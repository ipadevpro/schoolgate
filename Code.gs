// Backend Google Apps Script

// Database spreadsheet IDs
const SS_ID = "GANTI_DENGAN_ID_SPREADSHEET_ANDA"; // Ganti dengan ID spreadsheet Anda

// Sheet names
const STUDENT_SHEET = "Students";
const TEACHER_SHEET = "Teachers";
const PERMISSION_SHEET = "Permissions";
const POINT_SHEET = "DisciplinePoints";
const LATE_SHEET = "LateStudents";

// Struktur header untuk setiap sheet
const SHEET_HEADERS = {
  [STUDENT_SHEET]: ["id", "username", "password", "role", "name", "class"],
  [TEACHER_SHEET]: ["id", "username", "password", "role", "name", "subject"],
  [PERMISSION_SHEET]: ["id", "studentId", "reason", "date", "time", "notes", "status", "teacherId", "teacherNotes", "timestamp"],
  [POINT_SHEET]: ["id", "studentId", "violation", "points", "notes", "timestamp"],
  [LATE_SHEET]: ["id", "studentId", "date", "time", "duration", "reason", "recordedBy", "timestamp"]
};

// Fungsi untuk memeriksa dan membuat sheet jika belum ada
function checkAndCreateSheets() {
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const allSheets = ss.getSheets();
    const existingSheetNames = allSheets.map(sheet => sheet.getName());
    
    // Cek dan buat setiap sheet yang dibutuhkan
    Object.keys(SHEET_HEADERS).forEach(sheetName => {
      if (!existingSheetNames.includes(sheetName)) {
        Logger.log(`Creating sheet: ${sheetName}`);
        const newSheet = ss.insertSheet(sheetName);
        
        // Tambahkan header ke sheet baru
        newSheet.getRange(1, 1, 1, SHEET_HEADERS[sheetName].length)
          .setValues([SHEET_HEADERS[sheetName]])
          .setFontWeight("bold")
          .setBackground("#E8F0FE");
        
        // Freeze header row
        newSheet.setFrozenRows(1);
      } else {
        Logger.log(`Sheet ${sheetName} already exists`);
      }
    });
    
    return { success: true, message: "All required sheets have been verified/created." };
  } catch (error) {
    Logger.log(`Error in checkAndCreateSheets: ${error}`);
    return { success: false, message: error.toString() };
  }
}

// Fungsi ini tidak diperlukan karena HTML akan di-host di GitHub
// function doGet() {
//   return HtmlService.createHtmlOutputFromFile('index')
//     .setTitle('SchoolGate - Manajemen Perizinan Sekolah');
// }

function doGet(e) {
  // Initialize sheets if they don't exist
  checkAndCreateSheets();
  
  // Untuk tes bahwa API berfungsi
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "SchoolGate API aktif",
    version: "1.0"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // Initialize sheets if they don't exist
    checkAndCreateSheets();
    
    const action = e.parameter.action;
    
    // Sesuai CORSrules.txt, kita tidak perlu set header CORS secara manual
    // Google akan mengizinkan CORS untuk request sederhana dengan content-type x-www-form-urlencoded
    
    switch (action) {
      case "login":
        return ContentService.createTextOutput(JSON.stringify(
          handleLogin(e.parameter.username, e.parameter.password)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "submitPermission":
        return ContentService.createTextOutput(JSON.stringify(
          submitPermission(e.parameter.studentId, e.parameter.reason, e.parameter.date, 
                          e.parameter.time, e.parameter.notes)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getPermissions":
        return ContentService.createTextOutput(JSON.stringify(
          getPermissions(e.parameter.role, e.parameter.userId)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "updatePermission":
        return ContentService.createTextOutput(JSON.stringify(
          updatePermission(e.parameter.permissionId, e.parameter.status, e.parameter.teacherNotes, e.parameter.teacherId)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "addPoints":
        return ContentService.createTextOutput(JSON.stringify(
          addPoints(e.parameter.studentId, e.parameter.violation, e.parameter.points, e.parameter.notes)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getPoints":
        return ContentService.createTextOutput(JSON.stringify(
          getPoints(e.parameter.studentId)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getUsers":
        return ContentService.createTextOutput(JSON.stringify(
          getUsers(e.parameter.role)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "initializeSheets":
        return ContentService.createTextOutput(JSON.stringify(
          checkAndCreateSheets()
        )).setMimeType(ContentService.MimeType.JSON);
      
      // New CRUD operations for student management
      case "createStudent":
        return ContentService.createTextOutput(JSON.stringify(
          createStudent(e.parameter.username, e.parameter.password, e.parameter.name, e.parameter.class)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "updateStudent":
        return ContentService.createTextOutput(JSON.stringify(
          updateStudent(e.parameter.id, e.parameter.username, e.parameter.password, e.parameter.name, e.parameter.class)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "deleteStudent":
        return ContentService.createTextOutput(JSON.stringify(
          deleteStudent(e.parameter.id)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getStudentById":
        return ContentService.createTextOutput(JSON.stringify(
          getStudentById(e.parameter.id)
        )).setMimeType(ContentService.MimeType.JSON);
        
      // New CRUD operations for late student records
      case "createLateRecord":
        return ContentService.createTextOutput(JSON.stringify(
          createLateRecord(e.parameter.studentId, e.parameter.date, e.parameter.time, e.parameter.duration, e.parameter.reason, e.parameter.teacherId)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getLateRecords":
        return ContentService.createTextOutput(JSON.stringify(
          getLateRecords(e.parameter.date)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getLateRecordById":
        return ContentService.createTextOutput(JSON.stringify(
          getLateRecordById(e.parameter.id)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "updateLateRecord":
        return ContentService.createTextOutput(JSON.stringify(
          updateLateRecord(e.parameter.id, e.parameter.studentId, e.parameter.date, e.parameter.time, e.parameter.duration, e.parameter.reason)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "deleteLateRecord":
        return ContentService.createTextOutput(JSON.stringify(
          deleteLateRecord(e.parameter.id)
        )).setMimeType(ContentService.MimeType.JSON);
        
      case "getLateStatistics":
        return ContentService.createTextOutput(JSON.stringify(
          getLateStatistics()
        )).setMimeType(ContentService.MimeType.JSON);
      
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Invalid action"
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi untuk login
function handleLogin(username, password) {
  if (!username || !password) {
    return { success: false, message: "Username dan password diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // Coba cari di Teachers
  let sheet = ss.getSheetByName(TEACHER_SHEET);
  let data = sheet.getDataRange().getValues();
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === username && data[i][2] === password) {
      return {
        success: true,
        user: {
          id: data[i][0],
          username: data[i][1],
          role: data[i][3],
          name: data[i][4],
          subject: data[i][5] || null
        }
      };
    }
  }
  
  // Jika tidak ditemukan di Teachers, cari di Students
  sheet = ss.getSheetByName(STUDENT_SHEET);
  data = sheet.getDataRange().getValues();
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === username && data[i][2] === password) {
      return {
        success: true,
        user: {
          id: data[i][0],
          username: data[i][1],
          role: data[i][3],
          name: data[i][4],
          class: data[i][5] || null
        }
      };
    }
  }
  
  return { success: false, message: "Username atau password salah" };
}

// Fungsi untuk mengajukan izin
function submitPermission(studentId, reason, date, time, notes) {
  if (!studentId || !reason || !date) {
    return { success: false, message: "Data tidak lengkap" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(PERMISSION_SHEET);
  
  // Generate ID
  const id = Utilities.getUuid();
  const timestamp = new Date();
  
  // Tambahkan ke spreadsheet
  sheet.appendRow([
    id,
    studentId,
    reason,
    date,
    time,
    notes,
    "pending", // status: pending, approved, rejected
    "", // teacher ID who approves/rejects
    "", // teacher notes
    timestamp
  ]);
  
  return { success: true, message: "Permintaan izin berhasil diajukan" };
}

// Fungsi untuk mendapatkan daftar permintaan izin
function getPermissions(role, userId) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(PERMISSION_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const permissions = [];
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    // Jika role siswa, hanya tampilkan permintaan mereka
    if (role === "student" && data[i][1] !== userId) {
      continue;
    }
    
    // Dapatkan info siswa
    const studentInfo = getUserById(data[i][1], "student");
    
    permissions.push({
      id: data[i][0],
      studentId: data[i][1],
      studentName: studentInfo ? studentInfo.name : "Unknown",
      studentClass: studentInfo ? studentInfo.class : "",
      reason: data[i][2],
      date: data[i][3],
      time: data[i][4],
      notes: data[i][5],
      status: data[i][6],
      teacherId: data[i][7],
      teacherNotes: data[i][8],
      timestamp: data[i][9]
    });
  }
  
  return { success: true, permissions: permissions };
}

// Fungsi untuk update status permintaan izin
function updatePermission(permissionId, status, teacherNotes, teacherId) {
  if (!permissionId || !status) {
    return { success: false, message: "Data tidak lengkap" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(PERMISSION_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Cari permintaan berdasarkan ID
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === permissionId) {
      // Update status dan catatan guru
      sheet.getRange(i+1, 7).setValue(status);
      if (teacherId) sheet.getRange(i+1, 8).setValue(teacherId);
      sheet.getRange(i+1, 9).setValue(teacherNotes || "");
      
      return { success: true, message: "Status izin berhasil diperbarui" };
    }
  }
  
  return { success: false, message: "Permintaan izin tidak ditemukan" };
}

// Fungsi untuk menambahkan poin pelanggaran
function addPoints(studentId, violation, points, notes) {
  if (!studentId || !violation || !points) {
    return { success: false, message: "Data tidak lengkap" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(POINT_SHEET);
  
  // Generate ID
  const id = Utilities.getUuid();
  const timestamp = new Date();
  
  // Tambahkan ke spreadsheet
  sheet.appendRow([
    id,
    studentId,
    violation,
    points,
    notes,
    timestamp
  ]);
  
  return { success: true, message: "Poin pelanggaran berhasil ditambahkan" };
}

// Fungsi untuk mendapatkan poin pelanggaran siswa
function getPoints(studentId) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(POINT_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const points = [];
  let totalPoints = 0;
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === studentId) {
      points.push({
        id: data[i][0],
        violation: data[i][2],
        points: data[i][3],
        notes: data[i][4],
        timestamp: data[i][5]
      });
      
      totalPoints += Number(data[i][3]);
    }
  }
  
  return { 
    success: true, 
    points: points,
    totalPoints: totalPoints
  };
}

// Fungsi untuk mendapatkan informasi pengguna berdasarkan ID
function getUserById(userId, role) {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // Tentukan sheet berdasarkan role
  const sheetName = role === "teacher" ? TEACHER_SHEET : STUDENT_SHEET;
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      if (role === "teacher") {
        return {
          id: data[i][0],
          username: data[i][1],
          role: data[i][3],
          name: data[i][4],
          subject: data[i][5] || ""
        };
      } else {
        return {
          id: data[i][0],
          username: data[i][1],
          role: data[i][3],
          name: data[i][4],
          class: data[i][5] || ""
        };
      }
    }
  }
  
  // Jika tidak ditemukan dan role tidak ditentukan, cari di sheet lainnya
  if (!role) {
    const otherSheet = ss.getSheetByName(role === "teacher" ? STUDENT_SHEET : TEACHER_SHEET);
    const otherData = otherSheet.getDataRange().getValues();
    
    for (let i = 1; i < otherData.length; i++) {
      if (otherData[i][0] === userId) {
        if (otherData[i][3] === "teacher") {
          return {
            id: otherData[i][0],
            username: otherData[i][1],
            role: otherData[i][3],
            name: otherData[i][4],
            subject: otherData[i][5] || ""
          };
        } else {
          return {
            id: otherData[i][0],
            username: otherData[i][1],
            role: otherData[i][3],
            name: otherData[i][4],
            class: otherData[i][5] || ""
          };
        }
      }
    }
  }
  
  return null;
}

// Fungsi untuk mendapatkan daftar pengguna berdasarkan role
function getUsers(role) {
  if (!role) {
    return { success: false, message: "Role diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // Tentukan sheet berdasarkan role
  let sheet;
  if (role === "student") {
    sheet = ss.getSheetByName(STUDENT_SHEET);
  } else if (role === "teacher") {
    sheet = ss.getSheetByName(TEACHER_SHEET);
  } else if (role === "all") {
    // Gabungkan data dari kedua sheet
    const teachers = getUsers("teacher").users || [];
    const students = getUsers("student").users || [];
    return { success: true, users: [...teachers, ...students] };
  } else {
    return { success: false, message: "Role tidak valid" };
  }
  
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    if (role === "teacher") {
      users.push({
        id: data[i][0],
        username: data[i][1],
        role: data[i][3],
        name: data[i][4],
        subject: data[i][5] || ""
      });
    } else {
      users.push({
        id: data[i][0],
        username: data[i][1],
        role: data[i][3],
        name: data[i][4],
        class: data[i][5] || ""
      });
    }
  }
  
  return { success: true, users: users };
}

// Fungsi untuk membuat siswa baru
function createStudent(username, password, name, studentClass) {
  if (!username || !password || !name) {
    return { success: false, message: "Username, password, dan nama diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(STUDENT_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Cek apakah username sudah ada
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === username) {
      return { success: false, message: "Username sudah digunakan" };
    }
  }
  
  // Generate ID
  const id = Utilities.getUuid();
  
  // Tambahkan ke spreadsheet
  sheet.appendRow([
    id,
    username,
    password,
    "student",  // role
    name,
    studentClass || ""
  ]);
  
  return { 
    success: true, 
    message: "Siswa berhasil ditambahkan",
    student: {
      id: id,
      username: username,
      role: "student",
      name: name,
      class: studentClass || ""
    }
  };
}

// Fungsi untuk mendapatkan data siswa berdasarkan ID
function getStudentById(id) {
  if (!id) {
    return { success: false, message: "ID siswa diperlukan" };
  }
  
  const student = getUserById(id, "student");
  
  if (!student) {
    return { success: false, message: "Siswa tidak ditemukan" };
  }
  
  return { success: true, student: student };
}

// Fungsi untuk mengupdate data siswa
function updateStudent(id, username, password, name, studentClass) {
  if (!id) {
    return { success: false, message: "ID siswa diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(STUDENT_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Cari siswa berdasarkan ID
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: "Siswa tidak ditemukan" };
  }
  
  // Jika username berubah, periksa apakah sudah digunakan
  if (username && username !== data[rowIndex-1][1]) {
    for (let i = 1; i < data.length; i++) {
      if (i !== rowIndex-1 && data[i][1] === username) {
        return { success: false, message: "Username sudah digunakan" };
      }
    }
  }
  
  // Update data
  if (username) sheet.getRange(rowIndex, 2).setValue(username);
  if (password) sheet.getRange(rowIndex, 3).setValue(password);
  if (name) sheet.getRange(rowIndex, 5).setValue(name);
  sheet.getRange(rowIndex, 6).setValue(studentClass || "");
  
  return { 
    success: true, 
    message: "Data siswa berhasil diperbarui",
    student: {
      id: id,
      username: username || data[rowIndex-1][1],
      role: "student",
      name: name || data[rowIndex-1][4],
      class: studentClass || data[rowIndex-1][5] || ""
    }
  };
}

// Fungsi untuk menghapus siswa
function deleteStudent(id) {
  if (!id) {
    return { success: false, message: "ID siswa diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(STUDENT_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Cari siswa berdasarkan ID
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: "Siswa tidak ditemukan" };
  }
  
  // Hapus baris siswa
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: "Siswa berhasil dihapus" };
}

// Fungsi untuk mengelola siswa terlambat
function createLateRecord(studentId, date, time, duration, reason, teacherId) {
  if (!studentId || !date || !time || !duration) {
    return { success: false, message: "Data tidak lengkap" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(LATE_SHEET);
  
  // Generate ID
  const id = Utilities.getUuid();
  const timestamp = new Date();
  
  // Tambahkan ke spreadsheet
  sheet.appendRow([
    id,
    studentId,
    date,
    time,
    duration,
    reason || "",
    teacherId || "",
    timestamp
  ]);
  
  return { 
    success: true, 
    message: "Keterlambatan siswa berhasil dicatat",
    lateRecord: {
      id: id,
      studentId: studentId,
      date: date,
      time: time,
      duration: duration,
      reason: reason || "",
      recordedBy: teacherId || "",
      timestamp: timestamp
    }
  };
}

function getLateRecords(date) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(LATE_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const lateRecords = [];
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    // Filter by date if provided
    if (date && data[i][2] !== date) {
      continue;
    }
    
    // Dapatkan info siswa
    const studentInfo = getUserById(data[i][1], "student");
    
    lateRecords.push({
      id: data[i][0],
      studentId: data[i][1],
      studentName: studentInfo ? studentInfo.name : "Unknown",
      studentClass: studentInfo ? studentInfo.class : "",
      date: data[i][2],
      time: data[i][3],
      duration: data[i][4],
      reason: data[i][5],
      recordedBy: data[i][6],
      timestamp: data[i][7]
    });
  }
  
  return { success: true, lateRecords: lateRecords };
}

function getLateRecordById(id) {
  if (!id) {
    return { success: false, message: "ID diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(LATE_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      // Dapatkan info siswa
      const studentInfo = getUserById(data[i][1], "student");
      
      return { 
        success: true, 
        lateRecord: {
          id: data[i][0],
          studentId: data[i][1],
          studentName: studentInfo ? studentInfo.name : "Unknown",
          studentClass: studentInfo ? studentInfo.class : "",
          date: data[i][2],
          time: data[i][3],
          duration: data[i][4],
          reason: data[i][5],
          recordedBy: data[i][6],
          timestamp: data[i][7]
        }
      };
    }
  }
  
  return { success: false, message: "Data keterlambatan tidak ditemukan" };
}

function updateLateRecord(id, studentId, date, time, duration, reason) {
  if (!id) {
    return { success: false, message: "ID diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(LATE_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Cari data berdasarkan ID
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: "Data keterlambatan tidak ditemukan" };
  }
  
  // Update data
  if (studentId) sheet.getRange(rowIndex, 2).setValue(studentId);
  if (date) sheet.getRange(rowIndex, 3).setValue(date);
  if (time) sheet.getRange(rowIndex, 4).setValue(time);
  if (duration) sheet.getRange(rowIndex, 5).setValue(duration);
  sheet.getRange(rowIndex, 6).setValue(reason || "");
  
  return { 
    success: true, 
    message: "Data keterlambatan berhasil diperbarui"
  };
}

function deleteLateRecord(id) {
  if (!id) {
    return { success: false, message: "ID diperlukan" };
  }
  
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(LATE_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // Cari data berdasarkan ID
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: "Data keterlambatan tidak ditemukan" };
  }
  
  // Hapus baris
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: "Data keterlambatan berhasil dihapus" };
}

// Fungsi untuk mendapatkan statistik keterlambatan
function getLateStatistics() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName(LATE_SHEET);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { 
      success: true, 
      statistics: {
        totalLate: 0,
        frequentStudents: [],
        byDayOfWeek: [0, 0, 0, 0, 0, 0, 0]  // Sun, Mon, Tue, Wed, Thu, Fri, Sat
      }
    };
  }
  
  // Hitung jumlah keterlambatan per siswa
  const studentLateCount = {};
  const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0];  // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  
  // Skip baris header
  for (let i = 1; i < data.length; i++) {
    const studentId = data[i][1];
    
    // Count by student
    if (!studentLateCount[studentId]) {
      studentLateCount[studentId] = {
        count: 0,
        studentId: studentId,
        studentName: null,
        studentClass: null
      };
    }
    studentLateCount[studentId].count++;
    
    // Count by day of week
    try {
      const dateStr = data[i][2];
      if (dateStr) {
        // Parse date string (format: YYYY-MM-DD)
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const lateDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const dayOfWeek = lateDate.getDay();  // 0 = Sunday, 6 = Saturday
          dayOfWeekCount[dayOfWeek]++;
        }
      }
    } catch (error) {
      Logger.log("Error parsing date: " + error);
    }
  }
  
  // Get top 5 most frequently late students
  const frequentStudents = [];
  for (const studentId in studentLateCount) {
    const studentInfo = getUserById(studentId, "student");
    if (studentInfo) {
      studentLateCount[studentId].studentName = studentInfo.name;
      studentLateCount[studentId].studentClass = studentInfo.class;
      frequentStudents.push(studentLateCount[studentId]);
    }
  }
  
  // Sort by count (descending) and take top 5
  frequentStudents.sort((a, b) => b.count - a.count);
  const top5 = frequentStudents.slice(0, 5);
  
  return { 
    success: true, 
    statistics: {
      totalLate: data.length - 1,  // Subtract header row
      frequentStudents: top5,
      byDayOfWeek: dayOfWeekCount
    }
  };
} 