# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository overview
- npm workspaces monorepo with two apps:
  - `backend/`: Express API (ES modules), PostgreSQL (`pg`), Socket.IO, Swagger.
  - `frontend/`: React 19 + TypeScript + Vite SPA.
- Root `package.json` orchestrates lint/test/format across both workspaces.

## Canonical development commands
Run from repo root unless noted.

### Install
- `npm install`

### Run locally
- Backend (preferred): `npm run start:dev --workspace=backend`
- Frontend: `npm run dev --workspace=frontend`
- Backend health check: `GET http://localhost:4000/health`
- Swagger UI: `http://localhost:4000/api-docs`

### Lint / format
- Lint all workspaces: `npm run lint`
- Lint backend: `npm run lint --workspace=backend`
- Lint frontend: `npm run lint --workspace=frontend`
- Auto-fix lint all: `npm run lint:fix`
- Format all: `npm run format`
- Format check: `npm run format:check`

### Type-check / build
- Frontend type-check: `npm run type-check --workspace=frontend`
- Frontend production build: `npm run build --workspace=frontend`
- Full validation pipeline: `npm run validate`

### Test
- All tests (backend + frontend): `npm test`
- Backend tests: `npm run test --workspace=backend`
- Frontend tests: `npm run test --workspace=frontend`
- Backend watch mode: `npm run test:watch --workspace=backend`
- Frontend watch mode: `npm run test:watch --workspace=frontend`

Single-test patterns:
- Backend single file: `npm run test --workspace=backend -- __tests__/controllers/aiAssistantController.test.js`
- Backend by test name: `npm run test --workspace=backend -- -t "login"`
- Frontend single file: `npm run test --workspace=frontend -- src/__tests__/pages/StudentDashboard.test.tsx`
- Frontend by test name: `npm run test --workspace=frontend -- -t "StudentDashboard"`

### Demo data / local setup
- Seed comprehensive demo data (run inside `backend/`): `node scripts/seed-all-features.js`
- `backend/db/index.js` hard-fails startup if `DATABASE_URL` is missing; set env before running backend.

## Architecture (big picture)

### Backend request + realtime flow
- Process entrypoint is `backend/index.js`, which calls `startServer()` from `backend/server.js`.
- `backend/server.js` is the composition root:
  - Configures CORS/body parsing and large payload limits.
  - Mounts all REST route modules under `/api/*`.
  - Mounts Swagger from `backend/swagger.js` at `/api-docs`.
  - Creates `http` server + Socket.IO server and stores `io` on Express app (`app.set('io', io)`).
- Socket authentication is centralized in `authenticateSocket()` (JWT from `socket.handshake.auth.token`), then reused across lecture/proctoring events.
- AI tables are bootstrapped during startup by controller helpers (`createAnalysisTables`, `createAILogTables`, `createPlannerTables`, `createRagTables`).
- Route/controller organization is consistent: routes wire endpoints + Swagger docs, controllers hold query/business logic, and shared auth guards live in middleware.
- `backend/server.js` mounts `aiEditorRoutes` on both `/api/code-analysis` and `/api/ai-assistant`; treat both prefixes as active API surfaces.

### Backend data layer
- PostgreSQL is accessed through shared pool export in `backend/db/index.js`.
- `DATABASE_URL` is required; SSL is auto-enabled only when URL includes `sslmode=require` or `ssl=true`.

### Frontend app composition
- Entry is `frontend/src/main.tsx`: `AppProviders` wraps `ErrorBoundary` + `Suspense` + `App`.
- Provider stack in `frontend/src/AppProviders.tsx`: `ThemeProvider` → `BrowserRouter` → `AuthProvider` → `ToastProvider`.
- `frontend/src/App.tsx` centralizes route graph with lazy-loaded pages; role gating is done through `ProtectedRoute` wrappers.
- A global `CourseProvider` is applied around the routed app, so course context changes can impact most pages.

### Frontend auth/API contracts
- `frontend/src/context/AuthContext.tsx` persists `auth:token` and `auth:user` in `localStorage` and exposes login/logout flows.
- Role translation is critical: backend role `faculty` is mapped to frontend role `teacher` in `frontend/src/utils/auth.ts`.
- `frontend/src/services/api.ts` normalizes `VITE_API_BASE_URL` (removes trailing slash and optional `/api`) and appends bearer token automatically.

## Existing repo workflow conventions
- Husky hooks are intentionally non-blocking:
  - `.husky/pre-commit` runs `lint-staged` and full lint/test pass but allows commit on failures.
  - `.husky/commit-msg` checks Conventional Commit format and warns only.
- Staged-file automation is defined in `.lintstagedrc.js`:
  - Backend JS: eslint + prettier
  - Frontend TS/TSX: eslint + prettier
  - JSON/MD/YAML files: prettier

## Important docs to consult first
- `README.md`: top-level overview and key links.
- `START_HERE.md`: master navigation for demo/verification docs.
- `DEMO_QUICK_START.md`: fastest path to seeded data + runnable demo environment.
