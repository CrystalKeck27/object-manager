// interface Dialect {
//     [field: string]: {
//         filter: string[];
//         type: string;
//         update: {
//             [action: string]: string;
//         };
//     };
// }
//
// const myRedirect = "name";
//
// const dialect: Dialect = {
//     "name": {
//         filter: ["named", "called"],
//         type: "string",
//         update: {
//             rename: "to"
//         }
//     },
//     "description": {
//         filter: ["described as", "with description"],
//         type: "string",
//         update: {
//             describe: "as"
//         }
//     },
//     "tags": {
//         filter: ["tagged", "with tags", "with tag"],
//         type: "string",
//         update: {
//             tag: "with"
//         }
//     },
//     "on": {
//         filter: ["on"],
//         type: "string",
//         update: {
//             move: "to on",
//             put: "on"
//         }
//     },
//     "in": {
//         filter: ["in"],
//         type: "string",
//         update: {
//             move: "to in",
//             put: "in"
//         }
//     }
// };
//
// const aliases = {
//     select: ["show me", "fetch", "get", "find", "where is"],
//     delete: ["toss", "remove"],
//     insert: ["add", "create"],
//     update: [], // created in for loop below
//     indicator: [], // created in for loop below
//     stringFilter: [], // created in for loop below
//     locationFilter: [], // created in for loop below
//     everything: ["all", "anything"]
// };
//
// for (const field in dialect) {
//     const fieldData = dialect[field];
//     for (const updateAction in fieldData.update) {
//         const indicator = fieldData.update[updateAction];
//         if (!aliases.update.includes(updateAction)) {
//             aliases.update.push(updateAction);
//         }
//         if (!aliases.indicator.includes(indicator)) {
//             aliases.indicator.push(indicator);
//         }
//     }
//     if (fieldData.type === "string") {
//         for (const filter of fieldData.filter) {
//             if (!aliases.stringFilter.includes(filter)) {
//                 aliases.stringFilter.push(filter);
//             }
//         }
//     } else if (fieldData.type === "location") {
//         for (const filter of fieldData.filter) {
//             if (!aliases.locationFilter.includes(filter)) {
//                 aliases.locationFilter.push(filter);
//             }
//         }
//     }
// }
//
// const actions = ["select", "delete", "insert", "update"];
//
// const regExps: { [key: string]: RegExp } = {};
//
// for (const alias in aliases) {
//     regExps[alias] = new RegExp(`(?:${[...aliases[alias], alias].join("|")})`, "i");
// }
//
// function src(key: string): string {
//     return regExps[key].source;
// }
//
// const stringLiteral = new RegExp(`"[^"]*"|(?:(?!and\\b)(?!or\\b)\\b\\w+ )*(?!and\\b)(?!or\\b)\\b\\w+`, "i");
// const stringLiteralList = regexList(stringLiteral.source);
// const stringListOrLiteral = new RegExp(`(?:${stringLiteralList.source})|${stringLiteral.source}`, "i");
// const locationValue = new RegExp(`(?:my|the) (?:${stringListOrLiteral.source})`, "i");
// const mySelector = new RegExp(`(?<my>my|the) (?<myValues>${stringListOrLiteral.source})`, "i");
// const stringFieldFilter = new RegExp(`(?:${src("stringFilter")} )(?:${stringListOrLiteral.source})`, "i");
// const locationFieldFilter = new RegExp(`(?:${src("locationFilter")} )(?:${locationValue.source})`, "i");
// const fieldFilter = new RegExp(`(?:${stringFieldFilter.source})|(?:${locationFieldFilter.source})`, "i");
// const namedFieldFilter = new RegExp(`(?<string>${stringFieldFilter.source})|(?<location>${locationFieldFilter.source})`, "i");
// const fieldFilterList = regexList(fieldFilter.source);
// const namedFieldFilterList = numberedRegexList(fieldFilter.source);
// const fieldFilterSingleOrList = new RegExp(`(?:${fieldFilterList.source})|(?:${fieldFilter.source})`, "i");
// const namedFieldFilterSingleOrList = new RegExp(`(?<list>${fieldFilterList.source})|(?<single>${fieldFilter.source})`, "i");
// const standardSelector = new RegExp(`(?:(?<narrowSelector>(?:my|the) .*? ?things?)|(?<wideSelector>${src("everything")})) (?<filters>${fieldFilterSingleOrList.source})`, "i");
// const noneSelector = new RegExp(`(?:(?<noneNarrowSelector>(?:my|the) .*? ?things)|(?<noneWideSelector>${src("everything")}))`, "i");
// const selector = new RegExp(`(?:${standardSelector.source})|(?:${noneSelector.source})|(?:${mySelector.source})`, "i");
// const selectDeleteStatement = new RegExp(`^(?<action>${src("select")}|${src("delete")}) (?:${selector.source})`, "i");
//
// function regexList(source: string): RegExp {
//     return new RegExp(`(?:(?:(?:${source}), )*|(?:${source}) )(?:or|and) (?:${source})`, "i");
// }
//
// function numberedRegexList(source: string): RegExp {
//     return new RegExp(`(?:(?:(${source}), )*|(${source}) )(?:or|and) (${source})`, "i");
// }
//
// function getActionType(raw: string) {
//     for (const action of actions) {
//         const regExp = new RegExp(`^${src(action)}`, "i");
//         if (regExp.test(raw)) {
//             return action;
//         }
//     }
//     return null;
// }
//
// function selectTypeStatement(raw: string) {
//     const primary = selectDeleteStatement.exec(raw);
//     if (!primary) {
//         return null;
//     }
//     console.log(primary.groups.action);
//     if (primary.groups.my) {
//         console.log(primary.groups.myValues);
//         return;
//     }
//     if (primary.groups.noneNarrowSelector) {
//         console.log(primary.groups.noneWideSelector);
//         return;
//     }
//     if (primary.groups.noneWideSelector) {
//         console.log(primary.groups.noneWideSelector);
//         return;
//     }
//     if (primary.groups.narrowSelector) {
//         console.log(primary.groups.filters);
//         return;
//     }
//     if (primary.groups.wideSelector) {
//         console.log(primary.groups.filters);
//         return;
//     }
// }
//
// const tests = [
//     "show me everything",
//     "move my thing to on the table",
//     "delete my shoes",
//     "insert a new thing called shoes",
//     "update my shoes to be on the table",
//     "select everything named shoes",
//     "fetch the first 11 things",
//     "find everything named shoes or toothbrush and in my dorm"
// ];
//
// for (const test of tests) {
//     const action = getActionType(test);
//     if (action) {
//         switch (action) {
//             case "select":
//             case "delete":
//                 selectTypeStatement(test);
//         }
//     } else {
//         console.log(`"${test}" is not an action`);
//     }
// }