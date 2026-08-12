<div align="center">

<h1>🚀 CodeTrail</h1>

<p><strong>A collaborative coding platform for real-time code execution, workspace sharing, and contribution tracking.</strong></p>

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/github/license/Manushri3080/CodeTrail?style=flat-square" />
  <img src="https://img.shields.io/github/issues/Manushri3080/CodeTrail?style=flat-square" />
  <img src="https://img.shields.io/github/forks/Manushri3080/CodeTrail?style=flat-square" />
  <img src="https://img.shields.io/github/stars/Manushri3080/CodeTrail?style=flat-square" />
</p>

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Team](#-team)
- [License](#-license)

---

## 🧠 About

**CodeTrail** is a full-stack collaborative coding platform designed to streamline developer workflows. It combines a modular workspace, a live code execution sandbox, real-time collaboration via Socket.IO, and a contribution telemetry dashboard — all under one unified interface.

Whether you're pair-programming, running code snippets, or tracking your team's contributions, CodeTrail gives you the tools to code smarter together.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🔐 **Authentication** | Register/Login with email & password or Google OAuth |
| 📧 **Password Recovery** | Forgot password & reset via email link |
| 🏠 **Home Dashboard** | Personalized dashboard shown after login |
| 🛠️ **Modular Workspace** | Collaborative coding workspace with modular layout |
| ⚡ **Execution Engine** | Code execution sandbox to run and test code snippets |
| 📊 **Contribution Dossier** | Telemetry & contribution analytics for team members |
| 💻 **Terminal Modal** | Interactive in-app terminal powered by a custom kernel |
| 🌐 **Landing Page** | Public-facing hero section, module highlights, and feature grid |

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://react.dev/) | 19 | UI framework |
| [Vite](https://vite.dev/) | 8 | Build tool & dev server |
| [React Router DOM](https://reactrouter.com/) | 7 | Client-side routing |
| [Axios](https://axios-http.com/) | 1.x | HTTP client |
| [Three.js](https://threejs.org/) | 0.185 | 3D graphics/animations |
| [Lucide React](https://lucide.dev/) | 1.x | Icon library |
| [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google) | 0.13 | Google OAuth integration |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first styling |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [Node.js](https://nodejs.org/) | LTS | Runtime environment |
| [Express](https://expressjs.com/) | 5 | Web server framework |
| [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) | 9.x | Database & ODM |
| [Socket.IO](https://socket.io/) | 4.x | Real-time communication |
| [JSON Web Token](https://jwt.io/) | 9.x | Authentication tokens |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | 3.x | Password hashing |
| [Nodemailer](https://nodemailer.com/) | 9.x | Email service |
| [google-auth-library](https://www.npmjs.com/package/google-auth-library) | 11.x | Google token verification |

---

## 📁 Project Structure

```
CodeTrail/
├── Documents/                        # Project planning & proposal PDFs
│   ├── CodeTrail Project Plan.pdf
│   └── CodeTrail Project Proposal Document.pdf
│
├── backend/                          # Node.js + Express backend
│   ├── controllers/
│   │   └── authController.js         # Auth logic (register, login, OAuth, reset)
│   ├── models/
│   │   └── User.js                   # Mongoose User schema
│   ├── utils/
│   │   └── email.js                  # Nodemailer email utility
│   ├── .env.example                  # Environment variable template
│   ├── index.js                      # App entry point
│   └── package.json
│
├── frontend/                         # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx        # Top navigation
│   │   │   │   └── Footer.jsx        # Site footer
│   │   │   ├── LoginPage.jsx         # Login & Sign Up
│   │   │   ├── ForgotPassword.jsx    # Forgot password form
│   │   │   └── ResetPassword.jsx     # Reset password form
│   │   ├── modules/
│   │   │   ├── landing/
│   │   │   │   ├── HeroSection.jsx   # Landing hero
│   │   │   │   ├── ModulesGrid.jsx   # Feature grid
│   │   │   │   └── TerminalDemo.jsx  # Terminal demo preview
│   │   │   ├── home/
│   │   │   │   └── HomePage.jsx      # Logged-in dashboard
│   │   │   ├── workspace/
│   │   │   │   └── ModularWorkspace.jsx  # Collaborative workspace
│   │   │   ├── execution/
│   │   │   │   └── ExecutionEngine.jsx   # Code execution sandbox
│   │   │   ├── telemetry/
│   │   │   │   └── ContributionDossier.jsx # Contribution analytics
│   │   │   └── terminal/
│   │   │       ├── TerminalModal.jsx      # Terminal UI modal
│   │   │       └── terminalKernel.js      # Terminal command processor
│   │   ├── assets/
│   │   ├── constants/
│   │   ├── utils/
│   │   ├── App.jsx                   # Root component & routing logic
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Global styles
│   └── package.json
│
├── package.json                      # Root package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- A Google Cloud project with OAuth 2.0 credentials (for Google login)
- A Gmail account with an App Password (for email features)

---

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Manushri3080/CodeTrail.git
cd CodeTrail
```

**2. Install backend dependencies**
```bash
cd backend
npm install
```

**3. Install frontend dependencies**
```bash
cd ../frontend
npm install
```

---

### Environment Variables

Create a `.env` file inside the `backend/` directory using the provided template:

```bash
cp backend/.env.example backend/.env
```

Then fill in your values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mp9rgf1.mongodb.net/codetrail?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> **Note:** For `EMAIL_PASS`, use a [Gmail App Password](https://support.google.com/accounts/answer/185833), not your regular Gmail password.

---

### Running the App

**Start the backend server**
```bash
cd backend
npm run dev
```
> Backend runs on `http://localhost:5000`

**Start the frontend dev server** (in a new terminal)
```bash
cd frontend
npm run dev
```
> Frontend runs on `http://localhost:5173`

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login with email & password |
| `POST` | `/auth/google` | Login / Register with Google OAuth |
| `POST` | `/auth/forgot-password` | Send password reset email |
| `POST` | `/auth/reset-password` | Reset password using token |

---

## 🤝 Contributing

We follow a **feature-branch workflow**. Please read the guidelines below before contributing.

### Branch Naming Convention
```
features/<your-name>        → New features
fix/<issue-description>     → Bug fixes
docs/<description>          → Documentation updates
refactor/<description>      → Code refactoring
```

### Contribution Workflow

1. **Fork** the repo (external contributors) or create your feature branch (team members)
   ```bash
   git checkout -b features/your-name
   ```

2. **Make your changes** and commit with a clear message
   ```bash
   git add .
   git commit -m "feat: add [your feature description]"
   ```

3. **Push** your branch
   ```bash
   git push origin features/your-name
   ```

4. **Open a Pull Request** on GitHub against the `main` branch

5. **Wait for review** — at least one team member must approve before merging

### Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat:     New feature
fix:      Bug fix
docs:     Documentation change
style:    Formatting, no logic change
refactor: Code restructure, no feature change
test:     Adding or updating tests
chore:    Maintenance tasks
```

---

## 👥 Team

| Name | Role | Branch |
|------|------|--------|
| Manushri | | `features/manushri` |
| Maryam |  | `feat/maryam` |
| Anistina | | `features/anistina` |
| Ruchita | | `features/Ruchita` |
| Rishika | | `features/Rishika` |
| Mahi | | `features/Mahi` |
| Monar | | `features/Monar` |
| Meet | | `features/meet` |
| *(Add team members here)* | *(Role)* | *(Branch)* |

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ by the CodeTrail Team</p>
  <p>
    <a href="https://github.com/Manushri3080/CodeTrail">⭐ Star this repo</a> •
    <a href="https://github.com/Manushri3080/CodeTrail/issues">🐛 Report a bug</a> •
    <a href="https://github.com/Manushri3080/CodeTrail/pulls">🔀 Submit a PR</a>
  </p>
</div>
