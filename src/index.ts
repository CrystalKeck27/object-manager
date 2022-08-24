import readline from "readline";
import { lex } from "./Lexer";
import { parse } from "./Parser";


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on("line", async (line: string) => {
    try {
        const tokens = lex(line);
        const result = parse(tokens);
        console.log(result);
    } catch (e) {
        console.log(e);
    }
    process.stdout.write("> ");
});

rl.on("close", () => {
    process.exit(0);
});