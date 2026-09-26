# MMPNS — Static Portfolio Demo

A fully static build of the MMPNS school website and portal system, made for
portfolio demonstration. It is an exact copy of the production UI (`client/`)
with the backend removed:

- **No Firebase / REST API** — `src/utils/auth.ts`, `src/utils/apiClient.ts`,
  and `src/utils/database.ts` are demo implementations backed by
  `src/demo/demoData.ts` (fixed content) and `localStorage` (in-browser edits).
- **Portals auto-login** — opening any portal route enters its dashboard
  immediately, no password. Logging out shows the real login screen; any
  credentials sign back in.
- **Fixed demo content** — 56 students, 7 teachers, grade book scores,
  library catalog/circulation, attendance analytics, calendar, evaluations,
  and news posts are all seeded deterministically. Attendance and library
  dates are generated relative to "today" so dashboards always look current.
- Edits made in the portals (adding books, registering students, grading…)
  persist only in the visitor's browser. The superadmin **Developer Tools →
  Reset Database Table** restores the seeded demo content.

## Portal routes

| Route | Signs in as |
|---|---|
| `/teacher-portal` | Maricel D. Santos (teacher, JHS) |
| `/student-portal` | Grade 7 student |
| `/principal-portal` | Sr. Maria Pia S. Alvarez (principal) |
| `/registrar-portal` | Grace P. Salcedo (multi-role) |
| `/librarian-portal` | Noel B. Ramirez (librarian) |
| `/admin-portal` | MMPNS Developer (superadmin) |

## Running

```bash
npm install
npm run dev       # local dev server
npm run build     # static production build in dist/
npm run preview   # serve the production build locally
```

The `dist/` output is fully static — deploy it to any static host
(Netlify, Vercel, GitHub Pages, Firebase Hosting…). No environment
variables are required. SPA rewrites (all routes → `index.html`) must be
enabled on the host.
