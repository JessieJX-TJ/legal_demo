# AI Legal Agent 2.0 · Frontend Demo

UI / page structure / interaction recreate of the internal site `http://10.182.37.12:8095/v2/`. **Runs fully offline as a static frontend**, with no real backend API; all responses are mocked in `js/mock-data.js`.

## Quick start

Pick one:

```bash
# Python
python -m http.server 5173

# Node
npx --yes serve -p 5173
```

Open in the browser:

- Login: http://localhost:5173/login.html
- Workbench: http://localhost:5173/index.html

You can also open `login.html` directly in the browser (ES modules are not required; this demo uses plain scripts and usually works with a double-click).

## Account

Any non-empty username and password will sign you in (defaults: `Jessie` / `demo`).

## Page map

| Page | Original capability | Demo interactions |
|------|---------------------|-------------------|
| `login.html` | `/v2/login` | Empty validation, loading, remember username |
| `index.html` | `/v2/` workbench | Four module cards with press animation, account menu, help drawer |
| `regulation-qa.html` | Regulation Q&A Assistant 2.0 | Chat history, sample questions, AI loading, structured answers, failure retry (questions containing "fail") |
| `regulation-knowledge.html` | Regulation knowledge base | Directory browse, parse check, master list / assessment edit & publish, recycle bin |
| `compliance-check.html` | Compliance screening 2.0 (originally :8010) | Multi-file upload, step progress, merge preview, diff generation, download mock |
| `regulation-report.html` | Reports & news (originally :8091) | News list, skill config, report success/failure |
| `regulation-compare.html` | Breakdown & compare (originally :8099) | Old/new file selection, breakdown loading, diff results, export |

## Original site structure (summary)

- **Workbench**: top bar (brand / help / notifications / account) + four colored feature cards (report purple, compare yellow, screening green, Q&A blue)
- **Q&A**: left chat history + center empty/conversation stream + bottom circular send composer; answers include applicable regulations, clause text, risk, and sources
- **Knowledge base**: four tabs — document directory / regulation master list / project assessment / recycle bin
- **Compliance screening**: four-step pipeline (upload → merge → diff → results) + left history

## Directory layout

```
legal_08_25/
  login.html / index.html / regulation-*.html / compliance-check.html
  styles.css / login.css / regulation-qa.css / ...
  js/shared.js          # Logged-in user helpers and utilities
  js/mock-data.js       # All mock data and async delays
  assets/*.svg          # Site illustrations
  vendor/vue.global*.js # Vue 3
  _ref/                 # Captured reference snapshots from the original site (not required at runtime)
```

## Notes

This demo is for internship / review showcase of frontend fidelity and interaction states only. It does not include real auth, file persistence, or model inference.
