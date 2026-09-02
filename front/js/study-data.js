const STUDY_API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8085" : "";
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
        const token = localStorage.getItem("token");
        const response = await fetch(`${STUDY_API_BASE_URL}/api/flashcards/set/${encodeURIComponent(setId)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
            let message = "Failed to fetch flashcards";
            try {
                const error = await response.json();
                message = error.message || message;
            } catch {
                // Keep the fallback when the server did not return JSON.
            }
            throw new Error(message);
        }
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
        if (ensureStudyCardClientIds(set.cards || [])) {
            localStorage.setItem(LOCAL_SETS_KEY, JSON.stringify(sets));
        }
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
        if (draft && ensureStudyCardClientIds(draft.cards || [])) {
            localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(draft));
        }
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
        .map((card, index) => {
            const clientId = card.clientId || createStudyCardClientId();
            return {
            id: Number.isFinite(Number(card.id)) ? Number(card.id) : null,
            clientId,
            annotationKey: card.id ? `remote-${card.id}` : `client-${clientId}`,
            legacyAnnotationKey: `local-${index}-${String(card.term || "").trim()}`,
            term: String(card.term || "").trim(),
            definition: String(card.definition || "").trim(),
            exampleSentence: String(card.exampleSentence || "").trim(),
            };
        })
        .filter(card => card.term && card.definition);
}

function ensureStudyCardClientIds(cards) {
    let changed = false;
    cards.forEach(card => {
        if (!card.clientId) {
            card.clientId = createStudyCardClientId();
            changed = true;
        }
    });
    return changed;
}

function createStudyCardClientId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        const value = character === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
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
