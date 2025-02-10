document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: Initializing data from IndexedDB...');

    const refNumberElement = document.getElementById('refNumber');
    const datetimeElement = document.getElementById('datetime');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const printTaskBtn = document.getElementById('printTaskBtn');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const categoryInput = document.getElementById('category');
    const userLogin = 'ugm616'; // Store user login

    // Check if we're on the main page
    const isMainPage = window.location.pathname.endsWith('main.html');

    // Initialize IndexedDB
    const request = indexedDB.open("theoryDB", 2); // Upgraded version number for new store

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

        if (!db.objectStoreNames.contains("disciplines")) {
            db.createObjectStore("disciplines", { autoIncrement: true });
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
        const transaction = db.transaction(["locations", "disciplines"], "readonly");
        const locStore = transaction.objectStore("locations");
        const discStore = transaction.objectStore("disciplines");
        const locCountRequest = locStore.count();
        const discCountRequest = discStore.count();

        Promise.all([
            new Promise(resolve => {
                locCountRequest.onsuccess = () => resolve(locCountRequest.result);
            }),
            new Promise(resolve => {
                discCountRequest.onsuccess = () => resolve(discCountRequest.result);
            })
        ]).then(([locCount, discCount]) => {
            if ((locCount === 0 || discCount === 0) && isMainPage) {
                // No data found and we're on main page, redirect to init
                console.log('No data found, redirecting to initialization...');
                window.location.href = 'index.html';
                return;
            } else if (locCount > 0 && !isMainPage) {
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
                    loadDisciplines(db);
                    initializeDateTime();
                    setupEventListeners();
                } catch (error) {
                    console.error('Error initializing data:', error);
                }
            }
        });
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
        
        const formattedDateTime = `Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${year}-${month}-${day} ${hours}:${minutes}:${seconds}\nCurrent User's Login: ${userLogin}\n`;
        datetimeElement.innerHTML = formattedDateTime.replace(/\n/g, '<br>');
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

    function loadDisciplines(db) {
        try {
            const transaction = db.transaction(["disciplines"], "readonly");
            const store = transaction.objectStore("disciplines");
            
            const request = store.getAll();
            
            request.onsuccess = function(event) {
                const disciplines = event.target.result;
                
                if (disciplines && disciplines.length > 0) {
                    disciplines
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .forEach(discipline => {
                            const option = document.createElement('option');
                            option.value = discipline.name;
                            option.setAttribute('data-search', 
                                Object.values(discipline.fullDetails)
                                    .filter(val => val)
                                    .join(' ')
                                    .toLowerCase()
                            );
                            option.setAttribute('data-details', JSON.stringify(discipline.fullDetails));
                        });
                }
            };

            request.onerror = function(event) {
                console.error("Error loading disciplines:", event.target.error);
                throw event.target.error;
            };
        } catch (error) {
            console.error('Error in loadDisciplines:', error);
            throw error;
        }
    }

    function setupEventListeners() {
        newTaskBtn.addEventListener('click', handleNewTask);
        printTaskBtn.addEventListener('click', handlePrintTask);
        
        fromInput.addEventListener('input', handleLocationInput);
        toInput.addEventListener('input', handleLocationInput);
        categoryInput.addEventListener('input', handleDisciplineInput);

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            const resultsContainers = document.querySelectorAll('.search-results');
            resultsContainers.forEach(container => {
                if (!container.contains(e.target) && !e.target.matches('#from, #to, #category')) {
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

    function handleDisciplineInput(event) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        // Get all matching options from IndexedDB
        const db = request.result;
        const transaction = db.transaction(["disciplines"], "readonly");
        const store = transaction.objectStore("disciplines");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function() {
            const disciplines = getAllRequest.result;
            const matches = disciplines.filter(discipline => 
                Object.values(discipline.fullDetails)
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

        matches.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            
            // Create formatted information
            const fullDetails = item.fullDetails;
            const info = Object.entries(fullDetails)
                .filter(([_, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' | ');

            // Highlight matching text
            const highlightedText = info.replace(new RegExp(searchValue, 'gi'), 
                match => `<span class="highlight">${match}</span>`
            );
            
            div.innerHTML = highlightedText;
            
            div.addEventListener('click', () => {
                input.value = item.name;
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
        categoryInput.value = '';
        document.getElementById('description').value = '';
    }

    function handlePrintTask() {
        window.print();
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const activeInput = document.activeElement;
        if (!activeInput || !['from', 'to', 'category'].includes(activeInput.id)) return;

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
