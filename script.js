document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: Initializing data from IndexedDB...');

    const refNumberElement = document.getElementById('refNumber');
    const datetimeElement = document.getElementById('datetime');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const printTaskBtn = document.getElementById('printTaskBtn');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');

    // Initialize IndexedDB
    const request = indexedDB.open("theoryDB", 1);

    // Handle database upgrade needed
    request.onupgradeneeded = function(event) {
        console.log('Database upgrade needed...');
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains("reference")) {
            db.createObjectStore("reference", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("locations")) {
            db.createObjectStore("locations", { autoIncrement: true });
        }
    };

    request.onerror = function(event) {
        console.error("Database error:", event.target.error);
        // Redirect to initialization page if database error occurs
        window.location.href = 'index.html';
    };

    request.onsuccess = function(event) {
        console.log('Database opened successfully');
        const db = event.target.result;

        // Verify object stores exist
        if (!db.objectStoreNames.contains("reference") || 
            !db.objectStoreNames.contains("locations")) {
            console.log('Required object stores missing, redirecting to initialization...');
            window.location.href = 'index.html';
            return;
        }

        try {
            loadReferenceNumber(db);
            loadLocations(db);
            initializeDateTime();
            setupEventListeners();
        } catch (error) {
            console.error('Error initializing data:', error);
            window.location.href = 'index.html';
        }
    };

    function initializeDateTime() {
        updateDateTime();
        setInterval(updateDateTime, 60000);
    }

    function updateDateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const dateStr = now.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        datetimeElement.textContent = `TIME: ${timeStr} | DATE: ${dateStr}`;
    }

    function loadReferenceNumber(db) {
        try {
            const transaction = db.transaction(["reference"], "readonly");
            const store = transaction.objectStore("reference");
            
            const request = store.get(1);
            
            request.onsuccess = function(event) {
                const data = event.target.result;
                if (data) {
                    refNumberElement.textContent = `REF: ${data.reference}`;
                }
            };

            request.onerror = function(event) {
                console.error("Error loading reference:", event.target.error);
            };
        } catch (error) {
            console.error('Error in loadReferenceNumber:', error);
            throw error;
        }
    }

    function loadLocations(db) {
        try {
            const transaction = db.transaction(["locations"], "readonly");
            const store = transaction.objectStore("locations");
            
            const request = store.getAll();
            
            request.onsuccess = function(event) {
                const locations = event.target.result;
                const dataList = document.getElementById('locations');
                dataList.innerHTML = '';
                
                if (locations && locations.length > 0) {
                    locations
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .forEach(location => {
                            const option = document.createElement('option');
                            option.value = location.name;
                            option.setAttribute('data-details', JSON.stringify(location.fullDetails));
                            dataList.appendChild(option);
                        });
                } else {
                    console.log('No locations found, redirecting to initialization...');
                    window.location.href = 'index.html';
                }
            };

            request.onerror = function(event) {
                console.error("Error loading locations:", event.target.error);
                throw event.target.error;
            };
        } catch (error) {
            console.error('Error in loadLocations:', error);
            throw error;
        }
    }

    function setupEventListeners() {
        newTaskBtn.addEventListener('click', handleNewTask);
        printTaskBtn.addEventListener('click', handlePrintTask);
        
        fromInput.addEventListener('input', handleLocationInput);
        toInput.addEventListener('input', handleLocationInput);
    }

    function handleLocationInput(event) {
        const input = event.target;
        const datalist = document.getElementById('locations');
        const value = input.value.toLowerCase();
        
        Array.from(datalist.options).forEach(option => {
            const optionValue = option.value.toLowerCase();
            if (optionValue.includes(value)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    }

    function handleNewTask() {
        fromInput.value = '';
        toInput.value = '';
        document.getElementById('description').value = '';
        if (document.getElementById('category')) {
            document.getElementById('category').selectedIndex = 0;
        }
    }

    function handlePrintTask() {
        window.print();
    }
});
