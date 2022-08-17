import {
    addDoc,
    DocumentData,
    DocumentReference,
    getDocs,
    query,
    where,
    QueryDocumentSnapshot,
    updateDoc,
    AddPrefixToKeys
} from "firebase/firestore/lite";
import { objectsReference } from "./Login";

export interface BasicObject extends DocumentData {
    name: string;
    description: string;
    tags: string[]; // must be lowercase
    relations?: {
        on?: DocumentReference[];
        by?: DocumentReference[];
        in?: DocumentReference[];
    };
}

export interface ObjectUpdate extends AddPrefixToKeys<string, any> {
    name?: string;
    description?: string;
    tags?: string[]; // must be lowercase
    relations?: {
        on?: DocumentReference[];
        by?: DocumentReference[];
        in?: DocumentReference[];
    };
}

export interface ConsumableObject extends BasicObject {
    count: number;
}

export async function insertObject(object: BasicObject): Promise<DocumentReference> {
    if (await nameExists(object.name)) {
        throw new Error(`Object with name ${object.name} already exists`);
    }
    return addDoc(objectsReference, object);
}

export async function nameExists(name: string): Promise<boolean> {
    const q = query(objectsReference, where("name", "==", name));
    const matches = await getDocs(q);
    return matches.docs.length > 0;
}

export async function getDocByName(name: string): Promise<QueryDocumentSnapshot | undefined> {
    const q = query(objectsReference, where("name", "==", name));
    const matches = await getDocs(q);
    return !matches.empty ? matches.docs.at(0) : undefined;
}

export async function getObjectByTag(tag: string): Promise<DocumentData | undefined> {
    const q = query(objectsReference, where("tags", "array-contains", tag));
    const matches = await getDocs(q);
    return !matches.empty ? matches.docs.at(0).data() as DocumentData : undefined;
}

export async function updateObject(doc: DocumentReference, updates: ObjectUpdate): Promise<void> {
    return updateDoc(doc, updates);
}