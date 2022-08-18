import { AbstractQuery } from "./Parser";
import { CollectionReference, deleteDoc, getDocs, query, QueryConstraint, where } from "firebase/firestore/lite";
import { ObjectUpdate } from "./FirestoreDAO";

export class ExecutableQuery {
    action: string;
    constraints: QueryConstraint[];
    isMultiQuery: boolean; // true if logical OR, false if logical AND
    values: ObjectUpdate;


    constructor(abstractQuery: AbstractQuery) {
        this.action = abstractQuery.action;
        this.constraints = [];
        this.isMultiQuery = abstractQuery.filters.operatorIsOr;
        for (const filter of abstractQuery.filters.filters) {
            this.constraints.push(filter.toWhereClause());
        }
        this.values = abstractQuery.values;
    }

    async execute(collection: CollectionReference): Promise<any> {
        console.log(this);
        switch (this.action) {
            case "select": {
                const response = await getDocs(query(collection, ...this.constraints));
                if (response.empty) {
                    return "No matches found";
                } else {
                    return response.docs.map(doc => doc.data());
                }
            }
            case "delete": {
                const response = await getDocs(query(collection, ...this.constraints));
                if (response.empty) {
                    return "No matches found";
                }
                for (const doc of response.docs) {
                    await deleteDoc(doc.ref);
                }
            }
        }
    }
}

export function interpret(abstractQuery: AbstractQuery): ExecutableQuery {
    return new ExecutableQuery(abstractQuery);
}