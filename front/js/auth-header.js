(() => {
    let expiryTimer;

    function updateHeader() {
        clearTimeout(expiryTimer);
        const token = localStorage.getItem("token");
        let username = "";

        if (token) {
            try {
                const parts = token.split(".");
                if (parts.length !== 3) throw new Error("Invalid token");
                const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
                const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
                const remaining = claims.exp * 1000 - Date.now();
                if (typeof claims.sub !== "string" || !claims.sub.trim()
                    || !Number.isFinite(remaining) || remaining <= 0) {
                    throw new Error("Invalid or expired session");
                }

                // The API validates the token; its subject supplies the display name,
                // including when the user signed in with an email address.
                username = claims.sub;
                expiryTimer = setTimeout(updateHeader, Math.min(remaining, 2147483647));
            } catch {
                localStorage.removeItem("token");
            }
        }

        document.querySelectorAll("[data-auth-guest]").forEach(link => {
            link.hidden = Boolean(username);
        });
        document.querySelectorAll("[data-auth-user]").forEach(link => {
            link.textContent = username;
            link.hidden = !username;
        });
    }

    updateHeader();
    window.addEventListener("pageshow", updateHeader);
    window.addEventListener("storage", event => {
        if (event.key === "token" || event.key === null) updateHeader();
    });
})();
