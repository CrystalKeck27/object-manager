export interface AbstractQuery {
    action: string;
}

export interface SelectQuery extends AbstractQuery {
    action: "select" | "delete";
    filters: FieldValueMap;
    orderStatement: string[] | false;
    operator: string | undefined;
}

export interface InsertQuery extends AbstractQuery {
    action: "insert";
    values: FieldValueMap;
}

export interface UpdateQuery extends AbstractQuery {
    action: "update";
    subject: SelectQuery;
    updates: FieldValueMap;
}

export interface FieldValueMap {
    [field: string]: Filter;
}

export type Filter = StringFilter | SelectQuery;

export interface StringFilter {
    values: string[];
    operator: "and" | "or" | undefined;
}

export function parse(tokens: string[]): AbstractQuery {
    const action = tokens[0];

    const actionType = actionTypeMap[action];

    let result;
    switch (actionType) {
        case "select":
        case "delete": {
            result = parseStandardSelectStatement(tokens);
            if (result) {
                parseFieldValueMap(result.filters);
                break;
            }
            result = parseMyStatement(tokens);
            if (result) {
                parseFieldValueMap(result.filters);
                break;
            }
            throw new Error("Failed to parse query");
        }
        case "insert": {
            result = parseInsertStatement(tokens);
            if (result) {
                parseFieldValueMap(result.values);
                break;
            }
            throw new Error("Failed to parse query");
        }
        case "update": {
            result = parseUpdateStatement(tokens);
            if (result) {
                parseFieldValueMap(result.updates);
                break;
            }
            throw new Error("Failed to parse query");
        }
    }
    return result;
}

function parseStandardSelectStatement(tokens: string[]): SelectQuery | false {
    tokens = tokens.slice(); // copy
    const action = tokens.shift();
    const token = tokens.shift();
    const output: SelectQuery = {
        action: actionTypeMap[action],
        filters: {},
        orderStatement: false,
        operator: undefined
    };
    if (myKeywords.includes(token)) {
        let found = false;
        const orderStatement = [];
        while (tokens.length > 0) {
            const nextToken = tokens.shift();
            if (thingKeywords.includes(nextToken)) {
                found = true;
                output.orderStatement = orderStatement;
                break;
            }
            orderStatement.push(nextToken);
        }
        if (!found) {
            return false;
        }
        output.orderStatement = orderStatement;
    } else if (noOrderKeywords.includes(token)) {

    } else {
        return false;
    }

    const result = separateFilters(tokens);
    Object.assign(output, result);
    return output;
}

function parseMyStatement(tokens: string[]): SelectQuery | false {
    tokens = tokens.slice(); // copy
    const action = tokens.shift();
    if (!myKeywords.includes(tokens.shift())) {
        return false;
    }
    const result = parseStringLiteralList(tokens);
    return {
        action: actionTypeMap[action],
        filters: {
            name: result
        },
        orderStatement: ["first"],
        operator: undefined
    };
}

function parseInsertStatement(tokens: string[]): InsertQuery | false {
    tokens = tokens.slice(); // copy
    const token = tokens.shift();
    const output: InsertQuery = {
        action: "insert",
        values: {}
    };
    if (!somethingKeywords.includes(token)) {
        return false;
    }

    const result = separateFilters(tokens);
    if (result.operator == "or") {
        throw new Error("Cannot use 'or' in an insert query");
    }
    output.values = result.filters;
    return output;
}

function parseUpdateStatement(tokens: string[]): UpdateQuery | false {
    tokens = tokens.slice(); // copy
    const token = tokens.shift();
    const updateKeyword = updateKeywordMap[token];
    if (!updateKeyword) {
        return false;
    }
    let field = undefined;
    let pos = -1;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const f = updateKeyword[token];
        if (f) {
            if (pos != -1) {
                throw new Error("Unexpected field");
            }
            pos = i;
            field = f;
        }
    }
    if (pos == -1) {
        return false;
    }
    const subjectTokens = tokens.splice(0, pos);
    subjectTokens.unshift("select");
    const subject = parseMyStatement(subjectTokens);
    if (!subject) {
        throw new Error("Failed to parse subject: " + subjectTokens.join(" "));
    }
    tokens.shift();
    const value = parseStringLiteralList(tokens);
    const updates = {};
    updates[field] = value;
    return {
        action: "update",
        subject: subject,
        updates: updates
    };
}

function parseFieldValueMap(fieldValueMap: FieldValueMap): void {
    for (const field in fieldValueMap) {
        const value = fieldValueMap[field];
        const fieldType = fieldTypeMap[field];
        if (fieldType == "reference") {
            const tokens = (value as StringFilter).values[0].split(" ");
            tokens.unshift("select");
            const result = parseMyStatement(tokens);
            if (!result) {
                throw new Error("Failed to parse my statement: " + (value as StringFilter).values[0]);
            }
            fieldValueMap[field] = result;
        }
    }
}

// expects tokens to be trimmed
function separateFilters(tokens: string[]): { filters: { [field: string]: StringFilter }, operator: string } {
    let filterJoinOperator = undefined;
    const filters = {};
    let currentFilter = [];
    while (tokens.length > 0) {
        const token = tokens.pop();
        currentFilter.unshift(token);
        if (filterMap[token]) {
            const field = currentFilter.shift();
            filters[filterMap[field]] = parseStringLiteralList(currentFilter);
            currentFilter = [];
            if (tokens.length == 0) break;
            const separator = tokens.pop();
            switch (separator) {
                case "and":
                case "or":
                    if (filterJoinOperator) {
                        throw new Error("Unexpected filter join operator");
                    }
                    filterJoinOperator = separator;
                    const oxfordComma = tokens.pop();
                    if (oxfordComma !== ",") {
                        tokens.push(oxfordComma);
                        console.log("Not an oxford comma");
                    }
                    break;
                case ",":
                    break;
                default:
                    console.log("Missing separator");
            }
        }
    }
    if (currentFilter.length > 0) {
        throw new Error("Incomplete starting filter: " + currentFilter.join(" "));
    }
    return {
        filters: filters,
        operator: filterJoinOperator
    };
}

function parseStringLiteralList(tokens: string[]): StringFilter {
    const strings = [];
    let separator = undefined;
    let currentString = [];
    while (tokens.length > 0) {
        const string = tokens.shift();
        switch (string) {
            case "and":
            case "or":
                if (separator) {
                    throw new Error("Unexpected filter join operator");
                }
                separator = string;
                break;
            case ",":
                if (separator) {
                    throw new Error("Unexpected comma after 'and' or 'or'");
                }
                break;
            default:
                currentString.push(string);
                continue;
        }
        if (currentString.length == 0) {
            throw new Error("Unexpected separator");
        }
        strings.push(currentString.join(" "));
    }
    if (currentString.length == 0) {
        throw new Error("Unexpected end of filter");
    }
    strings.push(currentString.join(" "));
    return {
        values: strings,
        operator: separator
    };
}

const actionTypeMap = {
    "select": "select",
    "show me": "select",
    "find": "select",
    "fetch": "select",
    "get": "select",
    "where is": "select",
    "delete": "delete",
    "toss": "delete",
    "remove": "delete",
    "insert": "insert",
    "add": "insert",
    "create": "insert",
    "move": "update",
    "put": "update",
    "rename": "update",
    "describe": "update",
    "tag": "update"
};

const filterMap = {
    "named": "name",
    "called": "name",
    "tagged": "tag",
    "in": "in",
    "inside": "in",
    "within": "in",
    "on": "on",
    "by": "by",
    "beside": "by",
    "near": "by",
    "around": "by"
};

export const fieldTypeMap = {
    "name": "string",
    "description": "string",
    "tag": "string array",
    "in": "reference",
    "on": "reference",
    "by": "reference"
};

const myKeywords = [
    "my",
    "the"
];

const thingKeywords = [
    "thing",
    "object",
    "item",
    "entity",
    "things",
    "objects",
    "items",
    "entities"
];

const noOrderKeywords = [
    "anything",
    "everything",
    "all"
];

const somethingKeywords = [
    "something"
];

const updateKeywordMap: { [keyword: string]: { [keyword: string]: string } } = {
    "rename": {"to": "name"},
    "describe": {"as": "description"},
    "tag": {"as": "tag", "with": "tag"},
    "put": {
        "in": "in",
        "inside": "in",
        "within": "in",
        "on": "on",
        "by": "by",
        "beside": "by",
        "near": "by",
        "around": "by"
    }
};