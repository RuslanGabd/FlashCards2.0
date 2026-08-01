const EDITOR_DRAFT_KEY = "words-up-editor-draft";
const LOCAL_SETS_KEY = "words-up-local-sets";
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8081" : "";

let librarySets = [];

const searchInput = document.getElementById("sets-search");
const draftContainer = document.getElementById("draft-sets-container");
const savedSetsContainer = document.getElementById("saved-sets-container");

document.addEventListener("DOMContentLoaded", () => {
    renderDraft();
    renderLocalSets();
    loadSavedSets();
});

searchInput.addEventListener("input", () => {
    renderLocalSets();
    renderPublicSets(librarySets);
});

function renderDraft() {
    const draft = loadDraft();
    draftContainer.innerHTML = "";

    if (!draft.cards.length) {
        draftContainer.innerHTML = `
            <article class="activity-item">
                <div class="set-thumb">+</div>
                <div>
                    <p class="set-meta">No local draft</p>
                    <h3>Create your first study set</h3>
                    <p class="set-description">Start from scratch or send words from text.</p>
                </div>
                <a class="study-link" href="edit-set.html?new=1">Create</a>
            </article>
        `;
        return;
    }

    const title = draft.meta.title || "Untitled draft";
    draftContainer.innerHTML = `
        <article class="activity-item clickable-set" data-set-url="flashcards.html">
            <div class="set-thumb">${getInitials(title)}</div>
            <div>
                <p class="set-meta">Local draft · ${draft.cards.length} cards</p>
                <h3>${escapeHtml(title)}</h3>
                <p class="set-description">${escapeHtml(draft.meta.description || "Saved in this browser")}</p>
            </div>
            <div class="set-actions">
                <a class="study-link" href="flashcards.html">Study</a>
                <a class="study-link secondary-study-link" href="edit-set.html">Edit</a>
            </div>
        </article>
    `;
}

function renderLocalSets() {
    const localSets = loadLocalSets();
    const query = searchInput.value.trim().toLowerCase();
    const filteredSets = localSets.filter(set =>
        `${set.title || ""} ${set.description || ""}`.toLowerCase().includes(query)
    );

    const existingLocalSection = document.getElementById("local-sets-section");
    if (existingLocalSection) {
        existingLocalSection.remove();
    }

    if (!filteredSets.length) return;

    const section = document.createElement("section");
    section.className = "activity-section";
    section.id = "local-sets-section";
    section.innerHTML = `
        <h2>Saved local sets</h2>
        <div class="activity-list" id="local-sets-container"></div>
    `;
    savedSetsContainer.closest(".activity-section").before(section);

    const localContainer = section.querySelector("#local-sets-container");
    filteredSets.forEach(set => {
        const item = document.createElement("article");
        item.className = "activity-item clickable-set";
        item.dataset.setUrl = `flashcards.html?localSetId=${encodeURIComponent(set.id)}`;
        item.innerHTML = `
            <div class="set-thumb">${getInitials(set.title)}</div>
            <div class="activity-copy">
                <p class="set-meta">Local set · ${set.cards?.length || 0} cards</p>
                <h3>${escapeHtml(set.title || "Untitled set")}</h3>
                <p class="set-description">${escapeHtml(set.description || "Saved in this browser")}</p>
            </div>
            <a class="study-link" href="flashcards.html?localSetId=${encodeURIComponent(set.id)}">Study</a>
        `;
        localContainer.appendChild(item);
    });
}

async function loadSavedSets() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}${token ? "/api/sets/me" : "/api/sets/public"}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error("Failed to fetch sets");
        librarySets = await response.json();
        renderPublicSets(librarySets);
    } catch (error) {
        console.error("Error loading sets:", error);
        savedSetsContainer.innerHTML = `
            <article class="activity-item">
                <div class="set-thumb">!</div>
                <div>
                    <p class="set-meta">Connection problem</p>
                    <h3>Error loading sets</h3>
                    <p class="set-description">Check that the backend is running on localhost:8081.</p>
                </div>
            </article>
        `;
    }
}

function renderPublicSets(sets) {
    const query = searchInput.value.trim().toLowerCase();
    const filteredSets = sets.filter(set =>
        `${set.title || ""} ${set.description || ""} ${set.ownerUsername || ""}`.toLowerCase().includes(query)
    );

    if (!filteredSets.length) {
        savedSetsContainer.innerHTML = `
            <article class="activity-item">
                <div class="set-thumb">WU</div>
                <div>
                    <p class="set-meta">${query ? "No matches" : getAuthToken() ? "No account sets yet" : "No public sets yet"}</p>
                    <h3>${query ? "Try another search" : "Your library is waiting"}</h3>
                    <p class="set-description">Create a set while logged in to see it here on every device.</p>
                </div>
                <a class="study-link" href="edit-set.html?new=1">Create</a>
            </article>
        `;
        return;
    }

    savedSetsContainer.innerHTML = "";
    filteredSets.forEach(set => {
        const item = document.createElement("article");
        item.className = "activity-item clickable-set";
        item.dataset.setUrl = `flashcards.html?setId=${set.id}`;
        item.innerHTML = `
            <div class="set-thumb">${getInitials(set.title)}</div>
            <div class="activity-copy">
                <p class="set-meta">Public set · ${escapeHtml(set.ownerUsername || "Words Up")}</p>
                <h3>${escapeHtml(set.title)}</h3>
                <p class="set-description">${escapeHtml(set.description || "No description")}</p>
            </div>
            <a class="study-link" href="flashcards.html?setId=${set.id}">Study</a>
        `;
        savedSetsContainer.appendChild(item);
    });
}

document.addEventListener("click", event => {
    if (event.target.closest("a, button, input, select, textarea")) return;

    const setItem = event.target.closest(".clickable-set");
    if (!setItem?.dataset.setUrl) return;
    window.location.href = setItem.dataset.setUrl;
});

function loadDraft() {
    try {
        const draft = JSON.parse(localStorage.getItem(EDITOR_DRAFT_KEY));
        return {
            cards: Array.isArray(draft?.cards) ? draft.cards : [],
            meta: {
                title: draft?.meta?.title || "",
                description: draft?.meta?.description || "",
            },
        };
    } catch {
        return { cards: [], meta: { title: "", description: "" } };
    }
}

function loadLocalSets() {
    try {
        const sets = JSON.parse(localStorage.getItem(LOCAL_SETS_KEY));
        return Array.isArray(sets) ? sets : [];
    } catch {
        return [];
    }
}

function getAuthToken() {
    return localStorage.getItem("token") || "";
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
