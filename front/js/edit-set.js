const STORAGE_KEY = "words-up-editor-draft";
const LOCAL_SETS_KEY = "words-up-local-sets";
const CURRENT_LOCAL_SET_ID_KEY = "words-up-current-local-set-id";
const CURRENT_REMOTE_SET_ID_KEY = "words-up-current-remote-set-id";
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8081" : "";
const DICTIONARY_LOOKUP_URL = `${API_BASE_URL}/api/dictionary/lookup`;
const AI_CREATE_SET_URL = `${API_BASE_URL}/api/ai/create-set`;

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
let cards = draft.cards;
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
const closeAddAi = document.getElementById("close-add-ai");
const cancelAddAi = document.getElementById("cancel-add-ai");
const applyAddAi = document.getElementById("apply-add-ai");
const deleteAllButton = document.getElementById("delete-all-button");
const toast = document.getElementById("toast");

setTitle.value = setMeta.title;
setDescription.value = setMeta.description;
renderVisibility();
renderDiagram();
renderCards();

doneButton.addEventListener("click", async () => {
    saveDraft();
    const savedSet = await saveSet();
    acceptCurrentDuplicateTerms();
    showToast(savedSet.remote ? "Set saved to PostgreSQL" : "Set saved locally");
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
    cards.push({ term: "", definition: "", image: "" });
    saveDraft();
    renderCards();
    focusCard(cards.length - 1, "term");
    showToast("Card added");
});

addByAiButton.addEventListener("click", () => {
    addAiText.value = "";
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

function renderCards() {
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
            <div class="card-number">${index + 1}</div>
            <div class="card-menu">
                <button class="card-action-button" type="button" data-action="move-up" data-index="${index}" aria-label="Move card up">↑</button>
                <button class="card-action-button" type="button" data-action="move-down" data-index="${index}" aria-label="Move card down">↓</button>
                <button class="card-action-button" type="button" data-action="delete" data-index="${index}" aria-label="Delete card">⌫</button>
            </div>
            <div class="editor-field">
                <input class="${duplicateClass.trim()}" value="${escapeAttribute(card.term)}" aria-label="Term ${index + 1}" data-card-index="${index}" data-field="term" />
                <span>TERM</span>
                <div class="editor-suggestions" data-suggestion-list="term" data-card-index="${index}" hidden></div>
            </div>
            <div class="editor-field">
                <input value="${escapeAttribute(card.definition)}" aria-label="Definition ${index + 1}" data-card-index="${index}" data-field="definition" />
                <span>DEFINITION</span>
                <div class="editor-suggestions" data-suggestion-list="definition" data-card-index="${index}" hidden></div>
            </div>
            <button class="image-drop ${card.image ? "has-image" : ""}" type="button" data-action="image" data-index="${index}" aria-label="Add image to card ${index + 1}">
                ${card.image ? `<img src="${card.image}" alt="" />` : `<span class="image-icon" aria-hidden="true">▧</span>`}
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
            handleSuggestionInput(event.target);
        });

        input.addEventListener("focus", event => {
            handleSuggestionInput(event.target);
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
        }),
    });

    if (!response.ok) throw new Error("AI generation failed");
    const data = await response.json();
    return Array.isArray(data.cards)
        ? data.cards.map(card => ({
            term: card.term || "",
            definition: card.definition || "",
            image: "",
        })).filter(card => card.term && card.definition)
        : [];
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
    return Array.from(new Set([...existingTerms, ...termSuggestionWords]))
        .filter(word => word !== query && word.startsWith(query))
        .slice(0, 5);
}

async function getDefinitionSuggestions(term) {
    if (dictionaryCache.has(term)) return dictionaryCache.get(term);

    try {
        const response = await fetch(DICTIONARY_LOOKUP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({ words: [term], lang: "en-ru" }),
        });
        if (!response.ok) throw new Error("Dictionary lookup failed");
        const data = await response.json();
        const item = Array.isArray(data.items) ? data.items[0] : null;
        const values = item?.alternatives?.length
            ? item.alternatives
            : item?.translation
                ? [item.translation]
                : [];
        dictionaryCache.set(term, values);
        return values;
    } catch (error) {
        console.error("Suggestion lookup failed:", error);
        dictionaryCache.set(term, []);
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
    if (reverseDictionaryCache.has(normalized)) return reverseDictionaryCache.get(normalized);

    try {
        const response = await fetch(DICTIONARY_LOOKUP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({ words: [normalized], lang: "ru-en" }),
        });
        if (!response.ok) throw new Error("Reverse dictionary lookup failed");
        const data = await response.json();
        const item = Array.isArray(data.items) ? data.items[0] : null;
        const values = item?.alternatives?.length
            ? item.alternatives
            : item?.translation
                ? [item.translation]
                : [];
        reverseDictionaryCache.set(normalized, values);
        return values;
    } catch (error) {
        console.error("Reverse suggestion lookup failed:", error);
        reverseDictionaryCache.set(normalized, []);
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
            return { term, definition, image: "" };
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
    localStorage.setItem(CURRENT_REMOTE_SET_ID_KEY, String(saved.id));
    return { id: saved.id, remote: true };
}

function createSetPayload() {
    return {
        title: setMeta.title?.trim() || "Untitled set",
        description: setMeta.description?.trim() || "",
        public: setMeta.isPublic !== false,
        cards: cards
            .map(card => ({
                term: String(card.term || "").trim(),
                definition: String(card.definition || "").trim(),
            }))
            .filter(card => card.term || card.definition),
    };
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
            term: String(card.term || "").trim(),
            definition: String(card.definition || "").trim(),
            image: card.image || "",
        }))
        .filter(card => card.term || card.definition);
    const now = new Date().toISOString();
    const localSet = {
        id: existingIndex >= 0 ? sets[existingIndex].id : createLocalSetId(),
        title: setMeta.title?.trim() || "Untitled set",
        description: setMeta.description?.trim() || "",
        isPublic: setMeta.isPublic !== false,
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

function createEmptyDraft() {
    return {
        cards: [
            { term: "", definition: "", image: "" },
            { term: "", definition: "", image: "" },
        ],
        diagram: null,
        meta: { title: "", description: "", isPublic: true },
    };
}

function createStarterDraft() {
    return {
        cards: [...defaultCards],
        diagram: null,
        meta: { title: "", description: "", isPublic: true },
    };
}

function renderVisibility() {
    visibilityButton.setAttribute("aria-pressed", String(setMeta.isPublic));
    visibilityButton.innerHTML = `
        <span aria-hidden="true">${setMeta.isPublic ? "◎" : "○"}</span>
        ${setMeta.isPublic ? "Public" : "Private"}
    `;
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
