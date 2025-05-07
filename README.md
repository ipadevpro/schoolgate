# SchoolGate - School Permission Management System

SchoolGate is a web-based application for managing school permissions and student discipline points. The system helps schools streamline the process of requesting, approving, and tracking student permissions and discipline records.

## Features

### Student Features
- Submit permission requests with details (reason, date, time, notes)
- View permission history and status (pending, approved, rejected)
- View discipline points history and total

### Teacher Features
- Manage permission requests (approve/reject with notes)
- View and manage student data
- Add discipline points to students with violation details
- View comprehensive discipline points history

## Tech Stack

### Frontend
- HTML5, JavaScript (Vanilla)
- Tailwind CSS for styling (via CDN)
- Inter font from Google Fonts
- Lucide Icons for UI elements

### Backend
- Google Apps Script (GAS) serving as the API
- Google Sheets as the database

## Project Structure

```
schoolgate/
│
├── css/
│   └── styles.css             # Custom CSS styles
│
├── js/
│   └── auth.js                # Authentication functionality
│
├── student/
│   └── dashboard.html         # Student dashboard
│
├── teacher/ 
│   └── dashboard.html         # Teacher dashboard
│
├── index.html                 # Login page
├── Code.gs                    # Backend Google Apps Script code
├── CORSrules.txt              # CORS guidelines for Google Apps Script
└── README.md                  # This file
```

## Database Structure

The system uses Google Sheets as its database with the following sheets:

1. **Students**
   - id, username, password, role, name, class

2. **Teachers**
   - id, username, password, role, name, subject

3. **Permissions**
   - id, studentId, reason, date, time, notes, status, teacherId, teacherNotes, timestamp

4. **DisciplinePoints**
   - id, studentId, violation, points, notes, timestamp

## Installation and Setup

### Backend Setup (Google Apps Script)

1. Create a new Google Sheet to serve as your database
2. Go to Extensions → Apps Script
3. Copy the content of `Code.gs` into the script editor
4. Update the `SS_ID` variable with your Google Sheet ID
5. Deploy as a web app:
   - Execute as: "Me"
   - Who has access: "Anyone"
6. Copy the web app URL and update the `API_URL` in the `auth.js` file

### Frontend Setup

#### Local Development
1. Clone this repository
2. Update the API URL in `js/auth.js` with your Google Apps Script URL
3. Open `index.html` in your browser or use a local server

#### Production Deployment
1. Upload the files to a web server or hosting service
2. Ensure the service provides HTTPS as Google Apps Script requires secure connections

## CORS Handling

This application follows specific CORS guidelines for Google Apps Script:

- Uses URLSearchParams instead of JSON for POST requests
- Relies on Google's built-in CORS handling
- See `CORSrules.txt` for detailed guidelines

## Authentication Flow

1. User logs in at `index.html`
2. Authentication processed by Google Apps Script backend
3. User session stored in browser's sessionStorage
4. User redirected to appropriate dashboard based on role

## Roles and Permissions

- **Students**: Can submit permission requests and view their own records
- **Teachers**: Can manage all permission requests and discipline points

## Mobile Responsiveness

The UI is designed to be responsive for various screen sizes:
- Desktop: Full sidebar navigation
- Mobile: Optimized layout for smaller screens

## Security Considerations

- Authentication data stored in sessionStorage (cleared on browser close)
- No sensitive data stored in localStorage
- Password handling implemented through Google Apps Script
- HTTPS required for production deployment

## License

This project is available for educational purposes. Please adjust licensing as needed for your specific use case.

## Authors

This project was developed for educational purposes to demonstrate a full-stack web application using Google Apps Script as a backend.

---

For any questions or assistance, please refer to this documentation or contact the project maintainers. 