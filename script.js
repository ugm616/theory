document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: Initializing data from IndexedDB...');

    const refNumberElement = document.getElementById('refNumber');
    const datetimeElement = document.getElementById('datetime');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const printTaskBtn = document.getElementById('printTaskBtn');

    // Initialize IndexedDB
    const request = indexedDB.open("theoryDB", 1);

    request.onsuccess = function(event) {
        console.log('onsuccess: IndexedDB opened successfully');
        const db = event.target.result;

        // Load initial data from IndexedDB
        loadReferenceNumber(db);
        loadLocations(db);

        // Update date and time
        updateDateTime();
        setInterval(updateDateTime, 60000);

        // Event listeners for buttons
        newTaskBtn.addEventListener('click', handleNewTask);
        printTaskBtn.addEventListener('click', handlePrintTask);

        function updateDateTime() {
            const now = new Date();
            datetimeElement.textContent = `TIME: ${now.toLocaleTimeString()} | DATE: ${now.toLocaleDateString()}`;
            console.log('Date and time updated');
        }

        function loadReferenceNumber(db) {
            console.log('Loading reference number...');
            const transaction = db.transaction(["reference"], "readonly");
            const objectStore = transaction.objectStore("reference");
            const request = objectStore.get(1);

            request.onsuccess = function(event) {
                const data = event.target.result;
                if (data) {
                    refNumberElement.textContent = `REF: ${data.reference}`;
                    console.log('Reference number loaded:', data.reference);
                }
            };

            request.onerror = function(event) {
                console.error("Error loading reference number:", event);
            };
        }

        function loadLocations(db) {
            console.log('Loading locations...');
            const transaction = db.transaction(["locations"], "readonly");
            const objectStore = transaction.objectStore("locations");
            const request = objectStore.getAll();

            request.onsuccess = function(event) {
                const data = event.target.result;
                const dataList = document.getElementById('locations');
                data.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.name;
                    dataList.appendChild(option);
                });
                console.log('Locations loaded:', data);
            };

            request.onerror = function(event) {
                console.error("Error loading locations:", event);
            };
        }

        function handleNewTask() {
            console.log('New Task button clicked');
            // Logic to handle new task creation
        }

        function handlePrintTask() {
            console.log('Print Task button clicked');
            window.print();
        }
    };

    request.onerror = function(event) {
        console.error("Error opening IndexedDB:", event);
    };
});