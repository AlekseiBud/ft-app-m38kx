# FinanceTracker

A personal Progressive Web App (PWA) built with **Angular 22** for quick expense and income tracking, saving data directly to **Google Sheets** via Google Apps Script.

> **Note:** This repository is built and maintained for personal use, though the source code is public. If you would like to use this application for yourself, please fork or clone the repository and deploy your own instance connected to your own Google Sheet.

---

## Key Features

* **Offline-First (PWA):** Cached locally on the device via Service Worker so it opens and works without an internet connection.
* **Offline Queue & Auto-Sync:** If the network is unavailable or times out, transactions are saved in `localStorage` and automatically synced once the connection is restored.
* **Duplicate Protection:** Every transaction is assigned a unique client-side `UUID` verified by Google Apps Script to prevent duplicate entries during retries.
* **Local PIN Protection:** Access to the input form is protected by a PIN stored locally in the browser alongside your script endpoint URL.
* **Fast Entry:** Includes quick date selectors ("Today", "Yesterday"), mobile haptic feedback, and optional notes/geolocation links.

---

## Self-Hosting & Setup

### 1. Prepare Google Sheets & Apps Script
1. Create a new Google Sheet and add tabs named after the months in Russian (`Январь`, `Февраль`, ..., `Декабрь`), or adjust the month names array in the script to match your locale.
2. Add the following column headers on each sheet: `Date`, `Type`, `Amount`, `Category`, `Note`, `GeoLink`, `ID` (you can hide the `ID` column).
3. Go to **Extensions → Apps Script**, paste the `doPost(e)` backend handler, and set your spreadsheet ID.
4. Click **Deploy → New deployment** (Type: *Web app*, Who has access: *Anyone*), then copy the generated Web App URL.

### 2. Installation & Local Development
Clone the repository and install dependencies:

```bash
git clone https://github.com
cd ft-app-m38kx
npm install
```

Start the local development server:

```bash
ng serve
```
Navigate to `http://localhost:4200/` in your browser.

### 3. Deploy to GitHub Pages
Replace `YOUR_REPO_NAME` with your repository name:

```bash
ng build --configuration production --base-href /YOUR_REPO_NAME/
npx angular-cli-ghpages --dir=dist/finance-tracker/browser
```

### 4. First Launch
Open the deployed app, enter your Google Apps Script Web App URL, and set a personal PIN. All settings are stored locally on your device.

---

## Tech Stack
* **Frontend:** Angular 22 (Standalone Components, Signals), RxJS
* **PWA:** `@angular/service-worker`
* **Backend / Storage:** Google Apps Script + Google Sheets
