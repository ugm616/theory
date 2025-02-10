document.addEventListener('DOMContentLoaded', function() {
    // ... previous initialization code remains the same ...

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
                            // Store all searchable text as a data attribute
                            option.setAttribute('data-search', 
                                Object.values(location.fullDetails)
                                    .filter(val => val) // Remove empty values
                                    .join(' ')
                                    .toLowerCase()
                            );
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

    function handleLocationInput(event) {
        const input = event.target;
        const datalist = document.getElementById('locations');
        const searchValue = input.value.toLowerCase();
        const resultsContainer = getOrCreateResultsContainer(input);
        
        if (!searchValue) {
            resultsContainer.style.display = 'none';
            return;
        }

        // Get all matching options
        const matches = Array.from(datalist.options).filter(option => {
            const searchData = option.getAttribute('data-search');
            return searchData.includes(searchValue);
        });

        // Display results
        displayResults(matches, resultsContainer, input);
    }

    function getOrCreateResultsContainer(input) {
        let container = document.getElementById(`results-${input.id}`);
        
        if (!container) {
            container = document.createElement('div');
            container.id = `results-${input.id}`;
            container.className = 'search-results';
            input.parentNode.insertBefore(container, input.nextSibling);
            
            // Add styles if not already added
            if (!document.getElementById('search-results-style')) {
                const style = document.createElement('style');
                style.id = 'search-results-style';
                style.textContent = `
                    .search-results {
                        position: absolute;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        max-height: 200px;
                        overflow-y: auto;
                        width: calc(100% - 20px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        z-index: 1000;
                        margin-top: 5px;
                    }
                    .search-result-item {
                        padding: 8px 12px;
                        cursor: pointer;
                        border-bottom: 1px solid #eee;
                    }
                    .search-result-item:hover {
                        background-color: #f0f0f0;
                    }
                    .search-result-item.selected {
                        background-color: #e3f2fd;
                    }
                    .highlight {
                        background-color: #fff3cd;
                        padding: 0 2px;
                        border-radius: 2px;
                    }
                    .row {
                        position: relative;
                    }
                `;
                document.head.appendChild(style);
            }
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

        matches.forEach((option, index) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            
            // Highlight matching text
            const text = option.value;
            const highlightedText = text.replace(new RegExp(searchValue, 'gi'), 
                match => `<span class="highlight">${match}</span>`
            );
            
            div.innerHTML = highlightedText;
            
            div.addEventListener('click', () => {
                input.value = option.value;
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

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        const activeInput = document.activeElement;
        if (!activeInput || !['from', 'to'].includes(activeInput.id)) return;

        const container = document.getElementById(`results-${activeInput.id}`);
        if (!container || container.style.display === 'none') return;

        const items = container.querySelectorAll('.search-result-item');
        const selected = container.querySelector('.selected');
        let nextSelect;

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

    // Close results when clicking outside
    document.addEventListener('click', function(e) {
        const resultsContainers = document.querySelectorAll('.search-results');
        resultsContainers.forEach(container => {
            if (!container.contains(e.target) && !e.target.matches('#from, #to')) {
                container.style.display = 'none';
            }
        });
    });
});
