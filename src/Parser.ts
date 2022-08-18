import { Token, TokenType } from "./Lexer";
import { QueryConstraint, where } from "firebase/firestore/lite";
import { fieldIsArray, ObjectUpdate } from "./FirestoreDAO";

export class AbstractQuery {
    action: string;
    return: Return;
    filters: FilterList;
    values: ObjectUpdate;

    constructor(action: string, return_: Return, filters: FilterList, values: ObjectUpdate) {
        this.action = action;
        this.return = return_;
        this.filters = filters;
        if (this.action.startsWith("insert")) {
            this.values = values;
            if (!this.values.tags) {
                this.values.tags = [];
            }
            let name = this.values.name;
            if (!name) {
                throw new Error("Name is required");
            }
            name = name.toLowerCase().trim();
            if (this.values.tags.indexOf(name) === -1) {
                this.values.tags.push(name);
            }
        }
    }
}

export class FilterList {
    filters: Field[];
    operatorIsOr: boolean;

    constructor(filters: Field[], operatorIsOr: boolean) {
        this.filters = filters;
        this.operatorIsOr = operatorIsOr;
    }

    toValueMap(): ObjectUpdate {
        const valueMap: ObjectUpdate = {};
        for (const filter of this.filters) {
            if (fieldIsArray[filter.field]) {
                valueMap[filter.field] = filter.values;
            } else {
                if (filter.values.length > 1) {
                    throw new Error(`Field ${filter.field} cannot have multiple values`);
                }
                valueMap[filter.field] = filter.values[0];
            }
        }
        return valueMap;
    }
}

export class Field {
    field: string;
    fieldIsArray: boolean;
    values: string[];

    constructor(field: string, values: string[]) {
        this.field = field;
        this.fieldIsArray = fieldIsArray[field];
        this.values = values;
    }

    toWhereClause(): QueryConstraint {
        if (this.values.length == 1) {
            return where(this.field, this.fieldIsArray ? "array-contains" : "==", this.values[0]);
        } else {
            return where(this.field, this.fieldIsArray ? "array-contains-any" : "in", this.values);
        }
    }
}

export interface Return {
    limit?: number;
    orderBy?: string;
}

export function parse(tokens: Token[]): AbstractQuery {
    const firstToken = tokens.shift();
    if (firstToken.type !== TokenType.Action) {
        throw new Error("Expected action");
    }
    const action = firstToken.value;

    expandShorthand(tokens);

    switch (action.split(" ")[0]) {
        case "select":
        case "delete": {
            const r = parseReturn(tokens);

            const filters = parseFilters(tokens);

            return new AbstractQuery(action, r, filters, {});
        }
        case "insert": {
            const somethingToken = tokens.shift();
            if (!isSomething(somethingToken)) {
                throw new Error("Unexpected token: " + somethingToken.value);
            }

            const values = parseValues(tokens);

            return new AbstractQuery(action, {}, new FilterList([], false), values);
        }
        case "update": {
            const r = parseReturn(tokens);

            const filters = parseFilters(tokens);

            if (tokens[0].type == TokenType.To) {
                const toToken = tokens.shift();
            }

            const fieldToken = new Token(TokenType.Filter, action.split(" ")[1]);
            tokens.unshift(fieldToken);

            const values = parseValues(tokens);

            return new AbstractQuery(action, r, filters, values);
        }
    }
}

function expandShorthand(tokens: Token[]): void {
    const replacement = [new Token(TokenType.The), new Token(TokenType.Thing), new Token(TokenType.Filter, "tags")];

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === TokenType.My) {
            tokens.splice(i, 1, ...replacement);
        }
    }

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === TokenType.Separator && tokens[i + 1].type === TokenType.Separator) {
            tokens.splice(i, 1);
            i--;
        }
    }
}

function parseReturn(tokens: Token[]): Return {
    const firstToken = tokens.shift();
    if (firstToken.type === TokenType.SimpleReturn) {
        return {};
    }
    if (firstToken.type === TokenType.The) {
        while (tokens[0].type !== TokenType.Thing) {
            tokens.shift();
        }
        tokens.shift();
        // TODO: parse the thing
        return {};
    }
    throw new Error("Expected return");
}

function parseFields(tokens: Token[], singleFieldParse: (list: Token[], operatorIsOr: boolean) => Field): FilterList {
    const filters: FilterList = new FilterList([], false);
    if (tokens.length === 0) {
        return filters;
    }

    let expecting = isFilter;
    let tree: Array<any> | Token = [[]];

    while (tokens.length > 0) {
        const token = tokens.shift();
        if (!expecting(token)) {
            if (isFilterEnd(token)) {
                tokens.unshift(token);
                break;
            }
            throw new Error(`Unexpected token ${token.value}`);
        }
        switch (expecting) {
            case isFilter:
                expecting = isStringLiteral;
                tree[tree.length - 1].push(token);
                break;
            case isStringLiteral:
                expecting = isSeparator;
                tree[tree.length - 1].push(token);
                break;
            case isSeparator:
                expecting = isStringLiteralOrFilter;
                tree[tree.length - 1].push(token);
                break;
            case isStringLiteralOrFilter:
                if (isFilter(token)) {
                    expecting = isStringLiteral;
                    tree.push([token]);
                } else {
                    expecting = isSeparator;
                    tree[tree.length - 1].push(token);
                }
        }
    }
    for (let i = 0; i < tree.length - 1; i += 2) {
        tree.splice(i + 1, 0, tree[i].pop());
    }

    filters.operatorIsOr = removeSeparators(tree, 0);

    for (const list of tree) {
        const subtreeOperatorIsOr = removeSeparators(list, 1);
        filters.filters.push(singleFieldParse(list, subtreeOperatorIsOr));
    }

    return filters;
}

function isFilter(token: Token): boolean {
    return token.type === TokenType.Filter;
}

function isSeparator(token: Token): boolean {
    return token.type === TokenType.Separator;
}

function isStringLiteral(token: Token): boolean {
    return token.type === TokenType.StringLiteral;
}

function isStringLiteralOrFilter(token: Token): boolean {
    return isStringLiteral(token) || isFilter(token);
}

function isSomething(token: Token): boolean {
    return token.type === TokenType.Something;
}

function isFilterEnd(token: Token): boolean {
    return token.type === TokenType.End || token.type === TokenType.To;
}

function removeSeparators(list: (any | Token)[], offset: number): boolean {

    let operatorIsOr = null;
    for (let i = 1; i < list.length; i++) {
        switch (list[i].value) {
            case "and":
                if (operatorIsOr == true) {
                    throw new Error("Cannot use 'and' with 'or'");
                }
                operatorIsOr = false;
                list.splice(i, 1);
                break;
            case "or":
                if (operatorIsOr == false) {
                    throw new Error("Cannot use 'or' with 'and'");
                }
                operatorIsOr = true;
                list.splice(i, 1);
                break;
            case ",":
                list.splice(i, 1);
                break;
        }
    }
    if (operatorIsOr == null) {
        operatorIsOr = false;
    }
    return operatorIsOr;
}

function parseFilter(list: Token[], operatorIsOr: boolean): Field {
    if (!operatorIsOr && list.length >= 3) {
        throw new Error("Cannot use 'and' in a filter");
    }
    let field = list.shift().value;
    if (field === "name") {
        field = "tags";
    }
    const values = [];
    while (list.length > 0) {
        const token = list.shift();
        values.push(token.value.toLowerCase());
    }
    return new Field(field, values);
}

function parseValue(list: Token[], operatorIsOr: boolean): Field {
    if (operatorIsOr && list.length >= 3) {
        throw new Error("Cannot use 'or' in a value");
    }
    let field = list.shift().value;
    const values = [];
    while (list.length > 0) {
        const token = list.shift();
        values.push(token.value);
    }
    return new Field(field, values);
}

function parseFilters(list: Token[]): FilterList {
    return parseFields(list, parseFilter);
}

function parseValues(tokens: Token[]): ObjectUpdate {
    const filters = parseFields(tokens, parseValue);
    return filters.toValueMap();
}