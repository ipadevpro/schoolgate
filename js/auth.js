// Configuration
const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbyRUI2TRfpmiEl800HF6vw6_UZssIHFNhtwTv56SXBhdI9TMflW37bbVZUSUbr4IQdu/exec",
    ROLES: {
        STUDENT: "student",
        TEACHER: "teacher"
    }
};

// DOM Elements
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loadingOverlay = document.getElementById("loading-overlay");

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Check if user is already logged in
    checkLoggedInStatus();
    
    // Add login form event listener
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});

// Check if user is already logged in
function checkLoggedInStatus() {
    const savedUser = sessionStorage.getItem("schoolgate_user");
    
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            redirectToDashboard(user);
        } catch (error) {
            console.error("Error parsing saved user:", error);
            sessionStorage.removeItem("schoolgate_user");
        }
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    if (!username || !password) {
        showToast("Error", "Username dan password diperlukan", "error");
        return;
    }
    
    showLoading();
    
    try {
        // CORS-compliant request using URLSearchParams
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: new URLSearchParams({
                action: "login",
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save user to session storage
            sessionStorage.setItem("schoolgate_user", JSON.stringify(data.user));
            
            // Redirect based on role
            redirectToDashboard(data.user);
        } else {
            showToast("Login Gagal", data.message || "Username atau password salah", "error");
        }
    } catch (error) {
        console.error("Login error:", error);
        showToast("Error", "Terjadi kesalahan saat login. Coba lagi nanti.", "error");
    } finally {
        hideLoading();
    }
}

// Redirect to appropriate dashboard based on user role
function redirectToDashboard(user) {
    const isLocal = window.location.protocol === 'file:';

    if (user.role === CONFIG.ROLES.TEACHER) {
        // For local file:// protocol, we need to use a relative path
        // For server deployment, we can use an absolute path
        const path = isLocal ? 'teacher/dashboard.html' : '/teacher/dashboard.html';
        window.location.href = path;
    } else {
        const path = isLocal ? 'student/dashboard.html' : '/student/dashboard.html';
        window.location.href = path;
    }
}

// Show loading overlay
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
    }
}

// Hide loading overlay
function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add("hidden");
    }
}

// Show toast notification
function showToast(title, message, type = "success") {
    // Create toast element
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 bg-${type === "success" ? "green" : "red"}-500 text-white px-4 py-3 rounded-md shadow-lg z-50 animate-fade-in`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="${type === "success" ? "check-circle" : "alert-circle"}" class="h-5 w-5 mr-3"></i>
            <div>
                <p class="font-medium">${title}</p>
                <p class="text-sm">${message}</p>
            </div>
            <button class="ml-4 text-white hover:text-gray-200">
                <i data-lucide="x" class="h-4 w-4"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Initialize Lucide icons in toast
    lucide.createIcons({
        attrs: {
            class: "h-5 w-5"
        },
        elements: [toast]
    });
    
    // Add click event to close button
    toast.querySelector("button").addEventListener("click", () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 5000);
} 