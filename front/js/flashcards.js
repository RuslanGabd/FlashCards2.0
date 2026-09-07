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
let pronunciationPlaybackToken = 0;
let activePronunciationAudio = null;
let activePronunciationCancel = null;
let studySetLanguage = "en";
const favoriteTerms = new Set(JSON.parse(localStorage.getItem("words-up-favorite-terms") || "[]"));
let flashSettings = JSON.parse(localStorage.getItem("words-up-flash-settings") || "{}");
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8085" : "";
const PRONUNCIATION_API_URL = `${API_BASE_URL}/api/pronunciation`;
const DICTIONARY_LOOKUP_URL = `${API_BASE_URL}/api/dictionary/lookup`;
const LEADING_ENGLISH_PREPOSITION = /^(?:aboard|about|above|across|after|against|along|alongside|amid|amidst|among|amongst|around|as|at|before|behind|below|beneath|beside|between|beyond|by|concerning|considering|despite|down|during|except|excluding|following|for|from|in|including|inside|into|like|minus|near|notwithstanding|of|off|on|onto|opposite|out|outside|over|past|per|plus|regarding|round|save|since|than|through|throughout|till|to|toward|towards|under|underneath|unlike|until|up|upon|versus|via|with|within|without|worth)\s+/i;
const ANNOTATION_LOCAL_PREFIX = "words-up-card-annotation:";
const transcriptionCache = new Map();
let transcriptionRequestToken = 0;
const annotationCache = new Map();
const annotationSaveTimers = new Map();
let annotationStrokes = [];
let currentAnnotationStroke = null;
let activeAnnotationTool = null;
let annotationLoadToken = 0;
let annotationLayerVisible = localStorage.getItem("words-up-annotation-layer-visible") !== "false";

const flashCard = document.getElementById("flash-study-card");
const flashFace = document.getElementById("flash-card-face");
const flashTranscription = document.getElementById("flash-card-transcription");
const flashHint = document.getElementById("flash-card-hint");
const flashExampleSentence = document.getElementById("flash-example-sentence");
const annotationCanvas = document.getElementById("flash-annotation-canvas");
const annotationContext = annotationCanvas.getContext("2d");
const annotationLayerToggle = document.getElementById("annotation-layer-toggle");
const annotationToolButtons = document.querySelectorAll("[data-annotation-tool]");
const annotationDoneButton = document.getElementById("annotation-done-button");
const annotationClearButton = document.getElementById("annotation-clear-button");
const annotationSaveStatus = document.getElementById("annotation-save-status");
const flashCounter = document.getElementById("flash-counter");
const emptyState = document.getElementById("flash-empty-state");
const hintButton = document.getElementById("hint-button");
const transcriptionButton = document.getElementById("transcription-button");
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
        document.getElementById("typing-mode-link").href = `typing.html${window.location.search}`;
        applySavedSettings();
        initializeAnnotationTools();
        const set = await loadStudySet();
        studySetLanguage = set.language === "fr" ? "fr" : "en";
        configureStudyLanguage();
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
    if (event.target.closest("button") || event.target === annotationCanvas) return;
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

transcriptionButton.addEventListener("click", toggleCurrentCardTranscription);

speakButton.addEventListener("click", async () => {
    const card = cards[currentIndex];
    if (!card) return;
    await speakCurrentCardSide(card, true);
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
previousButton.addEventListener("click", () => showPreviousCard());
nextButton.addEventListener("click", () => showNextCard());

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
            showNextCard(true);
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
    if (event.key.toLowerCase() === "q") speakButton.click();
    if (event.key.toLowerCase() === "w") transcriptionButton.click();
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
    hideTranscription();
    flashExampleSentence.textContent = card.exampleSentence || "";
    flashExampleSentence.hidden = !card.exampleSentence;
    flashCounter.textContent = `${currentIndex + 1} / ${cards.length}`;
    renderFavoriteState();
    loadAnnotationForCurrentCard();

    if (trackProgressToggle.checked) {
        localStorage.setItem("words-up-flash-progress", JSON.stringify({ currentIndex, total: cards.length }));
    }
}

function flipCard() {
    if (!cards.length) return;
    isBackSide = !isBackSide;
    renderCurrentCard();
}

function showNextCard(resetToConfiguredFront = false) {
    if (!cards.length) return;
    currentIndex = (currentIndex + 1) % cards.length;
    if (resetToConfiguredFront) {
        isBackSide = frontSideSelect.value === "definition";
    }
    renderCurrentCard();
    autoSpeakCurrentCard();
}

function showPreviousCard() {
    if (!cards.length) return;
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    renderCurrentCard();
    autoSpeakCurrentCard();
}

function renderFavoriteState() {
    const term = cards[currentIndex]?.term;
    favoriteButton.classList.toggle("active", favoriteTerms.has(term));
}

async function toggleCurrentCardTranscription() {
    if (!flashTranscription.hidden) {
        hideTranscription();
        return;
    }

    const card = cards[currentIndex];
    const term = String(card?.term || "").trim();
    if (!term) return;

    const authToken = localStorage.getItem("token") || "";
    if (!authToken) {
        showTranscriptionMessage("Log in to view transcription");
        return;
    }

    const cacheKey = `${studySetLanguage}:${term.toLocaleLowerCase(studySetLanguage === "fr" ? "fr-FR" : "en-US")}`;
    if (transcriptionCache.has(cacheKey)) {
        renderTranscription(transcriptionCache.get(cacheKey));
        return;
    }

    const requestToken = ++transcriptionRequestToken;
    transcriptionButton.disabled = true;
    showTranscriptionMessage("Loading transcription...");

    try {
        let transcription = await requestTranscription(term, authToken);
        const baseWord = studySetLanguage === "en"
                ? term.replace(LEADING_ENGLISH_PREPOSITION, "").trim()
                : term;
        if (!transcription && baseWord !== term) {
            transcription = await requestTranscription(baseWord, authToken);
        }
        transcriptionCache.set(cacheKey, transcription);
        if (requestToken !== transcriptionRequestToken || cards[currentIndex] !== card) return;
        renderTranscription(transcription);
    } catch (error) {
        console.warn("Transcription lookup failed:", error);
        if (requestToken === transcriptionRequestToken) {
            showTranscriptionMessage("Transcription is unavailable");
        }
    } finally {
        if (requestToken === transcriptionRequestToken) {
            transcriptionButton.disabled = false;
        }
    }
}

async function requestTranscription(term, authToken) {
    const response = await fetch(DICTIONARY_LOOKUP_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ words: [term], lang: `${studySetLanguage}-ru` }),
    });
    if (!response.ok) throw new Error("Dictionary lookup failed");
    const data = await response.json();
    return String(data.items?.[0]?.transcription || "").trim();
}

function renderTranscription(value) {
    const transcription = String(value || "").replace(/^[/\[]+|[/\]]+$/g, "").trim();
    showTranscriptionMessage(transcription ? `/${transcription}/` : "No transcription found");
}

function showTranscriptionMessage(message) {
    flashTranscription.textContent = message;
    flashTranscription.hidden = false;
    transcriptionButton.classList.add("active");
    transcriptionButton.setAttribute("aria-pressed", "true");
}

function hideTranscription() {
    transcriptionRequestToken += 1;
    flashTranscription.hidden = true;
    flashTranscription.textContent = "";
    transcriptionButton.disabled = false;
    transcriptionButton.classList.remove("active");
    transcriptionButton.setAttribute("aria-pressed", "false");
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

function configureStudyLanguage() {
    const isFrench = studySetLanguage === "fr";
    const sourceName = isFrench ? "French" : "English";
    const accentLabel = accentSelect.closest("label");
    if (accentLabel) accentLabel.hidden = isFrench;
    frontSideSelect.querySelector('option[value="term"]').textContent = sourceName;

    const sourceTtsHeading = englishTtsToggle.closest(".option-row")?.querySelector("h2");
    const sourceSpeedHeading = englishSpeedSelect.closest(".option-row")?.querySelector("h2");
    if (sourceTtsHeading) sourceTtsHeading.textContent = `${sourceName} text to speech`;
    if (sourceSpeedHeading) sourceSpeedHeading.textContent = `${sourceName} text to speech speed`;
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
        speakCurrentCardSide(cards[currentIndex], false);
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

async function speakCurrentCardSide(card, manualPlayback = false) {
    const playbackToken = ++pronunciationPlaybackToken;
    stopActivePronunciation();

    const side = getCurrentSide();
    const text = String((side === "definition" ? card.definition : card.term) || "").trim();
    if (!text) {
        showFlashMessage("Nothing to pronounce");
        return;
    }

    const isRussianSide = side === "definition";
    if (!manualPlayback && !canUseTextToSpeech(isRussianSide ? "ru" : studySetLanguage)) {
        return;
    }

    const lang = isRussianSide ? "ru" : studySetLanguage;
    const accent = !isRussianSide && studySetLanguage === "en" ? accentSelect.value : "";
    const playedForvoAudio = await playForvoPronunciation(text, lang, accent, playbackToken);
    if (playedForvoAudio) {
        return;
    }

    if (playbackToken !== pronunciationPlaybackToken) {
        return;
    }

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        showFlashMessage("Speech is not supported in this browser");
        return;
    }

    const speechLang = isRussianSide
            ? "ru-RU"
            : studySetLanguage === "fr"
                ? "fr-FR"
                : accentSelect.value === "uk" ? "en-GB" : "en-US";
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

    speechSynthesis.resume();
    await waitForPronunciationStart(90);
    if (playbackToken !== pronunciationPlaybackToken) {
        return;
    }
    speechSynthesis.speak(utterance);
}

async function playForvoPronunciation(word, language, accent, playbackToken) {
    const audioUrl = await getForvoAudioUrl(word, language, accent);
    if (!audioUrl || playbackToken !== pronunciationPlaybackToken) {
        return false;
    }

    return new Promise(resolve => {
        const audio = new Audio(audioUrl);
        activePronunciationAudio = audio;
        audio.preload = "auto";
        let resolved = false;
        let started = false;

        const finish = value => {
            if (resolved) return;
            resolved = true;
            if (activePronunciationAudio === audio) {
                activePronunciationAudio = null;
                activePronunciationCancel = null;
            }
            speakButton.classList.remove("active");
            resolve(value);
        };

        const start = async () => {
            if (started || resolved) return;
            started = true;
            if (playbackToken !== pronunciationPlaybackToken) {
                finish(false);
                return;
            }

            audio.currentTime = 0;
            await waitForPronunciationStart(70);
            if (playbackToken !== pronunciationPlaybackToken) {
                finish(false);
                return;
            }

            audio.play()
                    .then(() => {
                        window.setTimeout(() => {
                            if (!resolved && audio.ended) {
                                finish(true);
                            }
                        }, 300);
                    })
                    .catch(() => finish(false));
        };

        speakButton.classList.add("active");
        activePronunciationCancel = () => finish(false);
        audio.addEventListener("ended", () => finish(true), { once: true });
        audio.addEventListener("error", () => finish(false), { once: true });
        audio.addEventListener("canplaythrough", start, { once: true });
        audio.addEventListener("loadeddata", start, { once: true });
        window.setTimeout(start, 1200);
        audio.load();
    });
}

function stopActivePronunciation() {
    const cancelPlayback = activePronunciationCancel;
    if (activePronunciationAudio) {
        activePronunciationAudio.pause();
        activePronunciationAudio.currentTime = 0;
        activePronunciationAudio = null;
    }
    activePronunciationCancel = null;
    cancelPlayback?.();
    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
    speakButton.classList.remove("active");
}

function waitForPronunciationStart(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

async function getForvoAudioUrl(word, language, accent) {
    try {
        const url = new URL(PRONUNCIATION_API_URL, window.location.origin);
        url.searchParams.set("word", word);
        url.searchParams.set("language", language);
        if (accent) {
            url.searchParams.set("accent", accent);
        }
        const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.audioUrl || null;
    } catch (error) {
        console.warn("Forvo pronunciation failed:", error);
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

function initializeAnnotationTools() {
    updateAnnotationLayerState();
    resizeAnnotationCanvas();

    new ResizeObserver(() => resizeAnnotationCanvas()).observe(flashCard);

    annotationLayerToggle.addEventListener("click", () => {
        annotationLayerVisible = !annotationLayerVisible;
        localStorage.setItem("words-up-annotation-layer-visible", String(annotationLayerVisible));
        if (!annotationLayerVisible) setActiveAnnotationTool(null);
        updateAnnotationLayerState();
    });

    annotationToolButtons.forEach(button => {
        button.addEventListener("click", () => {
            if (!annotationLayerVisible) {
                annotationLayerVisible = true;
                localStorage.setItem("words-up-annotation-layer-visible", "true");
                updateAnnotationLayerState();
            }
            setActiveAnnotationTool(button.dataset.annotationTool);
        });
    });

    annotationDoneButton.addEventListener("click", () => setActiveAnnotationTool(null));
    annotationClearButton.addEventListener("click", () => {
        if (!annotationStrokes.length || !window.confirm("Clear all notes on this card?")) return;
        annotationStrokes = [];
        redrawAnnotations();
        cacheAndScheduleAnnotationSave();
    });

    annotationCanvas.addEventListener("pointerdown", startAnnotationStroke);
    annotationCanvas.addEventListener("pointermove", continueAnnotationStroke);
    annotationCanvas.addEventListener("pointerup", finishAnnotationStroke);
    annotationCanvas.addEventListener("pointercancel", finishAnnotationStroke);
}

function updateAnnotationLayerState() {
    annotationCanvas.classList.toggle("is-hidden", !annotationLayerVisible);
    annotationLayerToggle.setAttribute("aria-pressed", String(annotationLayerVisible));
    annotationLayerToggle.textContent = annotationLayerVisible ? "Hide notes" : "Show notes";
}

function setActiveAnnotationTool(tool) {
    activeAnnotationTool = tool;
    annotationCanvas.classList.toggle("is-drawing", Boolean(tool) && annotationLayerVisible);
    annotationToolButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.annotationTool === tool);
    });
    annotationDoneButton.hidden = !tool;
}

function startAnnotationStroke(event) {
    if (!activeAnnotationTool || !annotationLayerVisible) return;
    event.preventDefault();
    event.stopPropagation();
    annotationCanvas.setPointerCapture(event.pointerId);
    currentAnnotationStroke = createAnnotationStroke(activeAnnotationTool, getAnnotationPoint(event));
    annotationStrokes.push(currentAnnotationStroke);
    redrawAnnotations();
}

function continueAnnotationStroke(event) {
    if (!currentAnnotationStroke || !annotationCanvas.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    currentAnnotationStroke.points.push(getAnnotationPoint(event));
    redrawAnnotations();
}

function finishAnnotationStroke(event) {
    if (!currentAnnotationStroke) return;
    event.preventDefault();
    if (annotationCanvas.hasPointerCapture(event.pointerId)) {
        annotationCanvas.releasePointerCapture(event.pointerId);
    }
    currentAnnotationStroke = null;
    cacheAndScheduleAnnotationSave();
}

function createAnnotationStroke(tool, point) {
    const styles = {
        pencil: { color: "#5b7cff", opacity: 1, width: 0.008 },
        marker: { color: "#ffe100", opacity: 0.34, width: 0.045 },
        eraser: { color: "#000000", opacity: 1, width: 0.055 },
    };
    return { tool, ...styles[tool], points: [point] };
}

function getAnnotationPoint(event) {
    const bounds = annotationCanvas.getBoundingClientRect();
    return {
        x: clampAnnotationCoordinate((event.clientX - bounds.left) / Math.max(bounds.width, 1)),
        y: clampAnnotationCoordinate((event.clientY - bounds.top) / Math.max(bounds.height, 1)),
    };
}

function clampAnnotationCoordinate(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function resizeAnnotationCanvas() {
    const bounds = flashCard.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    annotationCanvas.width = Math.round(bounds.width * pixelRatio);
    annotationCanvas.height = Math.round(bounds.height * pixelRatio);
    annotationContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    redrawAnnotations();
}

function redrawAnnotations() {
    const bounds = annotationCanvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    annotationContext.clearRect(0, 0, bounds.width, bounds.height);
    annotationStrokes.forEach(stroke => drawAnnotationStroke(stroke, bounds));
    annotationContext.globalCompositeOperation = "source-over";
    annotationContext.globalAlpha = 1;
}

function drawAnnotationStroke(stroke, bounds) {
    if (!stroke.points?.length) return;
    annotationContext.save();
    annotationContext.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    annotationContext.globalAlpha = stroke.opacity ?? 1;
    annotationContext.strokeStyle = stroke.color || "#5b7cff";
    annotationContext.fillStyle = stroke.color || "#5b7cff";
    annotationContext.lineWidth = Math.max(2, (stroke.width || 0.008) * Math.min(bounds.width, bounds.height));
    annotationContext.lineCap = "round";
    annotationContext.lineJoin = "round";
    annotationContext.beginPath();
    const first = stroke.points[0];
    annotationContext.moveTo(first.x * bounds.width, first.y * bounds.height);
    stroke.points.slice(1).forEach(point => {
        annotationContext.lineTo(point.x * bounds.width, point.y * bounds.height);
    });
    if (stroke.points.length === 1) {
        annotationContext.arc(first.x * bounds.width, first.y * bounds.height,
                annotationContext.lineWidth / 2, 0, Math.PI * 2);
        annotationContext.fill();
    } else {
        annotationContext.stroke();
    }
    annotationContext.restore();
}

async function loadAnnotationForCurrentCard() {
    const card = cards[currentIndex];
    if (!card) return;
    const key = getAnnotationKey(card);
    const token = ++annotationLoadToken;
    setActiveAnnotationTool(null);
    annotationSaveStatus.textContent = "";

    if (annotationCache.has(key)) {
        annotationStrokes = cloneAnnotationStrokes(annotationCache.get(key));
        redrawAnnotations();
        return;
    }

    let strokes = [];
    const authToken = localStorage.getItem("token") || "";
    if (card.id && authToken) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/annotations/card/${encodeURIComponent(card.id)}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                strokes = parseAnnotationData(data.drawingData);
            } else {
                strokes = loadLocalAnnotation(card);
            }
        } catch (error) {
            console.warn("Annotation load failed, using local copy:", error);
            strokes = loadLocalAnnotation(card);
        }
    } else {
        strokes = loadLocalAnnotation(card);
    }

    annotationCache.set(key, strokes);
    if (token !== annotationLoadToken || getAnnotationKey(cards[currentIndex]) !== key) return;
    annotationStrokes = cloneAnnotationStrokes(strokes);
    redrawAnnotations();
}

function cacheAndScheduleAnnotationSave() {
    const card = cards[currentIndex];
    if (!card) return;
    const key = getAnnotationKey(card);
    const snapshot = cloneAnnotationStrokes(annotationStrokes);
    annotationCache.set(key, snapshot);
    annotationSaveStatus.textContent = "Saving...";
    window.clearTimeout(annotationSaveTimers.get(key));
    annotationSaveTimers.set(key, window.setTimeout(() => saveAnnotation(card, key, snapshot), 500));
}

async function saveAnnotation(card, key, strokes) {
    const drawingData = JSON.stringify(strokes);
    const authToken = localStorage.getItem("token") || "";
    let savedInDatabase = false;

    if (card.id && authToken) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/annotations/card/${encodeURIComponent(card.id)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ drawingData }),
            });
            savedInDatabase = response.ok;
        } catch (error) {
            console.warn("Annotation save failed, keeping a local copy:", error);
        }
    }

    if (!savedInDatabase) {
        localStorage.setItem(getAnnotationLocalStorageKey(card), drawingData);
    }
    annotationSaveTimers.delete(key);
    if (cards[currentIndex] && getAnnotationKey(cards[currentIndex]) === key) {
        annotationSaveStatus.textContent = savedInDatabase ? "Saved" : "Saved on this device";
    }
}

function loadLocalAnnotation(card) {
    const primaryKey = getAnnotationLocalStorageKey(card);
    let drawingData = localStorage.getItem(primaryKey);
    if (drawingData === null && card?.legacyAnnotationKey) {
        const legacyKey = getAnnotationLocalStorageKey(card, card.legacyAnnotationKey);
        drawingData = localStorage.getItem(legacyKey);
        if (drawingData !== null) {
            localStorage.setItem(primaryKey, drawingData);
            localStorage.removeItem(legacyKey);
        }
    }
    return parseAnnotationData(drawingData || "[]");
}

function getAnnotationKey(card) {
    return card?.annotationKey || (card?.id ? `remote-${card.id}` : `local-${currentIndex}`);
}

function getAnnotationLocalStorageKey(card, annotationKey = getAnnotationKey(card)) {
    const setKey = new URLSearchParams(window.location.search).get("setId")
            || new URLSearchParams(window.location.search).get("localSetId")
            || "draft";
    return `${ANNOTATION_LOCAL_PREFIX}${setKey}:${annotationKey}`;
}

function parseAnnotationData(value) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(-1_000).map(stroke => ({
            tool: ["pencil", "marker", "eraser"].includes(stroke?.tool) ? stroke.tool : "pencil",
            color: String(stroke?.color || "#5b7cff").slice(0, 30),
            opacity: Math.max(0, Math.min(1, Number(stroke?.opacity) || 1)),
            width: Math.max(0.002, Math.min(0.1, Number(stroke?.width) || 0.008)),
            points: (Array.isArray(stroke?.points) ? stroke.points : []).slice(-10_000).map(point => ({
                x: clampAnnotationCoordinate(point?.x),
                y: clampAnnotationCoordinate(point?.y),
            })),
        })).filter(stroke => stroke.points.length);
    } catch {
        return [];
    }
}

function cloneAnnotationStrokes(strokes) {
    return strokes.map(stroke => ({
        ...stroke,
        points: stroke.points.map(point => ({ ...point })),
    }));
}
