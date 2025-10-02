// JavaScript-Datei: script.js (V9 - Wiederhergestellte Logik)

const SPIELE = 6;
const ROWS_OBERER_TEIL = ["einer", "zweier", "dreier", "vierer", "fuenfer", "sechser"];
const ROWS_UNTERER_TEIL = [
    "dreierpasch", "viererpasch", "zwei-paare",
    "drei-paare", "zwei-dreier", "full-house", "grosses-full-house",
    "kleine-strasse", "grosse-strasse", "highway", "kniffel",
    "kniffel-extreme", "zehn-oder-weniger", "dreiunddreissig-oder-mehr",
    "super-chance", "chance"
];

/**
 * Definiert die möglichen Punktwerte für den oberen Teil.
 */
const UPPER_SECTION_OPTIONS = {
    "einer": [1, 2, 3, 4, 5],
    "zweier": [2, 4, 6, 8, 10],
    "dreier": [3, 6, 9, 12, 15],
    "vierer": [4, 8, 12, 16, 20],
    "fuenfer": [5, 10, 15, 20, 25],
    "sechser": [6, 12, 18, 24, 30]
};

/**
 * Definiert die festen Punktwerte für den unteren Teil.
 */
const FIXED_POINTS = {
    "drei-paare": 35,
    "zwei-dreier": 45,
    "full-house": 25,
    "grosses-full-house": 45,
    "kleine-strasse": 30,
    "grosse-strasse": 40,
    "highway": 50,
    "kniffel": 50,
    "kniffel-extreme": 75,
    "zehn-oder-weniger": 40,
    "dreiunddreissig-oder-mehr": 40
};

/**
 * Erstellt das SELECT-Feld für eine Zeile (Oberer Teil).
 */
function createUpperSelect(rowId, colIndex) {
    let html = `<select data-row="${rowId}" data-col="${colIndex}" onchange="calculate(this)">`;
    // 1. LEER (Standardwert: "" mit &nbsp; als Platzhalter)
    html += `<option value="" selected class="empty-option"></option>`; 
    // 2. Punktwerte
    UPPER_SECTION_OPTIONS[rowId].forEach(point => {
        html += `<option value="${point}">${point}</option>`;
    });
    // 3. STREICHEN (Wert 0)
    html += `<option value="0" class="strike-option">-</option>`;
    html += `</select>`;
    return html;
}

/**
 * Erstellt das SELECT-Feld für eine Zeile (Feste Punkte Unterer Teil).
 */
function createFixedPointSelect(rowId, colIndex) {
    const point = FIXED_POINTS[rowId];
    let html = `<select data-row="${rowId}" data-col="${colIndex}" onchange="calculate(this)">`;
    // 1. LEER (Standardwert: "" mit &nbsp; als Platzhalter)
    html += `<option value="" selected class="empty-option"></option>`;
    // 2. Volle Punkte
    html += `<option value="${point}">${point} Punkte</option>`;
    // 3. STREICHEN (Wert 0)
    html += `<option value="0" class="strike-option">-</option>`;
    html += `</select>`;
    return html;
}

/**
 * Füllt die Zellen mit den entsprechenden Eingabemethoden (Select oder Input).
 */
function initializeInputs() {
    // Oberer Teil (Select-Felder)
    ROWS_OBERER_TEIL.forEach(rowId => {
        for (let i = 1; i <= SPIELE; i++) {
            const el = document.getElementById(`${rowId}-${i}`);
            if (el) el.innerHTML = createUpperSelect(rowId, i);
        }
    });

    // Unterer Teil (Feste Punkte - Select-Felder)
    Object.keys(FIXED_POINTS).forEach(rowId => {
        for (let i = 1; i <= SPIELE; i++) {
            const el = document.getElementById(`${rowId}-${i}`);
            // Nur Selects erstellen, wenn es sich nicht um Input-Felder (Pasch/Chance) handelt
            if (el) el.innerHTML = createFixedPointSelect(rowId, i);
        }
    });
}

/**
 * Berechnet die Summen für eine Spalte (ein Spiel) neu.
 */
function calculateColumn(colIndex) {
    let gesamtObererTeil = 0;
    let gesamtUntererTeil = 0;

    // Hilfsfunktion, um den Wert aus Input/Select zu holen (behandelt "" als 0)
    const getNumericValue = (element) => {
        const val = element ? element.value : "";
        return val === "" ? 0 : parseInt(val) || 0;
    };

    // 1. OBERER TEIL
    ROWS_OBERER_TEIL.forEach(rowId => {
        // Wir suchen das SELECT-Element INNERHALB der TD
        const input = document.getElementById(`${rowId}-${colIndex}`)?.querySelector('select');
        gesamtObererTeil += getNumericValue(input);
    });

    document.getElementById(`gesamt-${colIndex}`).textContent = gesamtObererTeil;

    let bonus = 0;
    if (gesamtObererTeil >= 73) {
        bonus = 45;
    }
    document.getElementById(`bonus-${colIndex}`).textContent = bonus;

    const gesamtObererTeilMitBonus = gesamtObererTeil + bonus;
    document.getElementById(`gesamt-oberer-teil-${colIndex}`).textContent = gesamtObererTeilMitBonus;
    document.getElementById(`gesamt-oberer-teil-unten-${colIndex}`).textContent = gesamtObererTeilMitBonus;


    // 2. UNTERER TEIL (Input und Select Felder)
    ROWS_UNTERER_TEIL.forEach(rowId => {
        const element = document.querySelector(`[data-row="${rowId}"][data-col="${colIndex}"]`);
        
        if (element) {
             if (element.tagName === 'SELECT') {
                gesamtUntererTeil += getNumericValue(element);
            } else { // Input[type="number"] (Augenzahl-Zeilen)
                gesamtUntererTeil += parseInt(element.value) || 0;
            }
        }
    });

    document.getElementById(`gesamt-unterer-teil-${colIndex}`).textContent = gesamtUntererTeil;

    // 3. ENDSUMME
    const endsumme = gesamtObererTeilMitBonus + gesamtUntererTeil;
    document.getElementById(`endsumme-${colIndex}`).textContent = endsumme;

    saveData();
}

/**
 * Wird bei jeder Änderung eines Feldes aufgerufen (onchange).
 */
function calculate(element) {
    if (element.type === 'number') {
        let value = element.value.trim();
        if (value !== "") {
            let numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 0) { numValue = 0; }
            const max = parseInt(element.getAttribute('max'));
            if (!isNaN(max) && numValue > max) { numValue = max; }
            element.value = numValue;
        }
    }
    
    const colIndex = parseInt(element.dataset.col);
    calculateColumn(colIndex);
}

/**
 * Speichert alle Spieldaten im Browser (localStorage).
 */
function saveData() {
    const data = {};
    const inputs = document.querySelectorAll('.spielblock input[type="number"], .spielblock select');
    
    inputs.forEach(input => {
        const key = `${input.dataset.row}-${input.dataset.col}`;
        data[key] = input.value; 
    });
    
    localStorage.setItem('kniffelExtremeData', JSON.stringify(data));
}

/**
 * Lädt die gespeicherten Daten aus dem Browser.
 */
function loadData() {
    // 1. Zuerst die Inputs/Selects erstellen, damit sie im DOM existieren
    initializeInputs(); 

    const storedData = localStorage.getItem('kniffelExtremeData');
    if (storedData) {
        const data = JSON.parse(storedData);
        
        for (const key in data) {
            const [row, colStr] = key.split('-');
            const col = parseInt(colStr);

            let element;
            // Unterscheide zwischen Input (Pasch/Chance) und Select (Oberer Teil/Feste Punkte)
            if (['dreierpasch', 'viererpasch', 'zwei-paare', 'super-chance', 'chance'].includes(row)) {
                element = document.querySelector(`[data-row="${row}"][data-col="${col}"][type="number"]`);
            } else {
                element = document.getElementById(`${row}-${col}`)?.querySelector('select');
            }
            
            if (element) {
                element.value = data[key];
            }
        }

        // 3. Alle Spalten neu berechnen, um die Ergebnisse anzuzeigen
        for (let i = 1; i <= SPIELE; i++) {
            calculateColumn(i);
        }
    }
}

/**
 * Setzt den gesamten Spielblock zurück.
 */
function resetBlock() {
    if (!confirm("Sind Sie sicher, dass Sie alle Spielstände zurücksetzen und die gespeicherten Daten löschen möchten?")) {
        return;
    }
    localStorage.removeItem('kniffelExtremeData');
    
    // Einfach die Seite neu laden, um den Block zu initialisieren und leer anzuzeigen
    window.location.reload(); 
}

// Beim Laden der Seite: 1. Inputs erstellen und 2. Daten laden/berechnen.
window.addEventListener('load', loadData);

// Event-Listener für den Reset-Button
document.getElementById('reset-button').addEventListener('click', resetBlock);