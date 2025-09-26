let questions = []; // Array ist jetzt leer und wird später mit JSON-Daten befüllt
let usedQuestions = [];
let currentQuestionIndex = -1;

const questionBox = document.getElementById('questionBox');
const answerBox = document.getElementById('answerBox');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const progressInfo = document.getElementById('progressInfo');

// Funktion zum Laden der Fragen aus der data.json
async function loadQuestions() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }
        questions = await response.json();
        
        // Initialen Status setzen
        if (questions.length > 0) {
            questionBox.innerHTML = 'Klicken Sie auf "Neue Zufallsfrage" um zu beginnen!';
            answerBox.innerHTML = 'Die Antwort wird direkt hier erscheinen.'; // Initialer Text
            answerBox.style.display = 'block'; // Sicherstellen, dass die Box sichtbar ist
            nextQuestionBtn.disabled = false;
            progressInfo.textContent = 'Bereit! Es gibt ' + questions.length + ' Fragen.';
        } else {
            questionBox.innerHTML = 'Fehler: Keine Fragen in data.json gefunden.';
            progressInfo.textContent = 'Ladefehler.';
        }
        updateCounters();

    } catch (error) {
        console.error('Fehler beim Laden der Fragen:', error);
        questionBox.innerHTML = '<strong>Ladefehler!</strong><br>Konnte Fragen nicht laden. Stelle sicher, dass "data.json" existiert und korrekt ist.';
        progressInfo.textContent = 'Fehler beim Laden der Daten.';
    }
}

function showRandomQuestion() {
    // Antwort-Box muss nicht mehr versteckt werden, aber der Inhalt wird geleert
    answerBox.innerHTML = '...'; 
    
    // Prüfen ob noch Fragen verfügbar sind
    if (usedQuestions.length >= questions.length) {
        questionBox.innerHTML = 
            '<strong>Glückwunsch!</strong><br>Sie haben alle Fragen durchgespielt! Klicken Sie auf "Fragen zurücksetzen" um von vorne zu beginnen.';
        answerBox.innerHTML = '';
        nextQuestionBtn.disabled = true;
        progressInfo.textContent = 'Alle Fragen wurden angezeigt!';
        updateCounters();
        return;
    }
    
    // Verfügbare Fragen finden (noch nicht verwendete)
    const availableQuestions = questions.filter((_, index) => !usedQuestions.includes(index));
    
    // Zufällige Frage aus verfügbaren auswählen
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestionIndex = questions.indexOf(availableQuestions[randomIndex]);
    
    // Frage als verwendet markieren
    usedQuestions.push(currentQuestionIndex);
    
    // FRAGE UND ANTWORT DIREKT ANZEIGEN (Anpassung hier)
    const currentQ = questions[currentQuestionIndex];

    questionBox.innerHTML = 
        `<strong>Frage ${usedQuestions.length} von ${questions.length}:</strong><br>${currentQ.question}`;
    
    answerBox.innerHTML = 
        `<strong>Antwort:</strong><br>${currentQ.answer}`; // Antwort wird sofort gesetzt
    
    // Buttons und Info aktualisieren
    nextQuestionBtn.disabled = usedQuestions.length >= questions.length;
    progressInfo.textContent = `Frage ${usedQuestions.length} von ${questions.length}`;
    updateCounters();
}

function resetUsedQuestions() {
    usedQuestions = [];
    currentQuestionIndex = -1;
    questionBox.innerHTML = 
        'Klicken Sie auf "Neue Zufallsfrage" um zu beginnen!';
    answerBox.innerHTML = 'Die Antwort wird direkt hier erscheinen.';
    nextQuestionBtn.disabled = false;
    progressInfo.textContent = 'Fragen zurückgesetzt - bereit für neue Runde!';
    updateCounters();
}

function updateCounters() {
    document.getElementById('totalCount').textContent = questions.length;
    document.getElementById('usedCount').textContent = usedQuestions.length;
    document.getElementById('availableCount').textContent = questions.length - usedQuestions.length;
}

// Initialisierung: Fragen beim Start der Seite laden
loadQuestions();