import { getDocRefByName, getObjectByTag, insertObject, updateObject } from "./FirestoreDAO";
import readline from "readline";
import { lex } from "./Lexer";
import { parse } from "./Parser";
import { interpret } from "./Interpreter";
import { objectsReference } from "./Login";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on("line", async (line: string) => {
    try {
        const tokens = lex(line);
        const abstractQuery = parse(tokens);
        const executableQuery = interpret(abstractQuery);
        console.log(await executableQuery.execute(objectsReference));
    } catch (e) {
        console.log(e);
    }
    process.stdout.write("> ");
});

rl.on("close", () => {
    process.exit(0);
});