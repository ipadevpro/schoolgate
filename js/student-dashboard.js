// Configuration
const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycby69qjAY4vYQClmmhdS0FgqUfxwJH6G4HbLuxzXDcDMZ4drloq-La5v7--PByeABSiT/exec",
    ROLES: {
        STUDENT: "student",
        TEACHER: "teacher"
    }
};

// Path utilities
const isLocalFile = window.location.protocol === 'file:';
function resolvePath(path) {
    return isLocalFile ? 
        path.startsWith('/') ? `.${path}` : path : 
        path;
}

// Global variables
let currentUser = null;
let userPermissions = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize icons
    lucide.createIcons();
    
    // Check if user is authenticated and is a student
    const savedUser = sessionStorage.getItem("schoolgate_user");
    if (!savedUser) {
        window.location.href = isLocalFile ? '../index.html' : '/index.html';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    if (currentUser.role !== "student") {
        window.location.href = isLocalFile ? '../index.html' : '/index.html';
        return;
    }
    
    // Set user info
    document.getElementById("student-name").textContent = currentUser.name;
    document.getElementById("student-class").textContent = currentUser.class || "-";
    
    // Setup navigation
    setupNavigation();
    
    // Load initial data
    loadDashboardData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Set current date
    const now = new Date();
    const dateString = now.toLocaleDateString('id-ID', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    if (document.getElementById('current-date')) {
        document.getElementById('current-date').textContent = dateString;
    }
    
    // Setup logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem("schoolgate_user");
        window.location.href = isLocalFile ? '../index.html' : '/index.html';
    });
});

// Setup navigation
function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            links.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all pages
            pages.forEach(page => page.classList.add('hidden'));
            
            // Show corresponding page
            const pageId = link.getAttribute('data-page');
            document.getElementById(`${pageId}-page`).classList.remove('hidden');
        });
    });
    
    // Also handle navigation from dashboard quick links
    document.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', (e) => {
            const pageId = button.getAttribute('data-page');
            
            // Find and click the corresponding nav link
            document.querySelector(`.nav-link[data-page="${pageId}"]`).click();
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Permission request modal
    const quickRequestBtn = document.getElementById('quick-request-btn');
    const newPermissionBtn = document.getElementById('new-permission-btn');
    const submitPermissionBtn = document.getElementById('submit-permission-btn');
    const reasonSelect = document.getElementById('reason');
    const permissionFilter = document.getElementById('permission-filter');
    
    if (quickRequestBtn) {
        quickRequestBtn.addEventListener('click', openPermissionModal);
    }
    
    if (newPermissionBtn) {
        newPermissionBtn.addEventListener('click', openPermissionModal);
    }
    
    if (submitPermissionBtn) {
        submitPermissionBtn.addEventListener('click', submitPermission);
    }
    
    if (reasonSelect) {
        // Show/hide "other reason" field based on selection
        reasonSelect.addEventListener('change', () => {
            const otherReasonContainer = document.getElementById('other-reason-container');
            if (reasonSelect.value === 'Lainnya') {
                otherReasonContainer.style.display = 'block';
            } else {
                otherReasonContainer.style.display = 'none';
            }
        });
    }
    
    if (permissionFilter) {
        permissionFilter.addEventListener('change', filterPermissions);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            // Find the closest modal
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}

// API call wrapper
async function callAPI(action, params = {}) {
    showLoading();
    
    try {
        const formData = new URLSearchParams({
            action,
            ...params
        });
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    } catch (error) {
        console.error(`Error calling ${action}:`, error);
        return { success: false, message: error.message };
    } finally {
        hideLoading();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load permissions
        await loadPermissions();
        
        // Update permission count in dashboard
        const pendingPermissions = userPermissions.filter(p => p.status === 'pending');
        if (document.getElementById('pending-permissions')) {
            document.getElementById('pending-permissions').textContent = pendingPermissions.length;
        }
        
        // Load recent activity
        renderRecentActivity();
        
        // Load violation points
        await loadViolationPoints();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load permissions
async function loadPermissions() {
    try {
        const result = await callAPI('getPermissions', {
            role: CONFIG.ROLES.STUDENT,
            userId: currentUser.id
        });
        
        if (result.success) {
            userPermissions = result.permissions || [];
            renderPermissionsList();
        } else {
            console.error('Error loading permissions:', result.message);
        }
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

// Render permissions list
function renderPermissionsList() {
    const permissionsList = document.getElementById('permissions-list');
    if (!permissionsList) return;
    
    // Get filter value if available
    const filterEl = document.getElementById('permission-filter');
    const filter = filterEl ? filterEl.value : 'all';
    
    // Apply filter
    let filteredPermissions = userPermissions;
    if (filter !== 'all') {
        filteredPermissions = userPermissions.filter(p => p.status === filter);
    }
    
    if (filteredPermissions.length === 0) {
        permissionsList.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-muted-foreground">
                    ${filter === 'all' ? 'Tidak ada riwayat perizinan' : 'Tidak ada perizinan dengan status tersebut'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort permissions by date (newest first)
    filteredPermissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    permissionsList.innerHTML = filteredPermissions.map(permission => {
        let statusClass = '';
        let statusText = '';
        
        if (permission.status === 'pending') {
            statusClass = 'bg-amber-100 text-amber-800';
            statusText = 'Menunggu';
        } else if (permission.status === 'approved') {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Disetujui';
        } else {
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Ditolak';
        }
        
        // Format date
        const date = new Date(permission.date);
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-6">${formattedDate}</td>
                <td class="py-3 px-6">${permission.reason}</td>
                <td class="py-3 px-6">${permission.time || '-'}</td>
                <td class="py-3 px-6">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="py-3 px-6">${permission.teacherNotes || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Filter permissions
function filterPermissions() {
    renderPermissionsList();
}

// Render recent activity
function renderRecentActivity() {
    const recentActivityEl = document.getElementById('recent-activity');
    if (!recentActivityEl) return;
    
    if (userPermissions.length === 0) {
        recentActivityEl.innerHTML = `
            <div class="p-6 text-center text-muted-foreground">
                <p>Tidak ada aktivitas terbaru</p>
            </div>
        `;
        return;
    }
    
    // Sort by timestamp (newest first) and take the first 5
    const recentActivity = [...userPermissions]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    recentActivityEl.innerHTML = recentActivity.map(activity => {
        let statusClass = '';
        let statusText = '';
        let icon = '';
        
        if (activity.status === 'pending') {
            statusClass = 'bg-amber-100 text-amber-800';
            statusText = 'Menunggu persetujuan';
            icon = 'clock';
        } else if (activity.status === 'approved') {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Perizinan disetujui';
            icon = 'check-circle';
        } else {
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Perizinan ditolak';
            icon = 'x-circle';
        }
        
        // Format date
        const date = new Date(activity.timestamp);
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short'
        });
        
        const formattedTime = date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="p-4 hover:bg-gray-50">
                <div class="flex items-start">
                    <div class="mr-3 p-2 rounded-full ${statusClass} bg-opacity-20">
                        <i data-lucide="${icon}" class="h-5 w-5 ${statusClass}"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium">${statusText}</p>
                        <p class="text-sm text-muted-foreground">${activity.reason}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-medium">${formattedDate}</p>
                        <p class="text-xs text-muted-foreground">${formattedTime}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Reinitialize icons in the newly added content
    lucide.createIcons({
        attrs: {
            class: "h-5 w-5"
        },
        elements: [recentActivityEl]
    });
}

// Load violation points
async function loadViolationPoints() {
    try {
        const result = await callAPI('getPoints', {
            studentId: currentUser.id
        });
        
        if (result.success) {
            if (document.getElementById('violation-points')) {
                document.getElementById('violation-points').textContent = result.totalPoints || 0;
            }
            
            if (document.getElementById('total-points')) {
                document.getElementById('total-points').textContent = `${result.totalPoints || 0} poin`;
            }
            
            renderPointsList(result.points || []);
        } else {
            console.error('Error loading points:', result.message);
        }
    } catch (error) {
        console.error('Error loading points:', error);
    }
}

// Render points list
function renderPointsList(points) {
    const pointsList = document.getElementById('points-list');
    if (!pointsList) return;
    
    if (points.length === 0) {
        pointsList.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-muted-foreground">
                    Tidak ada riwayat pelanggaran
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort points by date (newest first)
    points.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    pointsList.innerHTML = points.map(point => {
        // Format date
        const date = new Date(point.timestamp);
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-6">${formattedDate}</td>
                <td class="py-3 px-6">${point.violation}</td>
                <td class="py-3 px-6 font-medium">${point.points}</td>
                <td class="py-3 px-6">${point.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Open permission modal
function openPermissionModal() {
    resetPermissionForm();
    document.getElementById('permission-modal').classList.remove('hidden');
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Set default time to current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('time').value = `${hours}:${minutes}`;
}

// Reset permission form
function resetPermissionForm() {
    const form = document.getElementById('permission-form');
    if (form) form.reset();
    
    // Hide other reason field
    const otherReasonContainer = document.getElementById('other-reason-container');
    if (otherReasonContainer) otherReasonContainer.style.display = 'none';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Submit permission request
async function submitPermission() {
    const reasonSelect = document.getElementById('reason');
    const otherReasonInput = document.getElementById('other-reason');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const notesInput = document.getElementById('notes');
    
    // Validate form
    if (!reasonSelect.value) {
        alert('Pilih alasan izin');
        return;
    }
    
    if (reasonSelect.value === 'Lainnya' && !otherReasonInput.value) {
        alert('Jelaskan alasan izin');
        return;
    }
    
    if (!dateInput.value) {
        alert('Pilih tanggal izin');
        return;
    }
    
    if (!timeInput.value) {
        alert('Masukkan waktu keluar');
        return;
    }
    
    // Get reason value
    const reason = reasonSelect.value === 'Lainnya' ? otherReasonInput.value : reasonSelect.value;
    
    try {
        const result = await callAPI('submitPermission', {
            studentId: currentUser.id,
            reason: reason,
            date: dateInput.value,
            time: timeInput.value,
            notes: notesInput.value || ''
        });
        
        if (result.success) {
            closeModal('permission-modal');
            alert('Permintaan izin berhasil diajukan');
            
            // Reload permissions
            await loadPermissions();
            
            // Update dashboard data
            loadDashboardData();
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error submitting permission:', error);
        alert(`Error: ${error.message}`);
    }
}

// Show/hide loading overlay
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// Expose functions for inline HTML event handlers
window.openPermissionModal = openPermissionModal;
window.closeModal = closeModal; 