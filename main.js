// Konfigurasi aplikasi
const CONFIG = {
    // Ubah URL ini ke URL endpoint Google Apps Script setelah di-deploy
    API_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
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

// Element selectors
const elements = {
    // Login section
    loginScreen: document.getElementById("loginScreen"),
    loginForm: document.getElementById("loginForm"),
    loginBtnText: document.getElementById("loginBtnText"),
    loginSpinner: document.getElementById("loginSpinner"),
    loginErrorMsg: document.getElementById("loginErrorMsg"),
    
    // App section
    appScreen: document.getElementById("appScreen"),
    userInitials: document.getElementById("userInitials"),
    userName: document.getElementById("userName"),
    logoutBtn: document.getElementById("logoutBtn"),
    notificationBtn: document.getElementById("notificationBtn"),
    notificationCount: document.getElementById("notificationCount"),
    notificationDropdown: document.getElementById("notificationDropdown"),
    notificationsList: document.getElementById("notificationsList"),
    profileBtn: document.getElementById("profileBtn"),
    profileDropdown: document.getElementById("profileDropdown"),
    
    // Tab links
    tabLinks: document.querySelectorAll(".tab-link"),
    disciplineTabLink: document.getElementById("disciplineTabLink"),
    studentsTabLink: document.getElementById("studentsTabLink"),
    
    // Tab content
    tabContents: document.querySelectorAll(".tab-content"),
    permissionSection: document.getElementById("permissionSection"),
    disciplineSection: document.getElementById("disciplineSection"),
    dashboardSection: document.getElementById("dashboardSection"),
    
    // Modal
    modalContainer: document.getElementById("modalContainer"),
    modalContent: document.getElementById("modalContent"),
    
    // Toast notification
    notificationToast: document.getElementById("notificationToast"),
    toastTitle: document.getElementById("toastTitle"),
    toastMessage: document.getElementById("toastMessage"),
    closeToastBtn: document.getElementById("closeToastBtn")
};

// ==============================================
// INITIALIZATION AND EVENT LISTENERS
// ==============================================

document.addEventListener("DOMContentLoaded", () => {
    // Verifikasi koneksi ke API
    verifyApiConnection();
    
    // Check if user is already logged in
    checkLoginStatus();
    
    // Set up event listeners
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
    // Login form submission
    elements.loginForm.addEventListener("submit", handleLogin);
    
    // Logout button
    elements.logoutBtn.addEventListener("click", handleLogout);
    
    // Tab switching
    elements.tabLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab(link.getAttribute("data-tab"));
        });
    });
    
    // Toggle dropdowns
    elements.notificationBtn.addEventListener("click", () => {
        elements.notificationDropdown.classList.toggle("hidden");
        elements.profileDropdown.classList.add("hidden");
    });
    
    elements.profileBtn.addEventListener("click", () => {
        elements.profileDropdown.classList.toggle("hidden");
        elements.notificationDropdown.classList.add("hidden");
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
        if (!elements.notificationBtn.contains(e.target) && !elements.notificationDropdown.contains(e.target)) {
            elements.notificationDropdown.classList.add("hidden");
        }
        if (!elements.profileBtn.contains(e.target) && !elements.profileDropdown.contains(e.target)) {
            elements.profileDropdown.classList.add("hidden");
        }
    });
    
    // Close toast
    elements.closeToastBtn.addEventListener("click", () => {
        elements.notificationToast.classList.add("hidden");
    });
}

// ==============================================
// AUTHENTICATION FUNCTIONS
// ==============================================

function checkLoginStatus() {
    const savedUser = localStorage.getItem("schoolgate_user");
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            login(user);
        } catch (error) {
            console.error("Error parsing saved user:", error);
            localStorage.removeItem("schoolgate_user");
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    // Get form values
    const username = elements.loginForm.username.value.trim();
    const password = elements.loginForm.password.value.trim();
    
    if (!username || !password) {
        showError("Username dan password diperlukan");
        return;
    }
    
    // Show loading state
    setLoginLoadingState(true);
    
    try {
        // Call the API
        const response = await apiCall("login", { username, password });
        
        if (response.success) {
            // Save user to localStorage if remember me is checked
            if (elements.loginForm.remember_me.checked) {
                localStorage.setItem("schoolgate_user", JSON.stringify(response.user));
            }
            
            // Login the user
            login(response.user);
        } else {
            showError(response.message || "Login gagal, silakan coba lagi.");
        }
    } catch (error) {
        console.error("Login error:", error);
        showError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
        setLoginLoadingState(false);
    }
}

function login(user) {
    // Set user in application state
    APP_STATE.user = user;
    
    // Update UI elements
    elements.userInitials.textContent = getInitials(user.name);
    elements.userName.textContent = user.name;
    
    // Show/hide elements based on user role
    if (user.role === CONFIG.ROLES.TEACHER || user.role === CONFIG.ROLES.ADMIN) {
        elements.disciplineTabLink.classList.remove("hidden");
        elements.studentsTabLink.classList.remove("hidden");
    }
    
    // Hide login screen, show app
    elements.loginScreen.classList.add("hidden");
    elements.appScreen.classList.remove("hidden");
    
    // Load initial data
    loadUserData();
}

function handleLogout(e) {
    e.preventDefault();
    
    // Clear local storage
    localStorage.removeItem("schoolgate_user");
    
    // Reset application state
    APP_STATE = {
        user: null,
        permissions: [],
        disciplinePoints: [],
        activeTab: "permission"
    };
    
    // Show login screen, hide app
    elements.appScreen.classList.add("hidden");
    elements.loginScreen.classList.remove("hidden");
    
    // Reset login form
    elements.loginForm.reset();
    elements.loginErrorMsg.classList.add("hidden");
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
    
    // Update tab links
    elements.tabLinks.forEach(link => {
        const isActive = link.getAttribute("data-tab") === tabId;
        
        link.classList.toggle("text-blue-600", isActive);
        link.classList.toggle("bg-blue-50", isActive);
        link.classList.toggle("text-gray-700", !isActive);
        link.classList.toggle("hover:bg-blue-50", !isActive);
        link.classList.toggle("hover:text-blue-600", !isActive);
    });
    
    // Show the active tab content, hide others
    elements.tabContents.forEach(content => {
        content.classList.toggle("hidden", content.id !== `${tabId}Section`);
    });
    
    // Load data for the active tab
    loadTabData(tabId);
}

function showToast(title, message, type = "success") {
    // Set toast content
    elements.toastTitle.textContent = title;
    elements.toastMessage.textContent = message;
    
    // Set toast type
    elements.notificationToast.className = "fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg notification";
    
    if (type === "success") {
        elements.notificationToast.classList.add("bg-green-500", "text-white");
        elements.toastTitle.previousElementSibling.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else if (type === "error") {
        elements.notificationToast.classList.add("bg-red-500", "text-white");
        elements.toastTitle.previousElementSibling.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    } else if (type === "warning") {
        elements.notificationToast.classList.add("bg-yellow-500", "text-white");
        elements.toastTitle.previousElementSibling.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }
    
    // Show toast
    elements.notificationToast.classList.remove("hidden");
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        elements.notificationToast.classList.add("hidden");
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
    // Load initial data for the active tab
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
        }
    } catch (error) {
        console.error(`Error loading data for tab ${tabId}:`, error);
        showToast("Error", `Gagal memuat data: ${error.message}`, "error");
    }
}

async function loadPermissionData() {
    const user = APP_STATE.user;
    if (!user) return;
    
    try {
        const response = await apiCall("getPermissions", {
            role: user.role,
            userId: user.id
        });
        
        if (response.success) {
            APP_STATE.permissions = response.permissions || [];
            renderPermissionTable();
        } else {
            console.error("Failed to load permissions:", response.message);
        }
    } catch (error) {
        console.error("Error loading permissions:", error);
        throw error;
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
    // Implement dashboard data loading
    elements.dashboardSection.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-800">Dashboard</h2>
        </div>
        <p class="text-gray-600">Selamat datang, ${APP_STATE.user.name}!</p>
        <p class="text-gray-600">Dashboard dalam pengembangan.</p>
    `;
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

function showModal(title, content, actions) {
    // Create modal HTML
    const modalHtml = `
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <i class="fas fa-sign-out-alt text-blue-600"></i>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">${title}</h3>
                    <div class="mt-2">
                        ${content}
                    </div>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            ${actions}
        </div>
    `;
    
    // Set modal content
    elements.modalContent.innerHTML = modalHtml;
    
    // Show modal
    elements.modalContainer.classList.remove("hidden");
    
    // Add event listener to close modal when clicking outside
    elements.modalContainer.addEventListener("click", (e) => {
        if (e.target === elements.modalContainer) {
            closeModal();
        }
    });
    
    // Add event listeners to close buttons
    document.querySelectorAll(".modal-close-btn").forEach(btn => {
        btn.addEventListener("click", closeModal);
    });
}

function closeModal() {
    elements.modalContainer.classList.add("hidden");
}

function showNewPermissionModal() {
    // Form untuk mengajukan izin baru
    const content = `
        <form id="newPermissionForm">
            <div class="mb-4">
                <label for="reason" class="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                <select id="reason" name="reason" class="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" required>
                    <option value="">Pilih alasan</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Keperluan keluarga">Keperluan keluarga</option>
                    <option value="Janji dokter">Janji dokter</option>
                    <option value="Lainnya">Lainnya</option>
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label for="date" class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                    <input type="date" id="date" name="date" class="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required>
                </div>
                <div>
                    <label for="time" class="block text-sm font-medium text-gray-700 mb-1">Waktu (Opsional)</label>
                    <input type="time" id="time" name="time" class="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
            </div>
            <div class="mb-4">
                <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea id="notes" name="notes" rows="3" class="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
            </div>
        </form>
    `;
    
    const actions = `
        <button type="button" id="submitPermissionBtn" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
            Ajukan
        </button>
        <button type="button" class="modal-close-btn mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Batal
        </button>
    `;
    
    showModal("Ajukan Izin Baru", content, actions);
    
    // Event listener untuk tombol submit
    document.getElementById("submitPermissionBtn").addEventListener("click", handleSubmitPermission);
}

function showViewPermissionModal(permissionId) {
    // Find the permission in the state
    const permission = APP_STATE.permissions.find(p => p.id === permissionId);
    if (!permission) return;
    
    const statusClass = getStatusBadgeClass(permission.status);
    const statusLabel = getStatusLabel(permission.status);
    
    const content = `
        <div class="space-y-4">
            <div class="flex justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500">Status</p>
                    <p class="mt-1">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${statusLabel}
                        </span>
                    </p>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-500">Tanggal</p>
                    <p class="mt-1 text-sm text-gray-900">${formatDate(permission.date)}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-500">Waktu</p>
                    <p class="mt-1 text-sm text-gray-900">${permission.time || 'Tidak ditentukan'}</p>
                </div>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Alasan</p>
                <p class="mt-1 text-sm text-gray-900">${permission.reason}</p>
            </div>
            ${permission.notes ? `
            <div>
                <p class="text-sm font-medium text-gray-500">Catatan</p>
                <p class="mt-1 text-sm text-gray-900">${permission.notes}</p>
            </div>
            ` : ''}
            ${permission.teacherNotes ? `
            <div>
                <p class="text-sm font-medium text-gray-500">Catatan Guru</p>
                <p class="mt-1 text-sm text-gray-900">${permission.teacherNotes}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    const actions = `
        <button type="button" class="modal-close-btn w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm">
            Tutup
        </button>
    `;
    
    showModal("Detail Permintaan Izin", content, actions);
}

// ==============================================
// ACTION HANDLERS
// ==============================================

async function handleSubmitPermission() {
    const form = document.getElementById("newPermissionForm");
    const reason = form.reason.value;
    const date = form.date.value;
    const time = form.time.value;
    const notes = form.notes.value;
    
    if (!reason || !date) {
        alert("Alasan dan tanggal wajib diisi");
        return;
    }
    
    try {
        const response = await apiCall("submitPermission", {
            studentId: APP_STATE.user.id,
            reason,
            date,
            time,
            notes
        });
        
        if (response.success) {
            // Close modal
            closeModal();
            
            // Reload permissions
            await loadPermissionData();
            
            // Show success message
            showToast("Sukses", "Permintaan izin berhasil diajukan", "success");
        } else {
            showToast("Error", response.message, "error");
        }
    } catch (error) {
        console.error("Error submitting permission:", error);
        showToast("Error", "Gagal mengajukan permintaan izin", "error");
    }
}

async function handlePermissionAction(permissionId, status) {
    try {
        const response = await apiCall("updatePermission", {
            permissionId: permissionId,
            status: status,
            teacherNotes: "" // Could add a note input in the future
        });
        
        if (response.success) {
            // Reload permissions
            await loadPermissionData();
            
            // Show success message
            showToast(
                "Sukses", 
                `Permintaan izin berhasil ${status === "approved" ? "disetujui" : "ditolak"}.`, 
                "success"
            );
        } else {
            showToast("Error", response.message, "error");
        }
    } catch (error) {
        console.error("Error updating permission:", error);
        showToast("Error", "Gagal memperbarui permintaan izin", "error");
    }
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
    if (!dateStr) return "-";
    
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
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