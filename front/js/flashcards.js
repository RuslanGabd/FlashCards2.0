let cards = [];
let allCards = [];
let currentIndex = 0;
let isBackSide = false;
let autoplayId = null;
let voicesReadyPromise = null;
let autoSpeakToken = 0;
let elapsedTimerId = null;
let elapsedStartedAt = 0;
let elapsedAccumulatedMs = 0;
let countdownTimerId = null;
let countdownEndsAt = 0;
let countdownRemainingMs = 0;
const pronunciationCache = new Map();
const favoriteTerms = new Set(JSON.parse(localStorage.getItem("words-up-favorite-terms") || "[]"));
let flashSettings = JSON.parse(localStorage.getItem("words-up-flash-settings") || "{}");
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8081" : "";
const PRONUNCIATION_API_URL = `${API_BASE_URL}/api/pronunciation`;

const flashCard = document.getElementById("flash-study-card");
const flashFace = document.getElementById("flash-card-face");
const flashHint = document.getElementById("flash-card-hint");
const flashCounter = document.getElementById("flash-counter");
const emptyState = document.getElementById("flash-empty-state");
const hintButton = document.getElementById("hint-button");
const speakButton = document.getElementById("speak-button");
const favoriteButton = document.getElementById("favorite-button");
const flipButton = document.getElementById("flip-card-button");
const previousButton = document.getElementById("previous-card-button");
const nextButton = document.getElementById("next-card-button");
const playButton = document.getElementById("play-button");
const shuffleButton = document.getElementById("shuffle-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const trackProgressToggle = document.getElementById("track-progress-toggle");
const accentSelect = document.getElementById("accent-select");
const settingsButton = document.getElementById("settings-button");
const optionsDialog = document.getElementById("flash-options-dialog");
const closeOptionsButton = document.getElementById("close-options-button");
const settingsTrackProgress = document.getElementById("settings-track-progress");
const starredOnlyToggle = document.getElementById("starred-only-toggle");
const frontSideSelect = document.getElementById("front-side-select");
const keyboardToggle = document.getElementById("keyboard-toggle");
const keyboardShortcuts = document.getElementById("keyboard-shortcuts");
const ttsToggle = document.getElementById("tts-toggle");
const advancedTtsToggle = document.getElementById("advanced-tts-toggle");
const advancedTtsOptions = document.getElementById("advanced-tts-options");
const englishTtsToggle = document.getElementById("english-tts-toggle");
const russianTtsToggle = document.getElementById("russian-tts-toggle");
const englishSpeedSelect = document.getElementById("english-speed-select");
const russianSpeedSelect = document.getElementById("russian-speed-select");
const restartFlashcardsButton = document.getElementById("restart-flashcards-button");
const privacyButton = document.getElementById("privacy-button");
const elapsedTimeDisplay = document.getElementById("elapsed-time-display");
const elapsedStartButton = document.getElementById("elapsed-start-button");
const elapsedResetButton = document.getElementById("elapsed-reset-button");
const countdownDisplay = document.getElementById("countdown-display");
const countdownMinutes = document.getElementById("countdown-minutes");
const countdownSeconds = document.getElementById("countdown-seconds");
const countdownStartButton = document.getElementById("countdown-start-button");
const countdownResetButton = document.getElementById("countdown-reset-button");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        applySavedSettings();
        const set = await loadStudySet();
        allCards = set.cards;
        cards = getStudyCards();
        document.title = `${set.title} - Flashcards`;

        if (!cards.length) {
            showEmptyState();
            return;
        }

        syncCountdownFromInputs();
        renderElapsedTimer();
        renderCurrentCard();
    } catch (error) {
        console.error("Error loading flashcards:", error);
        showEmptyState("Error loading flashcards");
    }
});

flashCard.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    flipCard();
});

flashCard.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flipCard();
    }
});

hintButton.addEventListener("click", () => {
    const card = cards[currentIndex];
    if (!card) return;
    flashHint.hidden = !flashHint.hidden;
    flashHint.textContent = getHint(isBackSide ? card.term : card.definition);
});

speakButton.addEventListener("click", async () => {
    const card = cards[currentIndex];
    if (!card) return;
    await speakCurrentCardSide(card);
});

favoriteButton.addEventListener("click", () => {
    const term = cards[currentIndex]?.term;
    if (!term) return;

    if (favoriteTerms.has(term)) {
        favoriteTerms.delete(term);
    } else {
        favoriteTerms.add(term);
    }

    localStorage.setItem("words-up-favorite-terms", JSON.stringify([...favoriteTerms]));
    renderFavoriteState();
    if (starredOnlyToggle.checked) {
        applyCardFilter();
    }
});

flipButton.addEventListener("click", flipCard);
previousButton.addEventListener("click", showPreviousCard);
nextButton.addEventListener("click", showNextCard);

playButton.addEventListener("click", () => {
    if (autoplayId) {
        stopAutoplay();
        return;
    }

    playButton.textContent = "Ⅱ";
    autoplayId = setInterval(() => {
        if (!isBackSide) {
            flipCard();
        } else {
            showNextCard();
        }
    }, 1800);
});

shuffleButton.addEventListener("click", () => {
    shuffleCards();
});

fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
});

trackProgressToggle.addEventListener("change", () => {
    settingsTrackProgress.checked = trackProgressToggle.checked;
    saveFlashSettings();
    renderCurrentCard();
});

accentSelect.addEventListener("change", () => {
    saveFlashSettings();
});

settingsButton.addEventListener("click", () => {
    syncSettingsPanel();
    optionsDialog.showModal();
});

closeOptionsButton.addEventListener("click", () => optionsDialog.close());

optionsDialog.addEventListener("click", event => {
    if (event.target === optionsDialog) {
        optionsDialog.close();
    }
});

settingsTrackProgress.addEventListener("change", () => {
    trackProgressToggle.checked = settingsTrackProgress.checked;
    saveFlashSettings();
    renderCurrentCard();
});

starredOnlyToggle.addEventListener("change", () => {
    saveFlashSettings();
    applyCardFilter();
});

frontSideSelect.addEventListener("change", () => {
    setFrontSide(frontSideSelect.value);
});

keyboardToggle.addEventListener("click", () => {
    const shouldShow = keyboardShortcuts.hidden;
    keyboardShortcuts.hidden = !shouldShow;
    keyboardToggle.querySelector("strong").textContent = shouldShow ? "Hide ^" : "View v";
});

ttsToggle.addEventListener("change", saveFlashSettings);
englishTtsToggle.addEventListener("change", saveFlashSettings);
russianTtsToggle.addEventListener("change", saveFlashSettings);
englishSpeedSelect.addEventListener("change", saveFlashSettings);
russianSpeedSelect.addEventListener("change", saveFlashSettings);

advancedTtsToggle.addEventListener("click", () => {
    const shouldShow = advancedTtsOptions.hidden;
    advancedTtsOptions.hidden = !shouldShow;
    advancedTtsToggle.querySelector("strong").textContent = shouldShow ? "Hide ^" : "View v";
});

restartFlashcardsButton.addEventListener("click", () => {
    currentIndex = 0;
    isBackSide = frontSideSelect.value === "definition";
    stopAutoplay();
    renderCurrentCard();
    optionsDialog.close();
    autoSpeakCurrentCard();
});

privacyButton.addEventListener("click", () => {
    showFlashMessage("Privacy policy is not configured yet");
    optionsDialog.close();
});

elapsedStartButton.addEventListener("click", toggleElapsedTimer);
elapsedResetButton.addEventListener("click", resetElapsedTimer);
countdownStartButton.addEventListener("click", toggleCountdownTimer);
countdownResetButton.addEventListener("click", resetCountdownTimer);
countdownMinutes.addEventListener("input", syncCountdownFromInputs);
countdownSeconds.addEventListener("input", syncCountdownFromInputs);

document.addEventListener("keydown", event => {
    if (event.target.matches("input, textarea, select")) return;
    if (event.key === "Escape" && optionsDialog.open) {
        optionsDialog.close();
        return;
    }
    if (event.key === "ArrowRight") showNextCard();
    if (event.key === "ArrowLeft") showPreviousCard();
    if (event.key === " ") {
        event.preventDefault();
        flipCard();
    }
    if (event.key.toLowerCase() === "h") shuffleCards();
    if (event.key.toLowerCase() === "a") speakButton.click();
    if (event.key.toLowerCase() === "p") playButton.click();
    if (event.key.toLowerCase() === "t") setFrontSide("term");
    if (event.key.toLowerCase() === "d") setFrontSide("definition");
    if (event.key.toLowerCase() === "s") favoriteButton.click();
    if (event.key.toLowerCase() === "e") window.location.href = "edit-set.html";
});

function renderCurrentCard() {
    const card = cards[currentIndex];
    if (!card) return;

    flashCard.classList.toggle("is-flipped", isBackSide);
    flashFace.textContent = getCardFace(card);
    flashHint.hidden = true;
    flashHint.textContent = "";
    flashCounter.textContent = `${currentIndex + 1} / ${cards.length}`;
    renderFavoriteState();

    if (trackProgressToggle.checked) {
        localStorage.setItem("words-up-flash-progress", JSON.stringify({ currentIndex, total: cards.length }));
    }
}

function flipCard() {
    if (!cards.length) return;
    isBackSide = !isBackSide;
    renderCurrentCard();
}

function showNextCard() {
    if (!cards.length) return;
    currentIndex = (currentIndex + 1) % cards.length;
    isBackSide = frontSideSelect.value === "definition";
    renderCurrentCard();
    autoSpeakCurrentCard();
}

function showPreviousCard() {
    if (!cards.length) return;
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    isBackSide = frontSideSelect.value === "definition";
    renderCurrentCard();
    autoSpeakCurrentCard();
}

function renderFavoriteState() {
    const term = cards[currentIndex]?.term;
    favoriteButton.classList.toggle("active", favoriteTerms.has(term));
}

function getHint(value) {
    const text = String(value || "").trim();
    if (!text) return "No hint available";
    if (text.length <= 3) return `${text[0] || ""}...`;
    return `${text[0]}${"•".repeat(Math.min(text.length - 2, 8))}${text[text.length - 1]}`;
}

function getCardFace(card) {
    const side = getCurrentSide();
    return side === "definition" ? card.definition : card.term;
}

function getCurrentSide() {
    const frontSide = frontSideSelect.value || "term";
    return isBackSide
            ? (frontSide === "term" ? "definition" : "term")
            : frontSide;
}

function setFrontSide(side) {
    frontSideSelect.value = side;
    isBackSide = side === "definition";
    saveFlashSettings();
    renderCurrentCard();
}

function shuffleCards() {
    cards = shuffleItems(cards);
    currentIndex = 0;
    isBackSide = frontSideSelect.value === "definition";
    renderCurrentCard();
    autoSpeakCurrentCard();
}

function applyCardFilter() {
    cards = getStudyCards();
    currentIndex = 0;
    isBackSide = frontSideSelect.value === "definition";
    stopAutoplay();

    if (!cards.length) {
        flashCard.hidden = true;
        document.querySelector(".flash-controls").hidden = true;
        emptyState.hidden = false;
        emptyState.querySelector("h1").textContent = "No starred cards yet";
        emptyState.querySelector("p").textContent = "Star a few cards, then study them here.";
        return;
    }

    flashCard.hidden = false;
    document.querySelector(".flash-controls").hidden = false;
    emptyState.hidden = true;
    renderCurrentCard();
}

function getStudyCards() {
    if (!starredOnlyToggle?.checked) {
        return [...allCards];
    }

    return allCards.filter(card => favoriteTerms.has(card.term));
}

function canUseTextToSpeech(language) {
    if (!ttsToggle.checked) return false;
    if (language === "ru") return russianTtsToggle.checked;
    return englishTtsToggle.checked;
}

function autoSpeakCurrentCard() {
    if (!ttsToggle.checked || !cards[currentIndex]) {
        return;
    }

    const token = ++autoSpeakToken;
    window.setTimeout(() => {
        if (token !== autoSpeakToken || !cards[currentIndex] || !ttsToggle.checked) {
            return;
        }
        speakCurrentCardSide(cards[currentIndex]);
    }, 120);
}

function applySavedSettings() {
    accentSelect.value = flashSettings.accent || localStorage.getItem("words-up-pronunciation-accent") || "us";
    trackProgressToggle.checked = Boolean(flashSettings.trackProgress);
    settingsTrackProgress.checked = trackProgressToggle.checked;
    starredOnlyToggle.checked = Boolean(flashSettings.starredOnly);
    frontSideSelect.value = flashSettings.frontSide || "term";
    isBackSide = frontSideSelect.value === "definition";
    ttsToggle.checked = flashSettings.ttsEnabled !== false;
    englishTtsToggle.checked = flashSettings.englishTtsEnabled !== false;
    russianTtsToggle.checked = flashSettings.russianTtsEnabled !== false;
    englishSpeedSelect.value = flashSettings.englishSpeed || "0.9";
    russianSpeedSelect.value = flashSettings.russianSpeed || "0.9";
}

function syncSettingsPanel() {
    settingsTrackProgress.checked = trackProgressToggle.checked;
    starredOnlyToggle.checked = Boolean(flashSettings.starredOnly);
    frontSideSelect.value = flashSettings.frontSide || "term";
}

function saveFlashSettings() {
    flashSettings = {
        accent: accentSelect.value,
        trackProgress: trackProgressToggle.checked,
        starredOnly: starredOnlyToggle.checked,
        frontSide: frontSideSelect.value,
        ttsEnabled: ttsToggle.checked,
        englishTtsEnabled: englishTtsToggle.checked,
        russianTtsEnabled: russianTtsToggle.checked,
        englishSpeed: englishSpeedSelect.value,
        russianSpeed: russianSpeedSelect.value
    };
    localStorage.setItem("words-up-flash-settings", JSON.stringify(flashSettings));
    localStorage.setItem("words-up-pronunciation-accent", accentSelect.value);
}

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
    countdownDisplay.textContent = formatTime(countdownRemainingMs || getCountdownInputMs(), false);
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

async function speakCurrentCardSide(card) {
    const side = getCurrentSide();
    const text = String((side === "definition" ? card.definition : card.term) || "").trim();
    if (!text) {
        showFlashMessage("Nothing to pronounce");
        return;
    }

    const isRussianSide = side === "definition";
    if (!canUseTextToSpeech(isRussianSide ? "ru" : "en")) {
        showFlashMessage("Text to speech is turned off");
        return;
    }

    const lang = isRussianSide ? "ru" : "en";
    const accent = isRussianSide ? "" : accentSelect.value;
    const playedForvoAudio = await playForvoPronunciation(text, lang, accent);
    if (playedForvoAudio) {
        return;
    }

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        showFlashMessage("Speech is not supported in this browser");
        return;
    }

    const speechLang = isRussianSide ? "ru-RU" : accentSelect.value === "uk" ? "en-GB" : "en-US";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;
    utterance.rate = Number(isRussianSide ? russianSpeedSelect.value : englishSpeedSelect.value);
    utterance.pitch = 1;

    const voice = await findVoice(speechLang);
    if (voice) {
        utterance.voice = voice;
    }

    utterance.onstart = () => speakButton.classList.add("active");
    utterance.onend = () => speakButton.classList.remove("active");
    utterance.onerror = () => {
        speakButton.classList.remove("active");
        showFlashMessage("Could not play pronunciation");
    };

    speechSynthesis.cancel();
    speechSynthesis.resume();
    speechSynthesis.speak(utterance);
}

async function playForvoPronunciation(word, language, accent) {
    const audioUrl = await getForvoAudioUrl(word, language, accent);
    if (!audioUrl) {
        return false;
    }

    return new Promise(resolve => {
        const audio = new Audio(audioUrl);
        let resolved = false;

        const finish = value => {
            if (resolved) return;
            resolved = true;
            speakButton.classList.remove("active");
            resolve(value);
        };

        speakButton.classList.add("active");
        audio.addEventListener("ended", () => finish(true), { once: true });
        audio.addEventListener("error", () => finish(false), { once: true });

        audio.play()
                .then(() => {
                    window.setTimeout(() => {
                        if (!resolved && audio.ended) {
                            finish(true);
                        }
                    }, 300);
                })
                .catch(() => finish(false));
    });
}

async function getForvoAudioUrl(word, language, accent) {
    const cacheKey = `${language}:${accent || "default"}:${word.toLowerCase()}`;
    if (pronunciationCache.has(cacheKey)) {
        return pronunciationCache.get(cacheKey);
    }

    try {
        const url = new URL(PRONUNCIATION_API_URL);
        url.searchParams.set("word", word);
        url.searchParams.set("language", language);
        if (accent) {
            url.searchParams.set("accent", accent);
        }
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        if (!response.ok) {
            pronunciationCache.set(cacheKey, null);
            return null;
        }
        const data = await response.json();
        const audioUrl = data.audioUrl || null;
        pronunciationCache.set(cacheKey, audioUrl);
        return audioUrl;
    } catch (error) {
        console.warn("Forvo pronunciation failed:", error);
        pronunciationCache.set(cacheKey, null);
        return null;
    }
}

function findVoice(lang) {
    return getVoices().then(voices => {
        const langPrefix = lang.split("-")[0].toLowerCase();
        return voices.find(voice => voice.lang.toLowerCase() === lang.toLowerCase())
            || voices.find(voice => voice.lang.toLowerCase().startsWith(`${langPrefix}-`))
            || null;
    });
}

function getVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
        return Promise.resolve(voices);
    }

    if (voicesReadyPromise) {
        return voicesReadyPromise;
    }

    voicesReadyPromise = new Promise(resolve => {
        const finish = () => resolve(speechSynthesis.getVoices());
        speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
        window.setTimeout(finish, 700);
    });

    return voicesReadyPromise;
}

function showFlashMessage(message) {
    flashHint.hidden = false;
    flashHint.textContent = message;
}

function stopAutoplay() {
    clearInterval(autoplayId);
    autoplayId = null;
    playButton.textContent = "▶";
}

function showEmptyState(message = "No cards yet") {
    flashCard.hidden = true;
    document.querySelector(".flash-controls").hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector("h1").textContent = message;
}
