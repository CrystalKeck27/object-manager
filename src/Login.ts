import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore/lite";

// @ts-ignore
import credentials from "../credentials.json";

export const app = initializeApp(credentials);
export const firestore = getFirestore(app);
export const objectsReference = collection(firestore, "crystal");
