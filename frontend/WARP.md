# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary
- React + TypeScript app scaffolded with Vite
- Routing via react-router-dom with role-based protection
- Mock authentication persisted in localStorage
- All data is in-memory (src/data/mock.ts)

Prerequisites
- Node.js 18+ and npm

Common commands
- Install dependencies
```powershell path=null start=null
npm install
```
- Start dev server (http://localhost:5173)
```powershell path=null start=null
npm run dev
```
- Type-check and build for production
```powershell path=null start=null
npm run build
```
- Preview production build locally
```powershell path=null start=null
npm run preview
```
- Type-check only (no emit)
```powershell path=null start=null
npx tsc -b --pretty
```
- Lint the project root
```powershell path=null start=null
npm run lint
```
- Lint a single file (example)
```powershell path=null start=null
npx eslint src/pages/Login.tsx
```
Note: An ESLint config file is not present in the repo. The lint scripts rely on ESLint and plugins from devDependencies; if lint fails with “No configuration found,” add an eslint.config.js per ESLint v9 flat config.

High-level architecture
- Entry/root composition
  - src/main.tsx mounts the app, wrapping it with BrowserRouter and AuthProvider. This is the composition point for app-wide providers.
- Routing and navigation
  - src/App.tsx declares all routes with <Routes> and redirects:
    - “/” redirects to a role-specific dashboard if authenticated, otherwise to “/login”.
    - Role dashboards: “/dashboard/student”, “/dashboard/teacher”, “/dashboard/admin”.
    - Course details: “/courses/:courseId”.
  - src/routes/ProtectedRoute.tsx enforces authentication and optional role allow-lists. Unauthenticated users are redirected to “/login”; unauthorized roles are redirected to “/”.
- Authentication and session
  - src/context/AuthContext.tsx exposes user, login, logout via React Context.
  - login creates a mock user and persists it in localStorage under "auth:user"; logout clears it.
  - getDashboardPathForRole maps roles to their dashboard routes and is used for redirects.
- Domain data and UI
  - src/data/mock.ts holds all demo data (courses, assignments, notes, PYQ links).
  - src/pages/* implement the UX for Login/Signup and role dashboards.
  - src/pages/student/CourseDetails.tsx renders a tabbed view (Present/Past assignments, PYQ, Notes) and simulates file-upload submission for Present assignments.
  - src/components/CourseCard.tsx is a generic, clickable course summary used across dashboards.
- Tooling and configuration
  - Vite config: vite.config.ts uses @vitejs/plugin-react.
  - TypeScript configs: project references split (tsconfig.json references tsconfig.app.json and tsconfig.node.json); strict settings are enabled, noEmit is true for both app and node configs.
  - Package scripts:
    - dev → vite
    - build → tsc -b && vite build (type-check first, then bundle)
    - preview → vite preview
    - lint → eslint .
  - Vite is pinned via overrides to "rolldown-vite@7.1.14".

Notes from README
- Roles: student, teacher, admin. Login flow lets a user pick a role; session is persisted to localStorage.
- All data and upload flows are mocked; integrate real APIs/storage to make production-ready.
- Dev quickstart: npm install; npm run dev; open http://localhost:5173.

Testing
- No test framework or scripts are configured in this repository. If tests are added later (e.g., vitest or jest), include run and single-test commands here.
