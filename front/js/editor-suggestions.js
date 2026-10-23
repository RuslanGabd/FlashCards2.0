(() => {
    window.createEditorSuggestions = ({getCards, getSetLanguage, getAuthToken, editorCards, suggestionsToggle,
        saveDraft, renderCards, focusCard, updateDuplicateTermWarnings, escapeHtml, escapeAttribute}) => {
    let activeSuggestionInput = null;
    let activeSuggestionIndex = -1;
    const dictionaryCache = new Map(), reverseDictionaryCache = new Map(), autoFilledTerms = new Map();
    const DICTIONARY_LOOKUP_URL = AppClient.baseURL + '/api/dictionary/lookup';
const termSuggestionWords = [
    "accomplish", "achieve", "answer", "beautiful", "become", "build", "change", "close",
    "connection", "create", "development", "door", "easy", "education", "encourage",
    "example", "flashcard", "get", "give", "known", "learn", "make", "master", "mastery",
    "myth", "practice", "read", "responsibility", "sentence", "set", "steep", "steeped",
    "steeple", "study", "term", "text", "time", "translation", "unknown", "word",
];
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

    getCards().forEach(card => {
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
    const card = getCards()[index];
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
    const existingTerms = getCards()
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
    const card = getCards()[index];
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
    const card = getCards()[index];
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
    const card = getCards()[index];
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


    return { applySuggestions, handleSuggestionInput, handleSuggestionKeydown, applyFieldSuggestion, hideAllSuggestions,
        clear: () => { dictionaryCache.clear(); reverseDictionaryCache.clear(); autoFilledTerms.clear(); hideAllSuggestions(); } };
    };
})();
