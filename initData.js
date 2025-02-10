document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing IndexedDB...');
    
    const DB_NAME = "theoryDB";
    const DB_VERSION = 1;

    // First check if database exists and has data
    const checkRequest = indexedDB.open(DB_NAME);
    
    checkRequest.onsuccess = function(event) {
        const db = event.target.result;
        
        // Check if locations store exists and has data
        if (db.objectStoreNames.contains("locations")) {
            const transaction = db.transaction(["locations"], "readonly");
            const store = transaction.objectStore("locations");
            const countRequest = store.count();
            
            countRequest.onsuccess = function() {
                if (countRequest.result > 0) {
                    // Data exists, redirect to main
                    console.log('Database already initialized, redirecting to main...');
                    window.location.href = 'main.html';
                    return;
                } else {
                    // No data, proceed with initialization
                    initializeNewDatabase();
                }
            };
        } else {
            // No locations store, proceed with initialization
            initializeNewDatabase();
        }
    };

    function initializeNewDatabase() {
        // Delete existing database first
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
                showError("Failed to create database. Please try again.");
            };
        };
    }

    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.style.display = 'block';
        }
        const loader = document.querySelector('.loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    function updateStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

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
        updateStatus("Loading location data...");

        // Initialize reference data
        const refTxn = db.transaction(["reference"], "readwrite");
        const refStore = refTxn.objectStore("reference");
        
        const today = new Date();
        const refNumber = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, '0')}${String(today.getUTCDate()).padStart(2, '0')}-001`;
        
        refStore.put({
            id: 1,
            reference: refNumber
        });

        // Load and process CSV data
        fetch('locations.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load locations.csv');
                }
                return response.text();
            })
            .then(csvData => {
                updateStatus("Processing location data...");
                const locations = parseCSV(csvData);
                addLocationsToDb(db, locations);
            })
            .catch(error => {
                console.error('Error loading CSV:', error);
                showError("Failed to load location data. Please check if locations.csv exists and try again.");
            });
    }

    function addLocationsToDb(db, locations) {
        updateStatus("Storing location data...");
        const locTxn = db.transaction(["locations"], "readwrite");
        const locStore = locTxn.objectStore("locations");

        let completed = 0;
        const total = locations.length;
        
        locations.forEach(function(location) {
            const locationName = `${location.Location}, ${location.Building} - ${location.Room}`;
            const request = locStore.add({
                name: locationName,
                fullDetails: location
            });
            
            request.onsuccess = function() {
                completed++;
                updateStatus(`Processing locations... (${completed}/${total})`);
                
                if (completed === total) {
                    console.log("Database initialization complete");
                    window.location.href = 'main.html';
                }
            };
            
            request.onerror = function(event) {
                console.error("Error adding location:", location, event.target.error);
                showError("Error storing location data. Please try again.");
            };
        });

        locTxn.onerror = function(event) {
            console.error("Transaction error:", event.target.error);
            showError("Database transaction failed. Please try again.");
        };
    }
});
