import {
    addDoc,
    DocumentData,
    DocumentReference,
    getDocs,
    query,
    where,
    updateDoc,
    AddPrefixToKeys
} from "firebase/firestore/lite";
import { objectsReference } from "./Login";

export interface BasicObject extends DocumentData {
    name: string;
    description: string;
    tags: string[]; // must be lowercase
    on?: DocumentReference;
    by?: DocumentReference;
    in?: DocumentReference;
}

export interface ObjectUpdate extends AddPrefixToKeys<string, any> {
    name?: string;
    description?: string;
    tags?: string[]; // must be lowercase
    on?: DocumentReference;
    by?: DocumentReference;
    in?: DocumentReference;
}

export const fieldIsArray = {
    name: false,
    description: false,
    tags: true,
    on: false,
    by: false,
    in: false
};

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

export async function getDocRefByName(name: string): Promise<DocumentReference | undefined> {
    const q = query(objectsReference, where("name", "==", name));
    const matches = await getDocs(q);
    return !matches.empty ? matches.docs.at(0).ref : undefined;
}

export async function getObjectByTag(tag: string): Promise<DocumentData | undefined> {
    const q = query(objectsReference, where("tags", "array-contains", tag));
    const matches = await getDocs(q);
    return !matches.empty ? matches.docs.at(0).data() as DocumentData : undefined;
}

export async function updateObject(doc: DocumentReference, updates: ObjectUpdate): Promise<void> {
    return updateDoc(doc, updates);
}