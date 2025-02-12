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
        return;
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
        
        Promise.all([
            new Promise(resolve => {
                locStore.count().onsuccess = e => resolve(e.target.result);
            }),
            new Promise(resolve => {
                discStore.count().onsuccess = e => resolve(e.target.result);
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
        elements.datetime.innerHTML = 'Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-02-12 18:57:36<br>Current User\'s Login: ugm616';
    }

    // [Previous database-related functions remain unchanged]
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

    function removeExistingDropdown(input) {
        const existingDropdown = document.getElementById(`results-${input.id}`);
        if (existingDropdown) {
            existingDropdown.remove();
        }
    }

    function createAndShowDropdown(matches, input) {
        removeExistingDropdown(input);
        
        const inputGroup = input.closest('.input-group');
        if (!inputGroup) return;

        const dropdown = document.createElement('div');
        dropdown.id = `results-${input.id}`;
        dropdown.className = 'search-results';
        
        matches.forEach((match, index) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = match.text;
            if (index === 0) item.classList.add('selected');
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                selectDropdownItem(match, input);
            });
            
            item.addEventListener('mouseover', () => {
                dropdown.querySelector('.selected')?.classList.remove('selected');
                item.classList.add('selected');
            });
            
            dropdown.appendChild(item);
        });

        inputGroup.appendChild(dropdown);

        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        if (dropdownRect.bottom > viewportHeight) {
            dropdown.style.bottom = '100%';
            dropdown.style.top = 'auto';
            dropdown.style.marginTop = '0';
            dropdown.style.marginBottom = '2px';
        }
    }

    function selectDropdownItem(match, input) {
        input.value = match.text;
        
        if (match.location) {
            const prefix = input.id.startsWith('from') ? 'from' : 'to';
            const buildingInput = elements[`${prefix}Building`];
            const deptInput = elements[`${prefix}Department`];
            
            if (!buildingInput.value) {
                buildingInput.value = `${match.location.Site} - ${match.location.Building}`;
            }
            if (!deptInput.value) {
                deptInput.value = match.location.Department;
            }
        }
        
        removeExistingDropdown(input);
        input.focus();
    }

    function setupEventListeners() {
        elements.fromBuilding.addEventListener('input', (e) => handleSearch(e, 'building'));
        elements.fromDepartment.addEventListener('input', (e) => handleSearch(e, 'department'));
        elements.fromLocation.addEventListener('input', (e) => handleSearch(e, 'location'));
        elements.toBuilding.addEventListener('input', (e) => handleSearch(e, 'building'));
        elements.toDepartment.addEventListener('input', (e) => handleSearch(e, 'department'));
        elements.toLocation.addEventListener('input', (e) => handleSearch(e, 'location'));
        elements.category.addEventListener('input', (e) => handleSearch(e, 'category'));

        elements.newTaskBtn.addEventListener('click', handleNewTask);
        elements.printTaskBtn.addEventListener('click', handlePrintTask);

        updateDateTime();
        setInterval(updateDateTime, 1000);

        document.addEventListener('click', function(e) {
            if (!e.target.matches('input[type="text"]') && !e.target.closest('.search-results')) {
                document.querySelectorAll('.search-results').forEach(dropdown => {
                    removeExistingDropdown(dropdown);
                });
            }
        });

        window.addEventListener('resize', debounce(function() {
            const activeDropdowns = document.querySelectorAll('.search-results');
            activeDropdowns.forEach(dropdown => {
                const input = document.getElementById(dropdown.id.replace('results-', ''));
                if (input) {
                    const matches = Array.from(dropdown.children).map(child => ({
                        text: child.textContent,
                        value: child.dataset.value
                    }));
                    createAndShowDropdown(matches, input);
                }
            });
        }, 150));
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function handleSearch(event, type) {
        const input = event.target;
        const searchTerm = input.value.toLowerCase().trim();
        
        if (!searchTerm) {
            removeExistingDropdown(input);
            return;
        }

        let matches = [];
        
        if (type === 'category' && window.disciplineData) {
            matches = window.disciplineData
                .filter(d => 
                    d.fullName.toLowerCase().includes(searchTerm) ||
                    d.initials.toLowerCase().includes(searchTerm)
                )
                .map(d => ({ text: d.fullName }));
        } else if (window.locationData) {
            const prefix = input.id.startsWith('from') ? 'from' : 'to';
            
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
                    const selectedBuilding = elements[`${prefix}Building`].value;
                    const uniqueDepts = new Set();
                    window.locationData.forEach(location => {
                        const buildingName = `${location.Site} - ${location.Building}`;
                        if (location.Department && 
                            location.Department.toLowerCase().includes(searchTerm) &&
                            (!selectedBuilding || buildingName === selectedBuilding)) {
                            uniqueDepts.add(location.Department);
                        }
                    });
                    matches = Array.from(uniqueDepts).map(d => ({ text: d }));
                    break;

                case 'location':
                    const buildingValue = elements[`${prefix}Building`].value;
                    const deptValue = elements[`${prefix}Department`].value;
                    
                    matches = window.locationData
                        .filter(location => {
                            const locationText = `${location["Room Number"]} - ${location.Description}`;
                            const buildingMatch = !buildingValue || 
                                `${location.Site} - ${location.Building}` === buildingValue;
                            const deptMatch = !deptValue || 
                                location.Department === deptValue;
                            
                            return buildingMatch && deptMatch && 
                                   locationText.toLowerCase().includes(searchTerm);
                        })
                        .map(l => ({
                            text: `${l["Room Number"]} - ${l.Description}`,
                            location: l
                        }));
                    break;
            }
        }

        if (matches.length > 0) {
            createAndShowDropdown(matches, input);
        } else {
            removeExistingDropdown(input);
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

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const activeInput = document.activeElement;
        if (!activeInput || !activeInput.matches('input[type="text"]')) return;

        const resultsContainer = document.getElementById(`results-${activeInput.id}`);
        if (!resultsContainer) return;

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
                    e.preventDefault();
                    const matchText = selected.textContent;
                    const matchLocation = window.locationData.find(loc => 
                        `${loc["Room Number"]} - ${loc.Description}` === matchText
                    );
                    selectDropdownItem(
                        { text: matchText, location: matchLocation },
                        activeInput
                    );
                }
                break;

            case 'Escape':
                e.preventDefault();
                removeExistingDropdown(activeInput);
                break;

            case 'Tab':
                    if (selected) {
                        e.preventDefault();
                        const matchText = selected.textContent;
                        const matchLocation = window.locationData.find(loc => 
                            `${loc["Room Number"]} - ${loc.Description}` === matchText
                        );
                        selectDropdownItem(
                            { text: matchText, location: matchLocation },
                            activeInput
                        );
                        
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
