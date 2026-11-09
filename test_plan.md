# 📋 CodeTrail: Comprehensive Formal Test Plan, Execution Specifications & Verification Results Document

---

## 📌 Document Control & Metadata

| Attribute | Specification |
| :--- | :--- |
| **Project Title** | **CodeTrail** — Real-Time Collaborative Code Editor with Cryptographic Contribution Tracking |
| **Course** | **Web Services & Service-Oriented Architecture (IT645)** |
| **Institution** | **Dhirubhai Ambani University (Formerly DA-IICT)** |
| **Document Type** | Formal Software Test Plan, Test Case Specifications, Database Seeding Strategy & Bug Log |
| **Deliverable Category** | Academic Submission Assignment (Git Repository & Google Classroom) |
| **Version** | **1.0.0 (Release Candidate / Final Audit)** |
| **Date of Execution** | November 2026 |
| **Test Lead / QA** | Anistina Dsouza (202512081) & Dudhat Monar (202512019) |
| **Project Manager** | Manushri Thakkar (202512122) |
| **Status** | **Approved & Fully Executed (100% Core Test Pass Rate)** |

---

## 👥 Contributor & Module Ownership Matrix

| # | Student Name | Student ID | Primary Project Role | Module / Test Domain Ownership |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Manushri Thakkar** | 202512122 | Project Manager / Backend & Crypto Chain Lead | Module 5 (Proof-of-Work Ledger, SHA-256 Chaining), Repository Architecture, Sockets |
| **2** | **Maryam Shaikh** | 202512074 | Full-Stack Developer / UI Architect | UI Design Tokens, Modular Workspace Layout, Workspace Sessions (`WorkspaceSession.js`) |
| **3** | **Ruchita Patadiya** | 202512070 | Frontend Developer / Shared Editor & Telemetry UI | Module 3 (Monaco Multi-file Navigation, Boilerplates), Module 6 (Contribution Dossier UI) |
| **4** | **Mahi Kansara** | 202512078 | Frontend Developer / Socket.IO Integration Lead | Module 1 (User Profiles), CT-164/CT-167 Telemetry Store, Version Guards, Reconnection |
| **5** | **Anistina Dsouza** | 202512081 | Full-Stack Developer / Execution & QA Lead | Module 4 (Piston Sandbox Engine), CT-199 (Contribution Report Generator & Validator) |
| **6** | **Dudhat Monar** | 202512019 | Backend Developer / QA Engineer | Module 5 (CT-166 Chain Integrity Auditor, Tamper Simulation Engine), Reset Password |
| **7** | **Rishika Shah** | 202512041 | Frontend UI Engineer / Session Analytics Lead | Module 4 (Execution Stdin Drawer), CT-198 & CT-201 (Session Analytics & Validation Suite) |
| **8** | **Meet Sheth** | 202512057 | Backend Architect / System Designer & PDF Lead | System Architecture, Piston Server Wrapper, CT-200 (PDF Export Engine), Workspace Regression |

---

## 📑 Table of Contents

1. [Section 1: Test Plan Overview & Objectives](#section-1-test-plan-overview--objectives)
   - 1.1 Document Purpose & Scope
   - 1.2 System Under Test (SUT) Summary & High-Level Architecture
   - 1.3 Test Strategy & Verification Methodology
   - 1.4 Test Environment & Toolchain Configuration
2. [Section 2: Functional Testing — Unit, Integration & API Test Specifications](#section-2-functional-testing--unit-integration--api-test-specifications)
   - 2.1 Cryptographic Proof-of-Work & Activity Ledger Engine (Module 5)
   - 2.2 Telemetry Store & Real-Time Synchronization (Module 6: CT-164 & CT-167)
   - 2.3 Contribution Analytics & Session Validation (CT-197, CT-198 & CT-201)
   - 2.4 Formal Contribution Report Generation & Mathematical Content Validation (CT-199)
   - 2.5 Multi-Language Code Execution Sandbox Engine (Module 4)
   - 2.6 Backend Runtime Bug Fixes & Workflow Regression Testing
   - 2.7 Workspace Visibility, Role Management & Dashboard Regression Testing
   - 2.8 REST API Endpoint Test Specifications
   - 2.9 Socket.IO Real-Time Event & Presence Integration
   - 2.10 Comprehensive Functional Test Cases Matrix
3. [Section 3: Database Seeding Strategy & Meaningful Records Population](#section-3-database-seeding-strategy--meaningful-records-population)
   - 3.1 Seeding Objectives & Rationale
   - 3.2 Schema Architecture & Entity Relationship Diagram
   - 3.3 Concrete Seeding Specification Across All Collections
   - 3.4 Automated Seeding Script Execution Guide (`seedDatabase.js`)
   - 3.5 Database Verification Queries & Meaningful Sample Records
4. [Section 4: Non-Functional Testing](#section-4-non-functional-testing)
   - 4.1 UI & Usability Testing (Monaco Editor, Remote Cursors, Theme, Viewer Locks)
   - 4.2 Performance, Load & Concurrency Testing
   - 4.3 Security, Authorization & Cryptographic Integrity Testing
   - 4.4 Reliability, Fault Tolerance & Offline Mode Testing
   - 4.5 Compatibility & Cross-Browser Testing
5. [Section 5: Defect Tracking & Bug Logs (Defect Lifecycle & Resolution)](#section-5-defect-tracking--bug-logs-defect-lifecycle--resolution)
   - 5.1 Defect Classification & Severity Matrix
   - 5.2 Formal Bug Log (BUG-001 through BUG-010)
   - 5.3 Detailed Root Cause Analysis & Verification Proof for Resolved Defects
6. [Section 6: Test Execution Results, Traceability & Deliverables Summary](#section-6-test-execution-results-traceability--deliverables-summary)
   - 6.1 Automated Test Execution Summary Table
   - 6.2 Requirements Traceability Matrix (RTM)
   - 6.3 Deliverables Manifest (Git Repository & Google Classroom)
   - 6.4 Formal Quality Assurance Sign-Off

---

# Section 1: Test Plan Overview & Objectives

### 1.1 Document Purpose & Scope
This formal **Test Plan and Results Document** establishes the comprehensive verification framework for the **CodeTrail** collaborative engineering platform. It defines the testing scope, test strategies, detailed functional test cases (Unit, Integration, and API), database seeding specifications with meaningful records, non-functional testing methodologies (UI, performance, security, reliability, compatibility), and the complete historical defect log tracking discovered bugs through to resolution.

The scope encompasses all 7 architectural modules of the CodeTrail system:
- **Module 1:** Authentication, Authorization & User Profile Management (Local JWT + Google OAuth 2.0).
- **Module 2:** Workspace Lifecycle, Discovery, Invitation & Role-Based Access Control (RBAC).
- **Module 3:** Modular Workspace & Real-Time Multiplayer Editor (Monaco Editor, multi-file trees, peer cursor broadcasting).
- **Module 4:** Multi-Language Code Execution Sandbox Engine (Piston v2 integration, stdin, timeouts, diagnostic parsing).
- **Module 5:** Cryptographic Proof-of-Work Activity Ledger & Forensic Auditor (SHA-256 hash chaining, genesis anchoring, tamper detection).
- **Module 6:** Contribution Dossier & Telemetry Analytics Engine (Real-time telemetry, session analytics, mathematical consistency, report exports).
- **Module 7:** Interactive Terminal Kernel & Visual Landing Engine (UNIX terminal emulator, Three.js 3D canvas).

### 1.2 System Under Test (SUT) Summary & High-Level Architecture
CodeTrail combines real-time multiplayer code collaboration with an unforgeable cryptographic telemetry ledger:

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

### 1.3 Test Strategy & Verification Methodology
The testing strategy incorporates multi-tier automated and empirical verification:
1. **Unit Testing:** Isolated testing of mathematical calculations, cryptographic SHA-256 hashing, canonical serialization, schema sanitizers, and diagnostic parsing rules using Node.js native assertion harnesses (`assert`).
2. **Integration Testing:** End-to-end verification of multi-user collaborative chains, session state lifecycles, and cross-module interactions between editor actions and cryptographic ledger appending.
3. **API & Contract Testing:** Verification of HTTP request/response payloads, status codes (200, 201, 400, 401, 403, 404, 500, 503), authentication middleware, and input validation bounds.
4. **Real-Time Socket Event Testing:** Validation of dual-layer Socket.IO rooms, message delivery, packet deduplication, 30ms cursor rate limiters, and monotonic version counters.
5. **Database Seeding & State Verification:** Programmatic generation of realistic, interconnected database records followed by mathematical and cryptographic audit verification.
6. **Non-Functional Testing:** Verification of UI ergonomics (Monaco Editor, viewer lock, auto-save fallbacks), performance scalability (1,500 event stress tests, cursor throttling), and security posture (tamper detection, role enforcement).
7. **Regression Testing:** Automated verification guaranteeing that bug fixes (Issues 1–10) do not introduce behavioral regressions.

### 1.4 Test Environment & Toolchain Configuration
- **Host Operating System:** Windows 11 Enterprise (x64)
- **Node.js Runtime:** v24.18.0 LTS
- **Backend Framework:** Express v5.2.1
- **Database Engine:** MongoDB Atlas (Cloud) / Local Replica Set (v7.0) with Mongoose v9.9.1
- **Frontend Framework:** React v19.2.8 with Vite v8.2.1
- **Code Editor Engine:** `@monaco-editor/react` v4.7.0 (Microsoft Monaco Engine)
- **Real-Time Transport:** `socket.io` & `socket.io-client` v4.8.3
- **Linter Engine:** Oxlint v1.75.0 (High-performance Rust-based JavaScript linter)
- **Execution Sandbox:** Piston v2 (Local daemon on `http://localhost:2000` with automated cloud fallback to `https://emkc.org/api/v2/piston/execute`)
- **Cryptography:** Native Node.js `crypto` (FIPS-compliant SHA-256) and `bcryptjs` v3.0.3

---

# Section 2: Functional Testing — Unit, Integration & API Test Specifications

CodeTrail includes 10 dedicated backend test suites and automated verification harnesses. All suites execute cleanly with **100% pass rate**.

---

### 2.1 Cryptographic Proof-of-Work & Activity Ledger Engine (Module 5)
**Test Suite File:** `backend/tests/proofOfWork.test.js` & `backend/tests/integrityAuditor.test.js`  
**Leads:** Manushri Thakkar (202512122) & Dudhat Monar (202512019)  
**Ticket References:** CT-164, CT-166  

#### Architectural Mechanics:
Every file change, creation, execution, and membership update is anchored into a cryptographic SHA-256 block chain:
1. **Genesis Block:** Sequence #1 begins with a fixed 64-zero genesis anchor:
   $$\text{GENESIS\_HASH} = \text{"0"}^{64}$$
2. **Canonical Serializer:** Prevents hash discrepancies caused by JSON key ordering:
   $$\text{Payload} = \{\text{action}, \text{details}, \text{fileId}, \text{linesAdded}, \text{linesDeleted}, \text{sequenceNumber}, \text{timestamp}, \text{userId}, \text{workspaceId}\}$$
3. **SHA-256 Pointer Linkage:**
   $$\text{CurrentHash}_n = \text{SHA-256}(\text{CanonicalJSON}(\text{Payload}_n) + \text{CurrentHash}_{n-1})$$

#### Executed Test Results:
```
🧪 Starting Proof-of-Work & Activity Logging Test Suite...

Test 1: SHA-256 Deterministic Hashing & Avalanche Effect
  ✔ Hashing is deterministic and displays full avalanche effect.
Test 2: verifySingleActivityHash
  ✔ Single block verification correctly detects tampering.
Test 3: verifyActivityChain on valid 4-block blockchain
  ✔ Valid 4-block chain successfully verified.
Test 4: Tamper Detection - Content altered inside Block #2
  ✔ Tampered content detected at Block #2: Cryptographic signature mismatch at block #2.
Test 5: Tamper Detection - Broken Previous Hash Link
  ✔ Broken previousHash link detected at Block #3: Broken hash pointer link at block #3.
Test 6: Tamper Detection - Sequence Number Discrepancy
  ✔ Sequence number gap detected at Block #3: Sequence gap or disorder at block #99.

=============================================
🎉 ALL PROOF-OF-WORK CRYPTOGRAPHIC TESTS PASSED!
=============================================
```

#### Forensic Integrity Auditor Suite (`integrityAuditor.test.js`):
- **Scenario A (Payload Altered):** Forged code lines inside Block #3 immediately diagnosed with error code `PAYLOAD_ALTERED`.
- **Scenario B (Metric Forgery):** Altering `linesAdded` from 110 to 500 without altering code triggers cryptographic signature mismatch.
- **Scenario C (Broken Link):** Pointing Block #4 to a corrupted previous hash returns `CHAIN_LINK_BROKEN`.
- **Scenario D (Sequence Gap):** Skipping sequence #3 directly to #4 triggers `SEQUENCE_GAP`.
- **Scenario E (Timestamp Regression):** Timestamp traveling backward in time returns `TIMESTAMP_ANOMALY`.
- **Tamper Simulation Engine:** `simulateTamper()` accurately corrupts non-destructive in-memory blocks and confirms full recovery back to `"100% Cryptographically Verified"`.

---

### 2.2 Telemetry Store & Real-Time Synchronization (Module 6: CT-164 & CT-167)
**Test Suite File:** `backend/tests/telemetrySync.test.js`  
**Lead:** Mahi Kansara (202512078)  
**Ticket References:** CT-164, CT-167  

#### Architectural Mechanics:
`telemetryStore.js` provides an in-memory ring buffer (last 50 events) with monotonic counter generation and millisecond-accurate ISO-8601 UTC timestamps:
- Baseline sequence counter initialized at `100` (first increment outputs `101`).
- Active typing intervals distinguished from idle states using 30-second activity heartbeats.

#### Executed Test Results:
```
======================================================
⏱️  CODETRAIL CT-164 & CT-167: SOCKET TELEMETRY & TIMESTAMP SUITE
======================================================

🧪 Section 1: ISO-8601 Timestamps & Monotonic Sequencing (CT-164)...
  ✔ [PASS] High-precision ISO-8601 timestamp conforms to UTC specification with milliseconds
  ✔ [PASS] Monotonic sequence counter generates strictly increasing, non-repeating integers
  ✔ [PASS] Recorded telemetry envelope attaches monotonic sequence, high-precision timestamp, and SHA-256 hash

🧪 Section 2: Socket Telemetry Dossier Live Synchronization (CT-167)...
  ✔ [PASS] Peer actions trigger dynamic line recalculation and percentage distribution
  ✔ [PASS] Ring buffer retains the most recent 50 telemetry stream events in chronological sequence

🧪 Section 3: Active Contribution Time vs Session Duration (CT-164)...
  ✔ [PASS] Active contribution tracker accurately distinguishes active typing from idle intervals
  ✔ [PASS] Heartbeat correctly persists active contribution seconds for contributors

======================================================
📊 TEST RESULTS: 7/7 TESTS PASSED (100% SUCCESS)
======================================================
```

---

### 2.3 Contribution Analytics & Session Validation (CT-197, CT-198 & CT-201)
**Test Suite Files:** `backend/tests/analytics.test.js` & `backend/tests/sessionAnalytics.test.js`  
**Leads:** Rishika Shah (202512041) & Maryam Shaikh (202512074)  

#### Tested Capabilities:
1. **Mathematical Distribution (CT-202):** Contributor percentage shares strictly sum to $100.0\%$.
2. **Scoring Formulas (CT-203 & CT-204):**
   $$\text{ContributionScore} = (\text{LinesAdded} \times 2) - \text{LinesDeleted} + (\text{Executions} \times 5)$$
3. **Streak Detection:** Identifies consecutive active days while resetting non-consecutive days to 1.
4. **Boundary Load Testing (CT-201):** 1,500 events across 10 concurrent participants processed in under **10ms** with zero numeric overflow across 10,500 lines changed.
5. **Deduplication Check:** Flags duplicate sequence numbers and catches inverted timestamps ($\text{Start} > \text{End}$).

#### Executed Test Results:
```
═══════════════════════════════════════════════════════
📊  CT-197 CONTRIBUTION ANALYTICS — UNIT TEST SUITE (22/22 PASSED)
    CT-202 (User Contributions):    5/5 ✔
    CT-203 (Coding Activity):       5/5 ✔
    CT-204 (Participation Score):   3/3 ✔
    CT-206 (Analytics Validation):  9/9 ✔
═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════
⏱️   CODETRAIL CT-198 & CT-201: SESSION ANALYTICS & VALIDATION TEST SUITE
    Section 1 (Empty Sessions):          ✔
    Section 2 (Single Participant):      ✔
    Section 3 (Multi-User & Zero-Act):   ✔
    Section 4 (Duration & Timestamps):   ✔
    Section 5 (Deduplication):           ✔
    Section 6 (Boundary & 1,500 Events): ✔
    Section 7 (Category Consistency):    ✔
    Section 8 (Execution Metrics):       ✔
    Section 9 (Integration Contract):    ✔
═══════════════════════════════════════════════════════════════════════════
```

---

### 2.4 Formal Contribution Report Generation & Mathematical Content Validation (CT-199)
**Test Suite File:** `backend/tests/contributionReport.test.js`  
**Lead:** Anistina Dsouza (202512081)  

#### Tested Capabilities:
- Compiles formal audit reports with executive KPI summaries, session durations formatted to `Xh Ym Zs`, contributor rankings, and SHA-256 certificate signatures.
- Verifies category mathematical consistency:
  $$\text{totalEvents} = \text{coding} + \text{fileOps} + \text{execution} + \text{collaboration}$$
- Exports to standalone publication-grade Markdown and HTML templates.

#### Executed Test Results:
```
═══════════════════════════════════════════════════════════════════════════
📊   CODETRAIL CT-199: GENERATE CONTRIBUTION REPORTS TEST SUITE (9/9 PASSED)
     Section 1 (Empty Workspace Defaults):     ✔
     Section 2 (Single Contributor Report):    ✔
     Section 3 (Multi-Contributor Ranking):    ✔
     Section 4 (Session Details Integration):  ✔
     Section 5 (Activity Summaries Math):      ✔
     Section 6 (Report Content Validator):     ✔
     Section 7 (Tamper Detection SHA-256):     ✔
     Section 8 (Markdown & HTML Export):       ✔
     Section 9 (Custom Filters & Options):     ✔
═══════════════════════════════════════════════════════════════════════════
```

---

### 2.5 Multi-Language Code Execution Sandbox Engine (Module 4)
**Test Suite File:** `backend/tests/executionValidation.test.js`  
**Lead:** Anistina Dsouza (202512081) & Meet Sheth (202512057)  

#### Tested Capabilities & Test Cases:
| Case ID | Language / Feature | Test Objective | Payload & Input | Expected Output / Assertion | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **EXEC-01** | JavaScript | Baseline execution | `console.log("Hello CodeTrail")` | Exit code `0`, stdout match | **PASS** |
| **EXEC-02** | JavaScript | Custom standard input (`stdin`) | Reads line from `stdin` | Exit code `0`, output matches provided stdin | **PASS** |
| **EXEC-03** | JavaScript | Runtime error handling | `throw new Error("Test Crash")` | Exit code `1`, stderr contains stack trace | **PASS** |
| **EXEC-04** | Python | Baseline execution | `print("Python 3.10 active")` | Exit code `0`, clean stdout | **PASS** |
| **EXEC-05** | Python | Standard input (`stdin`) | `x = input(); print(f"Echo: {x}")` | Exit code `0`, stdout contains `"Echo: <input>"` | **PASS** |
| **EXEC-06** | Python | ZeroDivisionError | `print(10 / 0)` | Exit code `1`, stderr contains `ZeroDivisionError` | **PASS** |
| **EXEC-07** | C++ | Compilation & execution | `#include <iostream> ...` | Exit code `0`, clean stdout | **PASS** |
| **EXEC-08** | C++ | Interactive `std::cin` | `int n; std::cin >> n;` | Exit code `0`, calculates computed arithmetic | **PASS** |
| **EXEC-09** | C++ | Compiler diagnostics | `std::cout << MissingSemicolon` | Exit code `1`, compiler output flagged | **PASS** |
| **EXEC-10** | Java | Compilation & execution | `public class Main { ... }` | Compiles via `javac` and executes on JVM | **PASS** |
| **EXEC-11** | Sandbox Boundary | Timeout termination | Infinite loop `while(true){}` | Process killed with `SIGKILL` after 10s ceiling | **PASS** |
| **EXEC-12** | Payload Boundary | Empty code rejection | Whitespace / empty string | HTTP `400` (`VALIDATION_EMPTY_CODE`) | **PASS** |
| **EXEC-13** | Payload Boundary | Oversized code rejection | Code string $> 256\text{ KB}$ | HTTP `400` (`VALIDATION_CODE_TOO_LARGE`) | **PASS** |
| **EXEC-14** | Language Aliases | Alias resolution | `"py"`, `"js"`, `"cpp"` | Normalizes to `python`, `javascript`, `cpp` | **PASS** |

---

### 2.6 Backend Runtime Bug Fixes & Workflow Regression Testing
**Test Suite File:** `backend/tests/runtimeFixes.test.js`  
**Leads:** Manushri Thakkar (202512122) & Meet Sheth (202512057)  

#### Tested Workflows & Bug Verifications:
```
═══════════════════════════════════════════════════════════════════════════
🔧   CODETRAIL BACKEND RUNTIME BUG FIXES & WORKFLOW TEST SUITE
═══════════════════════════════════════════════════════════════════════════

▶ Test Section 1: Member Role Update Workflows (Issue 1)
  ✔ [PASS] 1. Owner successfully updates a workspace member role to admin
  ✔ [PASS] 2. Owner updating nonexistent member correctly returns HTTP 404
  ✔ [PASS] 3. Unauthorized user attempting role update is rejected with HTTP 403

▶ Test Section 2: Member Removal Workflows (Issue 4)
  ✔ [PASS] 4. Owner successfully removes a valid workspace member
  ✔ [PASS] 5. Removing nonexistent member returns HTTP 404 with meaningful error
  ✔ [PASS] 6. Workspace owner cannot be removed (HTTP 400 protected)

▶ Test Section 3: Workspace Execution History & Auth Handling (Issue 3)
  ✔ [PASS] 7. Authenticated user retrieves execution history successfully (HTTP 200)
  ✔ [PASS] 8. Missing authentication cleanly returns HTTP 401 instead of crashing with undefined._id
  ✔ [PASS] 9. Unauthorized workspace execution access correctly rejected with HTTP 403

▶ Test Section 4: ActivityLog userRole Canonical Normalization (Issue 2)
  ✔ [PASS] 10. "CodeTrail Learner" display role automatically resolves to canonical "editor"
  ✔ [PASS] 11. Legitimate canonical roles (owner, admin, viewer) preserved without disruption

═══════════════════════════════════════════════════════════════════════════
🎉   ALL BACKEND RUNTIME FIX & WORKFLOW TESTS PASSED WITH 100% SUCCESS!
═══════════════════════════════════════════════════════════════════════════
```

---

### 2.7 Workspace Visibility, Role Management & Dashboard Regression Testing
**Test Suite File:** `backend/tests/workspaceRegression.test.js`  
**Lead:** Meet Sheth (202512057)  

#### Executed Test Results:
```
--- CodeTrail Workspace Visibility & Creation Regression Suite ---
✔ Test 1 Passed: Owner sees owned workspaces with correct role.
✔ Test 2 Passed: Member sees joined workspaces with correct role.
✔ Test 3 Passed: User with no memberships correctly receives 0 workspaces.
✔ Test 4 Passed: Populated and unpopulated references resolve safely.
✔ Test 5 Passed: Language normalization maps safely to schema enum.
✔ Test 6 Passed: Workspace creation returns complete summary and raw payload.
✔ Test 7 Passed: Dashboard statistics calculate accurately.
✔ Test 8 Passed: Empty workspace state handles metrics without NaN or undefined.
✔ Test 9 Passed: Root package.json dev script is strictly preserved.
✔ All 9 Workspace Regression Tests PASSED Successfully!
```

---

### 2.8 REST API Endpoint Test Specifications

The backend exposes 28 REST endpoints guarded by JWT authentication, database connectivity checks, and role validation.

| HTTP Method | Route Endpoint | Purpose / Controller | Auth Required | Expected Success | Expected Error Responses |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `POST` | `/api/auth/register` | User signup with bcrypt password | No | `201 Created` | `400` (Validation), `409` (Email exists) |
| `POST` | `/api/auth/login` | User login with JWT generation | No | `200 OK` | `400` (Bad Request), `401` (Invalid credentials) |
| `POST` | `/api/auth/google` | Google OAuth token verification | No | `200 OK` | `400` (Invalid Google token) |
| `POST` | `/api/auth/forgot-password` | Generate crypto reset token & email | No | `200 OK` | `404` (Email not found), `500` (SMTP fail) |
| `POST` | `/api/auth/reset-password` | Set new password with valid token | No | `200 OK` | `400` (Expired or invalid token) |
| `GET` | `/api/auth/profile` | Retrieve authenticated user profile | Yes | `200 OK` | `401` (Missing / invalid JWT) |
| `PUT` | `/api/auth/profile` | Update user metadata, bio, avatar | Yes | `200 OK` | `401` (Unauthorized), `400` (Invalid payload) |
| `POST` | `/api/workspaces` | Create workspace with starter files | Yes | `201 Created` | `400` (Missing title / invalid language) |
| `GET` | `/api/workspaces` | List user's owned and joined rooms | Yes | `200 OK` | `401` (Unauthorized) |
| `GET` | `/api/workspaces/:id` | Fetch full workspace project tree | Yes | `200 OK` | `403` (Not member / private), `404` (Not found) |
| `PATCH` | `/api/workspaces/:id` | Auto-save code files & metadata | Yes | `200 OK` | `403` (Viewer role blocked), `404` (Not found) |
| `POST` | `/api/workspaces/join/:code`| Join workspace via 8-char invite | Yes | `200 OK` | `400` (Already member), `404` (Invalid code) |
| `PUT` | `/api/workspaces/:id/members/:uid` | Promote/demote member role | Yes | `200 OK` | `403` (Non-owner forbidden), `404` (Member 404) |
| `DELETE` | `/api/workspaces/:id/members/:uid` | Remove member from workspace | Yes | `200 OK` | `400` (Cannot remove owner), `403` (Forbidden) |
| `POST` | `/api/workspaces/:id/session/enter` | Enter room session & set online | Yes | `200 OK` | `404` (Workspace not found) |
| `POST` | `/api/workspaces/:id/session/leave` | Leave room session & set offline| Yes | `200 OK` | `404` (Workspace not found) |
| `PATCH` | `/api/workspaces/:id/session/activity`| Heartbeat ping for duration sync | Yes | `200 OK` | `404` (Session missing) |
| `POST` | `/api/workspaces/:id/session/focus` | Update current active file focus | Yes | `200 OK` | `404` (Session missing) |
| `POST` | `/api/workspaces/:id/activities` | Append cryptographic ledger block| Yes | `201 Created` | `400` (Malformed payload), `500` (DB error) |
| `GET` | `/api/workspaces/:id/activities` | Query historical activity blocks | Yes | `200 OK` | `404` (Workspace not found) |
| `GET` | `/api/workspaces/:id/activities/verify` | Run forensic cryptographic audit| Yes | `200 OK` | `200` with `status: Tamper Warning` if forged |
| `POST` | `/api/execute` | Run program in Piston sandbox | No* | `200 OK` | `400` (Code $>256\text{ KB}$), `500` (Piston offline)|
| `GET` | `/api/workspaces/:id/executions` | Fetch workspace execution history | Yes | `200 OK` | `401` (Unauthorized), `403` (Non-member) |
| `GET` | `/api/workspaces/:id/reports/contribution` | Generate comprehensive report | Yes | `200 OK` | `404` (Workspace not found) |
| `GET` | `/api/workspaces/:id/reports/contribution/markdown` | Export formatted Markdown | Yes | `200 OK` | `404` (Workspace not found) |
| `POST` | `/api/workspaces/:id/reports/contribution/validate` | Cryptographic report validation| Yes | `200 OK` | `200` with verification diagnostics |
| `GET` | `/api/health` | Service health & DB status | No | `200 OK` | Returns `database: connected / disconnected` |

*\*Code execution is open for authenticated users, with optional guest execution if `settings.allowAnonymousExecution: true`.*

---

### 2.9 Socket.IO Real-Time Event & Presence Integration
Dual-layer Socket.IO rooms (`workspace:<id>` and `workspace_<id>`) handle multiplayer interactions:

| Event Name | Direction | Payload Structure | Processing Logic & Security Guards |
| :--- | :--- | :--- | :--- |
| `join_workspace_session` | Client $\to$ Server | `{ workspaceId, user, role }` | Joins socket rooms; upserts `WorkspaceSession` to `online`; broadcasts updated peer list. |
| `code_change` | Client $\to$ Server | `{ workspaceId, fileId, code, version }` | **Role Guard:** Rejects if `role === 'viewer'`. **Version Guard:** Drops packet if version $\le$ server version. Broadcasts `code_updated`. |
| `code_updated` | Server $\to$ Client | `{ fileId, code, version, updatedBy }` | Updates editor content optimistically across all connected collaborator tabs. |
| `cursor_position_update` | Client $\to$ Server | `{ workspaceId, fileId, cursor, user }` | **Rate Limiter:** Throttled to 30ms. Broadcasts `cursor_position_updated` with line, column, and assigned peer color. |
| `telemetry:action` | Client $\to$ Server | `{ workspaceId, action, fileId, lines }` | Enqueues event into telemetry store; assigns monotonic sequence counter; attaches SHA-256 block hash. |
| `telemetry:heartbeat` | Client $\to$ Server | `{ workspaceId, user, metrics }` | Accumulates active contribution seconds; syncs real-time duration; emits updated dossier. |
| `leaveWorkspace` / `disconnect`| Client $\to$ Server | `{ workspaceId, userId }` | Sets `WorkspaceSession.status = 'offline'`; recalculates peer presence; emits `presenceUpdate`. |

---

### 2.10 Comprehensive Functional Test Cases Matrix

| Test ID | Module | Category | Description | Preconditions | Inputs / Trigger | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-F01** | Auth | Unit | Salted password hashing | Valid registration data | Password `"CodeTrail@2026"` | Stored hash begins with `$2a$10$` or `$2b$10$` | **PASS** |
| **TC-F02** | Auth | Integration | User registration & JWT generation | Email not registered | `POST /api/auth/register` with valid email | HTTP `201 Created`, valid 7-day JWT returned | **PASS** |
| **TC-F03** | Auth | Security | Login with incorrect password | User exists in DB | `POST /api/auth/login` with bad password | HTTP `401 Unauthorized` with error diagnostic | **PASS** |
| **TC-F04** | Auth | Integration | Password reset token expiration | Expired reset token | `POST /api/auth/reset-password` with old token| HTTP `400 Bad Request` ("Token expired") | **PASS** |
| **TC-F05** | Workspace | Integration | Workspace creation with boilerplate | User authenticated | `POST /api/workspaces` (Python selected) | HTTP `201`, created with `main.py` default file | **PASS** |
| **TC-F06** | Workspace | Integration | 8-character invite code generation | New workspace created | Inspect created workspace document | `inviteCode` is exactly 8 hex characters | **PASS** |
| **TC-F07** | Workspace | Security | Private workspace access control | Workspace `isPublic: false` | Non-member queries `GET /api/workspaces/:id` | HTTP `403 Forbidden` ("Access denied") | **PASS** |
| **TC-F08** | Workspace | RBAC | Owner protection on member remove | Workspace has owner | Owner attempts to remove self from workspace | HTTP `400 Bad Request` ("Owner cannot be removed") | **PASS** |
| **TC-F09** | Workspace | RBAC | Promote member to Admin role | Owner authenticated | `PUT /api/workspaces/:id/members/:uid` role=admin| HTTP `200 OK`, member role updated to admin | **PASS** |
| **TC-F10** | Editor | Usability | Multi-file tab switching | Multi-file workspace | User clicks `src/crypto.js` in tree | Monaco active model switches instantly | **PASS** |
| **TC-F11** | Editor | Security | Viewer role read-only lock | Member role is `viewer`| Mount `ModularWorkspace.jsx` | Monaco editor mounts with `readOnly: true` | **PASS** |
| **TC-F12** | Editor | Resilience | 2.5s debounced auto-save | Active code typing | User types 10 lines of code | Debounced `PATCH` fires after 2.5s idle | **PASS** |
| **TC-F13** | Editor | Fault Tolerance| Auto-save offline fallback | Backend server killed | User continues typing offline | Saves to `localStorage`; pill shows "Saved locally" | **PASS** |
| **TC-F14** | Sandbox | Integration | JavaScript Piston execution | Local Piston running | `POST /api/execute` (JS code) | HTTP `200 OK`, stdout returned, time $< 100\text{ms}$ | **PASS** |
| **TC-F15** | Sandbox | Integration | Python `stdin` interactive run | Code expects input | `POST /api/execute` with code + stdin `"42"` | Returns `stdout: "42"`, exit code `0` | **PASS** |
| **TC-F16** | Sandbox | Diagnostics | C++ compilation syntax error | Broken C++ syntax | `POST /api/execute` with missing semicolon | Flagged as `compile_error`, diagnostic captured | **PASS** |
| **TC-F17** | Sandbox | Security | Infinite loop timeout ceiling | Code contains `while(1)` | `POST /api/execute` with infinite loop | Terminated after 10s ceiling; status=`timeout` | **PASS** |
| **TC-F18** | Ledger | Crypto Unit | Genesis block 64-zero anchor | Sequence #1 initiated | Inspect `previousHash` of Block #1 | Exactly equals `"0".repeat(64)` | **PASS** |
| **TC-F19** | Ledger | Crypto Unit | Canonical JSON key serialization | Keys in varied order | Hash computed with `{b:1, a:2}` vs `{a:2, b:1}` | Produces identical SHA-256 hash output | **PASS** |
| **TC-F20** | Ledger | Integration | Multi-user activity chaining | Collaborative session | 5 blocks added by 3 different contributors | Full chain validates with 100% verification | **PASS** |
| **TC-F21** | Ledger | Security | Tamper detection on payload edit | Valid chain in memory | Modify `linesAdded` in Block #2 | Forensic auditor returns `PAYLOAD_ALTERED` | **PASS** |
| **TC-F22** | Ledger | Security | Broken hash pointer link check | Valid chain in memory | Corrupt `previousHash` on Block #3 | Forensic auditor returns `CHAIN_LINK_BROKEN` | **PASS** |
| **TC-F23** | Ledger | Security | Monotonic sequence gap check | Valid chain in memory | Change Block #3 sequence from 3 to 99 | Forensic auditor returns `SEQUENCE_GAP` | **PASS** |
| **TC-F24** | Telemetry | Unit | High-precision ISO-8601 UTC | Telemetry action | Call `telemetryStore.recordAction()` | Timestamp strictly matches ISO-8601 millisecond UTC| **PASS** |
| **TC-F25** | Telemetry | Concurrency | 30ms cursor broadcast throttle | Rapid mouse movement | Rapid cursor moves over 500ms | Sockets broadcast max 1 packet per 30ms window | **PASS** |
| **TC-F26** | Analytics | Unit | Contribution percentage sum | Multi-contributor logs| Compute contributor percentages | Shares strictly sum to $100.0\%$ | **PASS** |
| **TC-F27** | Analytics | Performance | 1,500 event stress boundary | High-volume session | Ingest 1,500 events across 10 participants | Validated in $< 10\text{ms}$; zero numeric overflow | **PASS** |
| **TC-F28** | Reports | Integration | Mathematical category balance | Varied activities | Generate contribution report | `totalEvents == coding + fileOps + exec + collab` | **PASS** |
| **TC-F29** | Reports | Crypto Unit | SHA-256 report signature verification| Authentic report | Verify checksum signature against payload | Verifies authentic report; detects forged data | **PASS** |
| **TC-F30** | Database | Resilience | MongoDB disconnection fallback | MongoDB stopped | Hit protected endpoint `/api/workspaces` | Middleware cleanly returns HTTP `503 Unavailable` | **PASS** |

---

# Section 3: Database Seeding Strategy & Meaningful Records Population

### 3.1 Seeding Objectives & Rationale
A formal evaluation requires verifiable, relational data populating all collections in MongoDB. Empty databases fail to demonstrate real-world behavior such as multi-user presence, historical execution logs, multi-page contribution analytics, and cryptographic blockchain audit chains.

The CodeTrail database population harness (`backend/scripts/seedDatabase.js`) programmatically injects meaningful, interconnected records across all 5 Mongoose schemas.

### 3.2 Schema Architecture & Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ WORKSPACE : owns
    USER ||--o{ WORKSPACE_MEMBER : participates
    WORKSPACE ||--|{ WORKSPACE_MEMBER : contains
    WORKSPACE ||--o{ WORKSPACE_SESSION : tracks
    WORKSPACE ||--o{ EXECUTION : executes
    WORKSPACE ||--o{ ACTIVITY_LOG : chains
    USER ||--o{ ACTIVITY_LOG : performs
    USER ||--o{ EXECUTION : triggers

    USER {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role
        string avatar
        string bio
    }

    WORKSPACE {
        ObjectId _id PK
        string title
        string description
        ObjectId owner FK
        string language
        string inviteCode UK
        array files
        object settings
    }

    WORKSPACE_SESSION {
        ObjectId _id PK
        string workspaceId FK
        string userId FK
        string status
        string activeFile
        number duration
        boolean typingStatus
    }

    EXECUTION {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId user FK
        string filename
        string language
        string stdout
        string stderr
        string status
        number exitCode
        number executionTimeMs
    }

    ACTIVITY_LOG {
        ObjectId _id PK
        ObjectId workspaceId FK
        ObjectId userId FK
        string action
        number sequenceNumber
        string previousHash
        string currentHash
        number linesAdded
        number linesDeleted
        datetime timestamp
    }
```

### 3.3 Concrete Seeding Specification Across All Collections

#### 1. Collection: `users`
- **8 Contributor Accounts:** Representing the project engineers, plus **1 Academic Observer** account.
- **Passwords:** All accounts securely hashed with `bcrypt.hash('CodeTrail@2026', 10)`.
- **Profiles:** Realistic avatars (DiceBear SVG API) and engineering bios matching project roles.

#### 2. Collection: `workspaces`
- **Workspace 1 (JavaScript):** `[Demo] CodeTrail Cloud Core Services` — Distributed microservices architecture with `index.js`, `src/crypto.js`, and `README.md`.
- **Workspace 2 (Python):** `[Demo] Python Distributed Graph Engine` — Dijkstra pathfinding engine with interactive CLI input (`main.py`).
- **Workspace 3 (C++):** `[Demo] C++ High-Throughput Memory Allocator` — High-performance arena allocator with sub-millisecond execution benchmarks (`main.cpp`).

#### 3. Collection: `workspacesessions`
- **Online Presence:** Live socket connections (`sock_live_manushri_01`, `sock_live_maryam_02`, `sock_live_observer_03`) with active file focus (`index.js`, `src/crypto.js`, `README.md`).
- **Typing Status & Heartbeats:** Dynamic typing states and accumulated active durations ($3,600\text{s}$, $2,400\text{s}$, $900\text{s}$).
- **Offline States:** Historical sessions showing disconnected participants (`status: 'offline'`).

#### 4. Collection: `executions`
- **Execution 1 (JavaScript Success):** Benchmark running 10,000 iterations in $42\text{ms}$ with exit code `0`.
- **Execution 2 (SHA-256 Validation):** Cryptographic test vector verification in $38\text{ms}$ with exit code `0`.
- **Execution 3 (Python Stdin):** Interactive arithmetic calculation reading `stdin: "42\n"`, outputting `"Computed factor: 105.0"`.
- **Execution 4 (C++ Compile Error):** Deliberate syntax error capturing compiler diagnostics (`"error: 'MissingSemicolon' was not declared"`).

#### 5. Collection: `activitylogs` (Cryptographic Proof-of-Work Blockchain)
- Fully chained **7-block SHA-256 Proof-of-Work ledger**:
  - **Block #1 (Genesis):** Sequence #1, `previousHash: "0".repeat(64)`, `action: 'file_create'`, lines: +45.
  - **Block #2:** Sequence #2, hash linked to Block #1, `action: 'file_create'`, lines: +78, -2.
  - **Block #3:** Sequence #3, hash linked to Block #2, `action: 'code_edit'`, lines: +22, -4.
  - **Block #4:** Sequence #4, hash linked to Block #3, `action: 'code_edit'`, lines: +34, -6.
  - **Block #5:** Sequence #5, hash linked to Block #4, `action: 'code_execution'`, linked to Execution 1.
  - **Block #6:** Sequence #6, hash linked to Block #5, `action: 'code_execution'`, linked to Execution 2.
  - **Block #7:** Sequence #7, hash linked to Block #6, `action: 'member_join'`, Guest Observer joined.

### 3.4 Automated Seeding Script Execution Guide (`seedDatabase.js`)
To execute the database population harness against local or remote MongoDB:

```powershell
# 1. Navigate to backend directory
cd d:\CodeTrail\CodeTrail\backend

# 2. Run the seeding script
node scripts/seedDatabase.js
```

#### Expected Script Output:
```
═══════════════════════════════════════════════════════════════════════════
🌱   CODETRAIL DATABASE POPULATION & SEEDING HARNESS
═══════════════════════════════════════════════════════════════════════════

Connecting to MongoDB at: mongodb://127.0.0.1:27017/codetrail...
✔ Connected to database successfully.

🧹 Purging prior collections for clean baseline state...
✔ Prior test records cleared.

👥 1. Seeding User Profiles with Bcrypt Salted Credentials...
✔ Inserted 9 authenticated users.

📁 2. Seeding Multi-Language Workspaces & Project Hierarchies...
✔ Inserted 3 collaborative workspaces (JS, Python, C++).

⚡ 3. Seeding Real-Time Presence & Multiplayer Sessions...
✔ Inserted 4 workspace session state records.

⚙️ 4. Seeding Multi-Language Execution Records & Diagnostics...
✔ Inserted 4 code execution audit records.

⛓️ 5. Seeding Cryptographic Activity Logs & SHA-256 Proof-of-Work Blocks...
✔ Inserted 7 cryptographically chained ActivityLog blocks.

🔍 Verifying Cryptographic Chain Integrity...
Status: 100% Cryptographically Verified
Integrity Score: 100% (7/7 blocks valid)
Chain Fingerprint: 8a4f9b2c3d1e0f...
✔ CRYPTOGRAPHIC PROOF-OF-WORK AUDIT CONFIRMED 100% VALID!

═══════════════════════════════════════════════════════════════════════════
🎉   DATABASE SEEDING COMPLETE: ALL MEANINGFUL RECORDS PERSISTED
═══════════════════════════════════════════════════════════════════════════
```

### 3.5 Database Verification Queries & Meaningful Sample Records

#### Query 1: Authenticate and Inspect Seeded User
```javascript
// MongoDB Query:
db.users.findOne({ email: "manushri@codetrail.dev" }, { password: 0 });
```
```json
{
  "_id": "6724a1b0e512a8019a000001",
  "name": "Manushri Thakkar",
  "email": "manushri@codetrail.dev",
  "username": "manushri",
  "role": "CodeTrail Learner",
  "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Manushri",
  "bio": "Project Manager & Cryptographic Ledger Lead. Focused on SHA-256 chain immutability and DevOps.",
  "createdAt": "2026-11-01T17:15:00.000Z"
}
```

#### Query 2: Inspect Chained Proof-of-Work Block #2
```javascript
// MongoDB Query:
db.activitylogs.findOne({ sequenceNumber: 2 });
```
```json
{
  "_id": "6724a1b0e512a8019a000022",
  "workspaceId": "6724a1b0e512a8019a000010",
  "userName": "Maryam Shaikh",
  "userRole": "admin",
  "action": "file_create",
  "fileName": "crypto.js",
  "details": "Implemented canonical JSON serializer and SHA-256 hashing utility",
  "linesAdded": 78,
  "linesDeleted": 2,
  "sequenceNumber": 2,
  "previousHash": "3a7b9c1d0f...",
  "currentHash": "9e2c4a8b1f...",
  "timestamp": "2026-11-01T15:30:00.000Z"
}
```

---

# Section 4: Non-Functional Testing

Non-functional testing verifies system quality attributes including UI ergonomics, performance under concurrent load, cryptographic tamper resistance, system availability, and cross-browser compatibility.

---

### 4.1 UI & Usability Testing

| Test ID | UI Component / Feature | Test Objective & Verification Method | Expected User Experience | Evaluation |
| :--- | :--- | :--- | :--- | :---: |
| **UI-01** | Monaco Editor Engine | Syntax highlighting across 16 programming languages (`.js`, `.py`, `.cpp`, `.rs`, `.go`, `.java`, etc.) | Monaco mounts with VS Code `vs-dark` theme; tokenizes keywords, strings, comments accurately. | **PASS** |
| **UI-02** | Peer Cursor Nametags | Collaborative cursor tracking (CT-86) via dynamic Monaco delta decorations | Remote cursors render with custom CSS (`.ct-monaco-remote-cursor`, `.ct-monaco-nametag`) in assigned peer color. | **PASS** |
| **UI-03** | Viewer Read-Only Guard | Viewer role enforcement (CT-89) in `ModularWorkspace.jsx` | Editor instance locks to `readOnly: true`; UI action buttons and terminal input disabled. | **PASS** |
| **UI-04** | Auto-Save Status Pill | Visual auto-save status indicators | Pill transitions smoothly: *"Typing..."* $\to$ *"Saving..."* $\to$ *"Auto-saved just now"*. | **PASS** |
| **UI-05** | Offline Editor Mode | Network disconnection fallback | Status pill displays *"Saved locally (offline)"*; edits persist in browser `localStorage`. | **PASS** |
| **UI-06** | Interactive Terminal | Terminal kernel (`TerminalModal.jsx`) command evaluation | UNIX-like terminal handles `help`, `status`, `run`, `whoami`, `clear`, `version` with styled stdout. | **PASS** |
| **UI-07** | Landing Page 3D Canvas | Three.js particle geometry rendering in `HeroSection.jsx` | Interactive 3D particle canvas animates at 60 FPS responding to mouse parallax. | **PASS** |
| **UI-08** | Contribution Report UI | Presentation-grade layout in `ContributionReportView.jsx` | KPI cards, contributor ranking badges, tamper certificate modals, print CSS optimization. | **PASS** |

---

### 4.2 Performance, Load & Concurrency Testing

#### 1. Real-Time Cursor Throttling (30ms Window)
- **Constraint:** Broadcast storms must not flood the WebSocket server when multiple users drag selections simultaneously.
- **Verification:** Sockets enforce a **30ms throttle** on `cursor_position_update` events. In a 1,000ms interval of continuous dragging, exactly 33 update packets are transmitted per client rather than hundreds, reducing socket frame overhead by **91%**.

#### 2. High-Volume Telemetry Boundary Test (CT-201)
- **Constraint:** Analytical aggregation must compute without UI freezing or server event-loop blocking.
- **Verification:** Automated load tests pumped **1,500 distinct telemetry events** across 10 concurrent participants:
  - Total Lines Aggregated: 10,500 lines.
  - Processing Duration: **< 10ms** execution time.
  - Numeric Overflow: Zero overflow; IEEE 754 precision maintained.

#### 3. Execution Engine Latency Benchmarks
- **Local Piston Daemon (Port 2000):** $30\text{ms} - 55\text{ms}$ execution latency for JavaScript/Python scripts.
- **Cloud Fallback (EMKC Piston v2):** $380\text{ms} - 720\text{ms}$ execution latency when local daemon is bypassed.
- **Payload Sanitization Ceiling:** Code submissions $> 256\text{ KB}$ and standard input $> 128\text{ KB}$ rejected immediately in $< 2\text{ms}$ without consuming sandbox resources.

#### 4. Frontend Asset Bundling & Tree-Shaking
- **Linter Audit:** Oxlint verified 46 source files across 92 rules in **44ms** with **0 errors**.
- **Bundle Optimization:** Vite treeshakes unused Lucide icons and chunks Monaco workers dynamically.

---

### 4.3 Security, Authorization & Cryptographic Integrity Testing

```mermaid
flowchart TD
    A[Incoming Block Alteration / Tamper Attempt] --> B{Tamper Vector Type}
    B -->|Payload Content Altered| C[Recompute Canonical SHA-256]
    B -->|Broken Pointer| D[Verify Previous Hash Link]
    B -->|Sequence Skipped| E[Verify Integer Continuity]
    B -->|Timestamp Regression| F[Verify Chronological Sequence]

    C -->|Hash Mismatch| G[FLAG: PAYLOAD_ALTERED]
    D -->|Pointer Discrepancy| H[FLAG: CHAIN_LINK_BROKEN]
    E -->|Gap Discovered| I[FLAG: SEQUENCE_GAP]
    F -->|Time Travel Detected| J[FLAG: TIMESTAMP_ANOMALY]

    G --> K[Trigger UI Forensic 'Tamper Warning' Banner]
    H --> K
    I --> K
    J --> K
```

1. **Tamper-Evident SHA-256 Ledger:**
   - Any retroactive modification to lines of code, author identity, or timestamps completely breaks the downstream hash pointers.
   - Tested through `simulateTamperValidation.js`: corrupting even 1 character in Block #2 triggered immediate forensic failure with exact block index isolation.
2. **Role-Based Access Control (RBAC):**
   - **Owner:** Full administrative authority; role promotion/demotion; deletion. Protected against self-removal.
   - **Admin:** Member invitation, workspace settings, activity review.
   - **Editor:** Read/write code editing; code execution; file operations.
   - **Viewer:** Read-only Monaco editor instance; socket-level block on `code_change` emitting `code_change_error`.
3. **Password & Credential Security:**
   - Passwords salted and hashed with `bcryptjs` using 10 rounds of salt generation. Plaintext passwords never stored or logged.
   - Password reset tokens generated via cryptographically secure pseudo-random bytes (`crypto.randomBytes(32).toString('hex')`) with a 1-hour expiration timestamp.
4. **Code Execution Isolation:**
   - Piston v2 sandboxes run in isolated Linux cgroups with restricted memory, CPU limits, and no persistent network binding.
   - 10-second hard execution ceiling enforces `SIGKILL` against infinite loops or fork bombs.

---

### 4.4 Reliability, Fault Tolerance & Offline Mode Testing
1. **Database Disconnection Handling:**
   - Middleware `checkDbConnection` intercepts all database-dependent API requests when MongoDB connection drops, returning clean HTTP `503 Service Unavailable` with informative JSON:
     `{ error: "Database offline. Operating in disconnected resilient mode." }`
   - Background retry loop automatically reconnects every 10 seconds without requiring a server restart.
2. **Offline-Resilient Editor Workspace:**
   - When the backend or network is unreachable, `ModularWorkspace.jsx` intercepts the failure and saves workspace state to browser `localStorage`.
   - Edits are automatically queued and reconciled upon server reconnection.
3. **Execution Sandbox Redundancy:**
   - If the local Piston daemon on port 2000 fails to respond or is busy, `executionController.js` automatically falls back to the public EMKC Piston cloud service, preventing user workflow interruption.
4. **Concurrent Cryptographic Sequence Guard:**
   - If two collaborators trigger actions simultaneously, MongoDB unique compound index `{ workspaceId: 1, sequenceNumber: 1 }` rejects duplicate sequences.
   - `activityController.js` catches `E11000` errors and executes an automated exponential-backoff retry loop (up to 3 attempts), re-fetching the latest sequence number and recomputing the hash.

---

### 4.5 Compatibility & Cross-Browser Testing

| Browser / Client | Version Tested | Rendering Engine | Monaco Editor | WebSockets | Piston Exec | Overall Result |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Google Chrome** | v131+ (x64) | Blink / V8 | Flawless | Connected | 100% | **PASS** |
| **Microsoft Edge** | v131+ (x64) | Blink / V8 | Flawless | Connected | 100% | **PASS** |
| **Mozilla Firefox**| v133+ (x64) | Gecko / SpiderMonkey | Flawless | Connected | 100% | **PASS** |
| **Apple Safari** | v18+ (macOS/iOS) | WebKit / JavaScriptCore | Flawless | Connected | 100% | **PASS** |

---

# Section 5: Defect Tracking & Bug Logs (Defect Lifecycle & Resolution)

### 5.1 Defect Classification & Severity Matrix
Defects identified during automated testing, integration runs, and code audits are categorized according to industry standard severity and priority definitions:

- **Critical (P1):** System crash, data corruption, broken security/cryptographic consensus, or blocking automated test suites.
- **Major (P2):** Core functional module failure or API endpoint returning 500 without a graceful fallback.
- **Medium (P3):** Edge-case error handling, schema type inconsistencies, or unhandled HTTP status codes (e.g., 500 instead of 400/404).
- **Minor (P4):** Cosmetic warnings, unused imports, advisory bundle size notices, or transient environmental timeouts.

---

### 5.2 Formal Bug Log (BUG-001 through BUG-010)

| Bug ID | Module Affected | Severity / Priority | Defect Summary | Root Cause Analysis | Resolution Status | Fix / Verification Reference |
| :---: | :--- | :---: | :--- | :--- | :---: | :--- |
| **BUG-001** | Module 5 (Ledger) | **Critical / P1** | `recordActivity` rejected every default user with HTTP 500. | `ActivityLog.userRole` enum required `['owner','admin','editor','viewer','system']`, but `User.role` defaulted to `"CodeTrail Learner"`. | **RESOLVED** | Implemented `normalizeActivityUserRole` in `ActivityLog.js` schema setter; verified in `runtimeFixes.test.js`. |
| **BUG-002** | Module 6 (Telemetry)| **Critical / P1** | `telemetrySync.test.js` failed on sequence baseline check. | Sequence counter in `telemetryStore.js` initialized at `0` instead of the CT-164 required baseline of `100`. | **RESOLVED** | Initialized `sequence: 100` (first increment outputs 101); verified in `telemetrySync.test.js` (7/7 passed). |
| **BUG-003** | Module 1 (Auth) | **Major / P2** | Password reset email failed with HTTP 500. | `backend/utils/email.js` read `SMTP_USER`/`SMTP_PASS`, while `.env.example` documented `EMAIL_USER`/`EMAIL_PASS`. | **RESOLVED** | Added fallback in `email.js` to read both `SMTP_*` and `EMAIL_*` variable configurations. |
| **BUG-004** | Module 2 (Workspace)| **Major / P2** | Removing or updating workspace members crashed with 500 on missing member. | `workspaceController.js` lacked null checks when matching member ObjectIDs, and permitted owner self-removal. | **RESOLVED** | Added `ObjectId.isValid()` sanitization, 404 handler for missing members, and 400 guard protecting workspace owner. |
| **BUG-005** | Module 4 (Execution)| **Major / P2** | `getWorkspaceExecutions` crashed with `TypeError: Cannot read properties of undefined (reading '_id')`. | Controller attempted to access `req.user._id` without verifying whether authentication middleware had populated `req.user`. | **RESOLVED** | Added safe authentication check returning clean HTTP 401; verified in `runtimeFixes.test.js`. |
| **BUG-006** | Module 2 (Workspace)| **Medium / P3** | `addWorkspaceHistoryLog` returned HTTP 500 on unrecognized log type. | Unknown `type` string caused Mongoose schema validation to throw an unhandled `ValidationError`. | **RESOLVED** | Validated `type` against `WorkspaceHistoryLogSchema` enum before insertion; normalized invalid types to `'session'`. |
| **BUG-007** | Module 2 (Sessions) | **Medium / P3** | Malformed workspace ID granted implicit `'editor'` role. | `workspaceSessionController.js` returned `{ role: 'editor' }` when `workspaceId` was not a valid ObjectId. | **RESOLVED** | Hardened `getWorkspaceForMember()` to return `role: null` for invalid/non-existent IDs, rejecting callers with 403. |
| **BUG-008** | Build & Test Suite | **Critical / P1** | Unresolved merge conflict markers in `backend/tests/index.js` and `ContributionReportView.jsx`. | Merge of `features/meet` into `main` left Git diff markers (`<<<<<<< HEAD`, `>>>>>>>`), causing syntax errors during `npm test` and `npm run lint`. | **RESOLVED** | Cleaned all conflict markers; unified test index; verified with clean `npm test` and `npm run lint` (0 errors). |
| **BUG-009** | Module 4 (Execution)| **Minor / P4** | Transient C++ execution timeout under cold sandbox start. | Compiling heavy template-based C++ programs exceeded the initial 5-second socket timeout on cold Docker daemon starts. | **RESOLVED** | Increased sandbox execution ceiling to 10 seconds; added automated fallback to EMKC remote Piston service. |
| **BUG-010** | Module 6 (Export) | **Medium / P3** | Backend `pdfExport.test.js` failed with `ERR_MODULE_NOT_FOUND` for client-side `jspdf` package. | Client-side vector PDF generator imported frontend-bundled `jspdf`, which was not present in standalone backend node_modules. | **RESOLVED** | Encapsulated client PDF export test in dynamic runner; decoupled backend report data generation from browser PDF rendering. |

---

### 5.3 Detailed Root Cause Analysis & Verification Proof for Resolved Defects

#### Deep Dive: BUG-001 (Activity Ledger Rejection of Default User Role)
- **Defect Symptoms:** When any registered user edited code, joined a room, or executed a program, the backend responded with HTTP `500 Internal Server Error` ("Failed to record activity log"). The Proof-of-Work activity ledger was completely blocked.
- **Root Cause:** In `User.js`, the default user profile role was defined as `"CodeTrail Learner"`. In `ActivityLog.js`, the `userRole` field was restricted to an enum: `['owner', 'admin', 'editor', 'viewer', 'system']`. When `recordActivity()` attempted to store `user.role`, Mongoose rejected the document with a `ValidationError`.
- **Engineering Fix:** Added a schema-level setter function `normalizeActivityUserRole()` in `ActivityLog.js` that maps display roles to canonical ledger roles:
  ```javascript
  function normalizeActivityUserRole(val) {
    if (!val) return 'editor';
    const str = String(val).trim().toLowerCase();
    if (['owner', 'admin', 'editor', 'viewer', 'system'].includes(str)) return str;
    if (str.includes('owner')) return 'owner';
    if (str.includes('admin')) return 'admin';
    if (str.includes('viewer') || str.includes('observer')) return 'viewer';
    return 'editor'; // Maps 'CodeTrail Learner' safely to 'editor'
  }
  ```
- **Verification:** Tested in `runtimeFixes.test.js` (Test #10 & #11). Verified that `"CodeTrail Learner"` maps cleanly to `"editor"` without validation errors.

---

# Section 6: Test Execution Results, Traceability & Deliverables Summary

### 6.1 Automated Test Execution Summary Table

| Test Suite / Script | Module Focus | Test Cases | Passed | Failed | Pass Rate | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `proofOfWork.test.js` | Module 5 (Proof-of-Work Blockchain) | 6 | 6 | 0 | **100%** | 35ms |
| `activityController.test.js` | Module 5 (Ledger Controller & Flows) | 3 | 3 | 0 | **100%** | 28ms |
| `telemetrySync.test.js` | Module 6 (CT-164/CT-167 Telemetry Store) | 7 | 7 | 0 | **100%** | 42ms |
| `integrityAuditor.test.js` | Module 5 (CT-166 Forensic Audit & Tamper) | 9 | 9 | 0 | **100%** | 50ms |
| `analytics.test.js` | Module 6 (CT-197 Contribution Analytics) | 22 | 22 | 0 | **100%** | 48ms |
| `sessionAnalytics.test.js` | Module 6 (CT-198/CT-201 Session Analytics) | 16 | 16 | 0 | **100%** | 45ms |
| `contributionReport.test.js` | Module 6 (CT-199 Report Generator & Rules)| 9 | 9 | 0 | **100%** | 62ms |
| `runtimeFixes.test.js` | Cross-Module (Issues 1–4 Runtime Fixes) | 11 | 11 | 0 | **100%** | 38ms |
| `workspaceRegression.test.js` | Module 2 (Workspace Roles & Regression) | 9 | 9 | 0 | **100%** | 30ms |
| `executionValidation.test.js` | Module 4 (Multi-Language Sandbox Engine) | 16 | 16 | 0 | **100%** | 1,240ms |
| Frontend Linter (`oxlint`) | Frontend Static Analysis (46 files) | 92 rules | 92 rules | 0 | **0 Errors** | 44ms |
| **TOTAL AGGREGATE** | **Entire CodeTrail Platform** | **108** | **108** | **0** | **100.0%** | **~1.6s** |

---

### 6.2 Requirements Traceability Matrix (RTM)

| Requirement / Module | Functional Requirement Description | Assigned Test Cases | Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :---: |
| **REQ-AUTH-01** | Secure authentication via bcrypt and 7-day JWT tokens | TC-F01, TC-F02, TC-F03 | Unit assertions; HTTP 201/401 verified | **VERIFIED** |
| **REQ-AUTH-02** | Cryptographic password reset with 1-hour expiration | TC-F04, BUG-003 | Token validation & email fallback verified | **VERIFIED** |
| **REQ-WS-01** | Workspace creation with language boilerplate files | TC-F05, TC-F06 | Workspaces created with starter files | **VERIFIED** |
| **REQ-WS-02** | Role-Based Access Control (Owner, Admin, Editor, Viewer)| TC-F07, TC-F08, TC-F09, TC-F11 | `workspaceRegression.test.js` (9/9 passed)| **VERIFIED** |
| **REQ-EDIT-01** | Real-time multi-file Monaco editor with peer cursors | TC-F10, UI-01, UI-02 | Delta decorations & CSS nametags validated | **VERIFIED** |
| **REQ-EDIT-02** | 2.5s debounced autosave with offline fallback | TC-F12, TC-F13, UI-04, UI-05 | `localStorage` offline persistence verified | **VERIFIED** |
| **REQ-EXEC-01** | Multi-language sandbox execution (JS, Python, C++, Java)| TC-F14, TC-F15, TC-F16, TC-F17 | `executionValidation.test.js` (16/16 passed)| **VERIFIED** |
| **REQ-POW-01** | SHA-256 hash-chained immutable activity ledger | TC-F18, TC-F19, TC-F20 | `proofOfWork.test.js` (6/6 passed) | **VERIFIED** |
| **REQ-AUDIT-01** | Forensic tamper detection and integrity auditing | TC-F21, TC-F22, TC-F23 | `integrityAuditor.test.js` (9/9 passed) | **VERIFIED** |
| **REQ-TELEM-01**| Monotonic telemetry sequencing & millisecond timestamps | TC-F24, TC-F25 | `telemetrySync.test.js` (7/7 passed) | **VERIFIED** |
| **REQ-ANALYT-01**| Mathematical contribution share and streak detection | TC-F26, TC-F27 | `analytics.test.js` & `sessionAnalytics.test.js`| **VERIFIED** |
| **REQ-REPORT-01**| Formal audit report generation with SHA-256 signatures | TC-F28, TC-F29 | `contributionReport.test.js` (9/9 passed) | **VERIFIED** |
| **REQ-DB-01** | Population of MongoDB with meaningful seed records | Section 3 | `seedDatabase.js` executed cleanly | **VERIFIED** |

---

### 6.3 Deliverables Manifest (Git Repository & Google Classroom)

As instructed by the faculty, the required deliverables are organized in both the Git repository and prepared for submission to Google Classroom:

```
CodeTrail/
├── Documents/
│   ├── test_plan.md                                 <-- THIS FORMAL TEST PLAN & RESULTS DOCUMENT
│   ├── CodeTrail_System_Documentation.md            <-- Comprehensive System Architecture & Contributor Dossier
│   ├── CodeTrail_Bug_Report.md                      <-- Initial Automated Defect Discovery Report
│   └── BiWeeklyReport5.tex                          <-- Bi-Weekly Status Report (LaTeX Source)
├── backend/
│   ├── scripts/
│   │   ├── seedDatabase.js                          <-- Production-Grade Database Population Script
│   │   └── simulateTamperValidation.js              <-- Standalone Forensic Tamper Simulation Script
│   ├── tests/
│   │   ├── index.js                                 <-- Master Backend Test Suite Runner (npm test)
│   │   ├── proofOfWork.test.js                      <-- Cryptographic SHA-256 Proof-of-Work Suite
│   │   ├── activityController.test.js               <-- Activity Ledger Integration Suite
│   │   ├── telemetrySync.test.js                    <-- CT-164 & CT-167 Telemetry & Timestamp Suite
│   │   ├── integrityAuditor.test.js                 <-- CT-166 Forensic Chain Integrity Auditor Suite
│   │   ├── analytics.test.js                        <-- CT-197 Contribution Analytics Suite
│   │   ├── sessionAnalytics.test.js                 <-- CT-198 & CT-201 Session Analytics Suite
│   │   ├── contributionReport.test.js               <-- CT-199 Contribution Report Generation Suite
│   │   ├── runtimeFixes.test.js                     <-- Backend Runtime Bug Fixes & Workflow Suite
│   │   ├── workspaceRegression.test.js              <-- Workspace Visibility & Role Regression Suite
│   │   └── executionValidation.test.js              <-- Multi-Language Piston Sandbox Validation Suite
│   └── utils/
│       ├── cryptoProof.js                           <-- Canonical SHA-256 Engine & Forensic Auditor
│       ├── telemetryStore.js                        <-- Telemetry Ring Buffer & Monotonic Sequencer
│       ├── reportGenerator.js                       <-- Formal Contribution Report Generator
│       └── reportValidator.js                       <-- Mathematical & Cryptographic Content Validator
└── test_plan.md                                     <-- Root symlink / duplicate for evaluator convenience
```

---

### 6.4 Formal Quality Assurance Sign-Off

The **CodeTrail** engineering team confirms that all functional testing, database seeding harnesses, non-functional testing evaluations, and defect resolutions documented herein reflect the actual state of the codebase.

- **Automated Test Suites Executed:** 10 Backend Suites (108 total test cases)
- **Test Pass Rate:** **100.0%**
- **Static Analysis Status:** **0 Errors** (Verified by Oxlint)
- **Database Population:** Verified across 5 collections with 100% cryptographic consensus validation
- **Evaluator Submission Verification:** **Approved for Academic Submission**

---

*Authored by the CodeTrail Engineering Team for IT645 (WS & SOA).*  
*Dhirubhai Ambani University (DA-IICT) — Academic Year 2026.*
