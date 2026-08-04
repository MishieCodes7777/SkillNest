// ==================== AUTH HELPER ====================
// Include this script on any page that needs authentication

const Auth = {
    // Store token in localStorage (cookie is also set server-side)
    setToken(token) {
        localStorage.setItem("skillnest_token", token);
    },

    getToken() {
        return localStorage.getItem("skillnest_token");
    },

    removeToken() {
        localStorage.removeItem("skillnest_token");
        localStorage.removeItem("skillnest_user");
    },

    setUser(user) {
        localStorage.setItem("skillnest_user", JSON.stringify(user));
    },

    getUser() {
        const user = localStorage.getItem("skillnest_user");
        return user ? JSON.parse(user) : null;
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    // Get auth headers for API calls
    getHeaders() {
        const token = this.getToken();
        return {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
        };
    },

    // ==================== SIGNUP ====================
    async signup(name, email, password, role = "learner") {
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, email, password, role }),
            });

            const data = await res.json();

            if (data.success) {
                this.setToken(data.token);
                this.setUser(data.user);
            }

            return data;
        } catch (err) {
            return { success: false, message: "Network error. Please try again." };
        }
    },

    // ==================== LOGIN ====================
    async login(email, password) {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.success) {
                this.setToken(data.token);
                this.setUser(data.user);
            }

            return data;
        } catch (err) {
            return { success: false, message: "Network error. Please try again." };
        }
    },

    // ==================== LOGOUT ====================
    async logout() {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch (err) {
            // Ignore network errors on logout
        }

        this.removeToken();
        window.location.href = "/index.html";
    },

    // ==================== VERIFY (check if still logged in) ====================
    async verify() {
        try {
            const res = await fetch("/api/auth/verify", {
                headers: this.getHeaders(),
                credentials: "include",
            });

            const data = await res.json();
            return data.success;
        } catch (err) {
            return false;
        }
    },

    // ==================== PROTECT PAGE ====================
    // Call this on protected pages (dashboard, profile, etc.)
    async protectPage() {
        if (!this.isLoggedIn()) {
            window.location.href = "/index.html";
            return false;
        }

        const valid = await this.verify();
        if (!valid) {
            this.removeToken();
            window.location.href = "/index.html";
            return false;
        }

        return true;
    },

    // ==================== REDIRECT IF LOGGED IN ====================
    // Call this on login/signup pages to redirect if already logged in
    async redirectIfLoggedIn() {
        if (this.isLoggedIn()) {
            const valid = await this.verify();
            if (valid) {
                window.location.href = "/dashboard.html";
                return true;
            } else {
                this.removeToken();
            }
        }
        return false;
    },
};
