document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: Initializing data from IndexedDB...');

    const refNumberElement = document.getElementById('refNumber');
    const datetimeElement = document.getElementById('datetime');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const printTaskBtn = document.getElementById('printTaskBtn');
    const fromBuildingInput = document.getElementById('fromBuilding');
    const fromDepartmentInput = document.getElementById('fromDepartment');
    const fromLocationInput = document.getElementById('fromLocation');
    const toBuildingInput = document.getElementById('toBuilding');
    const toDepartmentInput = document.getElementById('toDepartment');
    const toLocationInput = document.getElementById('toLocation');
    const categoryInput = document.getElementById('category');
    const userLogin = 'ugm616';

    // Check if we're on the main page
    const isMainPage = window.location.pathname.endsWith('main.html');

    // Initialize IndexedDB
    const request = indexedDB.open("theoryDB", 2);

    request.onupgradeneeded = function(event) {
        console.log('Database upgrade needed...');
        const db = event.target.result;

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
        if (isMainPage) {
            window.location.href = 'index.html';
        }
    };

    request.onsuccess = function(event) {
        console.log('Database opened successfully');
        const db = event.target.result;

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
                console.log('No data found, redirecting to initialization...');
                window.location.href = 'index.html';
                return;
            } else if (locCount > 0 && !isMainPage) {
                console.log('Data found, redirecting to main...');
                window.location.href = 'main.html';
                return;
            }

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
        setInterval(updateDateTime, 1000);
    }

    function updateDateTime() {
        const formattedDateTime = 'Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-02-12 10:55:19\nCurrent User\'s Login: ugm616\n';
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
                    locations.sort((a, b) => a.name.localeCompare(b.name));
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
        
        // Setup location input handlers
        fromBuildingInput.addEventListener('input', handleBuildingInput);
        fromDepartmentInput.addEventListener('input', handleDepartmentInput);
        fromLocationInput.addEventListener('input', e => handleLocationInput(e, 'from'));
        
        toBuildingInput.addEventListener('input', handleBuildingInput);
        toDepartmentInput.addEventListener('input', handleDepartmentInput);
        toLocationInput.addEventListener('input', e => handleLocationInput(e, 'to'));
        
        categoryInput.addEventListener('input', handleDisciplineInput);

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            const resultsContainers = document.querySelectorAll('.search-results');
            resultsContainers.forEach(container => {
                if (!container.contains(e.target) && !e.target.matches('input[type="text"]')) {
                    container.style.display = 'none';
                }
            });
        });
    }

    function handleBuildingInput(event) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        const db = request.result;
        const transaction = db.transaction(["locations"], "readonly");
        const store = transaction.objectStore("locations");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function() {
            const locations = getAllRequest.result;
            const uniqueBuildings = new Set();
            
            locations.forEach(location => {
                const buildingInfo = `${location.fullDetails.Site} - ${location.fullDetails.Building}`;
                if (buildingInfo.toLowerCase().includes(searchValue)) {
                    uniqueBuildings.add(buildingInfo);
                }
            });

            const matches = Array.from(uniqueBuildings).map(building => ({
                name: building,
                fullDetails: { Building: building }
            }));

            displayResults(matches, resultsContainer, input);
        };
    }

    function handleDepartmentInput(event) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        const db = request.result;
        const transaction = db.transaction(["locations"], "readonly");
        const store = transaction.objectStore("locations");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function() {
            const locations = getAllRequest.result;
            const uniqueDepartments = new Set();
            
            locations.forEach(location => {
                if (location.fullDetails.Department && 
                    location.fullDetails.Department.toLowerCase().includes(searchValue)) {
                    uniqueDepartments.add(location.fullDetails.Department);
                }
            });

            const matches = Array.from(uniqueDepartments).map(dept => ({
                name: dept,
                fullDetails: { Department: dept }
            }));

            displayResults(matches, resultsContainer, input);
        };
    }

    function handleLocationInput(event, prefix) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        const buildingInput = document.getElementById(`${prefix}Building`);
        const departmentInput = document.getElementById(`${prefix}Department`);
        
        if (!searchValue || (!buildingInput.value && !departmentInput.value)) {
            resultsContainer.style.display = 'none';
            return;
        }

        const db = request.result;
        const transaction = db.transaction(["locations"], "readonly");
        const store = transaction.objectStore("locations");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function() {
            const locations = getAllRequest.result;
            const matches = locations.filter(location => {
                const buildingMatch = !buildingInput.value || 
                    `${location.fullDetails.Site} - ${location.fullDetails.Building}` === buildingInput.value;
                const deptMatch = !departmentInput.value || 
                    location.fullDetails.Department === departmentInput.value;
                const locationText = `${location.fullDetails.RoomCode} - ${location.fullDetails.Description}`;
                
                return (buildingMatch || deptMatch) && 
                       locationText.toLowerCase().includes(searchValue);
            });

            displayResults(matches, resultsContainer, input, true);
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

    function displayResults(matches, container, input, isLocation = false) {
        const searchValue = input.value.toLowerCase();
        
        if (!matches.length || !searchValue) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        container.style.display = 'block';

        matches.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            
            const fullDetails = item.fullDetails;
            let info;
            
            if (isLocation) {
                info = `${fullDetails.RoomCode} - ${fullDetails.Description}`;
            } else {
                info = Object.entries(fullDetails)
                    .filter(([_, value]) => value)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' | ');
            }

            const highlightedText = info.replace(new RegExp(searchValue, 'gi'), 
                match => `<span class="highlight">${match}</span>`
            );
            
            div.innerHTML = highlightedText;
            
            div.addEventListener('click', () => {
                input.value = isLocation ? `${fullDetails.RoomCode} - ${fullDetails.Description}` : item.name;
                
                if (isLocation) {
                    const prefix = input.id.startsWith('from') ? 'from' : 'to';
                    const buildingInput = document.getElementById(`${prefix}Building`);
                    const deptInput = document.getElementById(`${prefix}Department`);
                    
                    if (!buildingInput.value) {
                        buildingInput.value = `${fullDetails.Site} - ${fullDetails.Building}`;
                    }
                    if (!deptInput.value) {
                        deptInput.value = fullDetails.Department;
                    }
                }
                
                container.style.display = 'none';
            });

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
        fromBuildingInput.value = '';
        fromDepartmentInput.value = '';
        fromLocationInput.value = '';
        toBuildingInput.value = '';
        toDepartmentInput.value = '';
        toLocationInput.value = '';
        categoryInput.value = '';
        document.getElementById('description').value = '';
        document.getElementById('name').focus();
    }

    function handlePrintTask() {
        window.print();
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const activeInput = document.activeElement;
        if (!activeInput || !activeInput.matches('input[type="text"]')) return;

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
                    const prefix = activeInput.id.startsWith('from') ? 'from' : 'to';
                    if (activeInput.id.includes('Location')) {
                        // Handle location selection
                        const locationInfo = selected.textContent.replace(/\s+/g, ' ').trim();
                        activeInput.value = locationInfo;
                        
                        // If building or department is empty, fill them from the selected item
                        const buildingInput = document.getElementById(`${prefix}Building`);
                        const deptInput = document.getElementById(`${prefix}Department`);
                        
                        const fullDetails = JSON.parse(selected.getAttribute('data-details') || '{}');
                        if (!buildingInput.value && fullDetails.Site && fullDetails.Building) {
                            buildingInput.value = `${fullDetails.Site} - ${fullDetails.Building}`;
                        }
                        if (!deptInput.value && fullDetails.Department) {
                            deptInput.value = fullDetails.Department;
                        }
                    } else if (activeInput.id.includes('Building')) {
                        // Handle building selection
                        activeInput.value = selected.textContent.replace(/\s+/g, ' ').trim();
                    } else if (activeInput.id.includes('Department')) {
                        // Handle department selection
                        activeInput.value = selected.textContent.replace(/\s+/g, ' ').trim();
                    } else {
                        // Handle category or other fields
                        activeInput.value = selected.textContent.replace(/\s+/g, ' ').trim();
                    }
                    container.style.display = 'none';
                }
                break;

            case 'Escape':
                container.style.display = 'none';
                break;
        }
    });
});
