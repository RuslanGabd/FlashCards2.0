let matchCards = [];
let selectedTile = null;
let matchedPairs = 0;

const matchTitle = document.getElementById("match-title");
const matchScore = document.getElementById("match-score");
const matchBoard = document.getElementById("match-board");
const resetMatchButton = document.getElementById("reset-match-button");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const set = await loadStudySet();
        matchTitle.textContent = set.title ? `Match: ${set.title}` : "Match terms with definitions";
        matchCards = set.cards.slice(0, 8);
        renderMatchBoard();
    } catch (error) {
        console.error("Match load failed:", error);
        matchBoard.innerHTML = `<article class="empty-editor-state"><h2>Could not load cards</h2><p>Check that the backend is running.</p></article>`;
    }
});

resetMatchButton.addEventListener("click", renderMatchBoard);

function renderMatchBoard() {
    selectedTile = null;
    matchedPairs = 0;
    matchScore.textContent = "0 matched";

    if (!matchCards.length) {
        matchBoard.innerHTML = `<article class="empty-editor-state"><h2>No cards yet</h2><p>Create a set first, then come back to Match.</p></article>`;
        return;
    }

    const tiles = matchCards.flatMap((card, index) => [
        { pairId: index, type: "term", text: card.term },
        { pairId: index, type: "definition", text: card.definition },
    ]);

    matchBoard.innerHTML = "";
    shuffleItems(tiles).forEach(tile => {
        const button = document.createElement("button");
        button.className = "match-tile";
        button.type = "button";
        button.dataset.pairId = String(tile.pairId);
        button.dataset.type = tile.type;
        button.textContent = tile.text;
        button.addEventListener("click", () => handleTileClick(button));
        matchBoard.appendChild(button);
    });
}

function handleTileClick(tile) {
    if (tile.classList.contains("matched") || tile === selectedTile) return;

    if (!selectedTile) {
        selectedTile = tile;
        tile.classList.add("selected");
        return;
    }

    const isMatch = selectedTile.dataset.pairId === tile.dataset.pairId
        && selectedTile.dataset.type !== tile.dataset.type;

    if (isMatch) {
        selectedTile.classList.add("matched");
        tile.classList.add("matched");
        selectedTile.classList.remove("selected");
        matchedPairs += 1;
        matchScore.textContent = `${matchedPairs} matched`;
        selectedTile = null;

        if (matchedPairs === matchCards.length) {
            matchScore.textContent = "Complete!";
        }
        return;
    }

    tile.classList.add("wrong");
    selectedTile.classList.add("wrong");
    const previousTile = selectedTile;
    selectedTile = null;
    setTimeout(() => {
        tile.classList.remove("wrong");
        previousTile.classList.remove("wrong", "selected");
    }, 650);
}
