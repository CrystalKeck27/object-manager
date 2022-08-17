import { getDocByName, getObjectByTag, updateObject } from "./FirestoreDAO";

(async () => {

    console.log(await getObjectByTag("desktop"));

    const desktopSnapshot = await getDocByName("Desktop");
    const dormSnapshot = await getDocByName("Dorm");

    await updateObject(desktopSnapshot.ref, {
        relations: {
            in: [dormSnapshot.ref]
        }
    });

    console.log(await getObjectByTag("desktop"));

})();