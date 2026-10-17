const STORAGE_KEY = "words-up-editor-draft";
const LOCAL_SETS_KEY = "words-up-local-sets";
const CURRENT_LOCAL_SET_ID_KEY = "words-up-current-local-set-id";
const CURRENT_REMOTE_SET_ID_KEY = "words-up-current-remote-set-id";
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8085" : "";
const DICTIONARY_LOOKUP_URL = `${API_BASE_URL}/api/dictionary/lookup`;
const AI_CREATE_SET_URL = `${API_BASE_URL}/api/ai/create-set`;
const AI_EXAMPLE_URL = `${API_BASE_URL}/api/ai/example`;
const ANNOTATION_LOCAL_PREFIX = "words-up-card-annotation:";

const termSuggestionWords = [
    "accomplish", "achieve", "answer", "beautiful", "become", "build", "change", "close",
    "connection", "create", "development", "door", "easy", "education", "encourage",
    "example", "flashcard", "get", "give", "known", "learn", "make", "master", "mastery",
    "myth", "practice", "read", "responsibility", "sentence", "set", "steep", "steeped",
    "steeple", "study", "term", "text", "time", "translation", "unknown", "word",
];

const defaultCards = [
    { term: "accomplish", definition: "выполнять, достигать", image: "" },
    { term: "encourage", definition: "поощрять", image: "" },
    { term: "myth", definition: "миф", image: "" },
];

const draft = loadDraft();
let cards = draft.cards.map(ensureCardClientId);
let diagram = draft.diagram;
let setMeta = draft.meta;
let searchQuery = "";
let activeSuggestionInput = null;
let activeSuggestionIndex = -1;
const dictionaryCache = new Map();
const reverseDictionaryCache = new Map();
const autoFilledTerms = new Map();
let acceptedDuplicateTermCounts = getDuplicateTermCounts(cards);

const setTitle = document.getElementById("set-title");
const setDescription = document.getElementById("set-description");
const setLanguage = document.getElementById("set-language");
const visibilityButton = document.getElementById("visibility-button");
const createButton = document.getElementById("create-button");
const createPracticeButton = document.getElementById("create-practice-button");
const addCardButton = document.getElementById("add-card-button");
const addByAiButton = document.getElementById("add-by-ai-button");
const bottomCreateButtons = document.querySelectorAll("[data-create-action]");
const editorCards = document.getElementById("editor-cards");
const importButton = document.getElementById("import-button");
const diagramButton = document.getElementById("diagram-button");
const diagramInput = document.getElementById("diagram-input");
const diagramPreview = document.getElementById("diagram-preview");
const importDialog = document.getElementById("import-dialog");
const importText = document.getElementById("import-text");
const closeImport = document.getElementById("close-import");
const cancelImport = document.getElementById("cancel-import");
const applyImport = document.getElementById("apply-import");
const doneButton = document.getElementById("done-button");
const suggestionsToggle = document.getElementById("suggestions-toggle");
const searchButton = document.getElementById("search-button");
const searchPanel = document.getElementById("search-panel");
const cardSearch = document.getElementById("card-search");
const swapButton = document.getElementById("swap-button");
const keyboardButton = document.getElementById("keyboard-button");
const keyboardDialog = document.getElementById("keyboard-dialog");
const closeKeyboard = document.getElementById("close-keyboard");
const addAiDialog = document.getElementById("add-ai-dialog");
const addAiText = document.getElementById("add-ai-text");
const addAiLanguageHelp = document.getElementById("add-ai-language-help");
const closeAddAi = document.getElementById("close-add-ai");
const cancelAddAi = document.getElementById("cancel-add-ai");
const applyAddAi = document.getElementById("apply-add-ai");
const deleteAllButton = document.getElementById("delete-all-button");
const toast = document.getElementById("toast");

setTitle.value = setMeta.title;
setDescription.value = setMeta.description;
setLanguage.value = getSetLanguage();
renderVisibility();
renderLanguageDependentUi();
renderDiagram();
renderCards();
loadRequestedSetForEditing();

doneButton.addEventListener("click", async () => {
    saveDraft();
    const savedSet = await saveSet();
    acceptCurrentDuplicateTerms();
    showToast(savedSet.remote ? "Set saved to your account" : "Set saved locally");
});

createButton.addEventListener("click", () => {
    handleCreate();
});

createPracticeButton.addEventListener("click", () => {
    handlePracticeCreate();
});

bottomCreateButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (button.dataset.createAction === "practice") {
            handlePracticeCreate();
            return;
        }

        handleCreate();
    });
});

addCardButton.addEventListener("click", () => {
    cards.push({ term: "", definition: "", exampleSentence: "", image: "" });
    saveDraft();
    renderCards();
    focusCard(cards.length - 1, "term");
    showToast("Card added");
});

addByAiButton.addEventListener("click", () => {
    addAiText.value = "";
    renderLanguageDependentUi();
    addAiDialog.showModal();
    addAiText.focus();
});

closeAddAi.addEventListener("click", () => addAiDialog.close());
cancelAddAi.addEventListener("click", () => addAiDialog.close());

applyAddAi.addEventListener("click", async () => {
    const text = addAiText.value.trim();
    if (!text) {
        showToast("Paste text first");
        addAiText.focus();
        return;
    }

    applyAddAi.disabled = true;
    applyAddAi.textContent = "Generating...";

    try {
        const generatedCards = await generateCardsByAi(text);
        if (!generatedCards.length) {
            showToast("AI did not return cards");
            return;
        }

        cards.push(...generatedCards);
        saveDraft();
        renderCards();
        addAiDialog.close();
        focusCard(cards.length - generatedCards.length, "term");
        showToast(`${generatedCards.length} AI cards added`);
    } catch (error) {
        console.error("AI add failed:", error);
        showToast("AI generation failed");
    } finally {
        applyAddAi.disabled = false;
        applyAddAi.textContent = "Add cards";
    }
});

setTitle.addEventListener("input", event => {
    setMeta.title = event.target.value;
    saveDraft();
});

setDescription.addEventListener("input", event => {
    setMeta.description = event.target.value;
    saveDraft();
});

setLanguage.addEventListener("change", event => {
    setMeta.language = event.target.value === "fr" ? "fr" : "en";
    dictionaryCache.clear();
    reverseDictionaryCache.clear();
    saveDraft();
    renderLanguageDependentUi();
    renderCards();
});

visibilityButton.addEventListener("click", () => {
    setMeta.isPublic = !setMeta.isPublic;
    saveDraft();
    renderVisibility();
    showToast(setMeta.isPublic ? "Set is public" : "Set is private");
});

importButton.addEventListener("click", () => {
    importText.value = "";
    importDialog.showModal();
    importText.focus();
});

closeImport.addEventListener("click", () => importDialog.close());
cancelImport.addEventListener("click", () => importDialog.close());

applyImport.addEventListener("click", () => {
    const importedCards = parseImportedCards(importText.value);
    if (!importedCards.length) {
        showToast("Paste at least one valid card");
        importText.focus();
        return;
    }

    cards.push(...importedCards);
    saveDraft();
    renderCards();
    importDialog.close();
    showToast(`${importedCards.length} cards imported`);
});

diagramButton.addEventListener("click", () => {
    diagramInput.click();
});

diagramInput.addEventListener("change", () => {
    const file = diagramInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        diagram = { name: file.name, src: reader.result };
        saveDraft();
        renderDiagram();
        showToast("Diagram added");
    });
    reader.readAsDataURL(file);
});

suggestionsToggle.addEventListener("change", () => {
    if (suggestionsToggle.checked) {
        const updated = applySuggestions();
        renderCards();
        showToast(updated ? "Suggestions applied" : "Suggestions enabled");
    } else {
        showToast("Suggestions disabled");
    }
});

searchButton.addEventListener("click", () => {
    searchPanel.hidden = !searchPanel.hidden;
    searchButton.setAttribute("aria-expanded", String(!searchPanel.hidden));
    if (!searchPanel.hidden) {
        cardSearch.focus();
    } else {
        searchQuery = "";
        cardSearch.value = "";
        renderCards();
    }
});

cardSearch.addEventListener("input", event => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderCards();
});

swapButton.addEventListener("click", () => {
    cards = cards.map(card => ({
        ...card,
        term: card.definition,
        definition: card.term,
    }));
    saveDraft();
    renderCards();
    showToast("Terms and definitions swapped");
});

keyboardButton.addEventListener("click", () => {
    keyboardDialog.showModal();
});

closeKeyboard.addEventListener("click", () => keyboardDialog.close());

deleteAllButton.addEventListener("click", () => {
    if (!cards.length) {
        showToast("No cards to delete");
        return;
    }

    if (!confirm("Delete all cards from this draft?")) return;
    cards = [];
    saveDraft();
    renderCards();
    showToast("All cards deleted");
});

document.addEventListener("keydown", event => {
    if (!event.ctrlKey) return;

    const key = event.key.toLowerCase();
    if (key === "enter") {
        event.preventDefault();
        doneButton.click();
    }
    if (key === "i") {
        event.preventDefault();
        importButton.click();
    }
    if (key === "f") {
        event.preventDefault();
        searchButton.click();
    }
    if (key === "s" && event.shiftKey) {
        event.preventDefault();
        swapButton.click();
    }
});

document.addEventListener("click", event => {
    if (event.target.closest(".editor-field") || event.target.closest(".editor-suggestions")) return;
    hideAllSuggestions();
});

function editorIcon(name) {
    const paths = {
        up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
        down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
        trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
        globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
        lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function renderCards() {
    cards = cards.map(ensureCardClientId);
    const count = document.getElementById("editor-card-count");
    if (count) count.textContent = `${cards.length} ${cards.length === 1 ? "card" : "cards"}`;
    const duplicateTermCounts = getDuplicateTermCounts(cards);
    const visibleCards = cards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => matchesSearch(card));

    editorCards.innerHTML = "";

    if (!visibleCards.length) {
        editorCards.innerHTML = `
            <article class="empty-editor-state">
                <h2>${cards.length ? "No cards match your search" : "No cards yet"}</h2>
                <p>Use Import to add cards, or turn on Suggestions after typing terms.</p>
            </article>
        `;
        return;
    }

    visibleCards.forEach(({ card, index }) => {
        const row = document.createElement("article");
        row.className = "editor-card";
        const duplicateClass = shouldWarnDuplicateTerm(card.term, duplicateTermCounts) ? " duplicate-term-input" : "";
        row.innerHTML = `
            <div class="card-number">CARD ${String(index + 1).padStart(2, "0")}</div>
            <div class="card-menu">
                <button class="card-action-button" type="button" data-action="move-up" data-index="${index}" aria-label="Move card up" title="Move card up">${editorIcon("up")}</button>
                <button class="card-action-button" type="button" data-action="move-down" data-index="${index}" aria-label="Move card down" title="Move card down">${editorIcon("down")}</button>
                <button class="card-action-button" type="button" data-action="delete" data-index="${index}" aria-label="Delete card" title="Delete card">${editorIcon("trash")}</button>
            </div>
            <div class="editor-field">
                <span>${getSourceLanguageName().toUpperCase()} TERM</span>
                <input class="${duplicateClass.trim()}" value="${escapeAttribute(card.term)}" placeholder="A word worth remembering" maxlength="2000" aria-label="Term ${index + 1}" data-card-index="${index}" data-field="term" />
                <div class="editor-suggestions" data-suggestion-list="term" data-card-index="${index}" hidden></div>
            </div>
            <div class="editor-field">
                <span>RUSSIAN DEFINITION</span>
                <input value="${escapeAttribute(card.definition)}" placeholder="What does it mean?" maxlength="5000" aria-label="Definition ${index + 1}" data-card-index="${index}" data-field="definition" />
                <div class="editor-suggestions" data-suggestion-list="definition" data-card-index="${index}" hidden></div>
            </div>
            <div class="editor-field editor-example-field">
                <span>EXAMPLE SENTENCE <small>(optional)</small></span>
                <input value="${escapeAttribute(card.exampleSentence || "")}" placeholder="Give this word a little context…" maxlength="2000" aria-label="Example sentence ${index + 1}" data-card-index="${index}" data-field="exampleSentence" />
                <button class="generate-example-button" type="button" data-action="generate-example" data-index="${index}">Generate sentence</button>
            </div>
            <button class="image-drop ${card.image ? "has-image" : ""}" type="button" data-action="image" data-index="${index}" aria-label="Add image to card ${index + 1}">
                ${card.image ? `<img src="${card.image}" alt="" />` : `<span class="image-icon">${editorIcon("image")}</span>`}
                <strong>${card.image ? "Change" : "Image"}</strong>
            </button>
        `;
        editorCards.appendChild(row);
    });

    editorCards.querySelectorAll("input[data-card-index]").forEach(input => {
        input.addEventListener("input", event => {
            const card = cards[Number(event.target.dataset.cardIndex)];
            card[event.target.dataset.field] = event.target.value;
            saveDraft();
            if (event.target.dataset.field === "term") {
                updateDuplicateTermWarnings();
            }
            if (event.target.dataset.field !== "exampleSentence") {
                handleSuggestionInput(event.target);
            }
        });

        input.addEventListener("focus", event => {
            if (event.target.dataset.field !== "exampleSentence") {
                handleSuggestionInput(event.target);
            }
        });

        input.addEventListener("keydown", event => {
            handleSuggestionKeydown(event);
        });
    });

    editorCards.querySelectorAll("button[data-action]").forEach(button => {
        button.addEventListener("click", () => handleCardAction(button.dataset.action, Number(button.dataset.index)));
    });

    editorCards.querySelectorAll(".editor-suggestions").forEach(list => {
        list.addEventListener("mousedown", event => {
            event.preventDefault();
        });

        list.addEventListener("click", event => {
            const button = event.target.closest("[data-suggestion-value]");
            if (!button) return;
            applyFieldSuggestion(
                Number(button.dataset.cardIndex),
                button.dataset.field,
                button.dataset.suggestionValue
            );
        });
    });
}

function renderDiagram() {
    if (!diagram?.src) {
        diagramPreview.hidden = true;
        diagramPreview.innerHTML = "";
        return;
    }

    diagramPreview.hidden = false;
    diagramPreview.innerHTML = `
        <div>
            <p>Diagram</p>
            <h2>${escapeHtml(diagram.name)}</h2>
        </div>
        <img src="${diagram.src}" alt="Imported diagram" />
        <button type="button" id="remove-diagram">Remove</button>
    `;
    document.getElementById("remove-diagram").addEventListener("click", () => {
        diagram = null;
        diagramInput.value = "";
        saveDraft();
        renderDiagram();
        showToast("Diagram removed");
    });
}

function handleCardAction(action, index) {
    if (action === "generate-example") {
        generateExampleForCard(index);
        return;
    }

    if (action === "delete") {
        cards.splice(index, 1);
        saveDraft();
        renderCards();
        showToast("Card deleted");
        return;
    }

    if (action === "move-up" && index > 0) {
        [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
        saveDraft();
        renderCards();
        return;
    }

    if (action === "move-down" && index < cards.length - 1) {
        [cards[index], cards[index + 1]] = [cards[index + 1], cards[index]];
        saveDraft();
        renderCards();
        return;
    }

    if (action === "image") {
        chooseCardImage(index);
    }
}

async function handleCreate() {
    saveDraft();
    const savedSet = await saveSet();
    acceptCurrentDuplicateTerms();
    showToast(savedSet.remote ? "Set saved to your account" : "Set saved locally");
}

async function handlePracticeCreate() {
    saveDraft();
    const savedSet = await saveSet();
    acceptCurrentDuplicateTerms();
    showToast("Set saved. Opening practice");
    const targetUrl = savedSet.remote
        ? `flashcards.html?setId=${encodeURIComponent(savedSet.id)}`
        : `flashcards.html?localSetId=${encodeURIComponent(savedSet.id)}`;
    window.location.href = targetUrl;
}

async function generateCardsByAi(text) {
    const response = await fetch(AI_CREATE_SET_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
            title: setTitle.value.trim() || "AI vocabulary set",
            text,
            language: getSetLanguage(),
        }),
    });

    if (!response.ok) throw new Error("AI generation failed");
    const data = await response.json();
    return Array.isArray(data.cards)
        ? data.cards.map(card => ({
            term: card.term || "",
            definition: card.definition || "",
            exampleSentence: card.exampleSentence || "",
            image: "",
        })).filter(card => card.term && card.definition)
        : [];
}

async function generateExampleForCard(index) {
    const card = cards[index];
    if (!card?.term?.trim()) {
        showToast(`Enter the ${getSourceLanguageName()} word first`);
        focusCard(index, "term");
        return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
        saveDraft();
        showToast("Log in to generate example sentences");
        return;
    }

    const button = editorCards.querySelector(`button[data-action="generate-example"][data-index="${index}"]`);
    if (button) {
        button.disabled = true;
        button.textContent = "Generating...";
    }

    try {
        const response = await fetch(AI_EXAMPLE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                term: card.term.trim(),
                definition: String(card.definition || "").trim(),
                language: getSetLanguage(),
            }),
        });
        if (!response.ok) {
            const apiError = await readApiError(response);
            const error = new Error(apiError.message || "Example generation failed");
            error.status = response.status;
            error.retryAfter = response.headers.get("Retry-After");
            throw error;
        }
        const data = await response.json();
        card.exampleSentence = String(data.exampleSentence || "").trim();
        saveDraft();
        renderCards();
        showToast(card.exampleSentence ? "Example generated" : "AI did not return an example");
    } catch (error) {
        console.error("Example generation failed:", error);
        if (error.status === 401) {
            localStorage.removeItem("token");
            showToast("Your session expired. Log in again");
        } else if (error.status === 429) {
            const wait = Number(error.retryAfter);
            showToast(Number.isFinite(wait) ? `Too many requests. Try again in ${wait} seconds` : "Too many requests. Try again shortly");
        } else {
            showToast(error.message || "Could not generate example");
        }
        if (button) {
            button.disabled = false;
            button.textContent = "Generate sentence";
        }
    }
}

async function readApiError(response) {
    try {
        const body = await response.json();
        return { message: String(body.message || "").trim() };
    } catch {
        return { message: "" };
    }
}

function focusCard(index, field) {
    const input = editorCards.querySelector(`input[data-card-index="${index}"][data-field="${field}"]`);
    if (!input) return;

    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
}

function chooseCardImage(index) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            cards[index].image = reader.result;
            saveDraft();
            renderCards();
            showToast("Image added to card");
        });
        reader.readAsDataURL(file);
    });
    input.click();
}

function applySuggestions() {
    const suggestions = {
        accomplish: "выполнять, достигать",
        encourage: "поощрять",
        myth: "миф",
        hello: "привет",
        goodbye: "до свидания",
        "thank you": "спасибо",
    };
    let updated = false;

    cards.forEach(card => {
        const term = card.term.trim().toLowerCase();
        if (!card.definition.trim() && suggestions[term]) {
            card.definition = suggestions[term];
            updated = true;
        }
    });

    if (updated) saveDraft();
    return updated;
}

function handleSuggestionInput(input) {
    if (!suggestionsToggle.checked) {
        hideAllSuggestions();
        return;
    }

    activeSuggestionInput = input;
    if (input.dataset.field === "term") {
        renderTermSuggestions(input);
    } else {
        renderDefinitionSuggestions(input);
    }
}

function renderTermSuggestions(input) {
    const index = Number(input.dataset.cardIndex);
    const query = input.value.trim().toLowerCase();
    const list = getSuggestionList(index, "term");

    if (query.length < 2) {
        hideSuggestionList(list);
        return;
    }

    const values = getTermSuggestions(query);
    renderSuggestionButtons(list, values, index, "term");
}

async function renderDefinitionSuggestions(input) {
    const index = Number(input.dataset.cardIndex);
    const card = cards[index];
    const list = getSuggestionList(index, "definition");
    const term = card?.term?.trim().toLowerCase();

    await renderReverseTermSuggestions(input);

    if (!term || term.length < 2) {
        hideSuggestionList(list);
        return;
    }

    const typedValue = input.value.trim().toLowerCase();
    const suggestions = await getDefinitionSuggestions(term);
    if (activeSuggestionInput !== input) return;

    const values = typedValue
        ? suggestions.filter(value => value.toLowerCase().includes(typedValue))
        : suggestions;
    if (values.some(value => isSameSuggestion(value, typedValue))) {
        hideSuggestionList(list);
        return;
    }
    renderSuggestionButtons(list, values.slice(0, 5), index, "definition");
}

function getTermSuggestions(query) {
    const existingTerms = cards
        .map(card => card.term.trim().toLowerCase())
        .filter(Boolean);
    const builtInSuggestions = getSetLanguage() === "en" ? termSuggestionWords : [];
    return Array.from(new Set([...existingTerms, ...builtInSuggestions]))
        .filter(word => word !== query && word.startsWith(query))
        .slice(0, 5);
}

async function getDefinitionSuggestions(term) {
    const cacheKey = `${getSetLanguage()}:${term}`;
    if (dictionaryCache.has(cacheKey)) return dictionaryCache.get(cacheKey);

    try {
        const response = await fetch(DICTIONARY_LOOKUP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({ words: [term], lang: `${getSetLanguage()}-ru` }),
        });
        if (!response.ok) throw new Error("Dictionary lookup failed");
        const data = await response.json();
        const item = Array.isArray(data.items) ? data.items[0] : null;
        const values = item?.alternatives?.length
            ? item.alternatives
            : item?.translation
                ? [item.translation]
                : [];
        dictionaryCache.set(cacheKey, values);
        return values;
    } catch (error) {
        console.error("Suggestion lookup failed:", error);
        dictionaryCache.set(cacheKey, []);
        return [];
    }
}

async function renderReverseTermSuggestions(input) {
    const index = Number(input.dataset.cardIndex);
    const card = cards[index];
    const list = getSuggestionList(index, "term");
    const definition = input.value.trim().toLowerCase();
    const term = card?.term?.trim() || "";

    if (term || !definition || definition.length < 2 || !hasCyrillic(definition)) {
        hideSuggestionList(list);
        return;
    }

    const suggestions = await getTermSuggestionsFromDefinition(definition);
    if (activeSuggestionInput !== input) return;

    const values = suggestions.slice(0, 5);
    renderSuggestionButtons(list, values, index, "term");
    applyDefaultReverseTerm(card, index, values);
}

async function getTermSuggestionsFromDefinition(definition) {
    const normalized = normalizeRussianLookup(definition);
    const cacheKey = `${getSetLanguage()}:${normalized}`;
    if (reverseDictionaryCache.has(cacheKey)) return reverseDictionaryCache.get(cacheKey);

    try {
        const response = await fetch(DICTIONARY_LOOKUP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({ words: [normalized], lang: `ru-${getSetLanguage()}` }),
        });
        if (!response.ok) throw new Error("Reverse dictionary lookup failed");
        const data = await response.json();
        const item = Array.isArray(data.items) ? data.items[0] : null;
        const values = item?.alternatives?.length
            ? item.alternatives
            : item?.translation
                ? [item.translation]
                : [];
        reverseDictionaryCache.set(cacheKey, values);
        return values;
    } catch (error) {
        console.error("Reverse suggestion lookup failed:", error);
        reverseDictionaryCache.set(cacheKey, []);
        return [];
    }
}

function applyDefaultReverseTerm(card, index, values) {
    const bestTerm = values[0];
    if (!card || !bestTerm) return;

    const previousAutoTerm = autoFilledTerms.get(index);
    const canReplace = !card.term.trim() || card.term === previousAutoTerm;
    if (!canReplace) return;

    card.term = bestTerm;
    autoFilledTerms.set(index, bestTerm);
    saveDraft();

    const termInput = editorCards.querySelector(`input[data-card-index="${index}"][data-field="term"]`);
    if (termInput) {
        termInput.value = bestTerm;
    }
}

function normalizeRussianLookup(value) {
    return String(value || "")
        .toLowerCase()
        .split(/[;,]/)[0]
        .trim();
}

function hasCyrillic(value) {
    return /[а-яё]/i.test(value);
}

function renderSuggestionButtons(list, values, cardIndex, field) {
    const input = editorCards.querySelector(`input[data-card-index="${cardIndex}"][data-field="${field}"]`);
    const currentValue = input?.value?.trim() || "";
    const uniqueValues = values.filter(value => !isSameSuggestion(value, currentValue));

    if (!list || !uniqueValues.length) {
        hideSuggestionList(list);
        return;
    }

    list.hidden = false;
    list.dataset.activeIndex = "-1";
    list.innerHTML = uniqueValues.map(value => `
        <button
            class="editor-suggestion-button"
            type="button"
            data-card-index="${cardIndex}"
            data-field="${field}"
            data-suggestion-value="${escapeAttribute(value)}"
        >${escapeHtml(value)}</button>
    `).join("");
}

function handleSuggestionKeydown(event) {
    if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) return;

    const input = event.target;
    const list = getSuggestionList(Number(input.dataset.cardIndex), input.dataset.field);
    if (!list || list.hidden) return;

    const buttons = Array.from(list.querySelectorAll(".editor-suggestion-button"));
    if (!buttons.length) return;

    if (event.key === "Escape") {
        hideSuggestionList(list);
        return;
    }

    event.preventDefault();

    if (event.key === "ArrowDown") {
        selectSuggestionByKeyboard(input, list, buttons, 1);
        return;
    }

    if (event.key === "ArrowUp") {
        selectSuggestionByKeyboard(input, list, buttons, -1);
        return;
    }

    if (event.key === "Enter") {
        const index = getActiveSuggestionIndex(list, buttons.length);
        applySuggestionButton(buttons[index]);
    }
}

function selectSuggestionByKeyboard(input, list, buttons, direction) {
    const currentIndex = getActiveSuggestionIndex(list, buttons.length);
    const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
    setActiveSuggestion(list, buttons, nextIndex);
    applySuggestionValueToInput(input, buttons[nextIndex]);
}

function setActiveSuggestion(list, buttons, index) {
    list.dataset.activeIndex = String(index);
    activeSuggestionIndex = index;
    buttons.forEach((button, buttonIndex) => {
        button.classList.toggle("is-active", buttonIndex === index);
    });
}

function getActiveSuggestionIndex(list, length) {
    const index = Number(list.dataset.activeIndex);
    if (Number.isInteger(index) && index >= 0 && index < length) {
        return index;
    }
    return 0;
}

function applySuggestionValueToInput(input, button) {
    const index = Number(button.dataset.cardIndex);
    const field = button.dataset.field;
    const value = button.dataset.suggestionValue;
    const card = cards[index];
    if (!card) return;

    card[field] = value;
    input.value = value;
    saveDraft();

    if (field === "term") {
        updateDuplicateTermWarnings();
    }
}

function applySuggestionButton(button) {
    applyFieldSuggestion(
        Number(button.dataset.cardIndex),
        button.dataset.field,
        button.dataset.suggestionValue
    );
}

function isSameSuggestion(value, currentValue) {
    return normalizeSuggestionValue(value) === normalizeSuggestionValue(currentValue);
}

function normalizeSuggestionValue(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function applyFieldSuggestion(index, field, value) {
    const card = cards[index];
    if (!card) return;

    card[field] = value;
    saveDraft();
    renderCards();
    focusCard(index, field);
    hideAllSuggestions();
}

function getSuggestionList(index, field) {
    return editorCards.querySelector(`.editor-suggestions[data-card-index="${index}"][data-suggestion-list="${field}"]`);
}

function hideSuggestionList(list) {
    if (!list) return;
    list.hidden = true;
    list.innerHTML = "";
    list.dataset.activeIndex = "-1";
    activeSuggestionIndex = -1;
}

function hideAllSuggestions() {
    activeSuggestionInput = null;
    editorCards.querySelectorAll(".editor-suggestions").forEach(hideSuggestionList);
}

function parseImportedCards(value) {
    return value
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const parts = splitImportedLine(line);
            if (!parts) return null;
            const [term, definition] = parts;
            return { term, definition, exampleSentence: "", image: "" };
        })
        .filter(Boolean);
}

function splitImportedLine(line) {
    const separators = ["\t", " - ", " = ", "=", ";", ","];
    for (const separator of separators) {
        const index = line.indexOf(separator);
        if (index > 0) {
            const term = line.slice(0, index).trim();
            const definition = line.slice(index + separator.length).trim();
            if (term && definition) return [term, definition];
        }
    }
    return null;
}

function matchesSearch(card) {
    if (!searchQuery) return true;
    return `${card.term} ${card.definition}`.toLowerCase().includes(searchQuery);
}

function updateDuplicateTermWarnings() {
    const duplicateTermCounts = getDuplicateTermCounts(cards);
    editorCards.querySelectorAll('input[data-field="term"]').forEach(input => {
        const card = cards[Number(input.dataset.cardIndex)];
        input.classList.toggle("duplicate-term-input", shouldWarnDuplicateTerm(card?.term, duplicateTermCounts));
    });
}

function acceptCurrentDuplicateTerms() {
    acceptedDuplicateTermCounts = getDuplicateTermCounts(cards);
    updateDuplicateTermWarnings();
}

function shouldWarnDuplicateTerm(term, duplicateTermCounts) {
    const key = normalizeDuplicateTerm(term);
    if (!key) return false;

    const currentCount = duplicateTermCounts.get(key) || 0;
    const acceptedCount = acceptedDuplicateTermCounts.get(key) || 0;
    return currentCount > 1 && currentCount > acceptedCount;
}

function getDuplicateTermCounts(items) {
    const counts = new Map();
    items.forEach(card => {
        const key = normalizeDuplicateTerm(card?.term);
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
}

function normalizeDuplicateTerm(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards, diagram, meta: setMeta }));
}

async function saveSet() {
    if (getAuthToken()) {
        try {
            return await saveRemoteSet();
        } catch (error) {
            console.error("Remote set save failed, saving locally:", error);
            showToast("Could not save online. Saved locally instead.");
        }
    }

    return { ...saveLocalSet(), remote: false };
}

async function saveRemoteSet() {
    const remoteSetId = localStorage.getItem(CURRENT_REMOTE_SET_ID_KEY);
    const url = remoteSetId
        ? `${API_BASE_URL}/api/sets/${encodeURIComponent(remoteSetId)}`
        : `${API_BASE_URL}/api/sets`;
    const response = await fetch(url, {
        method: remoteSetId ? "PUT" : "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(createSetPayload()),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const saved = await response.json();
    const sourceSetKey = localStorage.getItem(CURRENT_LOCAL_SET_ID_KEY) || "draft";
    localStorage.setItem(CURRENT_REMOTE_SET_ID_KEY, String(saved.id));
    await syncLocalAnnotations(saved.id, sourceSetKey);
    return { id: saved.id, remote: true };
}

function createSetPayload() {
    return {
        title: setMeta.title?.trim() || "Untitled set",
        description: setMeta.description?.trim() || "",
        public: setMeta.isPublic !== false,
        language: getSetLanguage(),
        cards: cards
            .map(card => ({
                clientId: ensureCardClientId(card).clientId,
                term: String(card.term || "").trim(),
                definition: String(card.definition || "").trim(),
                exampleSentence: String(card.exampleSentence || "").trim(),
            }))
            .filter(card => card.term || card.definition),
    };
}

async function syncLocalAnnotations(remoteSetId, sourceSetKey) {
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/flashcards/set/${encodeURIComponent(remoteSetId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const remoteCards = await response.json();

        for (const remoteCard of remoteCards) {
            if (!remoteCard.id || !remoteCard.clientId) continue;
            const localIndex = cards.findIndex(card => card.clientId === remoteCard.clientId);
            const localCard = localIndex >= 0 ? cards[localIndex] : null;
            const keys = [
                `${ANNOTATION_LOCAL_PREFIX}${sourceSetKey}:client-${remoteCard.clientId}`,
            ];
            if (localCard) {
                keys.push(`${ANNOTATION_LOCAL_PREFIX}${sourceSetKey}:local-${localIndex}-${localCard.term}`);
            }
            const sourceKey = keys.find(key => localStorage.getItem(key) !== null);
            if (!sourceKey) continue;

            const drawingData = localStorage.getItem(sourceKey) || "[]";
            const saveResponse = await fetch(
                `${API_BASE_URL}/api/annotations/card/${encodeURIComponent(remoteCard.id)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ drawingData }),
                }
            );
            if (saveResponse.ok) {
                keys.forEach(key => localStorage.removeItem(key));
            }
        }
    } catch (error) {
        console.warn("Local annotations will be synchronized on the next save:", error);
    }
}

function ensureCardClientId(card) {
    if (!card || typeof card !== "object") {
        return { clientId: createCardClientId(), term: "", definition: "", exampleSentence: "", image: "" };
    }
    if (!card.clientId) {
        card.clientId = createCardClientId();
    }
    return card;
}

function createCardClientId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        const value = character === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

function getAuthToken() {
    return localStorage.getItem("token") || "";
}

function saveLocalSet() {
    const sets = loadLocalSets();
    const existingId = localStorage.getItem(CURRENT_LOCAL_SET_ID_KEY);
    const existingIndex = sets.findIndex(set => set.id === existingId);
    const normalizedCards = cards
        .map(card => ({
            clientId: ensureCardClientId(card).clientId,
            term: String(card.term || "").trim(),
            definition: String(card.definition || "").trim(),
            exampleSentence: String(card.exampleSentence || "").trim(),
            image: card.image || "",
        }))
        .filter(card => card.term || card.definition);
    const now = new Date().toISOString();
    const localSet = {
        id: existingIndex >= 0 ? sets[existingIndex].id : createLocalSetId(),
        title: setMeta.title?.trim() || "Untitled set",
        description: setMeta.description?.trim() || "",
        isPublic: setMeta.isPublic !== false,
        language: getSetLanguage(),
        cards: normalizedCards,
        updatedAt: now,
        createdAt: existingIndex >= 0 ? sets[existingIndex].createdAt : now,
    };

    if (existingIndex >= 0) {
        sets[existingIndex] = localSet;
    } else {
        sets.unshift(localSet);
    }

    localStorage.setItem(LOCAL_SETS_KEY, JSON.stringify(sets));
    localStorage.setItem(CURRENT_LOCAL_SET_ID_KEY, localSet.id);
    return localSet;
}

function loadLocalSets() {
    try {
        const sets = JSON.parse(localStorage.getItem(LOCAL_SETS_KEY));
        return Array.isArray(sets) ? sets : [];
    } catch {
        return [];
    }
}

function createLocalSetId() {
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadDraft() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("new")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CURRENT_LOCAL_SET_ID_KEY);
        localStorage.removeItem(CURRENT_REMOTE_SET_ID_KEY);
        return createEmptyDraft();
    }

    try {
        const draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const meta = {
            title: draft?.meta?.title || "",
            description: draft?.meta?.description || "",
            isPublic: draft?.meta?.isPublic !== false,
            language: draft?.meta?.language === "fr" ? "fr" : "en",
        };
        return {
            cards: Array.isArray(draft?.cards) ? draft.cards : [...defaultCards],
            diagram: draft?.diagram || null,
            meta,
        };
    } catch {
        return createStarterDraft();
    }
}

async function loadRequestedSetForEditing() {
    const params = new URLSearchParams(window.location.search);
    const setId = params.get("setId");
    const localSetId = params.get("localSetId");
    if (localSetId) {
        loadLocalSetForEditing(localSetId);
        return;
    }
    if (!setId) return;

    const token = getAuthToken();
    if (!token) {
        showToast("Log in to edit this set");
        return;
    }

    try {
        const headers = { Authorization: `Bearer ${token}` };
        const [setResponse, cardsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/sets/${encodeURIComponent(setId)}`, { headers }),
            fetch(`${API_BASE_URL}/api/flashcards/set/${encodeURIComponent(setId)}`, { headers }),
        ]);
        if (!setResponse.ok || !cardsResponse.ok) {
            throw new Error("Set could not be loaded for editing");
        }

        const [remoteSet, remoteCards] = await Promise.all([
            setResponse.json(),
            cardsResponse.json(),
        ]);
        cards = Array.isArray(remoteCards)
            ? remoteCards.map(card => ({
                clientId: card.clientId || createCardClientId(),
                term: String(card.term || ""),
                definition: String(card.definition || ""),
                exampleSentence: String(card.exampleSentence || ""),
                image: "",
            }))
            : [];
        setMeta = {
            title: remoteSet.title || "",
            description: remoteSet.description || "",
            isPublic: remoteSet.public !== false,
            language: remoteSet.language === "fr" ? "fr" : "en",
        };
        diagram = null;
        localStorage.setItem(CURRENT_REMOTE_SET_ID_KEY, String(setId));
        localStorage.removeItem(CURRENT_LOCAL_SET_ID_KEY);
        setTitle.value = setMeta.title;
        setDescription.value = setMeta.description;
        setLanguage.value = getSetLanguage();
        renderVisibility();
        renderLanguageDependentUi();
        renderDiagram();
        renderCards();
        saveDraft();
    } catch (error) {
        console.error("Remote set edit load failed:", error);
        showToast("Could not load this set for editing");
    }
}

function loadLocalSetForEditing(localSetId) {
    const localSet = loadLocalSets().find(set => set.id === localSetId);
    if (!localSet) {
        showToast("Could not load this local set");
        return;
    }

    cards = (localSet.cards || []).map(ensureCardClientId);
    setMeta = {
        title: localSet.title || "",
        description: localSet.description || "",
        isPublic: localSet.isPublic !== false,
        language: localSet.language === "fr" ? "fr" : "en",
    };
    diagram = null;
    localStorage.setItem(CURRENT_LOCAL_SET_ID_KEY, localSetId);
    localStorage.removeItem(CURRENT_REMOTE_SET_ID_KEY);
    setTitle.value = setMeta.title;
    setDescription.value = setMeta.description;
    setLanguage.value = getSetLanguage();
    renderVisibility();
    renderLanguageDependentUi();
    renderDiagram();
    renderCards();
    saveDraft();
}

function createEmptyDraft() {
    return {
        cards: [
            { term: "", definition: "", exampleSentence: "", image: "" },
            { term: "", definition: "", exampleSentence: "", image: "" },
        ],
        diagram: null,
        meta: { title: "", description: "", isPublic: true, language: "en" },
    };
}

function createStarterDraft() {
    return {
        cards: [...defaultCards],
        diagram: null,
        meta: { title: "", description: "", isPublic: true, language: "en" },
    };
}

function renderVisibility() {
    visibilityButton.setAttribute("aria-pressed", String(setMeta.isPublic));
    visibilityButton.innerHTML = `
        ${editorIcon(setMeta.isPublic ? "globe" : "lock")}
        ${setMeta.isPublic ? "Public" : "Private"}
    `;
}

function getSetLanguage() {
    return setMeta.language === "fr" ? "fr" : "en";
}

function getSourceLanguageName() {
    return getSetLanguage() === "fr" ? "French" : "English";
}

function renderLanguageDependentUi() {
    const languageName = getSourceLanguageName();
    setLanguage.value = getSetLanguage();
    addAiLanguageHelp.textContent = `Paste any ${languageName} text. DeepSeek will find useful words and add new flashcards to this set.`;
}

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.hidden = true;
    }, 2200);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
