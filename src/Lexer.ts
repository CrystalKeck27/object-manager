export const actions = [
    "select",
    "show me",
    "fetch",
    "get",
    "find",
    "where is",
    "delete",
    "toss",
    "remove",
    "insert",
    "add",
    "create",
    "move",
    "put",
    "rename",
    "describe",
    "tag"
];

export function lex(raw: string) {
    const action = getAction(raw);
    raw = raw.substring(action.length);
    raw = raw.trimStart(); // no subsequent whitespace
    let tokens: string[] = [action];
    let currentToken = "";
    let insideString = false;
    while (raw.length > 0) {
        const char = raw.charAt(0);
        raw = raw.substring(1);
        switch (char) {
            case " ":
                if (insideString) {
                    currentToken += char;
                    continue;
                }
                if (currentToken.length > 0) {
                    tokens.push(currentToken);
                    currentToken = "";
                }
                break;
            case ",":
                if (insideString) {
                    currentToken += char;
                    continue;
                }
                if (currentToken.length > 0) {
                    tokens.push(currentToken);
                    currentToken = "";
                }
                tokens.push(",");
                break;
            case "\"":
                insideString = !insideString;
                currentToken += char;
                if (!insideString) {
                    tokens.push(currentToken);
                    currentToken = "";
                }
                break;
            default:
                currentToken += char;
        }
    }
    if (currentToken.length > 0) {
        tokens.push(currentToken);
    }

    return tokens;
}

function getAction(raw: string) {
    for (const action of actions) {
        if (raw.startsWith(action)) {
            return action;
        }
    }
}

const tests = [
    "show me everything named foo",
    "fetch my cheese",
    "get everything described as bar"
];

for (const test of tests) {
    console.log(lex(test).join(", "));
}