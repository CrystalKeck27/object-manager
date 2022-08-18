export enum TokenType {
    Action,
    SimpleReturn,
    The,
    Thing,
    My,
    Filter,
    Something,
    LocationFilter,
    SearchModifier,
    To,
    With,
    Separator,
    End,
    StringLiteral,
}

export class Token {
    public readonly type: TokenType;
    public readonly value?: string;

    constructor(type: TokenType, value?: string) {
        this.type = type;
        this.value = value;
    }

    equals(other: Token): boolean {
        return this.type === other.type && this.value === other.value;
    }
}

const tokenMap = {
    "show me": new Token(TokenType.Action, "select"),
    select: new Token(TokenType.Action, "select"),
    fetch: new Token(TokenType.Action, "select"),
    get: new Token(TokenType.Action, "select"),
    delete: new Token(TokenType.Action, "delete"),
    toss: new Token(TokenType.Action, "delete"),
    remove: new Token(TokenType.Action, "delete"),
    insert: new Token(TokenType.Action, "insert"),
    add: new Token(TokenType.Action, "insert"),
    create: new Token(TokenType.Action, "insert"),
    find: new Token(TokenType.Action, "find"),
    "where is": new Token(TokenType.Action, "find"),
    move: new Token(TokenType.Action, "update location"),
    //put: new Token(TokenType.Action, "update location"),
    rename: new Token(TokenType.Action, "update name"),
    describe: new Token(TokenType.Action, "update description"),
    tag: new Token(TokenType.Action, "update tags"),
    everything: new Token(TokenType.SimpleReturn, "everything"),
    all: new Token(TokenType.SimpleReturn, "everything"),
    anything: new Token(TokenType.SimpleReturn, "everything"),
    the: new Token(TokenType.The),
    thing: new Token(TokenType.Thing),
    my: new Token(TokenType.My),
    something: new Token(TokenType.Something),
    named: new Token(TokenType.Filter, "name"),
    called: new Token(TokenType.Filter, "name"),
    "described as": new Token(TokenType.Filter, "description"),
    tagged: new Token(TokenType.Filter, "tags"),
    exactly: new Token(TokenType.SearchModifier, "exactly"),
    precisely: new Token(TokenType.SearchModifier, "exactly"),
    cased: new Token(TokenType.SearchModifier, "case sensitive"),
    "case sensitive": new Token(TokenType.SearchModifier, "case sensitive"),
    located: new Token(TokenType.LocationFilter),
    by: new Token(TokenType.Filter, "by"),
    beside: new Token(TokenType.Filter, "by"),
    near: new Token(TokenType.Filter, "by"),
    around: new Token(TokenType.Filter, "by"),
    on: new Token(TokenType.Filter, "on"),
    in: new Token(TokenType.Filter, "in"),
    inside: new Token(TokenType.Filter, "in"),
    within: new Token(TokenType.Filter, "in"),
    at: new Token(TokenType.Filter, "at"),
    with: new Token(TokenType.With),
    to: new Token(TokenType.To),
    "as": new Token(TokenType.To),
    ",": new Token(TokenType.Separator, ","),
    and: new Token(TokenType.Separator, "and"),
    or: new Token(TokenType.Separator, "or"),
    ".": new Token(TokenType.End)
};

const preLexFixes = [];

for (const token in tokenMap) {
    if (token.indexOf(" ") > -1) {
        const newToken = token.replaceAll(" ", "");
        preLexFixes.push([token, newToken]);
        tokenMap[newToken] = tokenMap[token];
        delete tokenMap[token];
    }
}

export function lex(raw: string): Token[] {
    const splitOnQuotes = raw.split("\"");

    if (splitOnQuotes.length % 2 === 0) {
        throw new Error("Invalid string literal");
    }

    const tokens: Token[] = lexNoQuotes(splitOnQuotes[0]);

    for (let i = 1; i < splitOnQuotes.length; i += 2) {
        const token = new Token(TokenType.StringLiteral, splitOnQuotes[i]);
        tokens.push(token);

        tokens.concat(lexNoQuotes(splitOnQuotes[i + 1]));
    }

    return tokens;
}

function preLex(raw: string): string {
    raw = raw.trim();

    raw = raw.replaceAll(",", " ,");
    raw = raw.replaceAll(".", " .");
    raw = raw.replaceAll(/\s+/g, " ");
    for (const preLexFix of preLexFixes) {
        raw = raw.replace(preLexFix[0], preLexFix[1]);
    }

    return raw;
}

function lexNoQuotes(raw: string): Token[] {
    raw = preLex(raw);

    let tokens: Token[] = [];

    let splitOnSpaces = raw.split(" ");

    let string = "";
    let inString = false;

    for (const word of splitOnSpaces) {
        let token = tokenMap[word.toLowerCase()];
        if (!token) {
            if (inString) {
                string += " ";
            }
            inString = true;
            string += word;
            continue;
        }
        if (inString) {
            inString = false;
            tokens.push(new Token(TokenType.StringLiteral, string));
            string = "";
        }
        tokens.push(token);

    }

    if (inString) {
        tokens.push(new Token(TokenType.StringLiteral, string));
    }

    return tokens;
}