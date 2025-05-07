// Backend Google Apps Script

// Database spreadsheet IDs
const SS_ID = "GANTI_DENGAN_ID_SPREADSHEET_ANDA"; // Ganti dengan ID spreadsheet Anda

// Sheet names
const STUDENT_SHEET = "Students";
const TEACHER_SHEET = "Teachers";
const PERMISSION_SHEET = "Permissions";
const POINT_SHEET = "DisciplinePoints";

// Struktur header untuk setiap sheet
const SHEET_HEADERS = {
  [STUDENT_SHEET]: ["id", "username", "password", "role", "name", "class"],
  [TEACHER_SHEET]: ["id", "username", "password", "role", "name", "subject"],
  [PERMISSION_SHEET]: ["id", "studentId", "reason", "date", "time", "notes", "status", "teacherId", "teacherNotes", "timestamp"],
  [POINT_SHEET]: ["id", "studentId", "violation", "points", "notes", "timestamp"]
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