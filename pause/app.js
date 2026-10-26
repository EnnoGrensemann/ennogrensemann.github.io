let time_short = 15; //Kurze Pause in Minuten
let time_long = 30; //Lange Pause in Minuten
let time_set = 15; //Eingestellte Zeit in Minuten
let time_left = 15*60; //Zeit in sekunden

let countdown = null;

const timerElement = document.getElementById('time-left'); //Timer Text
const btnStartStop = document.getElementById('btn-start-stop'); //Start-Stop Button
const textButtonStartStop = document.getElementById('btn-start-stop-text'); //Start-Stop Button Test
const btnReset = document.getElementById('btn-reset'); //Reset Button
const btnShortTime = document.getElementById('btn-short-time'); //Short Time Button
const btnLongTime = document.getElementById('btn-long-time'); //Long Time Button

function updateTextDisplay() {
    let minutes = Math.floor(time_left / 60);
    let seconds = time_left % 60;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    timerElement.textContent = `${minutes}:${seconds}`;
}

function updateButtonDisplay(start) {
    if (start){
        textButtonStartStop.textContent = "Start";
        btnStartStop.style.backgroundColor = 'var(--btn-start-color)';
    } else {
        textButtonStartStop.textContent = "Stopp";
        btnStartStop.style.backgroundColor = 'var(--btn-stop-color)';
    }
}

function startTimer() {
    if (countdown) clearInterval(countdown); 
    countdown = setInterval(function() {
        time_left--;
        updateTextDisplay();
        if (time_left <= 0) {
            clearInterval(countdown);
            countdown = null;
            timerElement.textContent = "Zeit abgelaufen!";
            updateButtonDisplay(true);
        }
    }, 1000);
    updateButtonDisplay(false);
}

function stopTimer() {
    clearInterval(countdown);
    countdown = null;
    updateButtonDisplay(true);
}

//Start-Stop Button
btnStartStop.addEventListener('click', function() {
    if (countdown === null) {
        startTimer();
    } else {
        stopTimer();
    }
});

//Reset Button
btnReset.addEventListener('click', function() {
    stopTimer()
    time_left = time_set * 60;
    updateTextDisplay()
});

//Short-Time Button
btnShortTime.addEventListener('click', function() {
    stopTimer()
    time_set = time_short;
    time_left = time_set * 60;
    updateTextDisplay()
});

//Long-Time Button
btnLongTime.addEventListener('click', function() {
    stopTimer()
    time_set = time_long;
    time_left = time_set * 60;
    updateTextDisplay()
});