(() => {
    window.createStudyTimers = (showFlashMessage) => {
let elapsedTimerId = null;
let elapsedStartedAt = 0;
let elapsedAccumulatedMs = 0;
let countdownTimerId = null;
let countdownEndsAt = 0;
let countdownRemainingMs = 0;
const elapsedTimeDisplay = document.getElementById("elapsed-time-display");
const elapsedStartButton = document.getElementById("elapsed-start-button");
const elapsedResetButton = document.getElementById("elapsed-reset-button");
const countdownDisplay = document.getElementById("countdown-display");
const countdownMinutes = document.getElementById("countdown-minutes");
const countdownSeconds = document.getElementById("countdown-seconds");
const countdownStartButton = document.getElementById("countdown-start-button");
const countdownResetButton = document.getElementById("countdown-reset-button");

elapsedStartButton.addEventListener("click", toggleElapsedTimer);
elapsedResetButton.addEventListener("click", resetElapsedTimer);
countdownStartButton.addEventListener("click", toggleCountdownTimer);
countdownResetButton.addEventListener("click", resetCountdownTimer);
countdownMinutes.addEventListener("input", syncCountdownFromInputs);
countdownSeconds.addEventListener("input", syncCountdownFromInputs);
function toggleElapsedTimer() {
    if (elapsedTimerId) {
        elapsedAccumulatedMs += Date.now() - elapsedStartedAt;
        clearInterval(elapsedTimerId);
        elapsedTimerId = null;
        elapsedStartButton.textContent = "Start";
        renderElapsedTimer();
        return;
    }

    elapsedStartedAt = Date.now();
    elapsedTimerId = setInterval(renderElapsedTimer, 250);
    elapsedStartButton.textContent = "Pause";
    renderElapsedTimer();
}

function resetElapsedTimer() {
    clearInterval(elapsedTimerId);
    elapsedTimerId = null;
    elapsedStartedAt = 0;
    elapsedAccumulatedMs = 0;
    elapsedStartButton.textContent = "Start";
    renderElapsedTimer();
}

function renderElapsedTimer() {
    const runningMs = elapsedTimerId ? Date.now() - elapsedStartedAt : 0;
    elapsedTimeDisplay.textContent = formatTime(elapsedAccumulatedMs + runningMs, true);
}

function toggleCountdownTimer() {
    if (countdownTimerId) {
        countdownRemainingMs = Math.max(0, countdownEndsAt - Date.now());
        clearInterval(countdownTimerId);
        countdownTimerId = null;
        countdownStartButton.textContent = "Start";
        renderCountdownTimer();
        return;
    }

    const durationMs = countdownRemainingMs || getCountdownInputMs();
    if (durationMs <= 0) {
        showFlashMessage("Set countdown time first");
        return;
    }

    countdownRemainingMs = durationMs;
    countdownEndsAt = Date.now() + countdownRemainingMs;
    countdownTimerId = setInterval(tickCountdownTimer, 250);
    countdownStartButton.textContent = "Pause";
    tickCountdownTimer();
}

function resetCountdownTimer() {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
    countdownRemainingMs = getCountdownInputMs();
    countdownStartButton.textContent = "Start";
    renderCountdownTimer();
}

function tickCountdownTimer() {
    countdownRemainingMs = Math.max(0, countdownEndsAt - Date.now());
    renderCountdownTimer();

    if (countdownRemainingMs > 0) return;
    clearInterval(countdownTimerId);
    countdownTimerId = null;
    countdownStartButton.textContent = "Start";
    playCountdownDoneSound();
}

function syncCountdownFromInputs() {
    if (countdownTimerId) return;
    countdownRemainingMs = getCountdownInputMs();
    renderCountdownTimer();
}

function renderCountdownTimer() {
    countdownDisplay.textContent = formatTime(countdownRemainingMs, false);
}

function getCountdownInputMs() {
    const minutes = clampNumber(Number(countdownMinutes.value), 0, 999);
    const seconds = clampNumber(Number(countdownSeconds.value), 0, 59);
    return ((minutes * 60) + seconds) * 1000;
}

function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.floor(value)));
}

function formatTime(milliseconds, withHours) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = withHours ? [hours, minutes, seconds] : [minutes + hours * 60, seconds];
    return parts.map(value => String(value).padStart(2, "0")).join(":");
}

function playCountdownDoneSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.48);
        oscillator.addEventListener("ended", () => context.close());
    } catch (error) {
        console.warn("Countdown sound failed:", error);
    }
}


    window.addEventListener('pagehide', () => { clearInterval(elapsedTimerId); clearInterval(countdownTimerId); });
    return {initialize: () => { syncCountdownFromInputs(); renderElapsedTimer(); }};
    };
})();
