document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sets-container");

    fetch("http://localhost:8081/api/sets/public") // ← change if needed
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch sets");
            return response.json();
        })
        .then(sets => {
            if (!sets.length) {
                container.innerHTML = "<p>No public sets available.</p>";
                return;
            }

            sets.forEach(set => {
                const card = document.createElement("div");
                card.className = "card";
                card.innerHTML = `
          <h3>${set.title}</h3>
          <p>${set.description || "No description"}</p>
          <button onclick="window.location.href='flashcards.html?setId=${set.id}'">Study</button>
        `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Error loading sets:", error);
            container.innerHTML = "<p>Error loading sets.</p>";
        });
});
