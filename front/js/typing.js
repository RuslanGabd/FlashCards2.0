let typingCards = [];
let typingAllCards = [];
let typingCurrentIndex = 0;
let typingCorrectCount = 0;
let typingAnswerAccepted = false;
let typingIncorrectCards = [];

const typingTitle = document.getElementById("typing-title");
const typingProgress = document.getElementById("typing-progress");
const typingQuestion = document.getElementById("typing-question");
const typingExampleSentence = document.getElementById("typing-example-sentence");
const typingForm = document.getElementById("typing-answer-form");
const typingInput = document.getElementById("typing-answer-input");
const typingFeedback = document.getElementById("typing-feedback");
const typingCheckButton = document.getElementById("typing-check-button");
const typingRevealButton = document.getElementById("typing-reveal-button");
const typingNextButton = document.getElementById("typing-next-button");
const typingRetryButton = document.getElementById("typing-retry-button");

document.addEventListener("DOMContentLoaded", async () => {
    preserveTypingQueryParameters();

    try {
        const set = await loadStudySet();
        typingAllCards = [...set.cards];
        typingCards = shuffleItems(typingAllCards);
        typingTitle.textContent = set.title || "Type the English word";
        document.title = `${set.title || "Typing"} - English typing`;
        renderTypingCard();
    } catch (error) {
        console.error("Typing mode load failed:", error);
        renderTypingEmptyState(error.message || "Could not load cards");
    }
});

typingForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (typingAnswerAccepted) {
        showNextTypingCard();
        return;
    }

    const card = typingCards[typingCurrentIndex];
    if (!card) return;

    const answer = normalizeTypingAnswer(typingInput.value);
    if (!answer) {
        showTypingFeedback("Type an English word first", "incorrect");
        typingInput.focus();
        return;
    }

    if (answer !== normalizeTypingAnswer(card.term)) {
        markCurrentTypingCardIncorrect();
        showTypingFeedback("Not quite. Try again.", "incorrect");
        typingInput.select();
        return;
    }

    typingCorrectCount += 1;
    acceptTypingAnswer(`Correct: ${card.term}`, "correct");
    await pronounceTypedEnglish(card.term);
});

typingRevealButton.addEventListener("click", async () => {
    const card = typingCards[typingCurrentIndex];
    if (!card) return;
    markCurrentTypingCardIncorrect();
    acceptTypingAnswer(`Answer: ${card.term}`, "revealed");
    await pronounceTypedEnglish(card.term);
});

typingNextButton.addEventListener("click", showNextTypingCard);
typingRetryButton.addEventListener("click", retryIncorrectTypingCards);

function renderTypingCard() {
    if (!typingCards.length) {
        renderTypingEmptyState("No cards yet. Create a set first.");
        return;
    }

    if (typingCurrentIndex >= typingCards.length) {
        typingExampleSentence.hidden = true;
        typingExampleSentence.textContent = "";
        typingQuestion.textContent = "Session complete";
        typingProgress.textContent = `${typingCorrectCount} correct`;
        typingInput.hidden = true;
        typingCheckButton.hidden = true;
        typingRevealButton.hidden = true;
        typingNextButton.hidden = false;
        typingNextButton.textContent = "Restart";
        typingRetryButton.hidden = typingIncorrectCards.length === 0;
        typingRetryButton.textContent = `Practice mistakes (${typingIncorrectCards.length})`;
        const summary = typingIncorrectCards.length
                ? `Mistakes to repeat: ${typingIncorrectCards.length}`
                : `All ${typingCards.length} answers are correct`;
        showTypingFeedback(summary, typingIncorrectCards.length ? "incorrect" : "correct");
        typingAnswerAccepted = true;
        return;
    }

    const card = typingCards[typingCurrentIndex];
    typingAnswerAccepted = false;
    typingQuestion.textContent = card.definition;
    typingProgress.textContent = `${typingCurrentIndex + 1} / ${typingCards.length}`;
    typingInput.hidden = false;
    typingInput.disabled = false;
    typingInput.value = "";
    typingCheckButton.hidden = false;
    typingRevealButton.hidden = false;
    typingNextButton.hidden = true;
    typingNextButton.textContent = "Next";
    typingRetryButton.hidden = true;
    typingExampleSentence.hidden = true;
    typingExampleSentence.textContent = "";
    showTypingFeedback("", "");
    typingInput.focus();
}

function acceptTypingAnswer(message, state) {
    const exampleSentence = typingCards[typingCurrentIndex]?.exampleSentence?.trim();
    typingAnswerAccepted = true;
    typingInput.disabled = true;
    typingCheckButton.hidden = true;
    typingRevealButton.hidden = true;
    typingNextButton.hidden = false;
    typingExampleSentence.textContent = exampleSentence || "";
    typingExampleSentence.hidden = !exampleSentence;
    showTypingFeedback(message, state);
    typingNextButton.focus();
}

function showNextTypingCard() {
    if (typingCurrentIndex >= typingCards.length) {
        startTypingRound(typingAllCards);
    } else {
        typingCurrentIndex += 1;
        renderTypingCard();
    }
}

function markCurrentTypingCardIncorrect() {
    const card = typingCards[typingCurrentIndex];
    if (card && !typingIncorrectCards.includes(card)) {
        typingIncorrectCards.push(card);
    }
}

function retryIncorrectTypingCards() {
    if (!typingIncorrectCards.length) return;
    startTypingRound(typingIncorrectCards);
}

function startTypingRound(roundCards) {
    typingCards = shuffleItems([...roundCards]);
    typingCurrentIndex = 0;
    typingCorrectCount = 0;
    typingIncorrectCards = [];
    typingAnswerAccepted = false;
    renderTypingCard();
}

function showTypingFeedback(message, state) {
    typingFeedback.textContent = message;
    typingFeedback.className = `typing-feedback${state ? ` ${state}` : ""}`;
}

function normalizeTypingAnswer(value) {
    return String(value || "")
            .normalize("NFKC")
            .trim()
            .toLocaleLowerCase("en-US")
            .replace(/[’‘]/g, "'")
            .replace(/\s+/g, " ");
}

async function pronounceTypedEnglish(word) {
    const token = localStorage.getItem("token");

    try {
        const url = new URL("/api/pronunciation", window.location.origin);
        url.searchParams.set("word", word);
        url.searchParams.set("language", "en");
        url.searchParams.set("accent", localStorage.getItem("words-up-pronunciation-accent") || "us");

        const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
            const result = await response.json();
            if (result.audioUrl) {
                await playTypingAudio(result.audioUrl, word);
                return;
            }
        }
    } catch (error) {
        console.warn("Pronunciation API failed:", error);
    }

    speakTypedWordInBrowser(word);
}

function playTypingAudio(audioUrl, word) {
    return new Promise(resolve => {
        const audio = new Audio(audioUrl);
        let started = false;
        let finished = false;

        const finish = () => {
            if (finished) return;
            finished = true;
            resolve();
        };
        const start = () => {
            if (started || finished) return;
            started = true;
            audio.currentTime = 0;
            window.setTimeout(() => audio.play().catch(() => {
                finish();
                speakTypedWordInBrowser(word);
            }), 70);
        };

        audio.preload = "auto";
        audio.addEventListener("loadeddata", start, { once: true });
        audio.addEventListener("canplaythrough", start, { once: true });
        audio.addEventListener("ended", finish, { once: true });
        audio.addEventListener("error", () => {
            finish();
            speakTypedWordInBrowser(word);
        }, { once: true });
        window.setTimeout(start, 1200);
        audio.load();
    });
}

function speakTypedWordInBrowser(word) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = localStorage.getItem("words-up-pronunciation-accent") === "uk" ? "en-GB" : "en-US";
    utterance.rate = 0.9;
    window.setTimeout(() => speechSynthesis.speak(utterance), 90);
}

function preserveTypingQueryParameters() {
    const query = window.location.search;
    document.getElementById("typing-flashcards-link").href = `flashcards.html${query}`;
    document.getElementById("typing-practice-link").href = `practice.html${query}`;
}

function renderTypingEmptyState(message) {
    typingQuestion.textContent = message;
    typingProgress.textContent = "0 / 0";
    typingInput.disabled = true;
    typingCheckButton.disabled = true;
    typingRevealButton.disabled = true;
}
