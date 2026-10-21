# 🚀 CodeTrail: End-to-End System Documentation & Contributor Dossier

---

## 📌 Executive Summary

**CodeTrail** is an enterprise-grade, real-time collaborative software development platform and cryptographic contribution telemetry system. It combines browser-based code editing via Microsoft Monaco Editor, multi-language sandbox execution via Piston v2, low-latency multiplayer collaboration via dual-layer Socket.IO rooms, and an immutable, tamper-evident cryptographic Proof-of-Work activity ledger.

This document serves as the single source of truth for the CodeTrail project. It details the problem statement, technical stack, end-to-end architectural mechanics (frontend, backend, database, and WebSockets), detailed breakdowns of each module, and an exhaustive contribution dossier for all **8 team members**.

---

## 📑 Table of Contents

1. [Problem Statement & Background](#1-problem-statement--background)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Core Modules & End-to-End Implementation](#4-core-modules--end-to-end-implementation)
   - [Module 1: Authentication, Authorization & User Profile Management](#module-1-authentication-authorization--user-profile-management)
   - [Module 2: Workspace Lifecycle, Discovery & Role Management](#module-2-workspace-lifecycle-discovery--role-management)
   - [Module 3: Modular Workspace & Real-Time Multiplayer Editor](#module-3-modular-workspace--real-time-multiplayer-editor)
   - [Module 4: Multi-Language Code Execution Sandbox Engine](#module-4-multi-language-code-execution-sandbox-engine)
   - [Module 5: Cryptographic Proof-of-Work Activity Ledger & Forensic Auditor](#module-5-cryptographic-proof-of-work-activity-ledger--forensic-auditor)
   - [Module 6: Contribution Dossier & Telemetry Analytics Engine](#module-6-contribution-dossier--telemetry-analytics-engine)
   - [Module 7: Interactive Terminal Kernel & Marketing Landing Engine](#module-7-interactive-terminal-kernel--marketing-landing-engine)
5. [Real-Time Socket.IO Synchronization Deep Dive](#5-real-time-socketio-synchronization-deep-dive)
6. [Database Schema & Data Persistence Layer](#6-database-schema--data-persistence-layer)
7. [Comprehensive Contributor Breakdown (The 8 Team Members)](#7-comprehensive-contributor-breakdown-the-8-team-members)
8. [Edge Cases, Error Handling & System Resilience](#8-edge-cases-error-handling--system-resilience)
9. [Future Roadmap & Architectural Recommendations](#9-future-roadmap--architectural-recommendations)

---

## 1. Problem Statement & Background

### 1.1 The Industry Dilemma
Software engineering education, hackathons, remote development teams, and open-source projects rely heavily on collaboration. However, modern collaborative tooling suffers from significant fragmentation:

1. **The Toolchain Barrier:** Tools like VS Code Live Share require every collaborator to have identical runtimes, package managers, compilers, and dependencies configured locally. Environment mismatches ("works on my machine") derail pair programming.
2. **The Passive Pad Limitation:** Lightweight web pads (e.g., Google Docs, Etherpad, basic pastebins) offer real-time text sync but lack compiler toolchains, interactive terminals, debugging outputs, multi-file projects, and language-specific tooling.
3. **The Accountability Gap ("Freerider Problem"):** In team and educational settings, Git commit histories do not tell the whole story. A member can commit code authored by someone else, squash commits, rewrite history, or cherry-pick work. Traditional version control lacks fine-grained telemetry tracking active editing duration, line differential dynamics, execution frequency, and cryptographic guarantees of author identity.

### 1.2 The CodeTrail Solution
CodeTrail unifies these fractured domains into a cohesive, zero-install web platform:
- **Zero-Setup Collaborative IDE:** Instant browser-based multi-file editing powered by Microsoft Monaco Editor.
- **Sandboxed Multi-Language Compiler Engine:** Isolated execution across 9+ programming languages with real-time stdout, stderr, compile diagnostic capture, custom stdin, and execution time metrics.
- **Low-Latency Multiplayer Presence:** Real-time color-coded peer cursors, selection highlights, nametags, and optimistic synchronization with version conflict resolution.
- **Cryptographic Contribution Telemetry (CT-166 & CT-164):** An immutable SHA-256 hash-chained activity ledger (similar to a blockchain) that records every file edit, creation, deletion, rename, and execution. Any tampering with historical contributions breaks the hash pointer chain, triggering forensic audit alerts.

---

## 2. High-Level System Architecture

The following diagram illustrates the end-to-end data flow and structural interaction of CodeTrail:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT TIER (React 19 + Vite)                   │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │   Modular Workspace   │  │  Contribution Dossier │  │ Execution Engine │ │
│  │   (Monaco Editor)     │  │  (Telemetry & Audit)  │  │  (Sandbox UI)    │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬─────────┘ │
└──────────────┼──────────────────────────┼───────────────────────┼───────────┘
               │ HTTP REST                │ Socket.IO             │ HTTP REST
               │ /api/workspaces          │ Events / Heartbeats   │ /api/execute
               ▼                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION SERVER (Node.js + Express 5)            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ REST Controllers: auth, workspace, workspaceSession, activity, exec  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ Real-Time Sockets: workspaceSessionSocket.js & socketHandler.js        │  │
│  │ - Version Conflict Guard   - 30ms Throttled Cursor Tracking           │  │
│  │ - Viewer Role Enforcement  - Real-Time Heartbeat Session Accumulation │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │ Cryptographic Engine: cryptoProof.js                                  │  │
│  │ - SHA-256 Hash Chaining    - Canonical Serializer                     │  │
│  │ - Genesis Hash Anchor      - Forensic Chain Integrity Auditor         │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│       PERSISTENCE TIER        │               │       SANDBOX RUNTIME         │
│                               │               │                               │
│       MongoDB Atlas / Local   │               │   Piston v2 Execution Engine  │
│   (Users, Workspaces, Files,  │               │    (Port 2000 Local + EMKC    │
│    Sessions, Executions,      │               │     Cloud Remote Fallback)    │
│    Cryptographic ActivityLogs)│               │                               │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend Architecture
- **Framework:** React 19.x with functional components and modern hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`).
- **Build System:** Vite 8.x for lightning-fast HMR and optimized tree-shaking.
- **Routing:** React Router DOM v7 for declarative client-side navigation.
- **Code Editor:** `@monaco-editor/react` (Microsoft Monaco Editor engine, powers VS Code) supporting syntax trees, markers, hover tooltips, and custom delta-decorations.
- **Styling & Aesthetics:** Tailwind CSS v4 paired with custom vanilla CSS (`index.css`) featuring custom glassmorphism, glowing borders, animated gradients, and dark themes.
- **3D Graphics:** Three.js for interactive dynamic geometric canvas animations on the landing page hero section.
- **Iconography:** Lucide React for consistent, high-DPI SVG interface icons.
- **HTTP Client:** Axios with JWT request interceptors and error handling.
- **Real-Time Client:** `socket.io-client` v4 with exponential backoff reconnect logic.

### 3.2 Backend Architecture
- **Runtime:** Node.js (LTS).
- **Web Framework:** Express 5.x REST API with JSON payload body parsers (`limit: '10mb'`).
- **Real-Time Server:** Socket.IO v4.x attached to Node's native `http.Server`.
- **Database & ODM:** MongoDB Atlas with Mongoose 9.x (featuring automatic failover to local MongoDB `mongodb://127.0.0.1:27017/codetrail`).
- **Security & Cryptography:** Native Node.js `crypto` (SHA-256 hashing), `jsonwebtoken` (JWT), and `bcryptjs` (salted password hashing).
- **Mailing Transport:** Nodemailer configured for automated password reset dispatch via SMTP.
- **OAuth Integration:** `google-auth-library` verifying ID tokens from Google Identity Services.

### 3.3 Sandbox Execution Toolchain
- **Engine:** Piston v2 (open-source isolated containerized execution engine).
- **Local Service:** Integrated local Piston daemon auto-spawned on `http://localhost:2000`.
- **Remote Cloud Fallback:** `https://emkc.org/api/v2/piston/execute` providing high-availability redundancy if local port 2000 is occupied or offline.

---

## 4. Core Modules & End-to-End Implementation

---

### Module 1: Authentication, Authorization & User Profile Management

#### 1. Purpose & User Capabilities
Handles secure identity verification, session persistence, account customization, and credential recovery. Users can authenticate through traditional email/password credentials or Google OAuth 2.0.

#### 2. Frontend Implementation
- **Components:** `LoginPage.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `ProfilePage.jsx`, `AccountSettings.jsx`, `EditProfileModal.jsx`, `PersonalInfo.jsx`, `ProfileStats.jsx`.
- **Mechanics:**
  - Manages dual login/signup mode with form validation (regex email validation, password strength bars).
  - Integrates Google OAuth via `@react-oauth/google`. When a user logs in via Google, the resulting Google JWT credential is exchanged with the backend.
  - Stores the received CodeTrail JWT in `localStorage` under `ct-auth-token` and user metadata in `ct-user`.
  - Dispatches Axios requests with `Authorization: Bearer <token>`.

#### 3. Backend Implementation
- **Controller:** `backend/controllers/authController.js`
- **Endpoints:**
  - `POST /api/auth/register` — Validates inputs, salts and hashes password via `bcrypt.hash(password, 10)`, creates user document, signs JWT valid for 7 days.
  - `POST /api/auth/login` — Verifies email, checks password via `bcrypt.compare()`, generates JWT token.
  - `POST /api/auth/google` — Verifies Google token via `OAuth2Client.verifyIdToken()`. Performs atomic upsert: retrieves existing user or creates a new account with Google avatar.
  - `POST /api/auth/forgot-password` — Generates a crypto-random hex reset token (`crypto.randomBytes(32).toString('hex')`), hashes it for storage, sets a 1-hour expiration, and dispatches an HTML email via `nodemailer`.
  - `POST /api/auth/reset-password` — Matches unexpired hashed token and updates password.
  - `GET /api/auth/profile`, `PUT /api/auth/profile`, `PUT /api/auth/change-password` — Protected routes managed by `auth.js` middleware verifying `jwt.verify(token, process.env.JWT_SECRET)`.

#### 4. Database Schema
- **Model:** `User.js`
  - Fields: `name`, `email` (unique, lowercase), `password` (hashed), `googleId`, `avatar`, `role` (developer, lead, reviewer), `bio`, `githubUsername`, `resetPasswordToken`, `resetPasswordExpires`.

---

### Module 2: Workspace Lifecycle, Discovery & Role Management

#### 1. Purpose & User Capabilities
Enables users to create collaborative development rooms, manage project metadata, invite team members via unique invite codes or direct email, assign roles (`owner`, `admin`, `editor`, `viewer`), and browse public workspaces.

#### 2. Frontend Implementation
- **Components:** `WorkspacesPage.jsx`, `WorkspaceModal.jsx`, `WorkspaceSettingsModal.jsx`.
- **Mechanics:**
  - `WorkspacesPage.jsx` lists personal and public community workspaces with search queries and language tags.
  - `WorkspaceModal.jsx` provides an interactive modal with language templates (JavaScript, Python, C++, Java, Rust, Go, TypeScript), brand colors, and privacy settings.
  - `WorkspaceSettingsModal.jsx` (over 1,300 lines) enables owners and admins to manage members, promote/demote roles, copy invite codes, and review activity logs.

#### 3. Backend Implementation
- **Controller:** `backend/controllers/workspaceController.js`
- **Key Logic:**
  - Generates a unique 8-character cryptographic invite code (`crypto.randomBytes(4).toString('hex')`).
  - Initializes workspaces with language-specific boilerplate files (e.g., `index.js`, `main.py`, `main.cpp`).
  - Guards routes using `ObjectId.isValid()` checks and role checks (`owner`, `admin`, `editor`, `viewer`).
  - Seamlessly links to the cryptographic activity ledger: creating, updating, or joining a workspace triggers an automated `recordActivity` call.

#### 4. Database Schema
- **Model:** `Workspace.js`
  - Fields: `title`, `description`, `owner` (ObjectId -> User), `members` (`[{ user, role, joinedAt }]`), `inviteCode`, `language`, `files` (array of `WorkspaceFileSchema`), `brandColor`, `icon`, `status`, `settings` (`isPublic`, `allowAnonymousExecution`, `autoSaveInterval`), `timeSpent`, `activityLogs`, `lastActiveAt`.

---

### Module 3: Modular Workspace & Real-Time Multiplayer Editor

#### 1. Purpose & User Capabilities
The core IDE experience where developers write code, manage files, collaborate with peers, inspect execution outputs, and observe peer presence in real time.

#### 2. Frontend Implementation (`ModularWorkspace.jsx`)
- **Monaco Editor Integration:**
  - Dynamically mounts `@monaco-editor/react` with VS Code's Dark+ theme (`vs-dark`).
  - Implements language recognition for 16 extensions (`.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.cpp`, `.c`, `.java`, `.rs`, `.go`, `.html`, `.css`, `.json`, `.md`, `.sql`, `.yaml`).
  - Multi-file tab switching: users can open, switch, create, rename, and delete files inside an explorer tree.
- **Multiplayer Cursor & Nametag Rendering (CT-86):**
  - Monaco delta decorations track remote users' cursors and selection ranges.
  - Dynamically injects CSS classes (`.ct-monaco-remote-cursor`, `.ct-monaco-nametag`) displaying peer names in their assigned colors above their cursor line.
  - Throttles cursor broadcast to **30ms** to prevent network congestion.
- **Viewer Role Lock Guard (CT-89):**
  - If a participant has the `viewer` role, the Monaco editor instance is locked to `readOnly: true`, and UI action bars disable writing.
- **Resilient Auto-Save:**
  - Automatically debounces file changes every **2.5 seconds** and dispatches a `PATCH /api/workspaces/:id` request.
  - If the network drops or the server is temporarily offline, it seamlessly falls back to browser `localStorage` and updates the UI status pill to *"Saved locally (offline)"*.

#### 3. Socket Mechanics
- Communicates via `workspaceSessionSocket.js`:
  - `code_change` -> Broadcasts `code_updated` with monotonically increasing sequence counters.
  - `cursor_position_update` -> Broadcasts `cursor_position_updated` with line and column coordinates.
  - `file_created`, `file_deleted`, `file_renamed` -> Instantly updates the file tree across all connected browser tabs.

---

### Module 4: Multi-Language Code Execution Sandbox Engine

#### 1. Purpose & Capabilities
Allows developers to test and run their programs directly from the browser. Supports interactive execution with standard input (`stdin`), captures compilation outputs and runtime stack traces, detects process execution timeouts, and displays duration benchmarks.

#### 2. Execution Architecture Flow
```
[User Clicks 'Run Code']
         ↓
Frontend ModularWorkspace.jsx / ExecutionEngine.jsx
         ↓
HTTP POST /api/execute (Payload: language, code, stdin, filename, workspaceId)
         ↓
Backend executionController.js
         ↓
Payload Validation (Max 256KB code, 128KB stdin)
         ↓
[Attempt 1: Local Piston v2 Server (http://localhost:2000/api/v2/execute)]
    │
    ├─► Failure / Port Busy? ──► [Attempt 2: Remote Piston API (emkc.org)]
    │
    ▼
Output Sanitization & Diagnostics Parser:
- Exit Code Extraction (0 = Success, >0 = Runtime Error)
- Compilation Failure vs Runtime Failure Classification
- SIGKILL / Timeout Detection (>10s limit)
         ↓
Save Execution Document to MongoDB (Execution.js)
         ↓
Auto-record Cryptographic Ledger Activity ('code_execution')
         ↓
JSON Response -> Rendered in Terminal / Output Console
```

#### 3. Output Classification Engine
The backend classifies sandbox execution into 5 deterministic states:
1. `idle` — No code running.
2. `running` — Sandbox process active with animated spinner.
3. `success` — Exit code `0`, clean stdout.
4. `error` — Non-zero exit code or unhandled exception on `stderr`.
5. `compile_error` — Compilation failure (e.g. C++ syntax error, Java javac error) evaluated separately before runtime.
6. `timeout` — Process exceeded execution ceiling (SIGKILL received), tagged with an *Execution Timed Out* warning badge.

---

### Module 5: Cryptographic Proof-of-Work Activity Ledger & Forensic Auditor

#### 1. Purpose & Capabilities (CT-166 & CT-164)
Ensures total transparency and immutability for software project contributions. Every meaningful action—saving code, creating files, executing programs, joining rooms—is cryptographically hashed into an unforgeable hash chain.

#### 2. Cryptographic Architecture (`cryptoProof.js`)
- **Genesis Block Anchor:** Sequence `1` begins with a genesis hash consisting of 64 zeroes (`"0".repeat(64)`).
- **Canonical Payload Serializer:** JSON object keys are sorted deterministically before hashing to guarantee that object key order never produces inconsistent hashes:
  $$\text{Payload} = \{\text{workspaceId}, \text{sequenceNumber}, \text{previousHash}, \text{timestamp}, \text{userId}, \text{action}, \text{linesAdded}, \text{linesDeleted}, \text{details}\}$$
- **SHA-256 Hash Pointer Linkage:**
  $$\text{CurrentHash}_n = \text{SHA-256}(\text{Canonicalize}(\text{Payload}_n \parallel \text{CurrentHash}_{n-1}))$$
- **Monotonic Sequence Enforcement:** Strict integer progression ($1, 2, 3, \dots, N$). Any gap or duplicate causes instant validation failure.
- **Timestamp Chronology:** Each block's timestamp must be $\ge$ the preceding block's timestamp (with 1-second clock jitter allowance), preventing retroactive insertion of forged contributions.

#### 3. Forensic Chain Integrity Auditor (`auditActivityChainIntegrity`)
Runs automated forensic checks across the entire activity history:
- Checks sequence continuity (`SEQUENCE_GAP`).
- Validates hash pointers (`CHAIN_LINK_BROKEN`).
- Recomputes canonical payload hashes (`PAYLOAD_ALTERED`).
- Validates timestamps (`TIMESTAMP_ANOMALY`).
- Computes an overall **Chain Fingerprint**: SHA-256 hash of all concatenated block hashes.

#### 4. Tamper Simulation Engine (`simulateTamperValidation.js` & Modal)
For QA and academic demonstrations, users can trigger controlled simulations:
- `modify_payload_lines` — Forges lines added in a historical block.
- `modify_hash` — Replaces a block hash.
- `break_pointer` — Corrupts a previous hash pointer.
- `alter_sequence` — Injects an out-of-order sequence number.
When simulated, the UI lights up with a **Tamper Warning** banner, identifying the exact block index, forged content, and diagnostic error.

---

### Module 6: Contribution Dossier & Telemetry Analytics Engine

#### 1. Purpose & Capabilities (CT-167 & CT-164)
Provides developers, project managers, and evaluators with a telemetry dashboard visualizing team contributions.

#### 2. Real-Time Telemetry Pipeline (`telemetryStore.js`)
- An in-memory and MongoDB-backed telemetry store tracks:
  - Total lines added, deleted, and changed per contributor.
  - Percentage contribution distribution.
  - Active session duration (accumulated via 30s heartbeats).
  - Code execution counts.
  - Latest cryptographic block hash per developer.
- Intercepts editor actions via `telemetryInterceptor.js` and `useContributionTelemetry.js`, broadcasting telemetry stream envelopes across Socket.IO rooms.

#### 3. Audit Report Export (`auditExport.js`)
Users can export verified audit reports in two formats:
1. **JSON Audit Report:** Machine-readable dump containing the chain fingerprint, block ledger, integrity ratio, and contributor metrics.
2. **Markdown Audit Report:** Formatted document with summary tables, contributor breakdown, and forensic verification badges ready for submission or PR review.

---

### Module 7: Interactive Terminal Kernel & Marketing Landing Engine

#### 1. In-Browser Terminal Modal (`terminalKernel.js` & `TerminalModal.jsx`)
- Simulates an interactive UNIX-style terminal inside the app.
- Built-in commands:
  - `help` — Lists available commands.
  - `status` — Checks server and database connectivity.
  - `run [file]` — Triggers execution of a workspace file.
  - `clear` — Resets console history.
  - `whoami` — Prints active user profile.
  - `version` — Outputs current CodeTrail release version.

#### 2. Marketing Landing Page (`HeroSection.jsx`, `ModulesGrid.jsx`)
- High-impact visual landing page with a Three.js interactive 3D particle canvas.
- Highlights core platform features, live terminal demos, and direct links to sign up or join a workspace.

---

## 5. Real-Time Socket.IO Synchronization Deep Dive

CodeTrail uses a dual-layer Socket.IO architecture to cleanly separate in-memory live presence from database-backed session state:

```
Socket Connection Established
        │
        ├─► 'joinWorkspace' / 'join_workspace_session'
        │       ├── Joins rooms: 'workspace:<id>' and 'workspace_<id>'
        │       ├── Upserts WorkspaceSession document (status: 'online')
        │       ├── Emits 'presenceUpdate' & 'active_users_update'
        │       └── Pushes initial telemetry dossier sync
        │
        ├─► 'code_change'
        │       ├── Role Check: Blocks if role is 'viewer' (emits 'code_change_error')
        │       ├── Version Check: Compares incoming version with fileVersionMap
        │       │     └── If version < serverVersion: drops stale packet, emits 'code_conflict'
        │       ├── Updates fileVersionMap with new monotonic version
        │       └── Broadcasts 'code_updated' to all room peers
        │
        ├─► 'cursor_position_update' / 'cursor_move'
        │       └── Throttled (30ms): Broadcasts line & column coordinates with user color
        │
        ├─► 'telemetry:action' & 'telemetry:heartbeat'
        │       ├── Generates monotonic sequence number
        │       ├── Computes SHA-256 verification hash
        │       └── Broadcasts 'telemetry:stream' and 'telemetry:dossier_sync'
        │
        └─► 'disconnect' / 'leaveWorkspace'
                ├── Updates WorkspaceSession document (status: 'offline', leftAt: Date)
                ├── Emits 'userLeft'
                └── Recomputes and emits updated 'presenceUpdate'
```

---

## 6. Database Schema & Data Persistence Layer

### Summary of MongoDB Collections & Mongoose Models

| Collection / Model | Key Responsibilities | Primary Indexes |
| :--- | :--- | :--- |
| **`User`** | Stores credentials, Google OAuth profile, passwords (bcrypt), and reset tokens. | `email` (unique) |
| **`Workspace`** | Stores workspaces, metadata, file contents, members, invite codes, settings, and accumulated time spent. | `{ owner: 1, status: 1 }`<br>`{ 'members.user': 1 }`<br>`inviteCode` (unique, sparse) |
| **`WorkspaceSession`** | Tracks real-time online/offline presence, active socket IDs, last active timestamps, and file focus. | `{ userId: 1, workspaceId: 1 }` (unique) |
| **`Execution`** | Archives all code execution runs, stdout/stderr logs, compile outputs, exit codes, and timing. | `{ workspace: 1, timestamp: -1 }` |
| **`ActivityLog`** | The immutable cryptographic ledger storing SHA-256 hash chains, block sequences, and line diff metrics. | `{ workspaceId: 1, sequenceNumber: 1 }` (unique)<br>`{ workspaceId: 1, timestamp: -1 }`<br>`{ workspaceId: 1, action: 1 }` |

---

## 7. Comprehensive Contributor Breakdown (The 8 Team Members)

CodeTrail was developed collaboratively by a team of **8 engineers**. The following breakdown details each member's contributions based on repository commits, pull requests, and status reports:

---

### 1. Manushri Thakkar (202512122)
**Project Role:** Project Manager / Backend & Crypto Chain Lead / DevOps  
**Feature Branch:** `features/manushri`  
**Key Commit References:** `aa24bf1d`, `fd9782ec`, `a5f6018f`, `bd7a6894`, `c035413e`, `b65c6b20`, `a047befa`, `8db7ff85`

- **Repository Setup & Project Management:**
  - Initialized the Git repository, project scaffolding, package configurations, and authored the project proposal and planning documents.
  - Served as release coordinator, managing the Jira backlog and reviewing and merging PRs (#1, #12, #16, #20, #22).
- **Socket Infrastructure Foundation:**
  - Implemented the initial room-based broadcast mechanisms in `workspaceSessionSocket.js` (CT-85 first pass).
  - Hardened `workspaceController.js` with `ObjectId.isValid()` guards across all endpoints.
- **Cryptographic Activity Ledger & Proof-of-Work Engine:**
  - Designed and built the SHA-256 activity logging pipeline (`cryptoProof.js`), featuring canonical JSON serialization, genesis hash anchoring, and hash pointer linkage.
  - Implemented the Mongoose `ActivityLog.js` schema with compound unique indexing on `{ workspaceId: 1, sequenceNumber: 1 }`.
  - Authored `backend/controllers/activityController.js` and `backend/routes/activityRoutes.js` for logging, verifying, and querying cryptographic activities.
  - Integrated automated activity recording across workspace updates and execution events.
  - Developed test suites: `proofOfWork.test.js` and `activityController.test.js`.

---

### 2. Maryam Shaikh (202512074)
**Project Role:** Full-Stack Developer / UI Architect  
**Feature Branch:** `feat/maryam`  
**Key Commit References:** `73de29d3`, `57d97df5`, `ba7d68bf`, `84c27f47`, `c8d8f0ba`, `0bf8a7b0`, `06854877`, `a75843fa`, `3a9d94ca`

- **UI System Architecture & Design Foundation:**
  - Designed the visual layout system in `index.css`, establishing design tokens, dark themes, and glassmorphism styling.
  - Built the landing page (`HeroSection.jsx`, `ModulesGrid.jsx`) and authenticated dashboard (`HomePage.jsx`).
  - Resolved responsive design issues and security vulnerabilities across routes.
- **Workspace Session Management Layer:**
  - Developed `WorkspaceSession.js` Mongoose model with compound unique indices.
  - Authored `workspaceSessionController.js` and `workspaceSessionRoutes.js`, implementing 5 REST APIs: enter, leave, heartbeat, file-focus, and all-sessions.
- **Workspace Administration & Discovery:**
  - Built `WorkspaceSettingsModal.jsx` (over 1,300 lines), implementing member management, role promotion/demotion, metadata editing, and activity log review.
  - Developed `WorkspacesPage.jsx` for discovering and searching public workspaces.
- **Resilient Auto-Save:**
  - Implemented the 2.5-second debounced auto-save mechanism with automatic fallback to `localStorage` when offline.

---

### 3. Ruchita Patadiya (202512070)
**Project Role:** Frontend Developer / Shared Editor & Telemetry UI  
**Feature Branch:** `features/Ruchita`  
**Key Commit References:** `95e73bd7`, `09e979e7`, `c21dac68`, `99a65acd`, `55333ac2`

- **Authentication & Onboarding Interface:**
  - Developed `LoginPage.jsx` supporting registration, login, and Google OAuth with client-side validation.
  - Connected dashboard routing between landing, authentication, and workspace views.
- **Monaco Multi-File Management (PR #15):**
  - Integrated `@monaco-editor/react` into `ModularWorkspace.jsx`.
  - Built `getMonacoLanguage()` supporting 16 programming languages and `getStarterBoilerplate()` generating default starter templates.
  - Implemented multi-file tab navigation, file tree creation, file selection state, and default file setups (`DEFAULT_WORKSPACE_FILES`).
- **Telemetry UI & Audit Export (PR #21):**
  - Built the `ContributionDossier.jsx` dashboard interface visualizing team contribution distributions, line diff counts, and active durations.
  - Authored `auditExport.js` enabling one-click export of verified audit reports in both formatted JSON and Markdown.

---

### 4. Mahi Kansara (202512078)
**Project Role:** Frontend Developer / Socket.IO Integration Lead  
**Feature Branch:** `feature/Mahi`  
**Key Commit References:** `eef71001`, `86d878d3`, `9b8afc5a`, `19819efb`, `c3cae57e`, `5f5da245`, `c66702cf`, `a02b7690`

- **User Profile Management Module:**
  - Developed the complete profile module: `ProfilePage.jsx`, `AccountSettings.jsx`, `EditProfileModal.jsx`, `PersonalInfo.jsx`, `ProfileHeader.jsx`, `ProfileStats.jsx`, and `RecentActivity.jsx`.
- **Phase 3B Collaborative Workspace Hardening (CT-89):**
  - Implemented the viewer read-only guard (`isViewer`) at both component and socket layers.
  - Developed monotonic version counters per file key (`workspaceId:fileId`) to drop stale out-of-order packets.
  - Built the reconnection banner with real-time connection state indicators.
- **Real-Time Telemetry Synchronization (CT-164 & CT-167):**
  - Authored `backend/utils/telemetryStore.js`, `frontend/src/hooks/useContributionTelemetry.js`, `frontend/src/utils/telemetryInterceptor.js`, and `frontend/src/utils/timeUtils.js`.
  - Implemented live telemetry socket broadcast and timestamp recording.
- **CI/CD Deployment Configuration:**
  - Configured root build scripts, Vercel deployment settings (`vercel.json`), and resolved build conflict markers.

---

### 5. Anistina Dsouza (202512081)
**Project Role:** Full-Stack Developer / Execution & QA Lead  
**Feature Branch:** `features/anistina`  
**Key Commit References:** `97610152`, `de572107`, `3667336e`, `069f2614`, `635432d8`, `d700a61d`

- **Project Documentation:**
  - Authored the comprehensive repository documentation (`README.md`), defining project architecture, setup instructions, and API references.
- **Module 2 Workspace Creation & Management:**
  - Implemented Module 2 REST APIs in `workspaceController.js` and collaborative room management.
- **Code Execution Validation & Piston Engine Hardening:**
  - Refactored `executionController.js` and `pistonServer.js` with payload validation, input sanitization, and dual sandbox fallback (local to remote).
  - Built the backend execution test suite: `backend/tests/executionValidation.test.js` (320+ lines).
- **Frontend Execution Sandbox Enhancements:**
  - Enhanced `ExecutionEngine.jsx` with editable code runners, status badges, compilation diagnostics displays, and terminal styling.

---

### 6. Dudhat Monar (202512019)
**Project Role:** Backend Developer / QA Engineer  
**Feature Branch:** `features/Monar`  
**Key Commit References:** `78903f65`, `25c2b0f6`, `b97fc9d1`, `4756b02a`

- **Authentication Password Recovery:**
  - Developed `ResetPassword.jsx` and connected the token verification endpoint.
- **Real-Time Multiplayer Monaco Cursor Tracking (CT-86):**
  - Implemented peer cursor and selection tracking in `workspaceSessionSocket.js` and `socketHandler.js`.
  - Added dynamic Monaco delta-decoration injection with nametag styling in `ModularWorkspace.jsx` and `index.css`.
  - Implemented 30ms throttling on cursor broadcasts to prevent network flooding.
- **Forensic Chain Integrity Auditor & Tamper Simulation (CT-166):**
  - Enhanced `cryptoProof.js` with the forensic audit function `auditActivityChainIntegrity` and tamper simulation utility `simulateTamper`.
  - Developed the forensic test suite: `backend/tests/integrityAuditor.test.js` (270+ lines).
  - Created the standalone test script `simulateTamperValidation.js` and connected the simulation modal to `ContributionDossier.jsx`.

---

### 7. Rishika Shah (202512041)
**Project Role:** Frontend UI Engineer / Execution Integration  
**Feature Branch:** `features/Rishika`  
**Key Commit References:** `f16eff1b`, `3c757aeb`, `32a2407e`

- **Workspace Creation & Join Modals:**
  - Refactored `WorkspaceModal.jsx` with expanded create and join flows, input validation, and role selection.
  - Enhanced `HomePage.jsx` with quick-join actions, normalized language tags, and filter styling.
- **Execution Engine Custom Stdin & History Integration:**
  - Developed the Mongoose `Execution.js` model for persisting execution logs to MongoDB.
  - Integrated custom standard input (`stdin`) handling across `executionController.js`, `pistonServer.js`, `ExecutionEngine.jsx`, and `ModularWorkspace.jsx`.
  - Added the interactive output console drawer allowing users to supply custom runtime arguments.

---

### 8. Meet Sheth (202512057)
**Project Role:** Backend Architect / System Designer  
**Feature Branch:** `features/meet`  
**Key Commit References:** `4edb37c0`

- **System Architecture & Design:**
  - Authored the core System Design Document (SDD), establishing architectural boundaries, component interfaces, and database relationships.
- **Initial Code Execution Engine Foundation:**
  - Built the initial version of `backend/utils/pistonServer.js`, creating the local Piston v2 execution service wrapper on port 2000.
  - Developed the initial `executionController.js` routing and wired execution triggers into `ModularWorkspace.jsx`.
  - Documented the execution architecture flow in the project README.

---

## 8. Edge Cases, Error Handling & System Resilience

1. **Database Unavailability (Offline Mode):**
   - Middleware `checkDbConnection` intercepts API calls when MongoDB is unreachable and returns HTTP `503`.
   - The execution sandbox (`/api/execute`) works independently of database availability, allowing users to compile and run code even when offline.
   - The workspace editor falls back to browser `localStorage` if database saving fails.
2. **Race Conditions in Cryptographic Sequencing:**
   - In `activityController.js`, when concurrent edits occur simultaneously, a retry loop with exponential backoff (up to 3 retries) catches MongoDB `E11000` duplicate key errors and recomputes the monotonic sequence number and hash pointer.
3. **Execution Sandboxing Bounds:**
   - Source code is capped at **256 KB** and standard input at **128 KB**.
   - Terminal stdout/stderr outputs are truncated at **64 KB** to prevent browser memory exhaustion.
   - A **10-second ceiling** kills runaway processes with `SIGKILL`.
4. **WebSocket Packet Dropping & Conflict Resolution:**
   - Stale code packets bearing version numbers lower than the server's current version counter are dropped to prevent edit overwrites.
   - Viewer connections attempting to transmit code modifications are blocked at both client and socket layers.

---

## 9. Future Roadmap & Architectural Recommendations

1. **Operational Transformation (OT) or CRDT Integration:**
   - While version counters prevent out-of-order packet corruption, integrating Conflict-Free Replicated Data Types (such as Yjs or Automerge) will enable character-level concurrent editing.
2. **WebAssembly Local Execution:**
   - Introducing client-side WebAssembly runtimes (e.g., Pyodide for Python, WebAssembly Clang for C++) can enable offline execution without relying on backend Piston servers.
3. **Decentralized Merkle Tree Anchoring:**
   - Periodically anchoring the chain fingerprint to a public testnet (such as Ethereum Sepolia) can turn CodeTrail's contribution ledger into a globally verifiable credential for student portfolios.
4. **Containerized User Workspaces:**
   - Adding Docker/Kubernetes sandboxes with language server protocol (LSP) support will bring intelligent autocomplete and interactive debugging to the platform.

---

*Authored for the CodeTrail Collaborative Engineering Project.*  
*Documentation generated and verified against repository commit history.*
