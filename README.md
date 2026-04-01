# SOAR Tracker

SOAR Tracker is a lightweight local web app for teachers to log student interventions quickly, review weekly XP totals, manage app assignments, and export intervention records.

## Storage

This version uses SQLite in the browser through a local `sql.js` engine. The database is stored on this machine in browser storage, so it stays local and does not depend on any remote service.

## What is included

- Shared 4-character access code login
- Student directory with search and band filter
- Student profile with weekly totals and daily accordion logs
- Add student and add intervention flows
- Settings for content areas, apps, and student app assignments
- CSV and Excel-compatible exports
- Fixed Google Sheet export target for the shared intervention spreadsheet
- Google Sheets API sync route for deployed Vercel exports
- Sample seed data loaded into the local SQLite database on first run

## Run locally

1. Install dependencies with `npm install`.
2. For live development, run `npm run dev` and open [http://127.0.0.1:8123](http://127.0.0.1:8123).
3. For a production-like local build, run `npm run build` and then start [`serve-local.ps1`](./serve-local.ps1).
4. Use access code `SOAR`.

## Google Sheet Sync

The Export screen is hard-linked to this spreadsheet:

- [SOAR Tracker Interventions](https://docs.google.com/spreadsheets/d/1BBFCU-FuQgb7VNDiTuotpbWGR0cdOTxJ3FxyRWd706A/edit?usp=drivesdk)

This app uses a server-side Google Sheets API route at `/api/google-sheet-sync`.

To make the deployed Vercel site sync directly to that sheet:

1. Share the spreadsheet with your service account email as an editor.
2. Set Vercel environment variables from your service account:
   - `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` for local use, or
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_PROJECT_ID`
   - `GOOGLE_SPREADSHEET_ID`
3. Redeploy Vercel.

For local use, copy [`.env.example`](./.env.example) to `.env.local` and point `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` at your downloaded JSON key.

The API route upserts rows by intervention ID and highlights:

- new rows in green
- changed rows in yellow
- stale rows removed from the sheet and counted in the sync response

## Files

- `index.html`: Vite app entry
- `src/main.jsx`: React/Tailwind bootstrapping for the local app shell
- `src/styles.css` and `src/index.css`: navy/lilac shell styling
- `styles.css`: legacy UI styling still used by the current DOM-driven app logic
- `app.js`: current UI state, totals, grouping, exports, and CRUD wiring
- `data-service.js`: local SQLite database setup and persistence
- `public/soar-config.js`: runtime config for the access code, sheet URL, and API route
- `api/google-sheet-sync.js`: Vercel serverless route for Google Sheets sync
- `server/google-sheet-sync.js`: shared Google Sheets API server logic
- `seed-data.js`: first-run sample data
- `vendor/sql-wasm.js` and `vendor/sql-wasm.wasm`: local SQLite engine files
- `sqlite/schema.sql`: reference schema for the local database
