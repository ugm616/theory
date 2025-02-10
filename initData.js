document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing IndexedDB...');

    const request = indexedDB.open("theoryDB", 1);

    request.onupgradeneeded = function(event) {
        console.log('onupgradeneeded: Creating object stores...');
        const db = event.target.result;

        // Create object stores if they don't already exist
        if (!db.objectStoreNames.contains("reference")) {
            db.createObjectStore("reference", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("locations")) {
            db.createObjectStore("locations", { autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        console.log('onsuccess: IndexedDB opened successfully');
        const db = event.target.result;

        // Ensure the object stores are created before adding data
        if (event.target.transaction) {
            event.target.transaction.oncomplete = function() {
                addDataToIndexedDB(db);
            };
        } else {
            addDataToIndexedDB(db);
        }
    };

    request.onerror = function(event) {
        console.error("Error opening IndexedDB:", event);
    };

    function addDataToIndexedDB(db) {
        console.log('Adding data to IndexedDB...');

        // Add reference data
        const referenceData = {
            id: 1,
            reference: "A12345"
        };

        const referenceTransaction = db.transaction(["reference"], "readwrite");
        const referenceStore = referenceTransaction.objectStore("reference");
        referenceStore.put(referenceData);
        console.log('Reference data added to IndexedDB');

        // Add locations data
        const locationsData = [
            "St. Cross, RUG-ESTATES OFFICES, G, RVE, Hard FM Store (RUG), RVE00026, RVE00026, Not Defined, , RUG - ESTATES",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Phlebotomy Waiting Room, RCB00025, RCB00025, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Phelobotomy, RCB00027, RCB00027, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Clinic Room 2, RCB00028, RCB00028, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Clinic Room 3, RCB00029, RCB00029, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, , Not in Use, NOTinUSE, NO BARCODE, Not Defined, , DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Surgical Secretarys Office, RCB00036, RCB00036, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Phlebotomy Waiting Room, RCB00026, RCB00026, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Store, RCB00030, RCB00030, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Sisters Office, RCB00034, RCB00034, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Male Change THEATRE R, RCB00039, RCB00039, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Male Staff Change WC, RCB00041, RCB00041, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Male Staff Change Shower, RCB00040, RCB00040, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, THEATRE R4 Anaesthetic Room, RCB00045, RCB00045, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, THEATRE R4 Scrub Up, RCB00044, RCB00044, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Sluice Room, RCB00048, RCB00048, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, THEATRE R4 Operating, RCB00049, RCB00049, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Office/Theatre Res Room, RCB00050, RCB00050, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Recovery Bay, RCB00051, RCB00051, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Staff Room THEATRE R, RCB00052, RCB00052, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Store Room THEATRE R, RCB00053, RCB00053, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Female Change THEATRE R, RCB00055, RCB00055, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Dirty Utility Room, RCB00070, RCB00070, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Store, RCB00037, RCB00037, Not Defined, , DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, R.O. Plant Room, RCB00058, RCB00058, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Staff WC, RCB00068, RCB00068, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Store, RCB00043, RCB00043, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Lobby - to Clinic Room 4, RCB00035, RCB00035, Not Defined, , RUG - DAY SURGERY",
            "St. Cross, RUG-DAY SURGERY/THEATRE 4, G, RCB, Electrical Cupboard, RCB00064, RCB00064, Not Defined, , RUG - DAY SURGERY"
        ];

        const locationsTransaction = db.transaction(["locations"], "readwrite");
        const locationsStore = locationsTransaction.objectStore("locations");

        locationsData.forEach(location => {
            locationsStore.put({ name: location.split(",")[0] }); // Store only the first part
        });

        locationsTransaction.oncomplete = function() {
            console.log("Locations data added successfully");
            // Redirect to index.html after initialization
            window.location.href = 'index.html';
        };

        locationsTransaction.onerror = function(event) {
            console.error("Error adding locations data:", event);
        };
    }
});