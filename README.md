# 🎯 Online Skill Assessment & Proctoring System

A comprehensive web-based proctoring and testing platform with advanced AI-powered monitoring capabilities. This system provides secure online assessments with real-time proctoring features including face verification, screen monitoring, behavioral analysis, and violation detection.

## 🌟 Features

### 🔒 Advanced Proctoring
- **Face Verification**: ID photo matching with liveness detection
- **Real-time Webcam Monitoring**: Continuous face detection and analysis
- **Screen Capture**: Automated screen recording at regular intervals
- **Gaze Tracking**: Eye movement analysis to detect suspicious behavior
- **Behavioral Anomaly Detection**: AI-powered detection of unusual patterns
- **Violation Tracking**: Comprehensive logging and reporting system

### 📝 Test Management
- **Dynamic Test Creation**: Admin interface for creating custom tests
- **AI-Powered Question Generation**: Automated question creation using Google Gemini AI
- **Multiple Choice Questions**: Support for various question formats
- **Timed Sessions**: Configurable test durations with automatic submission
- **Real-time Progress Tracking**: Live monitoring of test completion status
- **Automatic Scoring**: Instant results with detailed analytics

### 🖥️ Security Features
- **Fullscreen Enforcement**: Prevents students from minimizing the test window
- **Tab Switching Detection**: Alerts when users navigate away from the test
- **Keyboard Shortcut Blocking**: Disables common shortcuts to prevent cheating
- **Copy-Paste Prevention**: Blocks clipboard operations during tests
- **Developer Tools Detection**: Prevents access to browser developer tools
- **Audio Monitoring**: Detects suspicious sounds during the test session

### 📊 Analytics & Reporting
- **User Performance Analytics**: Detailed insights into test performance
- **Violation Reports**: Comprehensive proctoring violation summaries
- **Test Statistics**: Analytics on test completion rates and scores
- **Behavioral Analysis**: Patterns and trends in student behavior
- **Export Capabilities**: PDF reports for administrators

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with modern hooks and context API
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Material-UI (MUI) for consistent design
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: React Context for global state
- **Routing**: React Router for client-side navigation
- **HTTP Client**: Axios for API communication

### Backend (FastAPI + Python)
- **Framework**: FastAPI for high-performance async API
- **Database**: Microsoft SQL Server with SQLAlchemy ORM
- **Authentication**: JWT-based with role-based access control
- **File Storage**: Organized media file system for images and documents
- **Background Tasks**: Asynchronous processing for screenshots and monitoring
- **AI Integration**: Google Gemini API for question generation
- **Image Processing**: OpenCV and face-recognition for proctoring features

### Database Schema
- **Users**: User management with role-based permissions
- **Tests**: Test configurations and metadata
- **Questions & Options**: Question bank with multiple choice answers
- **Test Sessions**: Active and completed test sessions
- **Violations**: Proctoring violation records
- **Screen Captures**: Screenshot storage and metadata
- **Behavioral Anomalies**: AI-detected suspicious behaviors
- **Face Verification**: Identity verification records

## 🚀 Quick Start

### Prerequisites

Before running the application, ensure you have the following installed:

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Microsoft SQL Server** (Express edition works fine)
- **SQL Server Management Studio (SSMS)** (recommended)
- **ODBC Driver 17 for SQL Server**

### 1. Database Setup

#### Install SQL Server
1. Download and install [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Install [SQL Server Management Studio (SSMS)](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
3. Download and install [ODBC Driver 17 for SQL Server](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

#### Configure SQL Server
1. Open SQL Server Configuration Manager
2. Go to **SQL Server Network Configuration > Protocols for SQLEXPRESS**
3. Enable **TCP/IP** and **Named Pipes**
4. Restart the SQL Server service

#### Create Database
1. Open SSMS and connect to your SQL Server instance
2. Right-click on "Databases" and select "New Database"
3. Name it `proctoring_db` and click OK

### 2. Project Setup

#### Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd ProctoringAndTestWithDB

# Install backend dependencies
cd backend
python -m venv venv
venv\\Scripts\\activate  # On Windows
# source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

#### Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_SERVER=localhost\\SQLEXPRESS
DB_NAME=proctoring_db
DB_TRUSTED_CONNECTION=yes
DB_DRIVER=ODBC Driver 17 for SQL Server

# For SQL Server Authentication (alternative)
# DB_USER=your_username
# DB_PASSWORD=your_password
# DB_TRUSTED_CONNECTION=no

# AI Configuration
GEMINI_API_KEY=your_google_gemini_api_key

# Security Configuration
SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256

# Optional: Descope Authentication
DESCOPE_PROJECT_ID=your_descope_project_id
```

> **Note**: Replace `localhost\\SQLEXPRESS` with your actual SQL Server instance name. For default instances, use just `localhost`.

### 3. Running the Application

#### Option 1: Using the Start Script (Windows)
```bash
# Run from the project root
start.bat
```

#### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
venv\\Scripts\\activate
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Option 3: Using Uvicorn (Alternative Backend Start)
```bash
cd backend
venv\\Scripts\\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database Test**: http://localhost:5173/db-test

## 📁 Project Structure

```
ProctoringAndTestWithDB/
├── backend/                          # FastAPI backend application
│   ├── app/
│   │   ├── models/                   # SQLAlchemy database models
│   │   ├── routes/                   # API route handlers
│   │   ├── services/                 # Business logic services
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── utils/                    # Utility functions and helpers
│   │   ├── config.py                 # Application configuration
│   │   ├── database.py               # Database connection and setup
│   │   └── __init__.py
│   ├── media/                        # File storage directory
│   │   ├── screenshots/              # Webcam snapshots by session
│   │   ├── snapshots/                # Screen captures by session
│   │   ├── id_photos/                # User ID photos for verification
│   │   └── suspicious_snapshots/     # Flagged images
│   ├── monitoring_logs/              # Proctoring event logs
│   ├── venv/                         # Python virtual environment
│   ├── main.py                       # Application entry point
│   ├── requirements.txt              # Python dependencies
│   ├── migrate_database.py           # Database migration script
│   ├── fix_sql_permissions.py        # SQL permissions fix script
│   └── setup_webcam_storage.py       # Media directories setup
├── frontend/                         # React frontend application
│   ├── public/                       # Static assets
│   ├── src/
│   │   ├── components/               # Reusable React components
│   │   ├── pages/                    # Page-level components
│   │   ├── contexts/                 # React context providers
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── layouts/                  # Layout components
│   │   ├── routes/                   # Route configurations
│   │   ├── services/                 # Frontend services
│   │   ├── utils/                    # Utility functions
│   │   ├── api/                      # API client functions
│   │   ├── styles/                   # CSS and styling files
│   │   ├── assets/                   # Images and static assets
│   │   ├── config.js                 # Frontend configuration
│   │   ├── App.jsx                   # Main application component
│   │   ├── main.jsx                  # Application entry point
│   │   └── index.css                 # Global styles
│   ├── package.json                  # Node.js dependencies
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   └── eslint.config.js              # ESLint configuration
├── OnlineSkillAssessment_DataStructure.txt  # Complete API documentation
├── SNAPSHOT_FOLDER_FIX.md            # Recent fixes documentation
├── README.md                         # This file
└── start.bat                         # Windows start script
```

## 🔧 Configuration

### Database Configuration Options

#### Windows Authentication (Recommended for Development)
```env
DB_SERVER=localhost\\SQLEXPRESS
DB_NAME=proctoring_db
DB_TRUSTED_CONNECTION=yes
DB_DRIVER=ODBC Driver 17 for SQL Server
```

#### SQL Server Authentication
```env
DB_SERVER=localhost\\SQLEXPRESS
DB_NAME=proctoring_db
DB_USER=your_username
DB_PASSWORD=your_password
DB_TRUSTED_CONNECTION=no
DB_DRIVER=ODBC Driver 17 for SQL Server
```

### Frontend Configuration

The frontend configuration is managed in `frontend/src/config.js`:

```javascript
const config = {
  apiUrl: 'http://localhost:8000',
  websocketUrl: 'ws://localhost:8000/ws',
  features: {
    faceVerification: true,
    gazeTracking: true,
    screenCapture: true,
    audioMonitoring: true
  }
};
```

## 🛠️ Development

### Backend Development

#### Database Migration
If you need to update the database schema:

```bash
cd backend
python migrate_database.py
```

#### Fix SQL Permissions
If you encounter permission issues:

```bash
cd backend
python fix_sql_permissions.py
```

#### Setup Media Directories
Initialize the media storage structure:

```bash
cd backend
python setup_webcam_storage.py
```

### Frontend Development

#### Development Server
```bash
cd frontend
npm run dev
```

#### Build for Production
```bash
cd frontend
npm run build
```

#### Linting
```bash
cd frontend
npm run lint
```

### API Documentation

The system automatically generates interactive API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🎯 User Roles & Workflows

### Administrator Workflow
1. **Create Tests**: Use the admin interface to create new tests
2. **Generate Questions**: Utilize AI-powered question generation
3. **Monitor Sessions**: View real-time test sessions and violations
4. **Review Results**: Access detailed analytics and reports
5. **Manage Users**: Handle user registrations and permissions

### Student Workflow
1. **Registration**: Provide personal information and upload ID photo
2. **Face Verification**: Complete identity verification process
3. **System Check**: Verify camera, microphone, and browser compatibility
4. **Test Rules**: Review and accept proctoring terms
5. **Take Test**: Complete the assessment under proctoring supervision
6. **View Results**: Access test scores and feedback

## 🔍 Proctoring Features

### Real-time Monitoring
- **Webcam Feed**: Continuous video monitoring with face detection
- **Screen Capture**: Periodic screenshots of the student's screen
- **Audio Analysis**: Detection of suspicious sounds or conversations
- **Gaze Tracking**: Eye movement analysis to detect looking away

### Violation Detection
- **Multiple Faces**: Detection of additional people in the frame
- **No Face**: Alerts when the student is not visible
- **Tab Switching**: Detection of navigation away from the test
- **Fullscreen Exit**: Alerts when the test window is minimized
- **Suspicious Behavior**: AI-powered anomaly detection

### Security Measures
- **Keyboard Blocking**: Prevents common shortcuts and function keys
- **Right-click Disabled**: Blocks context menu access
- **Copy-Paste Prevention**: Disables clipboard operations
- **Developer Tools Blocking**: Prevents access to browser dev tools
- **Window Focus Enforcement**: Ensures the test window remains active

## 📊 Analytics & Reporting

### Available Metrics
- **Test Performance**: Scores, completion rates, time analysis
- **Violation Statistics**: Types and frequency of proctoring violations
- **User Analytics**: Individual student performance tracking
- **Behavioral Patterns**: Analysis of suspicious behaviors
- **System Usage**: Platform utilization statistics

### Export Options
- **PDF Reports**: Detailed test reports with violation summaries
- **CSV Data**: Raw data export for further analysis
- **Charts and Graphs**: Visual representation of analytics

## 🐛 Troubleshooting

### Common Database Issues

#### SQL Server Not Running
```bash
# Check if SQL Server is running
services.msc
# Look for "SQL Server (SQLEXPRESS)" and ensure it's started
```

#### Connection Issues
1. Verify SQL Server instance name in `.env` file
2. Ensure TCP/IP and Named Pipes are enabled
3. Check Windows Firewall settings
4. Test connection in SQL Server Management Studio

#### Permission Errors
```bash
cd backend
python fix_sql_permissions.py
```

### Common Frontend Issues

#### Node.js Version
Ensure you're using Node.js 16 or higher:
```bash
node --version
npm --version
```

#### Port Conflicts
If port 5173 is in use:
```bash
npm run dev -- --port 3000
```

#### CORS Issues
Ensure the backend CORS configuration includes your frontend URL in `backend/main.py`.

### Performance Optimization

#### Backend Optimization
- Use connection pooling for database connections
- Implement caching for frequently accessed data
- Optimize image processing operations
- Use background tasks for heavy operations

#### Frontend Optimization
- Implement lazy loading for components
- Optimize image sizes and formats
- Use React.memo for expensive components
- Minimize bundle size with tree shaking

## 🔐 Security Considerations

### Data Protection
- All sensitive data is encrypted in transit and at rest
- User passwords are hashed using bcrypt
- JWT tokens have configurable expiration times
- File uploads are validated and sanitized

### Proctoring Security
- All proctoring data is stored securely with access controls
- Screen captures and webcam images are encrypted
- Violation reports include tamper-proof timestamps
- User identity verification uses advanced facial recognition

### Network Security
- HTTPS enforcement in production
- CORS policies properly configured
- API rate limiting to prevent abuse
- Input validation on all endpoints

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add feature description'`
5. Push to your branch: `git push origin feature-name`
6. Submit a pull request

### Code Standards
- Follow PEP 8 for Python code
- Use ESLint configuration for JavaScript/React
- Write unit tests for new features
- Update documentation for API changes
- Use meaningful commit messages

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the API documentation at `/docs`
- Create an issue in the repository
- Contact the development team

## 🚀 Deployment

### Production Environment Variables
```env
# Database
DB_SERVER=your_production_server
DB_NAME=proctoring_db_prod
DB_USER=your_prod_user
DB_PASSWORD=your_secure_password
DB_TRUSTED_CONNECTION=no

# Security
SECRET_KEY=your_production_secret_key
JWT_EXPIRATION_HOURS=24

# AI Services
GEMINI_API_KEY=your_production_api_key

# File Storage
MEDIA_ROOT=/var/media/proctoring
```

### Production Checklist
- [ ] Use HTTPS for all communications
- [ ] Set secure JWT secret keys
- [ ] Configure production database with backups
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting
- [ ] Configure file upload limits
- [ ] Set up automated backups
- [ ] Configure error reporting
- [ ] Test all proctoring features
- [ ] Verify all security measures

---

**Built with ❤️ for secure online assessments**