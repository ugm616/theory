document.addEventListener('DOMContentLoaded', function() {
    // Check if we can access the database
    const checkRequest = indexedDB.open("theoryDB", 2);
    
    checkRequest.onerror = function(event) {
        console.error("Database error in main:", event.target.error);
        alert("Database error. Please refresh the page or return to the initialization page.");
    };
    
    checkRequest.onsuccess = function(event) {
        const db = event.target.result;
        // Check if required stores exist
        if (!db.objectStoreNames.contains("locations") || 
            !db.objectStoreNames.contains("disciplines")) {
            console.error("Required stores missing");
            alert("Database is not properly initialized. Please return to the initialization page.");
            return;
        }
        
        // Initialize application
        initializeApp(db);
    };
});

function initializeApp(db) {
    // Update datetime display
    const datetimeElement = document.getElementById('datetime');
    if (datetimeElement) {
        // Get reference number from database
        const refTxn = db.transaction(["reference"], "readonly");
        const refStore = refTxn.objectStore("reference");
        const getRequest = refStore.get(1);

        getRequest.onsuccess = function(event) {
            const data = event.target.result;
            if (data) {
                document.getElementById('refNumber').textContent = `REF: ${data.reference}`;
                datetimeElement.innerHTML = `${data.lastUpdated}<br>${data.updatedBy}`;
            }
        };
    }

    // Setup location search
    setupLocationSearch('from', db);
    setupLocationSearch('to', db);
    
    // Setup discipline search
    setupDisciplineSearch('category', db);

    // Setup buttons
    document.getElementById('newTaskBtn').addEventListener('click', function() {
        clearForm();
    });

    document.getElementById('printTaskBtn').addEventListener('click', function() {
        window.print();
    });
}

function setupLocationSearch(inputId, db) {
    const input = document.getElementById(inputId);
    let resultsDiv = null;

    input.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm.length < 2) {
            if (resultsDiv) {
                resultsDiv.remove();
                resultsDiv = null;
            }
            return;
        }

        const tx = db.transaction(['locations'], 'readonly');
        const store = tx.objectStore('locations');
        const request = store.openCursor();
        const results = [];

        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const location = cursor.value;
                if (location.name.toLowerCase().includes(searchTerm)) {
                    results.push(location);
                }
                cursor.continue();
            } else {
                displayLocationResults(results, input);
            }
        };
    });

    // Handle keyboard navigation
    input.addEventListener('keydown', function(e) {
        if (!resultsDiv) return;
        
        const items = resultsDiv.getElementsByClassName('search-result-item');
        let selectedItem = resultsDiv.querySelector('.selected');
        let selectedIndex = Array.from(items).indexOf(selectedItem);

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < items.length - 1) {
                    if (selectedItem) selectedItem.classList.remove('selected');
                    items[selectedIndex + 1].classList.add('selected');
                    items[selectedIndex + 1].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    if (selectedItem) selectedItem.classList.remove('selected');
                    items[selectedIndex - 1].classList.add('selected');
                    items[selectedIndex - 1].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedItem) {
                    input.value = selectedItem.textContent;
                    resultsDiv.remove();
                    resultsDiv = null;
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (resultsDiv) {
                    resultsDiv.remove();
                    resultsDiv = null;
                }
                break;
        }
    });

    // Handle click outside
    document.addEventListener('click', function(e) {
        if (resultsDiv && !input.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.remove();
            resultsDiv = null;
        }
    });

    function displayLocationResults(results, input) {
        if (resultsDiv) {
            resultsDiv.remove();
        }

        if (results.length === 0) return;

        resultsDiv = document.createElement('div');
        resultsDiv.className = 'search-results';

        results.sort((a, b) => a.name.localeCompare(b.name));

        results.forEach((result, index) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = result.name;
            
            div.addEventListener('click', function() {
                input.value = result.name;
                resultsDiv.remove();
                resultsDiv = null;
            });

            div.addEventListener('mouseover', function() {
                const selected = resultsDiv.querySelector('.selected');
                if (selected) selected.classList.remove('selected');
                this.classList.add('selected');
            });

            resultsDiv.appendChild(div);
        });

        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(resultsDiv);

        // Select first result by default
        const firstResult = resultsDiv.querySelector('.search-result-item');
        if (firstResult) {
            firstResult.classList.add('selected');
        }
    }
}

function setupDisciplineSearch(inputId, db) {
    const input = document.getElementById(inputId);
    let resultsDiv = null;

    input.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm.length < 1) {
            if (resultsDiv) {
                resultsDiv.remove();
                resultsDiv = null;
            }
            return;
        }

        const tx = db.transaction(['disciplines'], 'readonly');
        const store = tx.objectStore('disciplines');
        const request = store.openCursor();
        const results = [];

        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const discipline = cursor.value;
                if (discipline.initials.toLowerCase().includes(searchTerm) ||
                    discipline.fullName.toLowerCase().includes(searchTerm)) {
                    results.push(discipline);
                }
                cursor.continue();
            } else {
                displayDisciplineResults(results, input);
            }
        };
    });

    // Handle keyboard navigation
    input.addEventListener('keydown', function(e) {
        if (!resultsDiv) return;
        
        const items = resultsDiv.getElementsByClassName('search-result-item');
        let selectedItem = resultsDiv.querySelector('.selected');
        let selectedIndex = Array.from(items).indexOf(selectedItem);

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < items.length - 1) {
                    if (selectedItem) selectedItem.classList.remove('selected');
                    items[selectedIndex + 1].classList.add('selected');
                    items[selectedIndex + 1].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    if (selectedItem) selectedItem.classList.remove('selected');
                    items[selectedIndex - 1].classList.add('selected');
                    items[selectedIndex - 1].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedItem) {
                    input.value = selectedItem.getAttribute('data-initials');
                    resultsDiv.remove();
                    resultsDiv = null;
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (resultsDiv) {
                    resultsDiv.remove();
                    resultsDiv = null;
                }
                break;
        }
    });

    // Handle click outside
    document.addEventListener('click', function(e) {
        if (resultsDiv && !input.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.remove();
            resultsDiv = null;
        }
    });

    function displayDisciplineResults(results, input) {
        if (resultsDiv) {
            resultsDiv.remove();
        }

        if (results.length === 0) return;

        resultsDiv = document.createElement('div');
        resultsDiv.className = 'search-results';

        results.sort((a, b) => a.initials.localeCompare(b.initials));

        results.forEach((result, index) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = `${result.initials} - ${result.fullName}`;
            div.setAttribute('data-initials', result.initials);
            
            div.addEventListener('click', function() {
                input.value = result.initials;
                resultsDiv.remove();
                resultsDiv = null;
            });

            div.addEventListener('mouseover', function() {
                const selected = resultsDiv.querySelector('.selected');
                if (selected) selected.classList.remove('selected');
                this.classList.add('selected');
            });

            resultsDiv.appendChild(div);
        });

        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(resultsDiv);

        // Select first result by default
        const firstResult = resultsDiv.querySelector('.search-result-item');
        if (firstResult) {
            firstResult.classList.add('selected');
        }
    }
}

function clearForm() {
    // Clear all input fields
    document.getElementById('name').value = '';
    document.getElementById('extension').value = '';
    document.getElementById('from').value = '';
    document.getElementById('to').value = '';
    document.getElementById('category').value = '';
    document.getElementById('description').value = '';

    // Focus on name field
    document.getElementById('name').focus();
}

// Handle dark mode changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    // Update search result colors if needed
    const searchResults = document.querySelectorAll('.search-results');
    searchResults.forEach(results => {
        results.style.backgroundColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--surface-color');
    });
});

// Add error handler for indexedDB errors
function handleDBError(event) {
    console.error('IndexedDB error:', event.target.error);
    alert('Database error occurred. Please refresh the page.');
}
