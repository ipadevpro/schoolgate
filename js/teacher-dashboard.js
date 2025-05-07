// Configuration
const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbyRUI2TRfpmiEl800HF6vw6_UZssIHFNhtwTv56SXBhdI9TMflW37bbVZUSUbr4IQdu/exec",
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
let allStudents = [];
let allPermissions = [];
let allPoints = [];
let lateStudents = []; // Mock data for late students

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize icons
    lucide.createIcons();
    
    // Check if user is authenticated and is a teacher
    const savedUser = sessionStorage.getItem("schoolgate_user");
    if (!savedUser) {
        window.location.href = isLocalFile ? '../index.html' : '/index.html';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    if (currentUser.role !== "teacher") {
        window.location.href = isLocalFile ? '../index.html' : '/index.html';
        return;
    }
    
    // Set user info
    document.getElementById("teacher-name").textContent = currentUser.name;
    document.getElementById("teacher-subject").textContent = currentUser.subject || "-";
    
    // Setup navigation
    setupNavigation();
    
    // Load initial data
    loadDashboardData();
    loadStudents();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem("schoolgate_user");
        window.location.href = isLocalFile ? '../index.html' : '/index.html';
    });
    
    // Set current date
    const now = new Date();
    const dateString = now.toLocaleDateString('id-ID', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    if (document.getElementById('current-date')) {
        document.getElementById('current-date').textContent = dateString;
    }
    
    if (document.getElementById('today-date')) {
        document.getElementById('today-date').textContent = dateString;
    }
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
            
            // Get the page ID
            const pageId = link.getAttribute('data-page');
            
            // Show corresponding page
            document.getElementById(pageId + '-page').classList.remove('hidden');
            
            // Load page-specific data
            loadPage(pageId);
        });
    });
}

// Load page-specific data
async function loadPage(pageId) {
    switch (pageId) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'students':
            await loadStudents();
            break;
        case 'permissions':
            await loadPermissions();
            break;
        case 'disciplines':
            await loadDisciplinePoints();
            break;
        case 'late-students':
            await loadAllLateRecords();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Student management
    document.getElementById('add-student-btn').addEventListener('click', openAddStudentModal);
    document.getElementById('save-student-btn').addEventListener('click', saveStudent);
    document.getElementById('confirm-delete-btn').addEventListener('click', deleteStudent);
    document.getElementById('student-search').addEventListener('input', filterStudents);
    
    // Late students management
    const addLateStudentBtn = document.getElementById('add-late-student-btn');
    if (addLateStudentBtn) {
        addLateStudentBtn.addEventListener('click', openLateStudentModal);
    }
    
    const saveLateStudentBtn = document.getElementById('save-late-student-btn');
    if (saveLateStudentBtn) {
        saveLateStudentBtn.addEventListener('click', saveLateRecord);
    }
    
    const lateDateFilter = document.getElementById('late-date-filter');
    if (lateDateFilter) {
        lateDateFilter.addEventListener('change', filterLateRecords);
    }
    
    const resetLateFilter = document.getElementById('reset-late-filter');
    if (resetLateFilter) {
        resetLateFilter.addEventListener('click', resetLateFilters);
    }
    
    const lateStudentSearch = document.getElementById('late-student-search');
    if (lateStudentSearch) {
        lateStudentSearch.addEventListener('input', filterLateRecords);
    }
    
    // Modal close buttons (using event delegation)
    document.querySelectorAll('.modal-overlay, .modal-close').forEach(el => {
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
    showLoading();
    
    try {
        // Load students
        const studentsResult = await callAPI('getUsers', { role: 'student' });
        if (studentsResult.success) {
            allStudents = studentsResult.users || [];
            document.getElementById('total-students').textContent = allStudents.length;
        }
        
        // Load permissions
        const permissionsResult = await callAPI('getPermissions', { 
            role: 'teacher',
            userId: currentUser.id
        });
        
        if (permissionsResult.success) {
            allPermissions = permissionsResult.permissions || [];
            const pendingPermissions = allPermissions.filter(p => p.status === 'pending');
            document.getElementById('pending-permissions').textContent = pendingPermissions.length;
            renderRecentPermissions();
        }
        
        // Load late students data
        await loadLateStudents();
        document.getElementById('late-students').textContent = lateStudents.length;
        renderLateStudentsList();
        
        // Load late statistics
        await loadLateStatistics();
        
        // Load total violation points
        loadPointStats();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    } finally {
        hideLoading();
    }
}

// Load late students data from API
async function loadLateStudents() {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        const result = await callAPI('getLateRecords', {
            date: today
        });
        
        if (result.success) {
            lateStudents = result.lateRecords || [];
        } else {
            console.error('Error loading late students:', result.message);
            lateStudents = [];
        }
    } catch (error) {
        console.error('Error loading late students:', error);
        lateStudents = [];
    }
}

// Temporarily use mock data until API is properly deployed
async function loadLateStudents() {
    try {
        // Mock data for demo purposes until API is fixed
        const today = new Date().toISOString().split('T')[0];
        
        // Generate some mock students based on allStudents array
        lateStudents = [];
        
        if (allStudents && allStudents.length > 0) {
            // Use up to 3 random students from the student list
            const studentCount = Math.min(3, allStudents.length);
            const shuffled = [...allStudents].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < studentCount; i++) {
                const student = shuffled[i];
                // Random time between 7:30 and 8:15
                const hour = 7;
                const minute = 30 + Math.floor(Math.random() * 45);
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                
                // Random delay between 5 and 45 minutes
                const duration = 5 + Math.floor(Math.random() * 40);
                
                lateStudents.push({
                    id: 'mock-' + Math.random().toString(36).substring(2, 9),
                    studentId: student.id,
                    studentName: student.name,
                    studentClass: student.class || '-',
                    date: today,
                    time: time,
                    duration: duration,
                    reason: 'Demo data - API masih dalam pengembangan',
                    recordedBy: currentUser.id,
                    timestamp: new Date()
                });
            }
        } else {
            // If no students loaded yet, use hardcoded names
            const mockNames = [
                { name: 'Budi Santoso', class: 'X-A' },
                { name: 'Siti Nuraini', class: 'XI-B' },
                { name: 'Ahmad Hidayat', class: 'XII-C' }
            ];
            
            mockNames.forEach((mockStudent, index) => {
                // Random time between 7:30 and 8:15
                const hour = 7;
                const minute = 30 + Math.floor(Math.random() * 45);
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                
                // Random delay between 5 and 45 minutes
                const duration = 5 + Math.floor(Math.random() * 40);
                
                lateStudents.push({
                    id: 'mock-' + Math.random().toString(36).substring(2, 9),
                    studentId: 'mock-student-' + index,
                    studentName: mockStudent.name,
                    studentClass: mockStudent.class,
                    date: today,
                    time: time,
                    duration: duration,
                    reason: 'Demo data - API masih dalam pengembangan',
                    recordedBy: currentUser.id,
                    timestamp: new Date()
                });
            });
        }
        
        console.log('Using mock data for late students due to API issues');
    } catch (error) {
        console.error('Error creating mock late students:', error);
        lateStudents = [];
    }
}

// Load late statistics from API
async function loadLateStatistics() {
    try {
        const result = await callAPI('getLateStatistics');
        
        if (result.success) {
            renderFrequentLateStudents(result.statistics.frequentStudents);
            renderLatenessByDayChart(result.statistics.byDayOfWeek);
        } else {
            console.error('Error loading late statistics:', result.message);
        }
    } catch (error) {
        console.error('Error loading late statistics:', error);
    }
}

// Temporarily use mock data for late statistics until API is properly deployed
async function loadLateStatistics() {
    try {
        // Generate mock statistics
        const mockStatistics = {
            totalLate: lateStudents.length,
            frequentStudents: [],
            byDayOfWeek: [0, 0, 0, 0, 0, 0, 0]
        };
        
        // Generate frequent students data using allStudents or mock data
        if (allStudents && allStudents.length > 0) {
            // Use up to 5 random students
            const studentCount = Math.min(5, allStudents.length);
            const shuffled = [...allStudents].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < studentCount; i++) {
                const student = shuffled[i];
                mockStatistics.frequentStudents.push({
                    studentId: student.id,
                    studentName: student.name,
                    studentClass: student.class || '-',
                    count: Math.floor(Math.random() * 10) + 1 // 1-10 times
                });
            }
        } else {
            // If no students loaded yet, use hardcoded names
            const mockNames = [
                { name: 'Budi Santoso', class: 'X-A' },
                { name: 'Siti Nuraini', class: 'XI-B' },
                { name: 'Ahmad Hidayat', class: 'XII-C' },
                { name: 'Dewi Safitri', class: 'XI-A' },
                { name: 'Rudi Hermawan', class: 'X-C' }
            ];
            
            mockNames.forEach((mockStudent, index) => {
                mockStatistics.frequentStudents.push({
                    studentId: 'mock-student-' + index,
                    studentName: mockStudent.name,
                    studentClass: mockStudent.class,
                    count: Math.floor(Math.random() * 10) + 1 // 1-10 times
                });
            });
        }
        
        // Sort by count (highest first)
        mockStatistics.frequentStudents.sort((a, b) => b.count - a.count);
        
        // Generate day of week data - more on weekdays, less on weekends
        mockStatistics.byDayOfWeek = [
            Math.floor(Math.random() * 3),     // Sunday (0-2)
            Math.floor(Math.random() * 15) + 5, // Monday (5-19)
            Math.floor(Math.random() * 12) + 3, // Tuesday (3-14)
            Math.floor(Math.random() * 10) + 4, // Wednesday (4-13)
            Math.floor(Math.random() * 11) + 2, // Thursday (2-12)
            Math.floor(Math.random() * 8) + 1,  // Friday (1-8)
            Math.floor(Math.random() * 2)       // Saturday (0-1)
        ];
        
        // Render the mock data
        renderFrequentLateStudents(mockStatistics.frequentStudents);
        renderLatenessByDayChart(mockStatistics.byDayOfWeek);
        
        console.log('Using mock data for late statistics due to API issues');
    } catch (error) {
        console.error('Error creating mock late statistics:', error);
    }
}

// Render frequent late students list
function renderFrequentLateStudents(students) {
    const container = document.getElementById('frequent-late-students');
    if (!container) return;
    
    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center text-muted-foreground">
                <p>Belum ada data keterlambatan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = students.map(student => `
        <div class="p-4 hover:bg-gray-50">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium">${student.studentName}</p>
                    <p class="text-sm text-muted-foreground">${student.studentClass || '-'}</p>
                </div>
                <div class="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                    ${student.count} kali
                </div>
            </div>
        </div>
    `).join('');
}

// Render lateness by day of week chart
function renderLatenessByDayChart(dayData) {
    const container = document.getElementById('lateness-by-day-chart');
    if (!container) return;
    
    // Simple bar chart rendering
    const maxValue = Math.max(...dayData);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    const chartHtml = `
        <div class="flex flex-col h-full">
            <div class="flex justify-between mb-2">
                ${dayNames.map(day => `<div class="text-xs text-center flex-1">${day}</div>`).join('')}
            </div>
            <div class="flex h-full items-end mb-2">
                ${dayData.map(count => {
                    const height = maxValue > 0 ? (count / maxValue * 100) : 0;
                    return `
                        <div class="flex-1 flex justify-center">
                            <div class="w-4/5 bg-red-200 rounded-t" style="height: ${height}%">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="flex justify-between">
                ${dayData.map(count => `<div class="text-xs text-center flex-1">${count}</div>`).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = chartHtml;
}

// Render late students list
function renderLateStudentsList() {
    const lateStudentsList = document.getElementById('late-students-list');
    if (!lateStudentsList) return;
    
    if (!lateStudents || lateStudents.length === 0) {
        lateStudentsList.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-muted-foreground">
                    Tidak ada siswa terlambat hari ini
                </td>
            </tr>
        `;
        return;
    }
    
    lateStudentsList.innerHTML = lateStudents.map(student => {
        // Calculate lateness status
        let status = 'Tercatat';
        let statusClass = 'bg-blue-100 text-blue-800';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-6">${student.studentName}</td>
                <td class="py-3 px-6">${student.studentClass}</td>
                <td class="py-3 px-6">${student.time}</td>
                <td class="py-3 px-6">${student.duration} menit</td>
                <td class="py-3 px-6">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
                        ${status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Render recent permissions
function renderRecentPermissions() {
    const recentPermissionsEl = document.getElementById('recent-permissions');
    
    if (!allPermissions || allPermissions.length === 0) {
        recentPermissionsEl.innerHTML = `
            <div class="p-6 text-center text-muted-foreground">
                <p>Tidak ada permintaan perizinan</p>
            </div>
        `;
        return;
    }
    
    // Sort by timestamp (newest first) and take the first 5
    const recentPermissions = [...allPermissions]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    recentPermissionsEl.innerHTML = recentPermissions.map(permission => {
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
            month: 'short'
        });
        
        return `
            <div class="p-4 hover:bg-gray-50">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-medium">${permission.studentName}</p>
                        <p class="text-sm text-muted-foreground">${permission.reason}</p>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="px-2 py-1 rounded-full text-xs ${statusClass} mb-1">
                            ${statusText}
                        </span>
                        <span class="text-xs text-muted-foreground">${formattedDate}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load points statistics and render top violations
async function loadPointStats() {
    // Aggregate points data for all students
    let totalPoints = 0;
    let studentPointsMap = new Map();
    
    try {
        for (const student of allStudents) {
            const result = await callAPI('getPoints', { studentId: student.id });
            
            if (result.success) {
                totalPoints += result.totalPoints || 0;
                
                if (result.totalPoints > 0) {
                    studentPointsMap.set(student.id, {
                        name: student.name,
                        class: student.class || '-',
                        totalPoints: result.totalPoints
                    });
                }
            }
        }
        
        // Update total points counter
        document.getElementById('total-violation-points').textContent = totalPoints;
        
        // Render top violations
        renderTopViolations(studentPointsMap);
        
    } catch (error) {
        console.error('Error loading points stats:', error);
    }
}

// Render top violations
function renderTopViolations(studentPointsMap) {
    const topViolationsEl = document.getElementById('top-violations');
    
    if (studentPointsMap.size === 0) {
        topViolationsEl.innerHTML = `
            <div class="p-6 text-center text-muted-foreground">
                <p>Tidak ada pelanggaran tercatat</p>
            </div>
        `;
        return;
    }
    
    // Convert map to array, sort by points (highest first) and take top 5
    const topStudents = Array.from(studentPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 5);
    
    topViolationsEl.innerHTML = topStudents.map((student, index) => {
        // Calculate progress percentage (assuming 100 is the max)
        const maxPoints = 100;
        const percentage = Math.min(100, (student.totalPoints / maxPoints) * 100);
        
        // Determine color based on points
        let colorClass = '';
        if (student.totalPoints >= 75) colorClass = 'bg-red-500';
        else if (student.totalPoints >= 50) colorClass = 'bg-orange-500';
        else if (student.totalPoints >= 25) colorClass = 'bg-amber-500';
        else colorClass = 'bg-blue-500';
        
        return `
            <div class="p-4 hover:bg-gray-50">
                <div class="flex justify-between mb-1">
                    <div>
                        <p class="font-medium">${student.name}</p>
                        <p class="text-sm text-muted-foreground">${student.class}</p>
                    </div>
                    <span class="font-semibold">${student.totalPoints} poin</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="h-2.5 rounded-full ${colorClass}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Load students
async function loadStudents() {
    const result = await callAPI('getUsers', { role: 'student' });
    
    if (result.success) {
        allStudents = result.users || [];
        renderStudentsList();
    } else {
        alert(`Error loading students: ${result.message}`);
    }
}

// Render students list
function renderStudentsList() {
    const studentsList = document.getElementById('students-list');
    
    if (allStudents.length === 0) {
        studentsList.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-muted-foreground">No students found</td>
            </tr>
        `;
        return;
    }
    
    studentsList.innerHTML = allStudents.map(student => `
        <tr class="border-b hover:bg-muted transition-colors">
            <td class="py-3 px-4">${student.name}</td>
            <td class="py-3 px-4">${student.username}</td>
            <td class="py-3 px-4">${student.class || '-'}</td>
            <td class="py-3 px-4 text-right">
                <button class="btn btn-sm btn-subtle" onclick="openEditStudentModal('${student.id}')">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button class="btn btn-sm btn-subtle text-red-500" onclick="openDeleteModal('${student.id}')">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Reinitialize icons
    lucide.createIcons({
        attrs: {
            class: "h-4 w-4"
        },
        elements: [studentsList]
    });
}

// Filter students
function filterStudents() {
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    
    if (!searchTerm) {
        renderStudentsList();
        return;
    }
    
    const filteredStudents = allStudents.filter(student => 
        student.name.toLowerCase().includes(searchTerm) || 
        student.username.toLowerCase().includes(searchTerm) || 
        (student.class && student.class.toLowerCase().includes(searchTerm))
    );
    
    const studentsList = document.getElementById('students-list');
    
    if (filteredStudents.length === 0) {
        studentsList.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-muted-foreground">No matching students found</td>
            </tr>
        `;
        return;
    }
    
    studentsList.innerHTML = filteredStudents.map(student => `
        <tr class="border-b hover:bg-muted transition-colors">
            <td class="py-3 px-4">${student.name}</td>
            <td class="py-3 px-4">${student.username}</td>
            <td class="py-3 px-4">${student.class || '-'}</td>
            <td class="py-3 px-4 text-right">
                <button class="btn btn-sm btn-subtle" onclick="openEditStudentModal('${student.id}')">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button class="btn btn-sm btn-subtle text-red-500" onclick="openDeleteModal('${student.id}')">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Reinitialize icons
    lucide.createIcons({
        attrs: {
            class: "h-4 w-4"
        },
        elements: [studentsList]
    });
}

// Open add student modal
function openAddStudentModal() {
    document.getElementById('student-modal-title').textContent = 'Add New Student';
    document.getElementById('student-id').value = '';
    document.getElementById('student-name').value = '';
    document.getElementById('student-username').value = '';
    document.getElementById('student-password').value = '';
    document.getElementById('student-class').value = '';
    
    // Show the modal
    document.getElementById('student-modal').classList.remove('hidden');
}

// Open edit student modal
function openEditStudentModal(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    
    if (!student) {
        alert('Student not found');
        return;
    }
    
    document.getElementById('student-modal-title').textContent = 'Edit Student';
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-username').value = student.username;
    document.getElementById('student-password').value = ''; // Don't show password
    document.getElementById('student-class').value = student.class || '';
    
    // Show the modal
    document.getElementById('student-modal').classList.remove('hidden');
}

// Open delete confirmation modal
function openDeleteModal(studentId) {
    document.getElementById('delete-student-id').value = studentId;
    document.getElementById('delete-modal').classList.remove('hidden');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Save student (create or update)
async function saveStudent() {
    const studentId = document.getElementById('student-id').value;
    const name = document.getElementById('student-name').value;
    const username = document.getElementById('student-username').value;
    const password = document.getElementById('student-password').value;
    const studentClass = document.getElementById('student-class').value;
    
    if (!name || !username) {
        alert('Name and username are required');
        return;
    }
    
    // For new student, password is required
    if (!studentId && !password) {
        alert('Password is required for new students');
        return;
    }
    
    try {
        let result;
        
        if (studentId) {
            // Update existing student
            result = await callAPI('updateStudent', {
                id: studentId,
                name,
                username,
                password, // Will only update if provided
                class: studentClass
            });
        } else {
            // Create new student
            result = await callAPI('createStudent', {
                name,
                username,
                password,
                class: studentClass
            });
        }
        
        if (result.success) {
            // Reload students and close modal
            await loadStudents();
            closeModal('student-modal');
            alert(result.message);
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error saving student:', error);
        alert(`Error: ${error.message}`);
    }
}

// Delete student
async function deleteStudent() {
    const studentId = document.getElementById('delete-student-id').value;
    
    if (!studentId) {
        alert('No student selected');
        return;
    }
    
    try {
        const result = await callAPI('deleteStudent', { id: studentId });
        
        if (result.success) {
            // Reload students and close modal
            await loadStudents();
            closeModal('delete-modal');
            alert(result.message);
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error deleting student:', error);
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
window.openEditStudentModal = openEditStudentModal;
window.openDeleteModal = openDeleteModal;
window.closeModal = closeModal;

// LATE STUDENT MANAGEMENT FUNCTIONS

// Load all late records for the late students page
async function loadAllLateRecords() {
    try {
        const result = await callAPI('getLateRecords');
        
        if (result.success) {
            const lateRecords = result.lateRecords || [];
            renderLateStudentsTable(lateRecords);
        } else {
            console.error('Error loading late records:', result.message);
        }
    } catch (error) {
        console.error('Error loading late records:', error);
    }
}

// Temporarily use mock data for all late records until API is properly deployed
async function loadAllLateRecords() {
    try {
        // Generate more comprehensive mock data for the late students table
        const mockLateRecords = [];
        
        // Generate records spanning the last 30 days
        const today = new Date();
        
        if (allStudents && allStudents.length > 0) {
            // Create 10-20 random late records using actual students
            const recordCount = 10 + Math.floor(Math.random() * 11); // 10-20 records
            
            for (let i = 0; i < recordCount; i++) {
                // Random student from actual list
                const student = allStudents[Math.floor(Math.random() * allStudents.length)];
                
                // Random date within the last 30 days
                const date = new Date(today);
                date.setDate(date.getDate() - Math.floor(Math.random() * 30));
                const dateStr = date.toISOString().split('T')[0];
                
                // Random time between 7:30 and 8:15
                const hour = 7;
                const minute = 30 + Math.floor(Math.random() * 45);
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                
                // Random delay between 5 and 45 minutes
                const duration = 5 + Math.floor(Math.random() * 40);
                
                // Random reason for being late
                const reasons = [
                    'Transportasi umum terlambat',
                    'Bangun kesiangan',
                    'Kemacetan lalu lintas',
                    'Urusan keluarga',
                    'Hujan lebat',
                    'Mengantar saudara ke sekolah',
                    'Sakit ringan'
                ];
                const reason = reasons[Math.floor(Math.random() * reasons.length)];
                
                mockLateRecords.push({
                    id: 'mock-' + Math.random().toString(36).substring(2, 9),
                    studentId: student.id,
                    studentName: student.name,
                    studentClass: student.class || '-',
                    date: dateStr,
                    time: time,
                    duration: duration,
                    reason: reason,
                    recordedBy: currentUser.id,
                    timestamp: date
                });
            }
        } else {
            // If no students loaded yet, use hardcoded names
            const mockNames = [
                { name: 'Budi Santoso', class: 'X-A' },
                { name: 'Siti Nuraini', class: 'XI-B' },
                { name: 'Ahmad Hidayat', class: 'XII-C' },
                { name: 'Dewi Safitri', class: 'XI-A' },
                { name: 'Rudi Hermawan', class: 'X-C' }
            ];
            
            // Create 2-3 records for each mock student
            mockNames.forEach((mockStudent, studentIndex) => {
                const recordCount = 2 + Math.floor(Math.random() * 2); // 2-3 records per student
                
                for (let i = 0; i < recordCount; i++) {
                    // Random date within the last 30 days
                    const date = new Date(today);
                    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
                    const dateStr = date.toISOString().split('T')[0];
                    
                    // Random time between 7:30 and 8:15
                    const hour = 7;
                    const minute = 30 + Math.floor(Math.random() * 45);
                    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    
                    // Random delay between 5 and 45 minutes
                    const duration = 5 + Math.floor(Math.random() * 40);
                    
                    // Random reason for being late
                    const reasons = [
                        'Transportasi umum terlambat',
                        'Bangun kesiangan',
                        'Kemacetan lalu lintas',
                        'Urusan keluarga',
                        'Hujan lebat',
                        'Mengantar saudara ke sekolah',
                        'Sakit ringan'
                    ];
                    const reason = reasons[Math.floor(Math.random() * reasons.length)];
                    
                    mockLateRecords.push({
                        id: 'mock-' + Math.random().toString(36).substring(2, 9),
                        studentId: 'mock-student-' + studentIndex,
                        studentName: mockStudent.name,
                        studentClass: mockStudent.class,
                        date: dateStr,
                        time: time,
                        duration: duration,
                        reason: reason,
                        recordedBy: currentUser.id,
                        timestamp: date
                    });
                }
            });
        }
        
        // Render the mock data
        renderLateStudentsTable(mockLateRecords);
        console.log('Using mock data for late records table due to API issues');
    } catch (error) {
        console.error('Error creating mock late records:', error);
    }
}

// Render the late students table
function renderLateStudentsTable(records) {
    const tableBody = document.getElementById('late-students-table');
    if (!tableBody) return;
    
    if (!records || records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-muted-foreground">
                    Tidak ada data keterlambatan
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date and time (newest first)
    records.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
    });
    
    tableBody.innerHTML = records.map(record => {
        // Format date
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-6">${formattedDate}</td>
                <td class="py-3 px-6">${record.studentName}</td>
                <td class="py-3 px-6">${record.studentClass}</td>
                <td class="py-3 px-6">${record.time}</td>
                <td class="py-3 px-6">${record.duration} menit</td>
                <td class="py-3 px-6">${record.reason || '-'}</td>
                <td class="py-3 px-6">
                    <div class="flex space-x-2">
                        <button class="btn-icon" onclick="openEditLateModal('${record.id}')">
                            <i data-lucide="edit" class="h-4 w-4 text-blue-600"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteLateRecord('${record.id}')">
                            <i data-lucide="trash-2" class="h-4 w-4 text-red-600"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Reinitialize icons
    lucide.createIcons({
        attrs: {
            class: "h-4 w-4"
        },
        elements: [tableBody]
    });
}

// Open modal to record new late student
function openLateStudentModal() {
    // Reset form
    const form = document.getElementById('late-student-form');
    if (form) form.reset();
    
    // Clear hidden ID field
    document.getElementById('late-record-id').value = '';
    
    // Set title
    document.getElementById('late-student-modal-title').textContent = 'Catat Siswa Terlambat';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('late-date').value = today;
    
    // Set default time to current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('late-time').value = `${hours}:${minutes}`;
    
    // Populate student select dropdown
    populateStudentSelect();
    
    // Show modal
    document.getElementById('late-student-modal').classList.remove('hidden');
}

// Open modal to edit late record
async function openEditLateModal(id) {
    try {
        showLoading();
        
        const result = await callAPI('getLateRecordById', { id });
        
        if (result.success) {
            const record = result.lateRecord;
            
            // Set form values
            document.getElementById('late-record-id').value = record.id;
            document.getElementById('late-date').value = record.date;
            document.getElementById('late-time').value = record.time;
            document.getElementById('late-duration').value = record.duration;
            document.getElementById('late-reason').value = record.reason || '';
            
            // Set title
            document.getElementById('late-student-modal-title').textContent = 'Edit Keterlambatan Siswa';
            
            // Populate student select dropdown and select the correct student
            await populateStudentSelect(record.studentId);
            
            // Show modal
            document.getElementById('late-student-modal').classList.remove('hidden');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error opening edit late modal:', error);
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Populate student select dropdown
async function populateStudentSelect(selectedStudentId = null) {
    const select = document.getElementById('late-student-select');
    if (!select) return;
    
    // If we don't have students data yet, fetch it
    if (!allStudents || allStudents.length === 0) {
        await loadStudents();
    }
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add student options
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${student.class || '-'})`;
        select.appendChild(option);
    });
    
    // Select the specified student if provided
    if (selectedStudentId) {
        select.value = selectedStudentId;
    }
}

// Save late record
async function saveLateRecord() {
    // Get form values
    const recordId = document.getElementById('late-record-id').value;
    const studentId = document.getElementById('late-student-select').value;
    const date = document.getElementById('late-date').value;
    const time = document.getElementById('late-time').value;
    const duration = document.getElementById('late-duration').value;
    const reason = document.getElementById('late-reason').value;
    
    // Validate required fields
    if (!studentId) {
        alert('Pilih siswa');
        return;
    }
    
    if (!date) {
        alert('Masukkan tanggal');
        return;
    }
    
    if (!time) {
        alert('Masukkan jam masuk');
        return;
    }
    
    if (!duration) {
        alert('Masukkan durasi keterlambatan');
        return;
    }
    
    try {
        showLoading();
        
        // Find student info
        let studentName = '';
        let studentClass = '';
        
        if (studentId.startsWith('mock-student-')) {
            // For mock students
            const mockNames = [
                { name: 'Budi Santoso', class: 'X-A' },
                { name: 'Siti Nuraini', class: 'XI-B' },
                { name: 'Ahmad Hidayat', class: 'XII-C' },
                { name: 'Dewi Safitri', class: 'XI-A' },
                { name: 'Rudi Hermawan', class: 'X-C' }
            ];
            const index = parseInt(studentId.replace('mock-student-', ''));
            if (index >= 0 && index < mockNames.length) {
                studentName = mockNames[index].name;
                studentClass = mockNames[index].class;
            }
        } else {
            // For real students
            const student = allStudents.find(s => s.id === studentId);
            if (student) {
                studentName = student.name;
                studentClass = student.class || '-';
            }
        }
        
        // Create a mock record
        const mockRecord = {
            id: recordId || 'mock-' + Math.random().toString(36).substring(2, 9),
            studentId: studentId,
            studentName: studentName,
            studentClass: studentClass,
            date: date,
            time: time,
            duration: duration,
            reason: reason,
            recordedBy: currentUser.id,
            timestamp: new Date()
        };
        
        // Simulate successful API response
        const result = {
            success: true,
            message: recordId ? "Data keterlambatan berhasil diperbarui (demo)" : "Keterlambatan siswa berhasil dicatat (demo)",
            lateRecord: mockRecord
        };
        
        // Close modal
        closeModal('late-student-modal');
        
        // For demonstration, just reload everything with fresh mock data
        await loadLateStudents();
        await loadAllLateRecords();
        
        // Update dashboard
        if (document.getElementById('late-students')) {
            document.getElementById('late-students').textContent = lateStudents.length;
        }
        renderLateStudentsList();
        
        // Reload statistics
        await loadLateStatistics();
        
        alert(result.message);
        
    } catch (error) {
        console.error('Error in mock save late record:', error);
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Delete late record
async function deleteLateRecord(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan keterlambatan ini?')) {
        return;
    }
    
    try {
        showLoading();
        
        const result = await callAPI('deleteLateRecord', { id });
        
        if (result.success) {
            // Reload data
            await loadLateStudents();
            await loadAllLateRecords();
            
            // Update dashboard
            document.getElementById('late-students').textContent = lateStudents.length;
            renderLateStudentsList();
            
            // Reload statistics
            await loadLateStatistics();
            
            alert(result.message);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting late record:', error);
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Temporarily use mock data for deleting late records
async function deleteLateRecord(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan keterlambatan ini?')) {
        return;
    }
    
    try {
        showLoading();
        
        // Simulate successful API response
        const result = {
            success: true,
            message: "Catatan keterlambatan berhasil dihapus (demo)"
        };
        
        // Reload data with fresh mock data
        await loadLateStudents();
        await loadAllLateRecords();
        
        // Update dashboard
        if (document.getElementById('late-students')) {
            document.getElementById('late-students').textContent = lateStudents.length;
        }
        renderLateStudentsList();
        
        // Reload statistics
        await loadLateStatistics();
        
        alert(result.message);
    } catch (error) {
        console.error('Error in mock delete late record:', error);
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Filter late records
function filterLateRecords() {
    const dateFilter = document.getElementById('late-date-filter').value;
    const searchFilter = document.getElementById('late-student-search').value.toLowerCase();
    
    // Apply filters to API call or local data
    loadFilteredLateRecords(dateFilter, searchFilter);
}

// Reset filters
function resetLateFilters() {
    document.getElementById('late-date-filter').value = '';
    document.getElementById('late-student-search').value = '';
    
    // Reload all records
    loadAllLateRecords();
}

// Load filtered late records
async function loadFilteredLateRecords(date, search) {
    try {
        showLoading();
        
        // If we have date filter, use it directly in the API call
        const result = await callAPI('getLateRecords', date ? { date } : {});
        
        if (result.success) {
            let records = result.lateRecords || [];
            
            // Apply search filter locally
            if (search) {
                records = records.filter(record => 
                    record.studentName.toLowerCase().includes(search) ||
                    record.studentClass.toLowerCase().includes(search)
                );
            }
            
            renderLateStudentsTable(records);
        } else {
            console.error('Error loading filtered late records:', result.message);
        }
    } catch (error) {
        console.error('Error loading filtered late records:', error);
    } finally {
        hideLoading();
    }
}

// Expose functions for event handlers
window.openLateStudentModal = openLateStudentModal;
window.openEditLateModal = openEditLateModal;
window.deleteLateRecord = deleteLateRecord; 