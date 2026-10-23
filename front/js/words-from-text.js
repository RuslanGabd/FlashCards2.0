const EDITOR_DRAFT_KEY = "words-up-editor-draft";
const CURRENT_LOCAL_SET_ID_KEY = "words-up-current-local-set-id";
const CURRENT_REMOTE_SET_ID_KEY = "words-up-current-remote-set-id";
const MY_TEXTS_KEY = "words-up-my-texts";
const API_BASE_URL = AppClient.baseURL;
const DICTIONARY_LOOKUP_URL = `${API_BASE_URL}/api/dictionary/lookup`;
const PDF_TEXT_URL = `${API_BASE_URL}/api/documents/pdf-text`;
const TRANSLATION_CHUNK_SIZE = 25;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const dictionary = {
    a: "артикль / один",
    about: "о, около",
    accomplish: "выполнять, достигать",
    after: "после",
    all: "все",
    and: "и",
    answer: "ответ",
    are: "являются",
    as: "как",
    ask: "спрашивать",
    at: "в, на",
    back: "назад",
    be: "быть",
    because: "потому что",
    become: "становиться",
    before: "до",
    book: "книга",
    build: "строить",
    but: "но",
    by: "кем-то, чем-то",
    can: "мочь",
    card: "карточка",
    change: "изменение, менять",
    close: "закрывать",
    come: "приходить",
    create: "создавать",
    day: "день",
    definition: "определение",
    do: "делать",
    door: "дверь",
    easy: "лёгкий",
    encourage: "поощрять",
    every: "каждый",
    face: "лицо",
    file: "файл",
    find: "находить",
    flashcard: "карточка для запоминания",
    for: "для",
    from: "из, от",
    get: "получать",
    give: "давать",
    go: "идти",
    good: "хороший",
    have: "иметь",
    here: "здесь",
    in: "в",
    is: "является",
    it: "это",
    know: "знать",
    known: "известный",
    learn: "учить",
    list: "список",
    make: "делать; заставлять",
    master: "мастер",
    mastery: "мастерство",
    may: "может",
    myth: "миф",
    new: "новый",
    no: "нет",
    noun: "существительное",
    of: "из, о",
    on: "на",
    or: "или",
    path: "путь",
    practice: "практика",
    read: "читать",
    replay: "повтор",
    sample: "пример",
    sentence: "предложение",
    set: "набор",
    she: "она",
    study: "учить",
    term: "термин",
    text: "текст",
    the: "определённый артикль",
    time: "время",
    to: "к",
    translation: "перевод",
    type: "тип; печатать",
    unknown: "неизвестный",
    upload: "загружать",
    url: "URL-адрес",
    verb: "глагол",
    with: "с",
    word: "слово",
    words: "слова",
    young: "молодой",
};

const commonWords = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "to", "of", "in", "on", "at", "for", "from",
    "by", "with", "as", "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
    "those", "it", "its", "he", "she", "they", "we", "you", "i", "me", "my", "your", "his", "her",
    "their", "our", "not", "no", "yes", "do", "does", "did", "have", "has", "had",
]);

let words = [];
let statusFilter = "all";
let currentTextId = null;
let isTranslating = false;

const textUrl = document.getElementById("text-url");
const loadUrlButton = document.getElementById("load-url-button");
const textFile = document.getElementById("text-file");
const fileName = document.getElementById("file-name");
const textTitle = document.getElementById("text-title");
const sourceText = document.getElementById("source-text");
const analyzeTextButton = document.getElementById("analyze-text-button");
const sampleTextButton = document.getElementById("sample-text-button");
const clearTextButton = document.getElementById("clear-text-button");
const addTextTab = document.getElementById("add-text-tab");
const myTextsTab = document.getElementById("my-texts-tab");
const myTextsPanel = document.getElementById("my-texts-panel");
const myTextsList = document.getElementById("my-texts-list");
const clearTextsButton = document.getElementById("clear-texts-button");
const sendToCardsButton = document.getElementById("send-to-cards-button");
const results = document.getElementById("word-list");
const wordsContainer = document.getElementById("words-container");
const wordsTotal = document.getElementById("words-total");
const newCount = document.getElementById("new-count");
const studyCount = document.getElementById("study-count");
const knownCount = document.getElementById("known-count");
const wordSearch = document.getElementById("word-search");
const sortWords = document.getElementById("sort-words");
const statusSelect = document.getElementById("status-select");
const translateMissingButton = document.getElementById("translate-missing-button");
const statusButtons = document.querySelectorAll("[data-status-filter]");
const toast = document.getElementById("toast");

renderSavedTexts();

addTextTab.addEventListener("click", () => {
    showAddTextView();
});

myTextsTab.addEventListener("click", () => {
    showMyTextsView();
});

analyzeTextButton.addEventListener("click", analyzeCurrentText);

sampleTextButton.addEventListener("click", () => {
    textTitle.value = "mastery-george-leonard";
    sourceText.value = "It's easy to get on the path of mastery. Time provides no replays. The master closes the door in the young man's face. She makes corrections, gives encouragement, and keeps practicing every day.";
    analyzeCurrentText();
});

textFile.addEventListener("change", async () => {
    const file = textFile.files?.[0];
    if (!file) return;

    fileName.textContent = file.name;
    if (isPdfFile(file)) {
        await loadPdfFile(file);
        return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        sourceText.value = String(reader.result || "");
        if (!textTitle.value.trim()) textTitle.value = file.name.replace(/\.[^.]+$/, "");
        analyzeCurrentText();
    });
    reader.readAsText(file);
});

async function loadPdfFile(file) {
    if (file.size > MAX_PDF_BYTES) {
        showToast("PDF file must not exceed 10 MB");
        textFile.value = "";
        return;
    }

    const token = localStorage.getItem("token") || "";
    if (!token) {
        showToast("Log in to process PDF files");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    textFile.disabled = true;
    fileName.textContent = `Reading ${file.name}...`;

    try {
        const response = await fetch(PDF_TEXT_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        if (!response.ok) {
            throw new Error(await readApiError(response, "Could not read PDF"));
        }

        const result = await response.json();
        sourceText.value = String(result.text || "");
        if (!textTitle.value.trim()) {
            textTitle.value = file.name.replace(/\.pdf$/i, "");
        }
        fileName.textContent = `${file.name} - ${result.pageCount} pages`;
        await analyzeCurrentText();
    } catch (error) {
        console.error("PDF processing failed:", error);
        fileName.textContent = file.name;
        showToast(error.message || "Could not read PDF");
    } finally {
        textFile.disabled = false;
    }
}

function isPdfFile(file) {
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

async function readApiError(response, fallback) {
    try {
        const error = await response.json();
        return error.message || fallback;
    } catch {
        return fallback;
    }
}

loadUrlButton.addEventListener("click", async () => {
    const url = textUrl.value.trim();
    if (!url) {
        showToast("Enter URL first");
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("URL failed");
        const html = await response.text();
        sourceText.value = htmlToText(html);
        if (!textTitle.value.trim()) textTitle.value = new URL(url).hostname;
        analyzeCurrentText();
    } catch (error) {
        console.error(error);
        showToast("This URL blocks loading. Paste the text instead");
    }
});

clearTextButton.addEventListener("click", () => {
    textTitle.value = "";
    sourceText.value = "";
    textUrl.value = "";
    fileName.textContent = "No file chosen";
    words = [];
    currentTextId = null;
    results.hidden = true;
    wordsContainer.innerHTML = "";
    showToast("Text cleared");
});

clearTextsButton.addEventListener("click", () => {
    if (!getSavedTexts().length) {
        showToast("No saved texts yet");
        return;
    }

    if (!confirm("Delete all saved texts?")) return;
    localStorage.setItem(MY_TEXTS_KEY, JSON.stringify([]));
    renderSavedTexts();
    showToast("Saved texts cleared");
});

sendToCardsButton.addEventListener("click", () => {
    if (!words.length) {
        showToast("Analyze text first");
        return;
    }

    sendWordsToCards(words, textTitle.value.trim() || "Words from text");
});

wordSearch.addEventListener("input", renderWords);
sortWords.addEventListener("change", renderWords);
statusSelect.addEventListener("change", () => {
    statusFilter = statusSelect.value;
    syncStatusControls();
    renderWords();
});

translateMissingButton.addEventListener("click", async () => {
    if (!words.length) {
        showToast("Analyze text first");
        return;
    }

    await lookupDictionaryTranslations(words, { renderProgress: true });
    saveCurrentText();
    renderWords();
});

statusButtons.forEach(button => {
    button.addEventListener("click", () => {
        statusFilter = button.dataset.statusFilter;
        syncStatusControls();
        renderWords();
    });
});

wordsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-word-status]");
    if (!button) return;

    const word = words.find(item => item.word === button.dataset.word);
    if (!word) return;

    word.status = button.dataset.wordStatus;
    saveCurrentText();
    updateSummary();
    renderWords();
});

myTextsList.addEventListener("click", event => {
    const button = event.target.closest("[data-text-action]");
    if (!button) return;

    const id = button.dataset.textId;
    const savedText = getSavedTexts().find(item => item.id === id);
    if (!savedText && button.dataset.textAction !== "delete") return;

    if (button.dataset.textAction === "open") {
        openSavedText(savedText);
    }

    if (button.dataset.textAction === "cards") {
        sendWordsToCards(savedText.words, savedText.title);
    }

    if (button.dataset.textAction === "delete") {
        deleteSavedText(id);
    }
});

async function analyzeCurrentText() {
    const text = sourceText.value.trim();
    if (!text) {
        showToast("Paste or load text first");
        sourceText.focus();
        return;
    }

    words = extractWords(text);
    results.hidden = false;
    syncStatusControls();
    renderWords();
    await lookupDictionaryTranslations(words, { renderProgress: true });
    currentTextId = saveProcessedText({
        id: currentTextId,
        title: textTitle.value.trim() || "Untitled text",
        text,
        words,
    });
    renderWords();
    renderSavedTexts();
    showToast(`${words.length} unique words found`);
}

async function lookupDictionaryTranslations(wordItems, options = {}) {
    const missingWords = wordItems.filter(item =>
        item.translation === "needs translation"
        || !Array.isArray(item.alternatives)
        || !item.alternatives.length
        || !item.partOfSpeech
    );

    if (!missingWords.length) return;
    if (isTranslating) return;

    isTranslating = true;
    translateMissingButton.disabled = true;
    showToast(`Looking up ${missingWords.length} words...`);

    try {
        for (let index = 0; index < missingWords.length; index += TRANSLATION_CHUNK_SIZE) {
            const chunk = missingWords.slice(index, index + TRANSLATION_CHUNK_SIZE);
            const dictionaryItems = await requestDictionaryItems(chunk.map(item => item.word));

            chunk.forEach(item => {
                const dictionaryItem = dictionaryItems.find(result => result.word === item.word);
                if (!dictionaryItem) return;

                if (dictionaryItem.translation) item.translation = dictionaryItem.translation;
                item.alternatives = dictionaryItem.alternatives || [];
                item.partOfSpeech = dictionaryItem.partOfSpeech || item.partOfSpeech || "";
                item.transcription = dictionaryItem.transcription || item.transcription || "";
            });

            if (options.renderProgress) {
                renderWords();
                showToast(`Loaded ${Math.min(index + chunk.length, missingWords.length)} of ${missingWords.length}`);
            }
        }
    } catch (error) {
        console.error("Yandex Dictionary error:", error);
        showToast("Dictionary API is not available. Check backend and API key");
    } finally {
        isTranslating = false;
        translateMissingButton.disabled = false;
    }
}

async function requestDictionaryItems(wordList) {
    const response = await fetch(DICTIONARY_LOOKUP_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ words: wordList }),
    });

    if (!response.ok) throw new Error("Dictionary lookup failed");
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
}

function showAddTextView() {
    myTextsPanel.hidden = true;
    addTextTab.classList.add("active");
    myTextsTab.classList.remove("active");
    document.querySelector(".text-loader-grid").hidden = false;
    if (words.length) results.hidden = false;
}

function showMyTextsView() {
    document.querySelector(".text-loader-grid").hidden = true;
    results.hidden = true;
    myTextsPanel.hidden = false;
    addTextTab.classList.remove("active");
    myTextsTab.classList.add("active");
    renderSavedTexts();
}

function openSavedText(savedText) {
    currentTextId = savedText.id;
    textTitle.value = savedText.title;
    sourceText.value = savedText.text;
    words = savedText.words;
    statusFilter = "all";
    showAddTextView();
    syncStatusControls();
    renderWords();
    showToast("Text opened");
}

function saveCurrentText() {
    if (!currentTextId || !words.length) return;
    currentTextId = saveProcessedText({
        id: currentTextId,
        title: textTitle.value.trim() || "Untitled text",
        text: sourceText.value.trim(),
        words,
    });
    renderSavedTexts();
}

function saveProcessedText(savedText) {
    const texts = getSavedTexts();
    const now = new Date().toISOString();
    const id = savedText.id || `text-${Date.now()}`;
    const nextText = {
        id,
        title: savedText.title,
        text: savedText.text,
        words: savedText.words,
        updatedAt: now,
        createdAt: texts.find(item => item.id === id)?.createdAt || now,
    };
    const nextTexts = [nextText, ...texts.filter(item => item.id !== id)].slice(0, 25);
    localStorage.setItem(MY_TEXTS_KEY, JSON.stringify(nextTexts));
    return id;
}

function getSavedTexts() {
    try {
        const savedTexts = JSON.parse(localStorage.getItem(MY_TEXTS_KEY));
        return Array.isArray(savedTexts) ? savedTexts : [];
    } catch {
        return [];
    }
}

function renderSavedTexts() {
    const savedTexts = getSavedTexts();
    myTextsList.innerHTML = "";

    if (!savedTexts.length) {
        myTextsList.innerHTML = `
            <article class="saved-text-card empty-saved-text">
                <h3>No saved texts yet</h3>
                <p>Analyze a text first. It will appear here automatically.</p>
            </article>
        `;
        return;
    }

    savedTexts.forEach(savedText => {
        const card = document.createElement("article");
        card.className = "saved-text-card";
        card.innerHTML = `
            <div>
                <p class="saved-text-meta">${formatDate(savedText.updatedAt)} · ${savedText.words.length} words</p>
                <h3>${escapeHtml(savedText.title)}</h3>
                <p>${escapeHtml(previewText(savedText.text))}</p>
            </div>
            <div class="saved-text-actions">
                <button class="green-action-button" data-text-action="open" data-text-id="${escapeAttribute(savedText.id)}" type="button">Open</button>
                <button class="secondary-create-button" data-text-action="cards" data-text-id="${escapeAttribute(savedText.id)}" type="button">Flashcards</button>
                <button class="danger-text-button" data-text-action="delete" data-text-id="${escapeAttribute(savedText.id)}" type="button">Delete</button>
            </div>
        `;
        myTextsList.appendChild(card);
    });
}

function deleteSavedText(id) {
    const nextTexts = getSavedTexts().filter(item => item.id !== id);
    localStorage.setItem(MY_TEXTS_KEY, JSON.stringify(nextTexts));
    if (currentTextId === id) currentTextId = null;
    renderSavedTexts();
    showToast("Text deleted");
}

function sendWordsToCards(wordItems, title) {
    const cards = wordItems
        .filter(item => item.status !== "known")
        .map(item => ({
            term: item.word,
            definition: item.translation,
            image: "",
        }));

    localStorage.removeItem(CURRENT_LOCAL_SET_ID_KEY);
    localStorage.removeItem(CURRENT_REMOTE_SET_ID_KEY);
    localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify({
        cards,
        diagram: null,
        meta: {
            title,
            description: `Generated from text: ${cards.length} words`,
            isPublic: true,
            language: "en",
        },
    }));

    window.location.href = "edit-set.html";
}

function previewText(text) {
    const preview = String(text || "").replace(/\s+/g, " ").trim();
    return preview.length > 160 ? `${preview.slice(0, 157)}...` : preview;
}

function formatDate(value) {
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function extractWords(text) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    const map = new Map();
    const tokens = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];

    tokens.forEach(token => {
        const word = normalizeWord(token);
        if (!word || word.length < 2) return;

        const item = map.get(word) || {
            word,
            translation: dictionary[word] || "needs translation",
            alternatives: dictionary[word] ? [dictionary[word]] : [],
            count: 0,
            status: commonWords.has(word) ? "known" : "new",
            partOfSpeech: guessPartOfSpeech(word),
            transcription: "",
            example: findSentence(sentences, word),
        };
        item.count += 1;
        map.set(word, item);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

function normalizeWord(word) {
    const clean = word.replace(/^'+|'+$/g, "");
    if (dictionary[clean]) return clean;

    if (clean.endsWith("ies")) {
        const singular = `${clean.slice(0, -3)}y`;
        if (dictionary[singular]) return singular;
    }
    if (clean.endsWith("ing")) {
        const base = clean.slice(0, -3);
        if (dictionary[base]) return base;
        if (dictionary[`${base}e`]) return `${base}e`;
    }
    if (clean.endsWith("ed")) {
        const base = clean.slice(0, -2);
        if (dictionary[base]) return base;
        if (dictionary[`${base}e`]) return `${base}e`;
    }
    if (clean.endsWith("s") && clean.length > 3) {
        const singular = clean.slice(0, -1);
        if (dictionary[singular] || commonWords.has(singular)) return singular;
    }
    return clean;
}

function findSentence(sentences, word) {
    return sentences.find(sentence => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(sentence))?.trim() || "";
}

function renderWords() {
    const query = wordSearch.value.trim().toLowerCase();
    const filtered = words
        .filter(item => statusFilter === "all" || item.status === statusFilter)
        .filter(item => !query || item.word.includes(query) || item.translation.toLowerCase().includes(query))
        .sort(sortWordItems);

    wordsContainer.innerHTML = "";
    if (!filtered.length) {
        wordsContainer.innerHTML = `
            <article class="word-row empty-word-row">
                <h3>No words match this filter</h3>
                <p>Try another status, search, or paste a longer text.</p>
            </article>
        `;
        updateSummary();
        return;
    }

    filtered.forEach(item => {
        const row = document.createElement("article");
        row.className = "word-row";
        row.innerHTML = `
            <div class="word-status-controls" aria-label="Status for ${escapeHtml(item.word)}">
                ${statusControl(item, "new")}
                ${statusControl(item, "study")}
                ${statusControl(item, "known")}
            </div>
            <div class="word-copy">
                <p><span class="part-label">${escapeHtml(item.partOfSpeech || guessPartOfSpeech(item.word))}</span> <strong>${escapeHtml(item.word)}</strong> — ${escapeHtml(item.translation)}</p>
                ${renderWordDetails(item)}
            </div>
            <button class="word-frequency" type="button" title="Frequency in text">${item.count}⌄</button>
        `;
        wordsContainer.appendChild(row);
    });

    updateSummary();
}

function statusControl(item, status) {
    const label = status === "study" ? "To study" : status[0].toUpperCase() + status.slice(1);
    return `
        <button
            class="${item.status === status ? "active" : ""}"
            data-word="${escapeAttribute(item.word)}"
            data-word-status="${status}"
            type="button"
            aria-label="${label}"
        ></button>
    `;
}

function renderWordDetails(item) {
    const alternatives = Array.isArray(item.alternatives)
        ? item.alternatives.filter(value => value && value !== item.translation).slice(0, 8)
        : [];
    const transcription = item.transcription ? `<span class="word-transcription">/${escapeHtml(item.transcription)}/</span>` : "";
    const alternativesHtml = alternatives.length
        ? `<span class="word-alternatives">also: ${escapeHtml(alternatives.join(", "))}</span>`
        : "";

    return `
        <small>${transcription}${alternativesHtml}</small>
        <small>${escapeHtml(item.example || "No example sentence")}</small>
    `;
}

function sortWordItems(a, b) {
    if (sortWords.value === "alphabet") return a.word.localeCompare(b.word);
    if (sortWords.value === "length") return b.word.length - a.word.length || a.word.localeCompare(b.word);
    return b.count - a.count || a.word.localeCompare(b.word);
}

function updateSummary() {
    const counts = words.reduce((acc, item) => {
        acc[item.status] += 1;
        return acc;
    }, { new: 0, study: 0, known: 0 });

    wordsTotal.textContent = `${words.length} words`;
    newCount.textContent = `${counts.new} new`;
    studyCount.textContent = `${counts.study} study`;
    knownCount.textContent = `${counts.known} known`;
}

function syncStatusControls() {
    statusSelect.value = statusFilter;
    statusButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.statusFilter === statusFilter);
    });
}

function guessPartOfSpeech(word) {
    if (word.endsWith("ly")) return "adverb";
    if (word.endsWith("tion") || word.endsWith("ness") || word.endsWith("y")) return "noun";
    if (word.endsWith("ing") || word.endsWith("ed")) return "verb";
    if (["be", "do", "get", "give", "make", "read", "study", "upload"].includes(word)) return "verb";
    return "word";
}

function htmlToText(html) {
    const documentText = new DOMParser().parseFromString(html, "text/html");
    documentText.querySelectorAll("script, style, noscript").forEach(element => element.remove());
    return documentText.body.textContent.replace(/\s+/g, " ").trim();
}

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.hidden = true;
    }, 2400);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
