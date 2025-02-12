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
        if (window.location.pathname.endsWith('main.html')) {
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
            if (locCount > 0 && discCount > 0) {
                loadReferenceNumber(db);
                loadLocations(db);
                loadDisciplines(db);
                initializeDateTime();
                setupEventListeners();
            } else {
                window.location.href = 'index.html';
            }
        });
    };

    function initializeDateTime() {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }

    function updateDateTime() {
        elements.datetime.innerHTML = 'Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-02-12 14:02:30<br>Current User\'s Login: ugm616';
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
        } catch (error) {
            console.error('Error loading reference number:', error);
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
                    window.locationData = locations;
                    console.log('Locations loaded:', window.locationData.length);
                }
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
                    window.disciplineData = disciplines;
                    console.log('Disciplines loaded:', window.disciplineData.length);
                }
            };
        } catch (error) {
            console.error('Error in loadDisciplines:', error);
            throw error;
        }
    }

    function setupEventListeners() {
        // Set up input event listeners for search functionality
        elements.fromBuilding.addEventListener('input', (e) => handleSearch(e, 'building'));
        elements.fromDepartment.addEventListener('input', (e) => handleSearch(e, 'department'));
        elements.fromLocation.addEventListener('input', (e) => handleSearch(e, 'location'));
        elements.toBuilding.addEventListener('input', (e) => handleSearch(e, 'building'));
        elements.toDepartment.addEventListener('input', (e) => handleSearch(e, 'department'));
        elements.toLocation.addEventListener('input', (e) => handleSearch(e, 'location'));
        elements.category.addEventListener('input', (e) => handleSearch(e, 'category'));

        // Set up button event listeners
        elements.newTaskBtn.addEventListener('click', handleNewTask);
        elements.printTaskBtn.addEventListener('click', handlePrintTask);

        // Initialize datetime
        updateDateTime();
        setInterval(updateDateTime, 1000);

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            const dropdowns = document.querySelectorAll('.search-results');
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target) && e.target.tagName !== 'INPUT') {
                    dropdown.style.display = 'none';
                }
            });
        });
    }

    function handleSearch(event, type) {
        const input = event.target;
        const searchTerm = input.value.toLowerCase();
        
        if (!searchTerm) {
            hideDropdown(input);
            return;
        }

        if (type === 'category' && window.disciplineData) {
            const matches = window.disciplineData.filter(d => 
                d.fullName.toLowerCase().includes(searchTerm) ||
                d.initials.toLowerCase().includes(searchTerm)
            );
            showResults(matches.map(d => ({ text: d.fullName })), input);
        } else if (window.locationData) {
            let matches = [];

            switch (type) {
                case 'building':
                    const uniqueBuildings = new Set();
                    window.locationData.forEach(location => {
                        const buildingName = `${location.Site} - ${location.Building}`;
                        if (buildingName.toLowerCase().includes(searchTerm)) {
                            uniqueBuildings.add(buildingName);
                        }
                    });
                    matches = Array.from(uniqueBuildings).map(b => ({ text: b }));
                    break;

                case 'department':
                    const uniqueDepts = new Set();
                    window.locationData.forEach(location => {
                        if (location.Department && 
                            location.Department.toLowerCase().includes(searchTerm)) {
                            uniqueDepts.add(location.Department);
                        }
                    });
                    matches = Array.from(uniqueDepts).map(d => ({ text: d }));
                    break;

                case 'location':
                    const prefix = input.id.startsWith('from') ? 'from' : 'to';
                    const buildingValue = elements[`${prefix}Building`].value;
                    const deptValue = elements[`${prefix}Department`].value;

                    matches = window.locationData.filter(location => {
                        const locationText = `${location["Room Number"]} - ${location.Description}`;
                        const buildingMatch = !buildingValue || 
                            `${location.Site} - ${location.Building}` === buildingValue;
                        const deptMatch = !deptValue || 
                            location.Department === deptValue;
                        
                        return buildingMatch && deptMatch && 
                               locationText.toLowerCase().includes(searchTerm);
                    }).map(l => ({
                        text: `${l["Room Number"]} - ${l.Description}`,
                        location: l
                    }));
                    break;
            }

            showResults(matches, input);
        }
    }

    function showResults(matches, input) {
        let dropdown = document.getElementById(`results-${input.id}`);
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = `results-${input.id}`;
            dropdown.className = 'search-results';
            input.parentNode.appendChild(dropdown);
        }

        if (!matches.length) {
            hideDropdown(input);
            return;
        }

        dropdown.innerHTML = '';
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = match.text;
            div.addEventListener('click', () => {
                input.value = match.text;
                if (match.location) {
                    const prefix = input.id.startsWith('from') ? 'from' : 'to';
                    elements[`${prefix}Building`].value = `${match.location.Site} - ${match.location.Building}`;
                    elements[`${prefix}Department`].value = match.location.Department;
                }
                hideDropdown(input);
            });
            dropdown.appendChild(div);
        });
        dropdown.style.display = 'block';
    }

    function hideDropdown(input) {
        const dropdown = document.getElementById(`results-${input.id}`);
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    function handleNewTask() {
        Object.values(elements).forEach(element => {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                element.value = '';
            }
        });
        elements.name.focus();
    }

    function handlePrintTask() {
        window.print();
    }

    // Keyboard navigation for search results
    document.addEventListener('keydown', function(e) {
        const activeInput = document.activeElement;
        if (!activeInput || !activeInput.matches('input[type="text"]')) return;

        const resultsContainer = document.getElementById(`results-${activeInput.id}`);
        if (!resultsContainer || resultsContainer.style.display === 'none') return;

        const items = resultsContainer.querySelectorAll('.search-result-item');
        const selected = resultsContainer.querySelector('.selected');
        
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
                    activeInput.value = selected.textContent;

                    if (activeInput.id.includes('Location')) {
                        const foundLocation = window.locationData.find(loc => 
                            `${loc["Room Number"]} - ${loc.Description}` === selected.textContent
                        );

                        if (foundLocation) {
                            const buildingInput = elements[`${prefix}Building`];
                            const deptInput = elements[`${prefix}Department`];

                            if (!buildingInput.value) {
                                buildingInput.value = `${foundLocation.Site} - ${foundLocation.Building}`;
                            }
                            if (!deptInput.value) {
                                deptInput.value = foundLocation.Department;
                            }
                        }
                    }

                    resultsContainer.style.display = 'none';
                }
                break;

            case 'Escape':
                resultsContainer.style.display = 'none';
                break;

            case 'Tab':
                if (selected) {
                    e.preventDefault();
                    activeInput.value = selected.textContent;
                    resultsContainer.style.display = 'none';

                    // Find next input field
                    const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
                    const currentIndex = inputs.indexOf(activeInput);
                    if (currentIndex < inputs.length - 1) {
                        inputs[currentIndex + 1].focus();
                    }
                }
                break;
        }
    });
});
