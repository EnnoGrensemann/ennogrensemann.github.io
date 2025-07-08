// Daten aus einer externen JSON-Datei laden (oder hier direkt einfügen, wenn klein)
let jsonData = []; // Initialisiere mit einem leeren Array

// Check for system dark mode preference early to prevent flicker
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark-mode');
}

function updateResultCount(count) {
    const resultCountElement = document.getElementById('resultCount');
    if (count === 0) {
        resultCountElement.textContent = 'Keine Ergebnisse gefunden.';
    } else if (count === 1) {
        resultCountElement.textContent = '1 Ergebnis gefunden.';
    } else {
        resultCountElement.textContent = `${count} Ergebnisse gefunden.`;
    }
}

async function loadJSON() {
    const dataContainer = document.getElementById('dataContainer');
    dataContainer.innerHTML = ''; // Container leeren

    try {
        // Lade die JSON-Daten von der 'data.json' Datei
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }
        jsonData = await response.json(); // Weise die geladenen Daten dem globalen jsonData zu

        if (jsonData.length === 0) {
            const noDataDiv = document.createElement('div');
            noDataDiv.className = 'no-data';
            noDataDiv.textContent = 'Keine Daten verfügbar.';
            dataContainer.appendChild(noDataDiv);
            updateResultCount(0);
            return;
        }

        jsonData.forEach(person => {
            const dataItem = document.createElement('div');
            dataItem.className = 'data-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = person.Name;
            dataItem.appendChild(nameSpan);

            const numberSpan = document.createElement('span');
            numberSpan.className = 'number';
            numberSpan.textContent = person.Nummer;
            dataItem.appendChild(numberSpan);

            dataContainer.appendChild(dataItem);
        });
        updateResultCount(jsonData.length); // Gesamtzahl beim Laden
    } catch (error) {
        console.error('Fehler beim Laden der JSON-Daten:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-data';
        errorDiv.textContent = 'Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.';
        dataContainer.appendChild(errorDiv);
        updateResultCount(0);
    }
}

function searchData() {
    const input = document.getElementById('searchBar').value.toLowerCase();
    const dataItems = document.querySelectorAll('.data-item');
    let visibleCount = 0;
    const dataContainer = document.getElementById('dataContainer');
    let noDataDiv = dataContainer.querySelector('.no-data');

    // Hide or remove existing "no data" message before iterating
    if (noDataDiv) {
        noDataDiv.style.display = 'none';
    }

    dataItems.forEach(item => {
        const name = item.querySelector('.name').textContent.toLowerCase();
        const number = item.querySelector('.number').textContent.toLowerCase();

        if (name.includes(input) || number.includes(input)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    if (visibleCount === 0) {
        if (!noDataDiv) { // Only create if it doesn't exist
            noDataDiv = document.createElement('div');
            noDataDiv.className = 'no-data';
            dataContainer.appendChild(noDataDiv);
        }
        noDataDiv.style.display = ''; // Show it
        noDataDiv.textContent = 'Keine Ergebnisse gefunden.'; // Update text
    } else {
        if (noDataDiv) {
            noDataDiv.style.display = 'none'; // Hide it if data is found
        }
    }
    updateResultCount(visibleCount); // Ergebnisanzahl aktualisieren
}

window.onload = loadJSON;

// Listen for changes in system color scheme preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }
});