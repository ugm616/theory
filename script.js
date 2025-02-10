document.addEventListener('DOMContentLoaded', function() {
    const refNumberElement = document.getElementById('refNumber');
    const datetimeElement = document.getElementById('datetime');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const printTaskBtn = document.getElementById('printTaskBtn');

    // Load initial data from JSON and CSV
    loadReferenceNumber();
    loadLocations();

    // Update date and time
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Event listeners for buttons
    newTaskBtn.addEventListener('click', handleNewTask);
    printTaskBtn.addEventListener('click', handlePrintTask);

    function updateDateTime() {
        const now = new Date();
        datetimeElement.textContent = `TIME: ${now.toLocaleTimeString()} | DATE: ${now.toLocaleDateString()}`;
    }

    function loadReferenceNumber() {
        fetch('reference.json')
            .then(response => response.json())
            .then(data => {
                refNumberElement.textContent = `REF: ${data.reference}`;
            })
            .catch(error => console.error('Error loading reference number:', error));
    }

    function loadLocations() {
        fetch('locations.csv')
            .then(response => response.text())
            .then(data => {
                const locations = data.split('\n').map(row => row.split(',')[0].replace(/"/g, ''));
                const dataList = document.getElementById('locations');
                locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location;
                    dataList.appendChild(option);
                });
            })
            .catch(error => console.error('Error loading locations:', error));
    }

    function handleNewTask() {
        // Logic to handle new task creation
    }

    function handlePrintTask() {
        window.print();
    }
});
