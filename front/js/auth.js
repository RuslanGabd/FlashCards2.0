const API_BASE_URL = AppClient.baseURL;

const showMessage = (message, isError = false) => {
    const messageElement = document.getElementById("auth-message");
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.classList.toggle("is-error", isError);
};

const loginForm = document.getElementById("login-form");
if (loginForm) {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const clearLoginError = () => {
        showMessage("");
        usernameInput.removeAttribute("aria-invalid");
        passwordInput.removeAttribute("aria-invalid");
    };

    usernameInput.addEventListener("input", clearLoginError);
    passwordInput.addEventListener("input", clearLoginError);

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submitButton.disabled) return;
        clearLoginError();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            showMessage("Enter your username or email and password.", true);
            return;
        }

        submitButton.disabled = true;
        loginForm.setAttribute("aria-busy", "true");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    usernameInput.setAttribute("aria-invalid", "true");
                    passwordInput.setAttribute("aria-invalid", "true");
                    showMessage("Incorrect username or password. Please try again.", true);
                } else if (response.status === 429) {
                    showMessage("Too many sign-in attempts. Please wait a moment and try again.", true);
                } else if (response.status >= 500) {
                    showMessage("Sign-in is temporarily unavailable. Please try again later.", true);
                } else {
                    showMessage("Unable to sign in. Check your details and try again.", true);
                }
                return;
            }

            const data = await response.json();
            if (typeof data.token !== "string" || !data.token.trim()) {
                showMessage("We couldn’t complete sign-in. Please try again.", true);
                return;
            }
            localStorage.setItem("token", data.token);
            showMessage("Logged in successfully.");
            window.location.href = "index.html";
        } catch (error) {
            showMessage(error instanceof TypeError
                ? "Unable to connect. Check your internet connection and try again."
                : "We couldn’t complete sign-in. Please try again.", true);
        } finally {
            submitButton.disabled = false;
            loginForm.removeAttribute("aria-busy");
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
