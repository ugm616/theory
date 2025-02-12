document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing IndexedDB...');
    
    const DB_NAME = "theoryDB";
    const DB_VERSION = 2; // Increased version for new stores
    const CURRENT_USER = "ugm616"; // Current user from system
    const CURRENT_DATETIME = "2025-02-12 08:22:07"; // Current UTC datetime

    // First check if database exists and has data
    const checkRequest = indexedDB.open(DB_NAME);
    
    checkRequest.onsuccess = function(event) {
        const db = event.target.result;
        
        // Check if all required stores exist and have data
        if (db.objectStoreNames.contains("locations") && 
            db.objectStoreNames.contains("privileges") && 
            db.objectStoreNames.contains("disciplines")) {
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
            // Required stores don't exist, proceed with initialization
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

                if (!db.objectStoreNames.contains("privileges")) {
                    db.createObjectStore("privileges", { keyPath: "initials" });
                }

                if (!db.objectStoreNames.contains("disciplines")) {
                    db.createObjectStore("disciplines", { keyPath: "code" });
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

    function parseCSV(csvText, useHeaders = false) {
        const lines = csvText.split(/\r?\n/);
        const results = [];
        
        // Define headers based on CSV structure or use first line
        const headers = useHeaders ? lines[0].split(',').map(header => header.trim()) : [
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

        const startLine = useHeaders ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const currentLine = parseCSVLine(lines[i]);
            const item = {};

            headers.forEach((header, index) => {
                item[header] = currentLine[index] || '';
            });

            results.push(item);
        }

        return results;
    }

    function initializeData(db) {
        updateStatus("Loading data...");

        // Initialize reference data with current timestamp
        const refTxn = db.transaction(["reference"], "readwrite");
        const refStore = refTxn.objectStore("reference");
        
        const [currentDate] = CURRENT_DATETIME.split(' ');
        const [year, month, day] = currentDate.split('-');
        const refNumber = `${year}${month}${day}-001`;
        
        refStore.put({
            id: 1,
            reference: refNumber,
            lastUpdated: CURRENT_DATETIME,
            updatedBy: CURRENT_USER
        });

        // Load all required CSV files
        Promise.all([
            fetch('locations.csv')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load locations.csv');
                    return response.text();
                }),
            fetch('privileges.csv')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load privileges.csv');
                    return response.text();
                }),
            fetch('disciplines.csv')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load disciplines.csv');
                    return response.text();
                })
        ])
        .then(([locationsData, privilegesData, disciplinesData]) => {
            updateStatus("Processing data...");
            
            // Parse each CSV file (privileges and disciplines use headers)
            const locations = parseCSV(locationsData, false);
            const privileges = parseCSV(privilegesData, true);
            const disciplines = parseCSV(disciplinesData, true);

            // Store all data in a single transaction
            const txn = db.transaction(["locations", "privileges", "disciplines"], "readwrite");
            
            // Store locations
            const locStore = txn.objectStore("locations");
            locations.forEach(location => {
                const locationName = `${location.Location}, ${location.Building} - ${location.Room}`;
                locStore.add({
                    name: locationName,
                    fullDetails: location,
                    lastUpdated: CURRENT_DATETIME,
                    updatedBy: CURRENT_USER
                });
            });

            // Store privileges
            const privStore = txn.objectStore("privileges");
            privileges.forEach(privilege => {
                privStore.add({
                    ...privilege,
                    lastUpdated: CURRENT_DATETIME,
                    updatedBy: CURRENT_USER
                });
            });

            // Store disciplines
            const discStore = txn.objectStore("disciplines");
            disciplines.forEach(discipline => {
                discStore.add({
                    ...discipline,
                    lastUpdated: CURRENT_DATETIME,
                    updatedBy: CURRENT_USER
                });
            });

            txn.oncomplete = function() {
                console.log("Database initialization complete");
                updateStatus("Initialization complete, redirecting...");
                window.location.href = 'main.html';
            };

            txn.onerror = function(event) {
                console.error("Transaction error:", event.target.error);
                showError("Database transaction failed. Please try again.");
            };
        })
        .catch(error => {
            console.error('Error loading CSV files:', error);
            showError(`Failed to load data files: ${error.message}`);
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
                fullDetails: location,
                lastUpdated: CURRENT_DATETIME,
                updatedBy: CURRENT_USER
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
