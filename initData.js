document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showError('An unexpected error occurred. Please try again.');
    });

    console.log('Initializing IndexedDB...');
    
    const DB_NAME = "theoryDB";
    const DB_VERSION = 2;
    const CURRENT_USER = "ugm616";
    const CURRENT_DATETIME = "2025-02-12 09:44:52";

    try {
        updateStatus("Checking database status...");
        const checkRequest = indexedDB.open(DB_NAME);
        
        checkRequest.onerror = function(event) {
            console.error("Database error:", event.target.error);
            showError("Failed to open database. Please try again.");
        };
        
        checkRequest.onsuccess = function(event) {
            try {
                const db = event.target.result;
                
                if (db.objectStoreNames.contains("locations") && 
                    db.objectStoreNames.contains("disciplines")) {
                    
                    updateStatus("Checking data stores...");
                    
                    const transaction = db.transaction(["locations", "disciplines"], "readonly");
                    const locStore = transaction.objectStore("locations");
                    const discStore = transaction.objectStore("disciplines");
                    
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
                        updateStatus(`Found ${locationsCount} locations and ${disciplinesCount} disciplines...`);
                        
                        if (locationsCount > 0 && disciplinesCount > 0) {
                            updateStatus("Database already initialized, redirecting to main...");
                            console.log("Redirecting to main.html...");
                            redirectToMain();
                        } else {
                            updateStatus("Empty data stores found, reinitializing...");
                            initializeNewDatabase();
                        }
                    }).catch(error => {
                        console.error("Error checking stores:", error);
                        showError("Failed to check data stores. Please try again.");
                    });
                } else {
                    updateStatus("Required stores missing, creating new database...");
                    initializeNewDatabase();
                }
            } catch (e) {
                console.error("Error in success handler:", e);
                showError("An error occurred while checking the database.");
            }
        };
    } catch (e) {
        console.error("Critical error during initialization:", e);
        showError("A critical error occurred during initialization.");
    }

    function redirectToMain() {
        try {
            console.log("Attempting to redirect to main.html using replace");
            window.location.replace('main.html');
        } catch (e1) {
            console.error("First redirect attempt failed:", e1);
            try {
                console.log("Attempting to redirect to main.html using href");
                window.location.href = 'main.html';
            } catch (e2) {
                console.error("Second redirect attempt failed:", e2);
                try {
                    console.log("Attempting to redirect to main.html using assign");
                    window.location.assign('main.html');
                } catch (e3) {
                    console.error("All redirect attempts failed:", e3);
                    showError("Unable to redirect to main page. Please try refreshing the page.");
                }
            }
        }
    }

    function initializeNewDatabase() {
        updateStatus("Preparing new database...");
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

        deleteRequest.onsuccess = function() {
            updateStatus("Creating new database structure...");
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                updateStatus("Creating database stores...");
                
                if (!db.objectStoreNames.contains("reference")) {
                    db.createObjectStore("reference", { keyPath: "id" });
                    updateStatus("Created reference store...");
                }
                
                if (!db.objectStoreNames.contains("locations")) {
                    db.createObjectStore("locations", { autoIncrement: true });
                    updateStatus("Created locations store...");
                }

                if (!db.objectStoreNames.contains("disciplines")) {
                    db.createObjectStore("disciplines", { keyPath: "initials" });
                    updateStatus("Created disciplines store...");
                }
            };

            request.onsuccess = function(event) {
                const db = event.target.result;
                updateStatus("Database structure ready, loading data...");
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
        
        result.push(text.substring(startPos).replace(/^"|"$/g, '').trim());
        return result;
    }

    function parseCSV(csvText, useHeaders = false) {
        const lines = csvText.split(/\r?\n/);
        const results = [];
        
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
        updateStatus("Initializing reference data...");

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

        updateStatus("Loading CSV files...");

        Promise.all([
            fetch('locations.csv')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load locations.csv');
                    updateStatus("Loading locations data...");
                    return response.text();
                }),
            fetch('disciplines.csv')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load disciplines.csv');
                    updateStatus("Loading disciplines data...");
                    return response.text();
                })
        ])
        .then(([locationsData, disciplinesData]) => {
            updateStatus("Processing location data...");
            const locations = parseCSV(locationsData, false);
            
            updateStatus("Processing discipline data...");
            const disciplines = parseCSV(disciplinesData, true);

            updateStatus(`Storing ${locations.length} locations and ${disciplines.length} disciplines...`);

            const txn = db.transaction(["locations", "disciplines"], "readwrite");
            let totalLocations = 0;
            let totalDisciplines = 0;
            
            const locStore = txn.objectStore("locations");
            locations.forEach((location, index) => {
                const locationName = `${location.Location}, ${location.Building} - ${location.Room}`;
                locStore.add({
                    name: locationName,
                    fullDetails: location,
                    lastUpdated: CURRENT_DATETIME,
                    updatedBy: CURRENT_USER
                }).onsuccess = () => {
                    totalLocations++;
                    if (totalLocations % 50 === 0 || totalLocations === locations.length) {
                        updateStatus(`Storing locations... (${totalLocations}/${locations.length})`);
                    }
                };
            });

            const discStore = txn.objectStore("disciplines");
            disciplines.forEach((discipline, index) => {
                if (!discipline.initials) {
                    console.warn('Skipping discipline without initials:', discipline);
                    return;
                }
                discStore.add({
                    ...discipline,
                    lastUpdated: CURRENT_DATETIME,
                    updatedBy: CURRENT_USER
                }).onsuccess = () => {
                    totalDisciplines++;
                    updateStatus(`Storing disciplines... (${totalDisciplines}/${disciplines.length})`);
                };
            });

            txn.oncomplete = function() {
                console.log("Database initialization complete");
                updateStatus("Initialization complete, redirecting...");
                setTimeout(() => {
                    try {
                        console.log("Attempting to redirect to main.html after initialization");
                        window.location.replace('main.html');
                    } catch (e) {
                        console.error("Redirect failed:", e);
                        window.location.href = 'main.html';
                    }
                }, 500);
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

    setTimeout(() => {
        try {
            const statusElement = document.getElementById('statusMessage');
            if (statusElement && document.location.pathname.includes('index.html')) {
                console.log("Page has been on index.html too long, forcing redirect...");
                redirectToMain();
            }
        } catch (e) {
            console.error("Timeout handler error:", e);
        }
    }, 10000);
});
