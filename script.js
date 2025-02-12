document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded: Initializing data from IndexedDB...');

    // Get DOM elements with null checks
    const elements = {
        refNumber: document.getElementById('refNumber'),
        datetime: document.getElementById('datetime'),
        newTaskBtn: document.getElementById('newTaskBtn'),
        printTaskBtn: document.getElementById('printTaskBtn'),
        name: document.getElementById('name'),
        extension: document.getElementById('extension'),
        fromBuilding: document.getElementById('fromBuilding'),
        fromDepartment: document.getElementById('fromDepartment'),
        fromLocation: document.getElementById('fromLocation'),
        toBuilding: document.getElementById('toBuilding'),
        toDepartment: document.getElementById('toDepartment'),
        toLocation: document.getElementById('toLocation'),
        category: document.getElementById('category'),
        description: document.getElementById('description')
    };

    // Validate that all required elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements);
        return; // Exit if required elements are missing
    }

    const userLogin = 'ugm616';
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
        const formattedDateTime = 'Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-02-12 11:50:39\nCurrent User\'s Login: ugm616\n';
        elements.datetime.innerHTML = formattedDateTime.replace(/\n/g, '<br>');
    }

    function loadReferenceNumber(db) {
        try {
            const transaction = db.transaction(["reference"], "readonly");
            const store = transaction.objectStore("reference");
            
            const request = store.get(1);
            
            request.onsuccess = function(event) {
                const data = event.target.result;
                if (data) {
                    elements.refNumber.textContent = `REF: ${data.reference}`;
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
                    const formattedLocations = locations.map(location => ({
                        name: `${location.Site} - ${location.Building} - ${location.Description}`,
                        fullDetails: {
                            Site: location.Site,
                            Building: location.Building,
                            Floor: location.Floor,
                            Area: location.Area,
                            Description: location.Description,
                            RoomCode: location["Room Number"],
                            Department: location.Department
                        }
                    }));

                    formattedLocations.sort((a, b) => {
                        if (!a || !b || !a.name || !b.name) return 0;
                        return a.name.localeCompare(b.name);
                    });

                    window.locationData = formattedLocations;
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
                    const formattedDisciplines = disciplines.map(discipline => ({
                        name: discipline.fullName,
                        fullDetails: {
                            initials: discipline.initials,
                            fullName: discipline.fullName,
                            Hospital: discipline.Hospital
                        }
                    }));

                    formattedDisciplines.sort((a, b) => {
                        if (!a || !b || !a.name || !b.name) return 0;
                        return a.name.localeCompare(b.name);
                    });

                    window.disciplineData = formattedDisciplines;
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
        elements.newTaskBtn.addEventListener('click', handleNewTask);
        elements.printTaskBtn.addEventListener('click', handlePrintTask);
        
        elements.fromBuilding.addEventListener('input', handleBuildingInput);
        elements.fromDepartment.addEventListener('input', handleDepartmentInput);
        elements.fromLocation.addEventListener('input', e => handleLocationInput(e, 'from'));
        
        elements.toBuilding.addEventListener('input', handleBuildingInput);
        elements.toDepartment.addEventListener('input', handleDepartmentInput);
        elements.toLocation.addEventListener('input', e => handleLocationInput(e, 'to'));
        
        elements.category.addEventListener('input', handleDisciplineInput);

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

        if (!window.locationData) return;

        const uniqueBuildings = new Set();
        window.locationData.forEach(location => {
            if (location.fullDetails && 
                `${location.fullDetails.Site} - ${location.fullDetails.Building}`.toLowerCase().includes(searchValue)) {
                uniqueBuildings.add(`${location.fullDetails.Site} - ${location.fullDetails.Building}`);
            }
        });

        const matches = Array.from(uniqueBuildings).map(building => ({
            name: building,
            fullDetails: { Building: building }
        }));

        displayResults(matches, resultsContainer, input);
    }

    function handleDepartmentInput(event) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        if (!window.locationData) return;

        const uniqueDepartments = new Set();
        window.locationData.forEach(location => {
            if (location.fullDetails && location.fullDetails.Department &&
                location.fullDetails.Department.toLowerCase().includes(searchValue)) {
                uniqueDepartments.add(location.fullDetails.Department);
            }
        });

        const matches = Array.from(uniqueDepartments).map(dept => ({
            name: dept,
            fullDetails: { Department: dept }
        }));

        displayResults(matches, resultsContainer, input);
    }

    function handleLocationInput(event, prefix) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        const buildingInput = elements[`${prefix}Building`];
        const departmentInput = elements[`${prefix}Department`];
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        if (!window.locationData) return;

        const matches = window.locationData.filter(location => {
            if (!location.fullDetails) return false;
            
            const buildingMatch = !buildingInput.value || 
                `${location.fullDetails.Site} - ${location.fullDetails.Building}` === buildingInput.value;
            const deptMatch = !departmentInput.value || 
                location.fullDetails.Department === departmentInput.value;
            const locationText = `${location.fullDetails.RoomCode} - ${location.fullDetails.Description}`;
            
            return buildingMatch && deptMatch && 
                   locationText.toLowerCase().includes(searchValue);
        });

        displayResults(matches, resultsContainer, input, true);
    }

    function handleDisciplineInput(event) {
        const input = event.target;
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue || !window.disciplineData) {
            resultsContainer.style.display = 'none';
            return;
        }

        const matches = window.disciplineData.filter(discipline => 
            discipline.name.toLowerCase().includes(searchValue) ||
            discipline.fullDetails.initials.toLowerCase().includes(searchValue)
        );

        displayResults(matches, resultsContainer, input);
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
            
            let info;
            if (isLocation && item.fullDetails) {
                info = `${item.fullDetails.RoomCode} - ${item.fullDetails.Description}`;
            } else {
                info = item.name;
            }
            
            div.textContent = info;
            
            div.addEventListener('click', () => {
                input.value = info;
                
                if (isLocation) {
                    const prefix = input.id.startsWith('from') ? 'from' : 'to';
                    const buildingInput = elements[`${prefix}Building`];
                    const deptInput = elements[`${prefix}Department`];
                    
                    if (!buildingInput.value && item.fullDetails) {
                        buildingInput.value = `${item.fullDetails.Site} - ${item.fullDetails.Building}`;
                    }
                    if (!deptInput.value && item.fullDetails) {
                        deptInput.value = item.fullDetails.Department;
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
        elements.name.value = '';
        elements.extension.value = '';
        elements.fromBuilding.value = '';
        elements.fromDepartment.value = '';
        elements.fromLocation.value = '';
        elements.toBuilding.value = '';
        elements.toDepartment.value = '';
        elements.toLocation.value = '';
        elements.category.value = '';
        elements.description.value = '';
        elements.name.focus();
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
                if (!selected && items.length > 0) {
                    items[0].classList.add('selected');
                    items[0].scrollIntoView({ block: 'nearest' });
                } else if (selected) {
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
                        const locationInfo = selected.textContent.trim();
                        activeInput.value = locationInfo;
                        
                        // If building or department is empty, fill them from the selected item
                        const buildingInput = elements[`${prefix}Building`];
                        const deptInput = elements[`${prefix}Department`];
                        
                        const matchedLocation = window.locationData.find(loc => 
                            `${loc.fullDetails.RoomCode} - ${loc.fullDetails.Description}` === locationInfo
                        );

                        if (matchedLocation) {
                            if (!buildingInput.value) {
                                buildingInput.value = `${matchedLocation.fullDetails.Site} - ${matchedLocation.fullDetails.Building}`;
                            }
                            if (!deptInput.value) {
                                deptInput.value = matchedLocation.fullDetails.Department;
                            }
                        }
                    } else if (activeInput.id.includes('Building')) {
                        // Handle building selection
                        activeInput.value = selected.textContent.trim();
                    } else if (activeInput.id.includes('Department')) {
                        // Handle department selection
                        activeInput.value = selected.textContent.trim();
                    } else {
                        // Handle category or other fields
                        activeInput.value = selected.textContent.trim();
                    }
                    container.style.display = 'none';
                }
                break;

            case 'Escape':
                container.style.display = 'none';
                break;

            case 'Tab':
                if (selected) {
                    e.preventDefault();
                    activeInput.value = selected.textContent.trim();
                    container.style.display = 'none';
                }
                break;
        }
    });
});