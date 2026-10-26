let time_short = 15; //Kurze Pause in Minuten
let time_long = 30; //Lange Pause in Minuten
let time_set = 15; //Eingestellte Zeit in Minuten
let time_left = 0; //Zeit in sekunden

let intervall;

const timerElement = document.getElementById('time-left'); //Timer Text
const btnStartStop = document.getElementById('btn-start-stop'); //Start-Stop Button
const textButtonStartStop = document.getElementById('btn-start-stop-text'); //Start-Stop Button Test
const btnReset = document.getElementById('btn-reset'); //Reset Button
const btnShortTime = document.getElementById('btn-short-time'); //Short Time Button
const btnLongTime = document.getElementById('btn-long-time'); //Long Time Button


//Verbleibene Zeit aus dem Cache holen oder auf Standard setzen
window.addEventListener('DOMContentLoaded', () => {
  const savedTime = localStorage.getItem('time_left');
  if (savedTime !== null) {
    time_left = Number(savedTime);
  } else{
    time_left = time_set * 60;
  }
  updateTextDisplay(time_left);
});

//Verbleibende Zeit im Cache speichern
function saveTimeLeft() {
  localStorage.setItem('time_left', time_left);
  //console.log("Save Time " + time_left + "s");
}

//Zeit in Sekunden als Minuten:Sekunden formatieren und in HTML anzeigen
function updateTextDisplay(time) {
    let minutes = Math.floor(time / 60);
    let seconds = time % 60;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    timerElement.textContent = `${minutes}:${seconds}`;
}

//Text im Start/Stopp-Button aktualisieren
function updateButtonDisplay(state) {
    if (state){
        textButtonStartStop.textContent = "Start";
        btnStartStop.style.backgroundColor = 'var(--btn-start-color)';
    } else {
        textButtonStartStop.textContent = "Stopp";
        btnStartStop.style.backgroundColor = 'var(--btn-stop-color)';
    }
}

//Countdown Starten / Fortsetzen
function startTimer() {
    if (!intervall){
        intervall = setInterval(countdownTimer, 1000);
    }
        updateButtonDisplay(false);
}

//Countdown Stoppen / Pausieren
function stoppTimer() {
    clearInterval(intervall);
    intervall = null;
    updateButtonDisplay(true);
}

//Countdown runter zählen und im Cache speichern
function countdownTimer(){
    updateTextDisplay(time_left);
    if (time_left <= 0) {
        clearInterval(intervall);
        intervall = null;
        timerElement.textContent = "Zeit abgelaufen!";
        updateButtonDisplay(true);
    } else {
        time_left--
        updateTextDisplay(time_left);
    }
    saveTimeLeft();
}

//Start-Stop Button
btnStartStop.addEventListener('click', function() {
    if (!intervall) {
        startTimer();
        
    } else {
        stoppTimer();
    }
});

//Reset Button
btnReset.addEventListener('click', function() {
    stoppTimer()
    time_left = time_set * 60;
    saveTimeLeft();
    updateTextDisplay(time_left)
});

//Short-Time Button
btnShortTime.addEventListener('click', function() {
    stoppTimer()
    time_set = time_short;
    time_left = time_set * 60;
    saveTimeLeft();
    updateTextDisplay(time_left)
});

//Long-Time Button
btnLongTime.addEventListener('click', function() {
    stoppTimer()
    time_set = time_long;
    time_left = time_set * 60;
    saveTimeLeft();
    updateTextDisplay(time_left)
});