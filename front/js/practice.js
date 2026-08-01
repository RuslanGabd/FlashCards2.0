let cards = [];
let currentIndex = 0;
let knownCount = 0;
let sessionComplete = false;

const title = document.getElementById("practice-title");
const progress = document.getElementById("practice-progress");
const question = document.getElementById("practice-question");
const answer = document.getElementById("practice-answer");
const showAnswerButton = document.getElementById("show-answer-button");
const knowButton = document.getElementById("know-button");
const againButton = document.getElementById("again-button");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const set = await loadStudySet();
        cards = shuffleItems(set.cards);
        title.textContent = set.title || "Practice";
        renderPracticeCard();
    } catch (error) {
        console.error("Practice load failed:", error);
        renderEmptyPractice("Could not load cards. Check that the backend is running.");
    }
});

showAnswerButton.addEventListener("click", () => {
    answer.hidden = false;
});

knowButton.addEventListener("click", () => {
    knownCount += 1;
    goNext();
});

againButton.addEventListener("click", () => {
    if (sessionComplete) {
        currentIndex = 0;
        knownCount = 0;
        sessionComplete = false;
        cards = shuffleItems(cards);
        showAnswerButton.disabled = false;
        knowButton.disabled = false;
        againButton.textContent = "Again";
        renderPracticeCard();
        return;
    }

    if (cards[currentIndex]) cards.push(cards[currentIndex]);
    goNext();
});

function goNext() {
    currentIndex += 1;
    renderPracticeCard();
}

function renderPracticeCard() {
    if (!cards.length) {
        renderEmptyPractice("No cards yet. Create a set first.");
        return;
    }

    if (currentIndex >= cards.length) {
        sessionComplete = true;
        question.textContent = "Session complete";
        answer.hidden = false;
        answer.textContent = `Known: ${knownCount}`;
        progress.textContent = `${knownCount} known`;
        showAnswerButton.disabled = true;
        knowButton.disabled = true;
        againButton.textContent = "Restart";
        return;
    }

    const card = cards[currentIndex];
    question.textContent = card.term;
    answer.textContent = card.definition;
    answer.hidden = true;
    progress.textContent = `${currentIndex + 1} / ${cards.length}`;
}

function renderEmptyPractice(message) {
    question.textContent = message;
    answer.hidden = true;
    progress.textContent = "0 / 0";
    showAnswerButton.disabled = true;
    knowButton.disabled = true;
    againButton.disabled = true;
}
