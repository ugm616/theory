document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing IndexedDB...');
    
    const DB_NAME = "theoryDB";
    const DB_VERSION = 1;

    // First delete the existing database
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteRequest.onsuccess = function() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains("reference")) {
                db.createObjectStore("reference", { keyPath: "id" });
            }
            
            if (!db.objectStoreNames.contains("locations")) {
                db.createObjectStore("locations", { autoIncrement: true });
            }
        };

        request.onsuccess = function(event) {
            const db = event.target.result;
            initializeData(db);
        };

        request.onerror = function(event) {
            console.error("Error opening database:", event.target.error);
        };
    };

    function initializeData(db) {
        // Initialize reference data
        const refTxn = db.transaction(["reference"], "readwrite");
        const refStore = refTxn.objectStore("reference");
        
        refStore.put({
            id: 1,
            reference: "A12345"
        });

        // Load and process CSV data
        fetch('locations.csv')
            .then(response => response.text())
            .then(csvData => {
                const locations = parseCSV(csvData);
                addLocationsToDb(db, locations);
            })
            .catch(error => {
                console.error('Error loading CSV:', error);
            });
    }

    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const results = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const currentLine = lines[i].split(',');
            const location = {};

            headers.forEach((header, index) => {
                location[header.trim()] = currentLine[index] ? currentLine[index].trim() : '';
            });

            results.push(location);
        }

        return results;
    }

    function addLocationsToDb(db, locations) {
        const locTxn = db.transaction(["locations"], "readwrite");
        const locStore = locTxn.objectStore("locations");

        let completed = 0;
        
        locations.forEach(function(location) {
            const request = locStore.add({
                name: `${location.Location}, ${location.Room}`,
                fullDetails: location
            });
            
            request.onsuccess = function() {
                completed++;
                if (completed === locations.length) {
                    console.log("Database initialization complete");
                    window.location.href = 'main.html';
                }
            };
            
            request.onerror = function(event) {
                console.error("Error adding location:", location, event.target.error);
            };
        });

        locTxn.onerror = function(event) {
            console.error("Transaction error:", event.target.error);
        };
    }
});
