const EDITOR_DRAFT_KEY = "words-up-editor-draft";
const CURRENT_LOCAL_SET_ID_KEY = "words-up-current-local-set-id";
const CURRENT_REMOTE_SET_ID_KEY = "words-up-current-remote-set-id";
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8085" : "";

const localTranslations = {
    about: "о, около",
    answer: "ответ",
    build: "строить",
    card: "карточка",
    create: "создавать",
    development: "развитие",
    education: "образование",
    example: "пример",
    flashcard: "карточка для запоминания",
    learn: "учить",
    make: "делать",
    practice: "практика",
    set: "набор",
    study: "учиться",
    text: "текст",
    translation: "перевод",
    word: "слово",
};

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sets-container");
    const openAiCreateButton = document.getElementById("open-ai-create-button");
    const aiCreateDialog = document.getElementById("ai-create-dialog");
    const closeAiCreate = document.getElementById("close-ai-create");
    const cancelAiCreate = document.getElementById("cancel-ai-create");
    const generateAiSet = document.getElementById("generate-ai-set");
    const aiSetTitle = document.getElementById("ai-set-title");
    const aiSetLanguage = document.getElementById("ai-set-language");
    const aiSourceText = document.getElementById("ai-source-text");
    const toast = document.getElementById("toast");
    const searchInput = document.getElementById("sets-search");
    let publicSets = [];

    function renderSets() {
        const query = searchInput.value.trim().toLowerCase();
        const sets = publicSets.filter(set =>
            `${set.title || ""} ${set.description || ""} ${set.ownerUsername || ""}`.toLowerCase().includes(query)
        );

        if (!sets.length) {
            container.innerHTML = `
                <article class="activity-item empty-state">
                    <div class="set-thumb" aria-hidden="true">${query ? "⌕" : "+"}</div>
                    <div>
                        <h3>${query ? "No sets found. Keep exploring." : "Every collection starts with a word."}</h3>
                        <p class="set-description">${query ? "Try a different word or search for a creator." : "There are no public sets just yet. Create yours and give a little knowledge a home."}</p>
                    </div>
                    ${query ? "" : '<a class="study-link" href="edit-set.html?new=1">Create the first set <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></a>'}
                </article>
            `;
            return;
        }

        container.innerHTML = "";
        sets.forEach(set => {
            const item = document.createElement("article");
            item.className = "activity-item clickable-set";
            item.dataset.setUrl = `flashcards.html?setId=${set.id}`;
            item.innerHTML = `
                <div class="set-thumb" aria-hidden="true">${escapeHtml(getInitials(set.title))}</div>
                <div class="activity-copy">
                    <p class="set-meta">${set.language === "fr" ? "French" : "English"} · by ${escapeHtml(set.ownerUsername || "Words Up")}</p>
                    <h3><a class="set-title-link" href="flashcards.html?setId=${set.id}">${escapeHtml(set.title)}</a></h3>
                    <p class="set-description">${escapeHtml(set.description || "A new set of words to make your own.")}</p>
                </div>
                <a class="study-link" href="flashcards.html?setId=${set.id}">Study <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></a>
            `;
            container.appendChild(item);
        });
    }

    searchInput.addEventListener("input", renderSets);

    openAiCreateButton.addEventListener("click", () => {
        aiCreateDialog.showModal();
        aiSourceText.focus();
    });

    closeAiCreate.addEventListener("click", () => aiCreateDialog.close());
    cancelAiCreate.addEventListener("click", () => aiCreateDialog.close());

    generateAiSet.addEventListener("click", async () => {
        const text = aiSourceText.value.trim();
        if (!text) {
            showToast("Paste text first", toast);
            aiSourceText.focus();
            return;
        }

        generateAiSet.disabled = true;
        generateAiSet.textContent = "Generating...";

        const language = aiSetLanguage.value === "fr" ? "fr" : "en";
        const aiSet = await generateCardsByAi(aiSetTitle.value.trim(), text, language);
        const cards = aiSet.cards.length ? aiSet.cards : generateCardsFromText(text, language);
        if (!cards.length) {
            showToast(`No ${language === "fr" ? "French" : "English"} words found`, toast);
            generateAiSet.disabled = false;
            generateAiSet.textContent = "Generate cards";
            return;
        }

        startNewEditorDraft({
            cards,
            diagram: null,
            meta: {
                title: aiSet.title || aiSetTitle.value.trim() || "AI vocabulary set",
                description: aiSet.description || `Generated from pasted text: ${cards.length} cards`,
                isPublic: true,
                language,
            },
        });

        window.location.href = "edit-set.html";
    });

    fetch(`${API_BASE_URL}/api/sets/public`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch sets");
            return response.json();
        })
        .then(sets => {
            publicSets = sets;
            renderSets();
        })
        .catch(error => {
            console.error("Error loading sets:", error);
            container.innerHTML = `
                <article class="activity-item">
                    <div class="set-thumb">!</div>
                    <div>
                        <p class="set-meta">Connection problem</p>
                        <h3>Error loading sets</h3>
                    <p class="set-description">We couldn’t load the sets. Please try again in a moment.</p>
                    </div>
                </article>
            `;
        });
});

function startNewEditorDraft(draft) {
    localStorage.removeItem(CURRENT_LOCAL_SET_ID_KEY);
    localStorage.removeItem(CURRENT_REMOTE_SET_ID_KEY);
    localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(draft));
}

document.addEventListener("click", event => {
    if (event.target.closest("a, button, input, select, textarea")) return;

    const setItem = event.target.closest(".clickable-set");
    if (!setItem?.dataset.setUrl) return;
    window.location.href = setItem.dataset.setUrl;
});

async function generateCardsByAi(title, text, language) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/create-set`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
            body: JSON.stringify({ title, text, language }),
        });

        if (!response.ok) throw new Error("AI generation failed");
        const data = await response.json();
        return {
            title: data.title || title || "AI vocabulary set",
            description: data.description || "",
            cards: Array.isArray(data.cards)
                ? data.cards.map(card => ({
                    term: card.term || "",
                    definition: card.definition || "",
                    exampleSentence: card.exampleSentence || "",
                    image: "",
                })).filter(card => card.term && card.definition)
                : [],
        };
    } catch (error) {
        console.error("AI generation failed, using local fallback:", error);
        return { title: title || "AI vocabulary set", description: "", cards: [] };
    }
}

function generateCardsFromText(text, language = "en") {
    const words = text.toLowerCase().match(/\p{L}+(?:['’]\p{L}+)?/gu) || [];
    const englishStopWords = [
        "the", "and", "for", "that", "this", "with", "you", "your", "are", "was", "were",
        "have", "has", "had", "from", "they", "their", "there", "what", "when", "where",
        "will", "would", "could", "should", "into", "onto", "than", "then", "them", "his",
        "her", "our", "out", "about", "but", "not", "all", "can", "one", "two", "too",
    ];
    const frenchStopWords = [
        "le", "la", "les", "un", "une", "des", "du", "de", "et", "est", "sont", "dans",
        "pour", "avec", "sans", "sur", "sous", "que", "qui", "quoi", "dont", "où", "mais",
        "pas", "plus", "son", "sa", "ses", "leur", "leurs", "nous", "vous", "ils", "elles",
    ];
    const stopWords = new Set(language === "fr" ? frenchStopWords : englishStopWords);
    const counts = new Map();

    words.forEach(word => {
        const normalized = normalizeWord(word);
        if (normalized.length < 3 || stopWords.has(normalized)) return;
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 30)
        .map(([term]) => ({
            term,
            definition: language === "en" ? localTranslations[term] || "add translation" : "add translation",
            image: "",
        }));
}

function normalizeWord(word) {
    if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
    if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
    if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
    if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
    return word;
}

function showToast(message, toast) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.hidden = true;
    }, 2200);
}

function getInitials(value) {
    return String(value || "WU")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
