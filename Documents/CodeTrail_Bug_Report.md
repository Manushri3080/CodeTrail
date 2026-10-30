# CodeTrail — Bug Report (What Needs to Be Fixed)

Generated from live test runs (`npm test`, `executionValidation.test.js`, frontend build/lint, and live endpoint smoke tests against the running backend). No code changes were made; this report lists defects to fix.

## 1. Bugs to fix

### 1.1 Activity ledger rejects every default user
- **Where:** `backend/controllers/activityController.js` → `recordActivity()` (line ~75, `userRole: user?.role || 'editor'`)
- **Root cause:** `ActivityLog.userRole` enum is `['owner','admin','editor','viewer','system']`, but `User.role` defaults to `"CodeTrail Learner"` (a profile role, not a workspace role). So every activity recorded for a normal user fails Mongoose validation.
- **Impact:**
  - `POST /api/workspaces/:workspaceId/activities` returns **500** "Failed to record activity log".
  - `POST /api/execute` with `workspaceId` silently fails to append the `code_execution` block to the PoW chain ("Execution activity log warning").
  - History auto-recording (`addWorkspaceHistoryLog`) silently skips the PoW entry.
- **Fix needed:** Resolve a workspace-scoped role inside `recordActivity`: honor an already-valid role; otherwise look up the workspace and use `owner` if the user is the owner, else the member's role, else `editor`. Never store profile roles.

### 1.2 Telemetry sequence baseline too low
- **Where:** `backend/utils/telemetryStore.js` → `_getOrCreateWorkspace()` (`sequence: 0`)
- **Root cause:** CT-164 requires the monotonic sequence to start at a baseline of 100; first `getNextSequence()` returns 1.
- **Impact:** `telemetrySync.test.js` fails ("Sequence counter must start at baseline or higher"); `npm test` exits early, skipping integrity/analytics suites.
- **Fix needed:** Initialize `sequence: 100` (first increment returns 101).

### 1.3 Email env-var name mismatch
- **Where:** `backend/utils/email.js` (reads `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`) vs `backend/.env.example` (documents `EMAIL_USER`/`EMAIL_PASS`).
- **Root cause:** Even with credentials set per the documented template, `SMTP_PASS` is undefined, so `forgot-password` always fails.
- **Impact:** `POST /api/auth/forgot-password` returns **500** "Failed to send password reset email".
- **Fix needed:** Align env var names — either update `.env.example` to `SMTP_*` or make `email.js` fall back to `EMAIL_USER`/`EMAIL_PASS`.

## 2. Minor items (not blocking, but recommended)

### 2.1 History log type validation returns 500 instead of 400
- **Where:** `backend/controllers/workspaceController.js` → `addWorkspaceHistoryLog()` and `WorkspaceHistoryLogSchema.type` enum in `backend/models/Workspace.js`.
- **Issue:** An unknown `type` (e.g. `"note"`) makes Mongoose throw a ValidationError → 500. Frontend only sends valid types, so production flows are fine, but the API is not defensive.
- **Fix needed:** Validate `type` against the enum and return 400 for invalid values (or normalize unknown → `session`).

### 2.2 Lenient role grant for invalid workspace IDs
- **Where:** `backend/controllers/workspaceSessionController.js` → `getWorkspaceForMember()` returns `{ role: 'editor' }` when `workspaceId` is not a valid ObjectId.
- **Issue:** A malformed workspace id passes the membership check as `editor`, allowing session upserts against a non-existent workspace.
- **Fix needed:** Return `role: null` for invalid/missing workspaces so callers reject with 403.

### 2.3 WorkspaceSession.workspaceId type inconsistency
- **Where:** `backend/models/WorkspaceSession.js` (`workspaceId: String`) vs `Workspace._id` (ObjectId) used elsewhere.
- **Issue:** Works because controllers pass the string param, but mixing types risks mismatches if any code passes an ObjectId. Consider changing to `ObjectId` ref `Workspace` for consistency (requires migration of existing docs).

### 2.4 C++ execution occasionally times out under load
- **Where:** `backend/controllers/executionController.js` → dual-sandbox fallback; local Piston on port 2000.
- **Issue:** `executionValidation.test.js` reported one transient C++ failure; re-running passed. Likely Piston queue/sandbox cold start.
- **Fix needed:** Add retry/backoff for the local Piston call or increase the 10s local timeout for compile-heavy languages.

## 3. Current test status (before fixes)

| Suite | Result |
|---|---|
| `npm test` (Module 5) | ❌ fails at telemetry (6/7), exits early |
| `executionValidation.test.js` | ✅ 24/25 (transient C++ timeout) |
| Frontend `npm run build` | ✅ success |
| Frontend `npm run lint` | ✅ 0 errors (108 warnings) |

## 4. Scope note
No source code was modified by this analysis. The defects above are what need to be fixed.
