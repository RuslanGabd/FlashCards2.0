(() => {
    class ApiError extends Error {
        constructor(message, status = 0) { super(message); this.status = status; }
    }
    const baseURL = window.location.protocol === 'file:' ? 'http://localhost:8080' : '';
    async function request(path, { timeout = 20000, withMeta = false, ...options } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const headers = new Headers(options.headers);
        const token = localStorage.getItem('token');
        if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        try {
            const response = await fetch(`${baseURL}${path}`, { ...options, headers, signal: controller.signal });
            if (!response.ok) {
                let message = 'The request could not be completed. Please try again.';
                try { const body = await response.json(); if (typeof body.message === 'string') message = body.message; } catch { /* Keep a readable fallback for proxy errors. */ }
                if (response.status === 401) {
                    message = 'Your session has expired. Log in again to save online.';
                    localStorage.removeItem('token');
                    window.dispatchEvent(new Event('auth-changed'));
                }
                if (response.status === 429) message = 'Too many requests. Please wait a moment and try again.';
                throw new ApiError(message, response.status);
            }
            const data = response.status === 204 ? null : await response.json();
            return withMeta ? {data, hasMore:response.headers.get('X-Has-More') === 'true'} : data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(error.name === 'AbortError' ? 'The request timed out. Please try again.' : 'Unable to connect. Please try again.');
        } finally { clearTimeout(timer); }
    }
    window.AppClient = { baseURL, request, ApiError };
})();
