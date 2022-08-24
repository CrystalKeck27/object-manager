import { AbstractQuery, fieldTypeMap, FieldValueMap, InsertQuery, SelectQuery, StringFilter } from "./Parser";
import {
    CollectionReference,
    deleteDoc,
    getDocs,
    query,
    QueryConstraint,
    QueryDocumentSnapshot,
    where
} from "firebase/firestore/lite";
import { ObjectUpdate } from "./FirestoreDAO";
import { objectsReference } from "./Login";

export class ExecutableQuery {
    action: string;
    constraints: QueryConstraint[];
    isMultiQuery: boolean; // true if logical OR, false if logical AND
    values: ObjectUpdate;

    static async create(abstractQuery: AbstractQuery): Promise<ExecutableQuery> {
        const query = new ExecutableQuery();
        query.action = abstractQuery.action;
        query.constraints = [];
        if (query.action === "select" || query.action === "delete") {
            query.isMultiQuery = (abstractQuery as SelectQuery).operator === "or";
            query.constraints = await filtersToWhereClauses((abstractQuery as SelectQuery).filters);
        } else if (query.action === "insert") {
            query.values = (abstractQuery as InsertQuery).values;
        }
        return query;
    }

    async execute(collection: CollectionReference): Promise<QueryDocumentSnapshot[]> {
        console.log(this);
        switch (this.action) {
            case "select": {
                const response = await getDocs(query(collection, ...this.constraints));
                if (response.empty) {
                    return [];
                } else {
                    return response.docs;
                }
            }
            case "delete": {
                const response = await getDocs(query(collection, ...this.constraints));
                if (response.empty) {
                    return [];
                }
                for (const doc of response.docs) {
                    await deleteDoc(doc.ref);
                }
            }
        }
    }
}

export async function interpret(abstractQuery: AbstractQuery): Promise<ExecutableQuery> {
    return await ExecutableQuery.create(abstractQuery);
}

async function filtersToWhereClauses(filters: FieldValueMap): Promise<QueryConstraint[]> {
    const constraints: QueryConstraint[] = [];
    for (const field in filters) {
        const filter = filters[field];
        const fieldType = fieldTypeMap[field];
        switch (fieldType) {
            case "string": {
                const filterCast = filter as StringFilter;
                if (filterCast.operator == undefined) {
                    constraints.push(where(field, "==", filterCast.values[0]));
                } else {
                    if (filterCast.operator == "and") {
                        throw new Error(`${field} cannot have multiple values`);
                    }
                    constraints.push(where(field, "in", filterCast.values));
                }
                break;
            }
            case "string array": {
                const filterCast = filter as StringFilter;
                if (filterCast.operator == undefined) {
                    constraints.push(where(field, "array-contains", filterCast.values[0]));
                } else {
                    if (filterCast.operator == "and") {
                        throw new Error(`and query not yet supported for ${field}`);
                    }
                    constraints.push(where(field, "array-contains-any", filterCast.values));
                }
                break;
            }
            case "reference": {
                const query = await interpret(filter as SelectQuery);
                const documents = await query.execute(objectsReference);
                constraints.push(where(field, "==", documents.at(0).ref));
            }
        }
    }
    return constraints;
}