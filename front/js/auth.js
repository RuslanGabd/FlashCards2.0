const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:8085" : "";

const showMessage = (message, isError = false) => {
    const messageElement = document.getElementById("auth-message");
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.style.color = isError ? "#b00020" : "#2575fc";
};

const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const data = await response.json();
            localStorage.setItem("token", data.token);
            showMessage("Logged in successfully.");
            window.location.href = "index.html";
        } catch (error) {
            showMessage(error.message || "Login failed.", true);
        }
    });
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            showMessage("Account created. You can log in now.");
            window.location.href = "login.html";
        } catch (error) {
            showMessage(error.message || "Signup failed.", true);
        }
    });
}
