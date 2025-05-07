// Konfigurasi aplikasi
const CONFIG = {
    // Ubah URL ini ke URL endpoint Google Apps Script setelah di-deploy
    API_URL: "https://script.google.com/macros/s/AKfycbyNVOile8sqVVhqJX_dRctxNIWJfSv3CiRbnPNFwBWdS6OPwhVoG5ZDxmCCXWBvt23r/exec",
    ROLES: {
        STUDENT: "student",
        TEACHER: "teacher",
        ADMIN: "admin"
    }
};

// State aplikasi
let APP_STATE = {
    user: null,
    permissions: [],
    disciplinePoints: [],
    activeTab: "permission"
};

// Element selectors - Updated for new shadcn UI
const elements = {
    // Login section
    loginScreen: document.getElementById("login-screen"),
    loginForm: document.getElementById("login-form"),
    
    // App section
    appScreen: document.getElementById("app"),
    userInitials: document.getElementById("user-initial"),
    userName: document.getElementById("user-name"),
    userRole: document.getElementById("user-role"),
    logoutBtn: document.getElementById("logout-btn"),
    
    // Nav links
    navDashboard: document.getElementById("nav-dashboard"),
    navPermissions: document.getElementById("nav-permissions"),
    navDiscipline: document.getElementById("nav-discipline"),
    navStudents: document.getElementById("nav-students"),
    
    // Pages
    dashboardPage: document.getElementById("dashboard-page"),
    permissionsPage: document.getElementById("permissions-page"),
    disciplinePage: document.getElementById("discipline-page"),
    studentsPage: document.getElementById("students-page"),
    
    // Views
    studentPermissionsView: document.getElementById("student-permissions-view"),
    teacherPermissionsView: document.getElementById("teacher-permissions-view"),
    
    // Tables
    studentPermissionsTable: document.getElementById("student-permissions-table"),
    teacherPermissionsTable: document.getElementById("teacher-permissions-table"),
    
    // Buttons 
    addPermissionBtn: document.getElementById("add-permission-btn"),
    mobileSidebarToggle: document.getElementById("mobile-sidebar-toggle"),
    
    // Modal
    modal: document.getElementById("modal"),
    modalTitle: document.getElementById("modal-title"),
    modalContent: document.getElementById("modal-content"),
    modalClose: document.getElementById("modal-close"),
    
    // Other
    loadingOverlay: document.getElementById("loading-overlay"),
    pageTitle: document.getElementById("page-title"),
    teacherMenu: document.getElementById("teacher-menu"),
    sidebar: document.getElementById("sidebar")
};

// Toggle mobile sidebar function - MOVED UP before it's called
function toggleMobileSidebar() {
    if (!elements.sidebar) return;
    
    elements.sidebar.classList.toggle("open");
    document.body.classList.toggle("overflow-hidden");
    
    // Create/remove overlay
    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
        overlay.addEventListener("click", toggleMobileSidebar);
    }
    
    overlay.classList.toggle("open");
}

// ==============================================
// INITIALIZATION AND EVENT LISTENERS
// ==============================================

document.addEventListener("DOMContentLoaded", () => {
    // Verifikasi koneksi ke API
    verifyApiConnection();
    
    // Check if user is already logged in
    checkLoginStatus();
    
    // Set up event listeners - only if elements exist
    setupEventListeners();
});

// Verifikasi koneksi ke API Google Apps Script
async function verifyApiConnection() {
    try {
        const response = await fetch(CONFIG.API_URL);
        const data = await response.json();
        
        console.log("API connection successful:", data);
        
        if (!data.success) {
            console.warn("API responded with success:false");
        }
    } catch (error) {
        console.error("API connection failed:", error);
        showToast(
            "Error Koneksi API", 
            "Tidak dapat terhubung ke backend. Pastikan URL API sudah benar dan CORS diizinkan.",
            "error"
        );
    }
}

function setupEventListeners() {
    // Only add event listeners if elements exist
    
    // Login form submission
    if (elements.loginForm) {
        elements.loginForm.addEventListener("submit", handleLogin);
    }
    
    // Logout button
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener("click", handleLogout);
    }
    
    // Navigation
    if (elements.navDashboard) {
        elements.navDashboard.addEventListener("click", () => switchTab("dashboard"));
    }
    
    if (elements.navPermissions) {
        elements.navPermissions.addEventListener("click", () => switchTab("permission"));
    }
    
    if (elements.navDiscipline) {
        elements.navDiscipline.addEventListener("click", () => switchTab("discipline"));
    }
    
    if (elements.navStudents) {
        elements.navStudents.addEventListener("click", () => switchTab("students"));
    }
    
    // Mobile sidebar toggle
    if (elements.mobileSidebarToggle) {
        elements.mobileSidebarToggle.addEventListener("click", toggleMobileSidebar);
    }
    
    // Modal close
    if (elements.modalClose) {
        elements.modalClose.addEventListener("click", closeModal);
    }
    
    // Add permission button
    if (elements.addPermissionBtn) {
        elements.addPermissionBtn.addEventListener("click", showNewPermissionModal);
    }
}

// ==============================================
// AUTHENTICATION FUNCTIONS
// ==============================================

function checkLoginStatus() {
    const savedUser = sessionStorage.getItem("schoolgate_user");
    
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            APP_STATE.user = user;
            login(user);
        } catch (error) {
            console.error("Error parsing saved user:", error);
            sessionStorage.removeItem("schoolgate_user");
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    if (!username || !password) {
        showToast("Error", "Username dan password diperlukan", "error");
        return;
    }
    
    showLoading();
    
    try {
        const response = await apiCall("login", { username, password });
        
        if (response.success) {
            // Save to session
            const user = response.user;
            sessionStorage.setItem("schoolgate_user", JSON.stringify(user));
            APP_STATE.user = user;
            
            login(user);
        } else {
            showToast("Error", response.message || "Username atau password salah", "error");
        }
    } catch (error) {
        console.error("Login error:", error);
        showToast("Error", "Terjadi kesalahan saat login", "error");
    } finally {
        hideLoading();
    }
}

function login(user) {
    // Update UI
    elements.userInitials.textContent = getInitials(user.name);
    elements.userName.textContent = user.name;
    elements.userRole.textContent = user.role === CONFIG.ROLES.TEACHER ? "Guru" : "Siswa";
    
    // Show/hide elements based on role
    if (user.role === CONFIG.ROLES.TEACHER || user.role === CONFIG.ROLES.ADMIN) {
        if (elements.teacherMenu) elements.teacherMenu.classList.remove("hidden");
        if (elements.studentPermissionsView) elements.studentPermissionsView.classList.add("hidden");
        if (elements.teacherPermissionsView) elements.teacherPermissionsView.classList.remove("hidden");
    } else {
        if (elements.teacherMenu) elements.teacherMenu.classList.add("hidden");
        if (elements.studentPermissionsView) elements.studentPermissionsView.classList.remove("hidden");
        if (elements.teacherPermissionsView) elements.teacherPermissionsView.classList.add("hidden");
    }
    
    // Show app, hide login
    elements.loginScreen.classList.add("hidden");
    elements.appScreen.classList.remove("hidden");
    
    // Load initial data
    loadUserData();
}

function handleLogout(e) {
    if (e) e.preventDefault();
    
    // Clear storage
    sessionStorage.removeItem("schoolgate_user");
    APP_STATE.user = null;
    
    // Hide app, show login
    elements.appScreen.classList.add("hidden");
    elements.loginScreen.classList.remove("hidden");
    
    // Reset login form if it exists
    if (elements.loginForm) {
        elements.loginForm.reset();
    }
}

// ==============================================
// UI HELPER FUNCTIONS
// ==============================================

function setLoginLoadingState(isLoading) {
    elements.loginBtnText.textContent = isLoading ? "Loading..." : "Masuk";
    elements.loginSpinner.classList.toggle("hidden", !isLoading);
    
    // Disable form fields if loading
    const formElements = elements.loginForm.elements;
    for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = isLoading;
    }
}

function showError(message) {
    elements.loginErrorMsg.textContent = message;
    elements.loginErrorMsg.classList.remove("hidden");
}

function switchTab(tabId) {
    // Update active tab
    APP_STATE.activeTab = tabId;
    
    // Update page title
    if (elements.pageTitle) {
        elements.pageTitle.textContent = getTabTitle(tabId);
    }
    
    // Hide all pages
    if (elements.dashboardPage) elements.dashboardPage.classList.add("hidden");
    if (elements.permissionsPage) elements.permissionsPage.classList.remove("hidden");
    if (elements.disciplinePage) elements.disciplinePage.classList.add("hidden");
    if (elements.studentsPage) elements.studentsPage.classList.add("hidden");
    
    // Show active page
    switch (tabId) {
        case "dashboard":
            if (elements.dashboardPage) elements.dashboardPage.classList.remove("hidden");
            break;
        case "permission":
            if (elements.permissionsPage) elements.permissionsPage.classList.remove("hidden");
            break;
        case "discipline":
            if (elements.disciplinePage) elements.disciplinePage.classList.remove("hidden");
            break;
        case "students":
            if (elements.studentsPage) elements.studentsPage.classList.remove("hidden");
            break;
    }
    
    // Update nav links
    updateNavLinks(tabId);
    
    // Load data for the active tab
    loadTabData(tabId);
    
    // Close mobile sidebar if open
    if (elements.sidebar && elements.sidebar.classList.contains("open")) {
        toggleMobileSidebar();
    }
}

function getTabTitle(tabId) {
    switch (tabId) {
        case "dashboard": return "Dashboard";
        case "permission": return "Perizinan";
        case "discipline": return "Poin Kedisiplinan";
        case "students": return "Daftar Siswa";
        default: return "SchoolGate";
    }
}

function updateNavLinks(activeTabId) {
    // Remove active class from all nav links
    if (elements.navDashboard) {
        elements.navDashboard.classList.remove("bg-gray-100", "text-gray-900");
        elements.navDashboard.classList.add("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
    }
    
    if (elements.navPermissions) {
        elements.navPermissions.classList.remove("bg-gray-100", "text-gray-900");
        elements.navPermissions.classList.add("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
    }
    
    if (elements.navDiscipline) {
        elements.navDiscipline.classList.remove("bg-gray-100", "text-gray-900");
        elements.navDiscipline.classList.add("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
    }
    
    if (elements.navStudents) {
        elements.navStudents.classList.remove("bg-gray-100", "text-gray-900");
        elements.navStudents.classList.add("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
    }
    
    // Add active class to current tab
    switch (activeTabId) {
        case "dashboard":
            if (elements.navDashboard) {
                elements.navDashboard.classList.add("bg-gray-100", "text-gray-900");
                elements.navDashboard.classList.remove("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
            }
            break;
        case "permission":
            if (elements.navPermissions) {
                elements.navPermissions.classList.add("bg-gray-100", "text-gray-900");
                elements.navPermissions.classList.remove("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
            }
            break;
        case "discipline":
            if (elements.navDiscipline) {
                elements.navDiscipline.classList.add("bg-gray-100", "text-gray-900");
                elements.navDiscipline.classList.remove("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
            }
            break;
        case "students":
            if (elements.navStudents) {
                elements.navStudents.classList.add("bg-gray-100", "text-gray-900");
                elements.navStudents.classList.remove("text-gray-600", "hover:text-gray-900", "hover:bg-gray-50");
            }
            break;
    }
}

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
            <button class="ml-4 text-white hover:text-gray-200 close-toast">
                <i data-lucide="x" class="h-4 w-4"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Initialize Lucide icons
    lucide.createIcons({
        elements: [toast]
    });
    
    // Add click event to close button
    toast.querySelector(".close-toast").addEventListener("click", () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 5000);
}

function getInitials(name) {
    if (!name) return "UN";
    
    const parts = name.split(" ");
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ==============================================
// DATA LOADING FUNCTIONS
// ==============================================

async function loadUserData() {
    // Load data for the active tab
    loadTabData(APP_STATE.activeTab);
}

async function loadTabData(tabId) {
    try {
        switch(tabId) {
            case "permission":
                await loadPermissionData();
                break;
            case "discipline":
                await loadDisciplineData();
                break;
            case "dashboard":
                loadDashboardData();
                break;
            case "students":
                await loadStudentsData();
                break;
        }
    } catch (error) {
        console.error(`Error loading data for tab ${tabId}:`, error);
        showToast("Error", `Gagal memuat data: ${error.message}`, "error");
    }
}

async function loadPermissionData() {
    const user = APP_STATE.user;
    if (!user) return;
    
    showLoading();
    
    try {
        const response = await apiCall("getPermissions", {
            role: user.role,
            userId: user.id
        });
        
        if (response.success) {
            APP_STATE.permissions = response.permissions || [];
            
            if (user.role === CONFIG.ROLES.TEACHER) {
                if (elements.teacherPermissionsTable) {
                    renderTeacherPermissions(elements.teacherPermissionsTable, APP_STATE.permissions);
                }
            } else {
                if (elements.studentPermissionsTable) {
                    renderStudentPermissions(elements.studentPermissionsTable, APP_STATE.permissions);
                }
            }
        } else {
            console.error("Failed to load permissions:", response.message);
            showToast("Error", "Gagal memuat data izin", "error");
        }
    } catch (error) {
        console.error("Error loading permissions:", error);
        showToast("Error", "Terjadi kesalahan saat memuat data", "error");
    } finally {
        hideLoading();
    }
}

async function loadDisciplineData() {
    const user = APP_STATE.user;
    if (!user) return;
    
    try {
        if (user.role === CONFIG.ROLES.STUDENT) {
            // Students can only view their own points
            const response = await apiCall("getPoints", {
                studentId: user.id
            });
            
            if (response.success) {
                APP_STATE.disciplinePoints = response.points || [];
                APP_STATE.totalPoints = response.totalPoints || 0;
                renderStudentPointsView();
            } else {
                console.error("Failed to load points:", response.message);
            }
        } else {
            // Teachers and admins can view all students
            const students = await apiCall("getUsers", { role: "student" });
            
            if (students.success) {
                APP_STATE.students = students.users || [];
                renderTeacherDisciplineView();
            } else {
                console.error("Failed to load students:", students.message);
            }
        }
    } catch (error) {
        console.error("Error loading discipline data:", error);
        throw error;
    }
}

function loadDashboardData() {
    if (elements.dashboardPage) {
        elements.dashboardPage.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Selamat Datang</h3>
                        <p class="card-description">${APP_STATE.user ? APP_STATE.user.name : 'User'}</p>
                    </div>
                    <div class="card-content">
                        <p>Gunakan menu navigasi untuk mengelola permintaan izin dan poin kedisiplinan.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

async function loadStudentsData() {
    if (elements.studentsPage) {
        elements.studentsPage.innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Daftar Siswa</h2>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Dalam Pengembangan</h3>
                </div>
                <div class="card-content">
                    <p>Fitur ini sedang dalam tahap pengembangan.</p>
                </div>
            </div>
        `;
    }
}

// ==============================================
// RENDERING FUNCTIONS
// ==============================================

function renderPermissionTable() {
    const permissions = APP_STATE.permissions;
    const user = APP_STATE.user;
    const isTeacher = user.role === CONFIG.ROLES.TEACHER || user.role === CONFIG.ROLES.ADMIN;
    
    let html = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-2 md:mb-0">Manajemen Perizinan</h2>
            <div class="flex space-x-3">
                ${user.role === CONFIG.ROLES.STUDENT ? `
                <button id="newPermissionBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition flex items-center">
                    <i class="fas fa-plus mr-2"></i>
                    <span>Ajukan Izin</span>
                </button>
                ` : ''}
                <div class="relative">
                    <button id="filterPermissionBtn" class="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition flex items-center">
                        <i class="fas fa-filter mr-2"></i>
                        <span>Filter</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add table with permissions
    html += `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        ${isTeacher ? '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>' : ''}
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alasan</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    if (permissions.length === 0) {
        html += `
            <tr>
                <td colspan="${isTeacher ? 5 : 4}" class="px-6 py-4 text-center text-gray-500">
                    Tidak ada data permintaan izin.
                </td>
            </tr>
        `;
    } else {
        permissions.forEach(permission => {
            html += `
                <tr>
                    ${isTeacher ? `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                ${getInitials(permission.studentName)}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${permission.studentName}</div>
                                <div class="text-sm text-gray-500">${permission.studentClass}</div>
                            </div>
                        </div>
                    </td>
                    ` : ''}
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${permission.reason}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${formatDate(permission.date)}</div>
                        <div class="text-sm text-gray-500">${permission.time || 'Tidak ditentukan'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(permission.status)}">
                            ${getStatusLabel(permission.status)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        ${isTeacher && permission.status === 'pending' ? `
                            <button class="approve-btn text-green-600 hover:text-green-900 mr-3" data-id="${permission.id}">Setujui</button>
                            <button class="reject-btn text-red-600 hover:text-red-900" data-id="${permission.id}">Tolak</button>
                        ` : `
                            <button class="view-permission-btn text-blue-600 hover:text-blue-900" data-id="${permission.id}">Lihat</button>
                        `}
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Add the HTML to the permission section
    elements.permissionSection.innerHTML = html;
    
    // Add event listeners to buttons
    const newPermissionBtn = document.getElementById("newPermissionBtn");
    if (newPermissionBtn) {
        newPermissionBtn.addEventListener("click", showNewPermissionModal);
    }
    
    // Add listeners for approval buttons
    document.querySelectorAll(".approve-btn").forEach(btn => {
        btn.addEventListener("click", () => handlePermissionAction(btn.dataset.id, "approved"));
    });
    
    document.querySelectorAll(".reject-btn").forEach(btn => {
        btn.addEventListener("click", () => handlePermissionAction(btn.dataset.id, "rejected"));
    });
    
    document.querySelectorAll(".view-permission-btn").forEach(btn => {
        btn.addEventListener("click", () => showViewPermissionModal(btn.dataset.id));
    });
}

// Implementasikan fungsi render lainnya di sini
function renderStudentPointsView() {
    // TODO: Implementasi tampilan poin untuk siswa
    elements.disciplineSection.innerHTML = '<p>Tampilan poin siswa belum diimplementasikan</p>';
}

function renderTeacherDisciplineView() {
    // TODO: Implementasi tampilan manajemen poin untuk guru
    elements.disciplineSection.innerHTML = '<p>Tampilan manajemen poin untuk guru belum diimplementasikan</p>';
}

// ==============================================
// MODAL FUNCTIONS
// ==============================================

function showModal(title, content) {
    if (!elements.modal || !elements.modalTitle || !elements.modalContent) return;
    
    elements.modalTitle.textContent = title;
    elements.modalContent.innerHTML = content;
    elements.modal.classList.remove("hidden");
}

function closeModal() {
    if (!elements.modal) return;
    elements.modal.classList.add("hidden");
}

function showNewPermissionModal() {
    const content = `
        <form id="new-permission-form" class="space-y-4">
            <div class="space-y-2">
                <label for="reason" class="text-sm font-medium">Alasan Izin</label>
                <input type="text" id="reason" class="input" required placeholder="Masukkan alasan izin">
            </div>
            <div class="space-y-2">
                <label for="date" class="text-sm font-medium">Tanggal</label>
                <input type="date" id="date" class="input" required>
            </div>
            <div class="space-y-2">
                <label for="time" class="text-sm font-medium">Waktu (Opsional)</label>
                <input type="time" id="time" class="input">
            </div>
            <div class="space-y-2">
                <label for="notes" class="text-sm font-medium">Catatan Tambahan (Opsional)</label>
                <textarea id="notes" class="input h-24" placeholder="Masukkan catatan tambahan jika diperlukan"></textarea>
            </div>
            <div class="flex justify-end space-x-2">
                <button type="button" id="cancel-btn" class="btn btn-outline">Batal</button>
                <button type="submit" class="btn btn-primary">Ajukan Izin</button>
            </div>
        </form>
    `;
    
    showModal("Ajukan Izin Baru", content);
    
    // Set default date to today
    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    // Add event listeners
    const cancelBtn = document.getElementById("cancel-btn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeModal);
    }
    
    const form = document.getElementById("new-permission-form");
    if (form) {
        form.addEventListener("submit", handleSubmitPermission);
    }
}

function showViewPermissionModal(permissionId) {
    const permission = APP_STATE.permissions.find(p => p.id === permissionId);
    if (!permission) {
        showToast("Error", "Data izin tidak ditemukan", "error");
        return;
    }
    
    showModal(
        "Detail Permintaan Izin",
        `
        <div class="space-y-4">
            <div>
                <p class="text-sm font-medium text-gray-500">Siswa</p>
                <p>${permission.studentName || 'Siswa'} ${permission.studentClass ? `(${permission.studentClass})` : ''}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Tanggal</p>
                <p>${formatDate(permission.date)}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Alasan</p>
                <p>${permission.reason}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Status</p>
                <p>
                    <span class="badge badge-${permission.status === 'approved' ? 'approved' : permission.status === 'rejected' ? 'rejected' : 'pending'}">
                        ${permission.status === 'approved' ? 'Disetujui' : permission.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                    </span>
                </p>
            </div>
            ${permission.notes ? `
            <div>
                <p class="text-sm font-medium text-gray-500">Catatan Siswa</p>
                <p>${permission.notes}</p>
            </div>
            ` : ''}
            ${permission.teacherNotes ? `
            <div>
                <p class="text-sm font-medium text-gray-500">Catatan Guru</p>
                <p>${permission.teacherNotes}</p>
            </div>
            ` : ''}
            <div class="flex justify-end pt-2">
                <button id="close-detail-btn" class="btn btn-outline">Tutup</button>
            </div>
        </div>
        `
    );
    
    document.getElementById('close-detail-btn').addEventListener('click', closeModal);
}

// ==============================================
// ACTION HANDLERS
// ==============================================

async function handleSubmitPermission(e) {
    e.preventDefault();
    
    const reason = document.getElementById("reason").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value || "";
    const notes = document.getElementById("notes").value || "";
    
    submitPermission(reason, date, time, notes);
}

async function submitPermission(reason, date, time, notes) {
    try {
        closeModal();
        showLoading();
        
        const response = await apiCall("submitPermission", {
            studentId: APP_STATE.user.id,
            reason,
            date,
            time,
            notes
        });
        
        if (response.success) {
            showToast("Sukses", "Permintaan izin berhasil diajukan", "success");
            await loadPermissionData();
        } else {
            showToast("Error", response.message || "Gagal mengajukan izin", "error");
        }
    } catch (error) {
        console.error("Error submitting permission:", error);
        showToast("Error", "Terjadi kesalahan saat mengajukan izin", "error");
    } finally {
        hideLoading();
    }
}

async function handlePermissionAction(permissionId, status) {
    showModal(
        status === 'approved' ? 'Setujui Izin' : 'Tolak Izin',
        `
        <form id="permission-action-form" class="space-y-4">
            <div class="space-y-2">
                <label for="teacher-notes" class="text-sm font-medium">Catatan (opsional)</label>
                <textarea id="teacher-notes" class="input h-24" placeholder="Masukkan catatan jika diperlukan"></textarea>
            </div>
            <div class="flex justify-end space-x-2">
                <button type="button" id="cancel-action" class="btn btn-outline">Batal</button>
                <button type="submit" class="btn ${status === 'approved' ? 'btn-primary' : 'btn-destructive'}">
                    ${status === 'approved' ? 'Setujui' : 'Tolak'}
                </button>
            </div>
        </form>
        `
    );
    
    document.getElementById('cancel-action').addEventListener('click', closeModal);
    document.getElementById('permission-action-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const teacherNotes = document.getElementById('teacher-notes').value;
        updatePermissionStatus(permissionId, status, teacherNotes);
    });
}

// ==============================================
// API HELPER FUNCTIONS
// ==============================================

async function apiCall(action, params = {}) {
    try {
        // Create form data for POST request - menggunakan URLSearchParams sesuai panduan CORS
        const formData = new URLSearchParams({
            action: action,
            ...params
        });
        
        // Make the API call
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: formData
            // Tidak menambahkan custom header untuk menghindari preflight OPTIONS
        });
        
        // Parse the response
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`API call error (${action}):`, error);
        throw error;
    }
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return dateStr;
    }
    
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "approved":
            return "bg-green-100 text-green-800";
        case "rejected":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

function getStatusLabel(status) {
    switch (status) {
        case "pending":
            return "Menunggu";
        case "approved":
            return "Disetujui";
        case "rejected":
            return "Ditolak";
        default:
            return status;
    }
}

// Loading helpers
function showLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove("hidden");
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add("hidden");
    }
}

// Helper functions for rendering permissions
function renderStudentPermissions(tableElement, permissions) {
    if (!tableElement) return;
    
    if (permissions.length === 0) {
        tableElement.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    Tidak ada data permintaan izin
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date, newest first
    permissions.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
    
    tableElement.innerHTML = permissions.map(p => `
        <tr>
            <td class="px-6 py-4">${formatDate(p.date)}</td>
            <td class="px-6 py-4">${p.reason}</td>
            <td class="px-6 py-4">
                <span class="badge badge-${p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending'}">
                    ${p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                </span>
            </td>
            <td class="px-6 py-4">${p.teacherNotes || '-'}</td>
        </tr>
    `).join('');
}

function renderTeacherPermissions(tableElement, permissions) {
    if (!tableElement) return;
    
    if (permissions.length === 0) {
        tableElement.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    Tidak ada data permintaan izin
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort permissions: pending first, then by date
    permissions.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date);
    });
    
    tableElement.innerHTML = permissions.map(p => `
        <tr>
            <td class="px-6 py-4">${p.studentName || 'Siswa'} ${p.studentClass ? `(${p.studentClass})` : ''}</td>
            <td class="px-6 py-4">${formatDate(p.date)}</td>
            <td class="px-6 py-4">${p.reason}</td>
            <td class="px-6 py-4">
                <span class="badge badge-${p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending'}">
                    ${p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                </span>
            </td>
            <td class="px-6 py-4">
                ${p.status === 'pending' ? `
                    <div class="flex space-x-2">
                        <button class="btn btn-outline py-1 px-2 h-8 approve-btn" data-id="${p.id}">
                            <i data-lucide="check" class="h-4 w-4"></i>
                        </button>
                        <button class="btn btn-outline py-1 px-2 h-8 reject-btn" data-id="${p.id}">
                            <i data-lucide="x" class="h-4 w-4"></i>
                        </button>
                    </div>
                ` : `
                    <button class="btn btn-outline py-1 px-2 h-8 view-btn" data-id="${p.id}">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                `}
            </td>
        </tr>
    `).join('');
    
    // Initialize Lucide icons
    lucide.createIcons({
        elements: [tableElement]
    });
    
    // Add event listeners to buttons
    tableElement.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', e => handlePermissionAction(e.currentTarget.dataset.id, 'approved'));
    });
    
    tableElement.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', e => handlePermissionAction(e.currentTarget.dataset.id, 'rejected'));
    });
    
    tableElement.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', e => showViewPermissionModal(e.currentTarget.dataset.id));
    });
}

// Function to update permission status
async function updatePermissionStatus(permissionId, status, teacherNotes) {
    closeModal();
    showLoading();
    
    try {
        const response = await apiCall("updatePermission", {
            permissionId,
            status,
            teacherNotes: teacherNotes || "",
            teacherId: APP_STATE.user.id
        });
        
        if (response.success) {
            showToast(
                "Sukses", 
                `Permintaan izin berhasil ${status === "approved" ? "disetujui" : "ditolak"}`, 
                "success"
            );
            await loadPermissionData();
        } else {
            showToast("Error", response.message || "Gagal memperbarui status izin", "error");
        }
    } catch (error) {
        console.error("Error updating permission status:", error);
        showToast("Error", "Terjadi kesalahan saat memperbarui status izin", "error");
    } finally {
        hideLoading();
    }
} 