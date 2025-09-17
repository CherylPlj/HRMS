## HRMS Codebase Structure

This document explains the purpose of the top-level folders and the most important subfolders/files in this repository.

### Root
- **package.json**: Project metadata, scripts, and dependencies.
- **next.config.js**: Next.js configuration.
- **eslint.config.mjs**: ESLint configuration.
- **tailwind.config.js**, **postcss.config.(js|mjs)**: Styling configurations.
- **tsconfig*.json**: TypeScript configuration files.
- **vercel.json**: Vercel deployment configuration.
- **AI_TRAINING_GUIDE.md**, **OUT_OF_SCOPE_EXAMPLES.md**, **README.md**: Documentation.

### prisma
- **schema.prisma**: Prisma ORM schema (database models and relations).
- **migrations/**: SQL migrations generated/applied by Prisma (timestamped directories or files).
- **seed*.ts / seed.js**: Seeding scripts for initial data (users, vacancies, academics, etc.).

### scripts
Operational scripts for setup, data fixes, and utilities.
- Examples: `setup-supabase.ts`, `setup-certificates-bucket.ts`, `seed-document-types.ts`, `fix-user-roles.ts`, `check-schedules.ts`.

### supabase
- **migrations/**: SQL for Supabase (storage policies, etc.). Complements Prisma migrations where needed.

### server
Lightweight Node entry points or legacy scripts used outside Next.js routing.
- `index.js`, `faculty-documents.js`.

### public
Static assets served as-is.
- Images/icons (e.g., `avatar.png`), SVGs, and sample templates under `public/templates/` (CSV import templates).
- Uploaded files under `public/uploads/` (local dev convenience; in production prefer object storage).

### src (application code)

#### src/app (Next.js App Router)
Route handlers (API) and UI routes using the App Router.
- **api/**: Server route handlers (Edge/Node) under `route.ts` files.
  - Notable groups:
    - `attendance/` (time-in/out, summaries, history, import)
    - `employees/` (CRUD, nested resources: certificates, skills, education, family, work-experience, promotion-history)
    - `employee-documents/` and `faculty-documents/`
    - `candidates/` and `vacancies/` (recruitment flows)
    - `users/` (user management, clerk ID refresh, password sync, role verification)
    - `webhooks/` (Clerk webhook) and other integration endpoints
    - `upload/`, `dtr/download/`, `ip/`, utility endpoints
- UI routes/pages:
  - `dashboard/` (admin, employee, faculty areas)
  - `applicant/`, `employees/`, `employees-new/`, `users/`
  - Auth routes: `sign-in/`, `sign-up/`
  - Global layout: `layout.tsx`, theme styles: `globals.css`

#### src/api (API utilities outside App Router)
Thin wrappers or compatibility routes for external consumers.
- `chat/route.ts`, `clerk-webhook.ts`, `faculty-documents.ts`, `users/*`, `webhook/route.ts`.

#### src/components
Reusable React UI components and feature sections.
- Feature groups: `Attendance*`, `Documents*`, `Employee*`, `Leave*`, `RecruitmentContent`, `UsersContent`.
- Tabbed subcomponents under `components/tabs/` (e.g., `CertificatesTab.tsx`, `SkillsTab.tsx`).

#### src/contexts
React context providers (e.g., `AttendanceContext.tsx`).

#### src/lib
Server and shared utilities.
- `prisma.ts` (Prisma client), `supabase*.ts` (Supabase clients/admin), `email.ts`, `hash.ts`, `security.ts`, `validation.ts`, `apiUtils.ts`, `generateUserId.ts`, `limiter.ts`, `ip.ts`, `googleDrive.ts`.

#### src/services
Domain services encapsulating business logic (called by API routes).
- `attendanceService.ts`, `facultyDocumentService.ts`, `googleDriveService.ts`.

#### src/types
TypeScript domain types/interfaces (e.g., `attendance.ts`, `employee.ts`).

#### src/pages (legacy Pages Router)
Only `_app.tsx` and `_document.tsx` remain for app bootstrapping; feature pages live under `src/app/`.

#### src/middleware.ts and src/test.middleware.ts
Edge middleware (auth, role checks, etc.) and test variant.

### Configuration and Environment
- `.env` variables (not committed) configure database, Supabase, Clerk, and external APIs.
- Rate limiting and security are handled under `src/lib/limiter.ts` and `src/lib/security.ts`.

### Typical Request Flow (API)
1. Incoming request hits `src/app/api/**/route.ts`.
2. Handler validates/authenticates and delegates to `src/services/**`.
3. Services use `src/lib/prisma.ts` (database) and other libs (Supabase, Google Drive, email).
4. Response returned to client or background worker.

### Development Quick Links
- Add a new API: create `src/app/api/<feature>/route.ts` (and subroutes as needed) and implement logic in `src/services/`.
- Add a new page: create `src/app/<route>/page.tsx` and import components from `src/components/`.
- Update DB: modify `prisma/schema.prisma`, run a migration, and update services/types.

### Conventions
- File names use kebab-case for routes (`route.ts`) and PascalCase for components.
- Business logic belongs in `src/services/`; route files stay thin.
- Shared helpers go in `src/lib/`; cross-cutting types go in `src/types/`.


