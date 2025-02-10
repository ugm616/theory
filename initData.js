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

    function parseCSVLine(text) {
        const result = [];
        let startPos = 0;
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === ',' && !inQuotes) {
                result.push(text.substring(startPos, i).replace(/^"|"$/g, '').trim());
                startPos = i + 1;
            }
        }
        
        // Add the last field
        result.push(text.substring(startPos).replace(/^"|"$/g, '').trim());
        
        return result;
    }

    function parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/);
        const results = [];
        
        // Define headers based on your CSV structure
        const headers = [
            'Location',
            'Building',
            'Floor',
            'Area',
            'Room',
            'RoomCode',
            'BarCode',
            'Status',
            'Notes',
            'Department'
        ];

        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const currentLine = parseCSVLine(lines[i]);
            const location = {};

            headers.forEach((header, index) => {
                location[header] = currentLine[index] || '';
            });

            results.push(location);
        }

        return results;
    }

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
                document.getElementById('errorMessage').style.display = 'block';
                document.getElementById('retryButton').style.display = 'block';
            });
    }

    function addLocationsToDb(db, locations) {
        const locTxn = db.transaction(["locations"], "readwrite");
        const locStore = locTxn.objectStore("locations");

        let completed = 0;
        
        locations.forEach(function(location) {
            const locationName = `${location.Location}, ${location.Building} - ${location.Room}`;
            const request = locStore.add({
                name: locationName,
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
