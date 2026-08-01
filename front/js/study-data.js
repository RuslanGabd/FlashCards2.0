const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8081" : "";
const EDITOR_DRAFT_KEY = "words-up-editor-draft";
const LOCAL_SETS_KEY = "words-up-local-sets";

async function loadStudySet() {
    const params = new URLSearchParams(window.location.search);
    const setId = params.get("setId");
    const localSetId = params.get("localSetId");

    if (localSetId) {
        return loadLocalStudySet(localSetId);
    }

    if (setId) {
        const response = await fetch(`${API_BASE_URL}/api/flashcards/set/${setId}`);
        if (!response.ok) throw new Error("Failed to fetch flashcards");
        const cards = await response.json();
        return {
            title: `Set ${setId}`,
            cards: normalizeCards(cards),
        };
    }

    return loadDraftStudySet();
}

function loadLocalStudySet(localSetId) {
    try {
        const sets = JSON.parse(localStorage.getItem(LOCAL_SETS_KEY));
        const set = Array.isArray(sets) ? sets.find(item => item.id === localSetId) : null;
        if (!set) return { title: "Local set", cards: [] };
        return {
            title: set.title || "Local set",
            cards: normalizeCards(set.cards || []),
        };
    } catch {
        return { title: "Local set", cards: [] };
    }
}

function loadDraftStudySet() {
    try {
        const draft = JSON.parse(localStorage.getItem(EDITOR_DRAFT_KEY));
        return {
            title: draft?.meta?.title || "Local draft",
            cards: normalizeCards(draft?.cards || []),
        };
    } catch {
        return { title: "Local draft", cards: [] };
    }
}

function normalizeCards(cards) {
    return (Array.isArray(cards) ? cards : [])
        .map(card => ({
            term: String(card.term || "").trim(),
            definition: String(card.definition || "").trim(),
        }))
        .filter(card => card.term && card.definition);
}

function shuffleItems(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
