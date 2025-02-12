document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing IndexedDB...');
    
    const DB_NAME = "theoryDB";
    const DB_VERSION = 2;
    const CURRENT_USER = "ugm616";
    const CURRENT_DATETIME = "2025-02-12 09:05:02";

    // First check if database exists and has data
    const checkRequest = indexedDB.open(DB_NAME);
    
    checkRequest.onerror = function(event) {
        console.error("Database error:", event.target.error);
        showError("Failed to open database. Please try again.");
    };
    
    checkRequest.onsuccess = function(event) {
        const db = event.target.result;
        
        // Check if all required stores exist and have data
        if (db.objectStoreNames.contains("locations") && 
            db.objectStoreNames.contains("disciplines")) {
            
            // Use a transaction to check both stores
            const transaction = db.transaction(["locations", "disciplines"], "readonly");
            const locStore = transaction.objectStore("locations");
            const discStore = transaction.objectStore("disciplines");
            
            // Check counts for both stores
            Promise.all([
                new Promise(resolve => {
                    const locCount = locStore.count();
                    locCount.onsuccess = () => resolve(locCount.result);
                }),
                new Promise(resolve => {
                    const discCount = discStore.count();
                    discCount.onsuccess = () => resolve(discCount.result);
                })
            ]).then(([locationsCount, disciplinesCount]) => {
                if (locationsCount > 0 && disciplinesCount > 0) {
                    // Only redirect if we're on index.html
                    if (window.location.pathname.endsWith('index.html')) {
                        console.log('Database already initialized, redirecting to main...');
                        window.location.href = 'main.html';
                    }
                } else {
                    // If any store is empty, reinitialize
                    initializeNewDatabase();
                }
            });
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

                if (!db.objectStoreNames.contains("disciplines")) {
                    db.createObjectStore("disciplines", { keyPath: "initials" });
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
            fetch('disciplines.csv')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load disciplines.csv');
                    return response.text();
                })
        ])
        .then(([locationsData, disciplinesData]) => {
            updateStatus("Processing data...");
            
            // Parse each CSV file (disciplines use headers)
            const locations = parseCSV(locationsData, false);
            const disciplines = parseCSV(disciplinesData, true);

            // Store all data in a single transaction
            const txn = db.transaction(["locations", "disciplines"], "readwrite");
            
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

            // Store disciplines
            const discStore = txn.objectStore("disciplines");
            disciplines.forEach(discipline => {
                if (!discipline.initials) {
                    console.warn('Skipping discipline without initials:', discipline);
                    return;
                }
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
});
