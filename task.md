# 📋 Task Allocation: Workspace Settings & Notifications

## 📌 Executive Summary & Metadata

| Attribute | Details |
| :--- | :--- |
| **Project** | **CodeTrail** — Real-Time Collaborative IDE & Cryptographic Contribution Telemetry |
| **Epic** | **Workspace Settings & Notifications – Complete Task Allocation** |
| **Lead Assignee** | **Anistina Dsouza** (ID: 202512081) |
| **Project Role** | Full-Stack Developer / Execution & QA Lead |
| **Feature Branch** | `features/anistina` |
| **Total Allocated Effort** | **35 Hours** |
| **Target Deliverable** | End-to-end Workspace Settings interface, preferences engine, RBAC permission enforcement, Mongoose persistence, and exhaustive automated unit test suite |
| **Status** | 🟢 **100% Completed & Verified** |

---

## ⏱️ Work Breakdown Structure (WBS) & 35-Hour Time Allocation

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             ANISTINA DSOUZA — WORKSPACE SETTINGS WORKSTREAM (35 HOURS)                 │
├─────────┬────────────────────────────────────────────────────────┬───────────┬─────────┤
│ Subtask │ Description                                            │ Hours     │ Status  │
├─────────┼────────────────────────────────────────────────────────┼───────────┼─────────┤
│ TASK-1  │ Design Workspace Settings Interface                    │ 6 Hours   │ ✅ Done │
│ TASK-2  │ Update Workspace Information (Details & Metadata)       │ 5 Hours   │ ✅ Done │
│ TASK-3  │ Configure Workspace Preferences & Operational Controls │ 6 Hours   │ ✅ Done │
│ TASK-4  │ Save Workspace Settings (Validation & DB Persistence)  │ 6 Hours   │ ✅ Done │
│ TASK-5  │ Validate User Permissions & RBAC Guard Rails           │ 5 Hours   │ ✅ Done │
│ TASK-6  │ Automated Unit Testing & Edge-Case Verification        │ 7 Hours   │ ✅ Done │
├─────────┴────────────────────────────────────────────────────────┼───────────┼─────────┤
│ TOTAL ALLOCATED TIME                                             │ 35 Hours  │100% Done│
└──────────────────────────────────────────────────────────────────┴───────────┴─────────┘
```

---

## 🎯 Task Details & Technical Specifications

```
                              TASK ROADMAP & DATA FLOW
                              
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                         FRONTEND PRESENTATION LAYER                      │
  │  WorkspaceSettingsModal.jsx / ModularWorkspace.jsx / WorkspacesPage.jsx  │
  │  - Navigation Sidebar (General, Preferences, Security, Appearance)       │
  │  - Live Role Awareness (Owner / Admin / Editor / Viewer Badges)         │
  │  - Form Inputs, Toggle Switches, Swatches & Toast Confirmations          │
  └────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                      HTTP PATCH /api/workspaces/:id
                      Headers: { Authorization: "Bearer <JWT>" }
                      Body: { title, description, language, settings, ... }
                                       │
                                       ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    BACKEND APPLICATION CONTROLLER LAYER                  │
  │  workspaceRoutes.js ──► auth.js Middleware ──► workspaceController.js    │
  │  - Input Sanitization via workspaceSettingsValidator.js                 │
  │  - RBAC Permission Validation (hasSettingsPermission, canModifyStatus)   │
  │  - Non-Owner/Admin 403 Forbidden Shield                                 │
  └────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                        PERSISTENCE & TELEMETRY LAYER                     │
  │  Workspace.js (Mongoose Model) + ActivityLog.js (Cryptographic Ledger)    │
  │  - Atomic $set Update on workspace.settings & metadata                   │
  │  - Cryptographic Activity Log Hash Generation via cryptoProof.js          │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

### 🔹 TASK-1: Design Workspace Settings Interface
- **Allocated Hours:** `6 Hours`
- **Status:** ✅ **Completed**
- **Module Scope:** Frontend UI/UX Layout, Navigation & Design System Integration
- **Primary Files:**
  - `frontend/src/components/workspace/WorkspaceSettingsModal.jsx`
  - `frontend/src/index.css`
  - `frontend/src/modules/workspace/ModularWorkspace.jsx`
- **Completed Objectives & Deliverables:**
  1. **Modal Layout Architecture:**
     - Responsive, accessible dialog modal adhering to CodeTrail's VS Code Dark+ / Cyberpunk aesthetic (`#0D0E15`, `#161926`, violet/cyan glowing borders).
     - Two-column layout: Left navigation tab rail (icons + title + counter chips) and Right scrollable content canvas.
  2. **Navigation Sidebar:**
     - Navigation items:
       - ⚙️ **General Details:** Workspace Title, Description, Primary Language, Room Invite Code.
       - 🎛️ **Preferences & Behavior:** Anonymous execution sandbox policies, editor auto-save frequency, tab spacing, word wrap, and notification alerts.
       - 🎨 **Theme & Access:** Brand accent color swatch palette, workspace icon badge, public/private visibility.
       - 👥 **Collaborators & Roles:** Member list, role badges (`owner`, `admin`, `editor`, `viewer`), invite generation.
       - 📜 **Audit History:** Chronological workspace session logs and execution history.
       - ⚠️ **Danger Zone:** Archive workspace, clear execution history, delete workspace (Owner-only).
  3. **Interactive UI State & Feedback:**
     - Tab persistence across tab switches using `localStorage` key `ct-workspace-settings-activetab-<wsId>`.
     - Smooth transitions, active state highlights, hover effects, and keyboard navigation (`Escape` to close).
     - Sticky footer action bar with `Close` and `Save Settings` buttons with active loading indicators.

---

### 🔹 TASK-2: Update Workspace Information
- **Allocated Hours:** `5 Hours`
- **Status:** ✅ **Completed**
- **Module Scope:** Form Controls, Input Binding, Validation & Frontend State Synchronization
- **Primary Files:**
  - `frontend/src/components/workspace/WorkspaceSettingsModal.jsx`
  - `frontend/src/modules/workspace/ModularWorkspace.jsx`
  - `frontend/src/modules/workspace/WorkspacesPage.jsx`
- **Completed Objectives & Deliverables:**
  1. **Workspace Name / Title Editing:**
     - Input field with real-time character counter (`max 80 chars`).
     - Required field validation with inline error messaging (`"Workspace title is required."`).
     - Auto-trim whitespace on submit.
  2. **Workspace Description Editing:**
     - Multi-line textarea for project overview (`max 300 chars`).
     - Real-time character counter (`x/300`).
     - Fallback default description when cleared.
  3. **Language Runtime Selection:**
     - Dropdown selector supporting CodeTrail's 7 first-class supported runtimes:
       - JavaScript (`.js`), TypeScript (`.ts`), Python (`.py`), C++ (`.cpp`), Java (`.java`), Rust (`.rs`), Go (`.go`).
  4. **Workspace Identifiers & Shareable Link:**
     - Read-only display of Workspace ID (`_id`) and unique 8-character Room Invite Code.
     - One-click copy-to-clipboard button with visual feedback (`"Copied"`).

---

### 🔹 TASK-3: Configure Workspace Preferences
- **Allocated Hours:** `6 Hours`
- **Status:** ✅ **Completed**
- **Module Scope:** Workspace-Level Functional Configuration, Policy Toggles & Notifications
- **Primary Files:**
  - `backend/models/Workspace.js`
  - `frontend/src/components/workspace/WorkspaceSettingsModal.jsx`
  - `frontend/src/modules/workspace/ModularWorkspace.jsx`
- **Completed Objectives & Deliverables:**
  1. **Workspace Access & Visibility Privileges:**
     - **Private vs. Public Toggle:**
       - `Private`: Accessible exclusively to explicitly invited members via token/invite code.
       - `Public`: Discoverable on CodeTrail's public workspace exploration lobby (`/workspaces/discover`).
  2. **Execution Sandbox Policies:**
     - **Anonymous Execution Toggle (`allowAnonymousExecution`):**
       - Controls whether non-authenticated or viewer users can trigger Piston v2 code runs.
  3. **Editor & Synchronization Preferences:**
     - **Auto-Save Frequency:**
       - Configurable interval: `1000ms`, `2500ms` (standard default), `5000ms`, or `10000ms`.
       - Dynamically consumed in `ModularWorkspace.jsx` to configure auto-save debounce timers.
     - **Font Size & Tab Size Defaults:**
       - Workspace-wide default tab spacing (`2 spaces` vs `4 spaces`).
       - Monaco Editor line wrapping policy toggle (`wordWrap`).
  4. **Notification & Telemetry Preferences:**
     - **Session Join/Leave Notifications (`emailOnMemberJoin`):**
       - Enable/disable collaborator join notifications.
     - **Execution Failure Alerts (`executionFailureAlerts`):**
       - Alert team leads when compilation fails or runtimes exceed memory limits.
     - **Session Contribution Summary (`sessionSummaryAlerts`):**
       - Prompt contribution dossier summary reports upon session completion.

---

### 🔹 TASK-4: Save Workspace Settings & Persistence Pipeline
- **Allocated Hours:** `6 Hours`
- **Status:** ✅ **Completed**
- **Module Scope:** Backend REST API, Database Mongoose Schema, Transaction Handling & Cryptographic Auditing
- **Primary Files:**
  - `backend/models/Workspace.js`
  - `backend/controllers/workspaceController.js`
  - `backend/utils/workspaceSettingsValidator.js`
  - `backend/routes/workspaceRoutes.js`
- **Completed Objectives & Deliverables:**
  1. **Mongoose Schema Expansion (`Workspace.js`):**
     - Enhanced `settings` subdocument:
       ```javascript
       settings: {
         isPublic: { type: Boolean, default: false },
         allowAnonymousExecution: { type: Boolean, default: false },
         autoSaveInterval: { type: Number, default: 2500, min: 1000, max: 30000 },
         tabSize: { type: Number, enum: [2, 4], default: 2 },
         wordWrap: { type: Boolean, default: true },
         notifications: {
           emailOnMemberJoin: { type: Boolean, default: false },
           executionFailureAlerts: { type: Boolean, default: true },
           sessionSummaryAlerts: { type: Boolean, default: true }
         }
       }
       ```
  2. **API Endpoint Hardening (`PATCH /api/workspaces/:id`):**
     - Verify MongoDB `ObjectId` format with `mongoose.Types.ObjectId.isValid(id)`.
     - Whitelist allowed update fields (`title`, `description`, `language`, `brandColor`, `icon`, `settings`, `status`).
     - Deep merge existing `workspace.settings` with incoming payload via `mergeWorkspaceSettings` helper.
  3. **Cryptographic Proof-of-Work Telemetry Hook:**
     - Upon successful settings update, automatically invokes `recordActivity` with action `'settings_update'` and SHA-256 hash chaining.
  4. **Frontend API Call & Optimistic Update:**
     - Axios `PATCH` dispatch with `Authorization: Bearer <token>`.
     - Success feedback toast and local active session update.

---

### 🔹 TASK-5: Validate User Permissions & RBAC Guard Rails
- **Allocated Hours:** `5 Hours`
- **Status:** ✅ **Completed**
- **Module Scope:** Role-Based Access Control (RBAC) Enforcement (Backend & Frontend)
- **Primary Files:**
  - `backend/controllers/workspaceController.js`
  - `backend/utils/workspaceSettingsValidator.js`
  - `frontend/src/components/workspace/WorkspaceSettingsModal.jsx`
- **Completed Objectives & Deliverables:**
  1. **RBAC Permission Matrix Enforcement:**

     | Workspace Role | View Settings | Edit Title / Desc | Edit Preferences | Change Status (Archive) | Delete Workspace |
     | :--- | :---: | :---: | :---: | :---: | :---: |
     | **Owner** | ✅ Full | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
     | **Admin** | ✅ Full | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
     | **Editor** | 👁️ Read-Only | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
     | **Viewer** | 👁️ Read-Only | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
     | **Guest / Non-Member** | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden |

  2. **Backend Controller Enforcement:**
     - Enforces `hasSettingsPermission(role)`: returns `403 Forbidden` for Editors, Viewers, or non-members attempting to update metadata/settings.
     - Enforces `canModifyStatus(role)`: only Owner can archive or reactivate workspaces.
  3. **Frontend UI Permission Guarding:**
     - Prominent Amber Banner displayed when user has Editor/Viewer role:
       *"Read-Only Mode: You have the {ROLE} role. Modifying workspace details, configuration, and preferences requires Owner or Administrator privileges."*
     - All input fields, textareas, selects, and toggles are `disabled` in read-only mode.
     - `Save Settings` button is disabled with descriptive tooltip.

---

### 🔹 TASK-6: Automated Unit Testing & Edge-Case Verification
- **Allocated Hours:** `7 Hours`
- **Status:** ✅ **Completed**
- **Module Scope:** Automated Test Suite Development & Edge-Case Verification
- **Primary Files:**
  - `backend/tests/workspaceSettings.test.js`
  - `backend/tests/index.js`
- **Completed Objectives & Deliverables:**
  1. **Dedicated Test Suite (`workspaceSettings.test.js`):**
     - Built a 7-section unit test suite (68 assertions) covering:
       - **Section 1:** Title & Description Boundaries & Sanitization (9 assertions)
       - **Section 2:** Language Runtime & Theme Accent Whitelist Validation (18 assertions)
       - **Section 3:** Workspace Preferences Configuration (13 assertions)
       - **Section 4:** Role-Based Access Control (RBAC) Permission Enforcement (13 assertions)
       - **Section 5:** Deep Merging & Partial State Preservation (5 assertions)
       - **Section 6:** Controller Request Simulation - 200, 400, 403, 404 Status Contracts (7 assertions)
       - **Section 7:** Cryptographic Proof-of-Work Settings Update Auditing (3 assertions)
  2. **Integration with Master Test Runner:**
     - Registered in `backend/tests/index.js` under Anistina Dsouza's test suites.
     - Executed via `npm test` and `node backend/tests/index.js` with **100% pass rate (68/68 assertions passed)**.

---

## 🛡️ Edge Cases, Security & Resilience Verification

1. **Stale State Overwrite Prevention:**
   - Deep merge helper `mergeWorkspaceSettings` preserves sibling configuration options during partial updates.
2. **Input Sanitization & Length Safeguards:**
   - Empty/whitespace titles and titles > 80 chars rejected with `400 Bad Request`.
   - Descriptions > 300 chars rejected with `400 Bad Request`.
3. **Owner Role Immunity:**
   - Owner role cannot be reassigned or demoted via settings update endpoints.
4. **Vite Client Production Build:**
   - Frontend production build verified with Vite (`✓ built in 1.29s` with 0 errors).

---

## ✅ Definition of Done (DoD) Checklist

- [x] **UI/UX Completion:** Workspace settings modal matches CodeTrail dark theme with smooth 6-tab navigation rail.
- [x] **Information Updating:** Workspace title, description, and primary language can be edited and previewed.
- [x] **Preferences Working:** Visibility (public/private), execution policy, auto-save interval, tab size, and notification alerts fully operational.
- [x] **Database Persistence:** Updated values save accurately to MongoDB with schema defaults and validation.
- [x] **RBAC Security Verified:** Only Owners and Admins can save changes; Editors and Viewers are strictly blocked with `403`.
- [x] **Cryptographic Audit:** Settings updates trigger tamper-evident activity ledger records.
- [x] **Automated Testing:** `workspaceSettings.test.js` covers all 7 test sections with 100% pass rate (68/68 passed).
- [x] **Frontend Production Build:** Vite build succeeds cleanly with 0 syntax or bundling errors.

---
*Lead Full-Stack Developer & QA Lead: **Anistina Dsouza**, CodeTrail Platform.*
