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

    request.onsuccess = function(event) {
        console.log('onsuccess: IndexedDB opened successfully');
        const db = event.target.result;

        loadReferenceNumber(db);
        loadLocations(db);
        initializeDateTime();
        setupEventListeners();
    };

    request.onerror = function(event) {
        console.error("Error opening IndexedDB:", event);
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
        const transaction = db.transaction(["reference"], "readonly");
        const store = transaction.objectStore("reference");
        
        store.get(1).onsuccess = function(event) {
            const data = event.target.result;
            if (data) {
                refNumberElement.textContent = `REF: ${data.reference}`;
            }
        };
    }

    function loadLocations(db) {
        const transaction = db.transaction(["locations"], "readonly");
        const store = transaction.objectStore("locations");
        
        store.getAll().onsuccess = function(event) {
            const locations = event.target.result;
            const dataList = document.getElementById('locations');
            dataList.innerHTML = '';
            
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.name;
                option.setAttribute('data-details', JSON.stringify(location.fullDetails));
                dataList.appendChild(option);
            });
        };
    }

    function setupEventListeners() {
        newTaskBtn.addEventListener('click', handleNewTask);
        printTaskBtn.addEventListener('click', handlePrintTask);
        
        // Add autocomplete handling
        fromInput.addEventListener('input', handleLocationInput);
        toInput.addEventListener('input', handleLocationInput);
    }

    function handleLocationInput(event) {
        const input = event.target;
        const datalist = document.getElementById('locations');
        const value = input.value.toLowerCase();
        
        // Filter options based on input
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
    }

    function handlePrintTask() {
        window.print();
    }
});