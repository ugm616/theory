document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: Initializing data from IndexedDB...');

    const refNumberElement = document.getElementById('refNumber');
    const datetimeElement = document.getElementById('datetime');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const printTaskBtn = document.getElementById('printTaskBtn');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const userLogin = 'ugm616'; // Store user login

    // Check if we're on the main page
    const isMainPage = window.location.pathname.endsWith('main.html');

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
        // Only redirect if we're on the main page
        if (isMainPage) {
            window.location.href = 'index.html';
        }
    };

    request.onsuccess = function(event) {
        console.log('Database opened successfully');
        const db = event.target.result;

        // Verify object stores exist and contain data
        const transaction = db.transaction(["locations"], "readonly");
        const store = transaction.objectStore("locations");
        const countRequest = store.count();

        countRequest.onsuccess = function() {
            if (countRequest.result === 0 && isMainPage) {
                // No data found and we're on main page, redirect to init
                console.log('No data found, redirecting to initialization...');
                window.location.href = 'index.html';
                return;
            } else if (countRequest.result > 0 && !isMainPage) {
                // Data exists and we're on init page, redirect to main
                console.log('Data found, redirecting to main...');
                window.location.href = 'main.html';
                return;
            }

            // Continue with normal initialization if we're on the right page
            if (isMainPage) {
                try {
                    loadReferenceNumber(db);
                    loadLocations(db);
                    initializeDateTime();
                    setupEventListeners();
                } catch (error) {
                    console.error('Error initializing data:', error);
                }
            }
        };
    };

    function initializeDateTime() {
        updateDateTime();
        setInterval(updateDateTime, 1000); // Update every second
    }

    function updateDateTime() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        
        const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} | ${userLogin}`;
        datetimeElement.textContent = formattedDateTime;
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
                
                if (locations && locations.length > 0) {
                    locations
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .forEach(location => {
                            const option = document.createElement('option');
                            option.value = location.name;
                            option.setAttribute('data-search', 
                                Object.values(location.fullDetails)
                                    .filter(val => val)
                                    .join(' ')
                                    .toLowerCase()
                            );
                            option.setAttribute('data-details', JSON.stringify(location.fullDetails));
                        });
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

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            const resultsContainers = document.querySelectorAll('.search-results');
            resultsContainers.forEach(container => {
                if (!container.contains(e.target) && !e.target.matches('#from, #to')) {
                    container.style.display = 'none';
                }
            });
        });
    }

    function handleLocationInput(event) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        // Get all matching options from IndexedDB
        const db = request.result;
        const transaction = db.transaction(["locations"], "readonly");
        const store = transaction.objectStore("locations");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function() {
            const locations = getAllRequest.result;
            const matches = locations.filter(location => 
                Object.values(location.fullDetails)
                    .some(value => value && value.toString().toLowerCase().includes(searchValue))
            );

            // Display results
            displayResults(matches, resultsContainer, input);
        };
    }

    function getOrCreateResultsContainer(input) {
        let container = document.getElementById(`results-${input.id}`);
        
        if (!container) {
            container = document.createElement('div');
            container.id = `results-${input.id}`;
            container.className = 'search-results';
            input.parentNode.insertBefore(container, input.nextSibling);
        }
        
        return container;
    }

    function displayResults(matches, container, input) {
        const searchValue = input.value.toLowerCase();
        
        if (!matches.length || !searchValue) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        container.style.display = 'block';

        matches.forEach((location, index) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            
            // Create formatted room information
            const fullDetails = location.fullDetails;
            const roomInfo = [
                `Location: ${fullDetails.Location}`,
                `Building: ${fullDetails.Building}`,
                `Floor: ${fullDetails.Floor}`,
                `Area: ${fullDetails.Area}`,
                `Room: ${fullDetails.Room}`,
                `Room Code: ${fullDetails.RoomCode}`,
                `Bar Code: ${fullDetails.BarCode}`,
                `Status: ${fullDetails.Status}`,
                `Department: ${fullDetails.Department}`,
                fullDetails.Notes ? `Notes: ${fullDetails.Notes}` : null
            ].filter(Boolean).join(' | ');

            // Highlight matching text
            const highlightedText = roomInfo.replace(new RegExp(searchValue, 'gi'), 
                match => `<span class="highlight">${match}</span>`
            );
            
            div.innerHTML = highlightedText;
            
            div.addEventListener('click', () => {
                input.value = location.name;
                container.style.display = 'none';
            });

            // Keyboard navigation handling
            div.addEventListener('mouseover', () => {
                const selected = container.querySelector('.selected');
                if (selected) selected.classList.remove('selected');
                div.classList.add('selected');
            });

            container.appendChild(div);
        });
    }

    function handleNewTask() {
        document.getElementById('name').value = '';
        document.getElementById('extension').value = '';
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

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const activeInput = document.activeElement;
        if (!activeInput || !['from', 'to'].includes(activeInput.id)) return;

        const container = document.getElementById(`results-${activeInput.id}`);
        if (!container || container.style.display === 'none') return;

        const items = container.querySelectorAll('.search-result-item');
        const selected = container.querySelector('.selected');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!selected) {
                    items[0].classList.add('selected');
                } else {
                    const next = Array.from(items).indexOf(selected) + 1;
                    if (next < items.length) {
                        selected.classList.remove('selected');
                        items[next].classList.add('selected');
                        items[next].scrollIntoView({ block: 'nearest' });
                    }
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (selected) {
                    const prev = Array.from(items).indexOf(selected) - 1;
                    if (prev >= 0) {
                        selected.classList.remove('selected');
                        items[prev].classList.add('selected');
                        items[prev].scrollIntoView({ block: 'nearest' });
                    }
                }
                break;

            case 'Enter':
                if (selected) {
                    activeInput.value = selected.textContent.replace(/\s+/g, ' ').trim();
                    container.style.display = 'none';
                }
                break;

            case 'Escape':
                container.style.display = 'none';
                break;
        }
    });
});
