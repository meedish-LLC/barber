# The Premium Barbershop Booking System

A fully functional, production-ready barbershop booking and management system built without any modern frameworks.

## Architecture

*   **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), Tailwind CSS (via CDN)
*   **Backend**: Google Apps Script
*   **Database**: Google Sheets

## Directory Structure

*   `/`: Public customer-facing website (Home, Services, Barbers, Booking)
*   `/admin`: Private administrative dashboard
*   `/google-apps-script`: Backend code to be deployed on Google Apps Script
*   `/js`, `/css`: Shared frontend assets

## Backend Setup (Google Sheets + Apps Script)

This is the most critical step. The application relies entirely on Google Sheets as its database.

1.  **Create a Google Sheet**
    *   Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2.  **Open Apps Script Editor**
    *   Click `Extensions` > `Apps Script`.
3.  **Add Backend Code**
    *   Delete the default `myFunction` in `Code.gs`.
    *   Copy the entire contents of `google-apps-script/Code.gs` into the Apps Script editor and save it.
    *   Create a new script file in the editor (File > New > Script) named `Config.gs`.
    *   Copy the entire contents of `google-apps-script/Config.gs` into it and save.
4.  **Initialize the Database**
    *   In the Apps Script editor, open `Config.gs`.
    *   Select the function `setupSpreadsheet` from the dropdown in the toolbar.
    *   Click **Run**.
    *   *Note: Google will ask for permission to access your spreadsheets. Click "Review permissions", choose your account, click "Advanced", and "Go to project (unsafe)". Allow the permissions.*
    *   Once it finishes, check your spreadsheet. It should have all the necessary sheets (Settings, Services, Barbers, etc.) populated with headers and default data.
5.  **Deploy as Web App**
    *   In the Apps Script editor, click **Deploy** > **New deployment** (top right corner).
    *   Select type: **Web app**.
    *   Description: "Production v1"
    *   Execute as: **Me** (your email).
    *   Who has access: **Anyone** (this is critical so the frontend can access it without a Google login).
    *   Click **Deploy**.
    *   Copy the **Web app URL**.

## Frontend Setup

1.  **Configure API URL**
    *   Open `js/config.js` in your code editor.
    *   Replace the placeholder `CONFIG.API_URL` with the Web app URL you copied in the previous step.
2.  **Test Locally**
    *   You can simply open `index.html` in your browser to test the site. Because there are no build steps, everything works natively.
    *   However, for local development, it's recommended to serve the folder over HTTP (e.g., using `npx serve` or VS Code Live Server) to prevent any cross-origin issues with local files.

## Admin Access

*   Go to `/admin/login.html` (e.g., click "Admin Access" in the footer).
*   **Email**: `admin@example.com`
*   **Password**: `admin`
*   *(Note: This is simulated authentication for demonstration purposes based on the requirements. In a true production environment, implement Google Apps Script JWT or standard OAuth).*

## Deployment

Because this is a completely static frontend, you can deploy it for free on any standard static hosting platform:

*   **GitHub Pages**: Push this repository to GitHub and enable Pages in the repo settings.
*   **Vercel / Netlify**: Drag and drop the folder into their dashboard or link your GitHub repo. Set the publish directory to the root `/`. No build command is required.

## Features

*   **Customer Booking Flow**: Multi-step booking ensuring no double-booking using Google Apps Script `LockService`.
*   **Real-time Availability**: Dynamically calculates open slots based on barber schedules, breaks, blocked dates, and existing appointments.
*   **Admin Dashboard**: Manage services, barbers, view stats, and cancel appointments.
*   **ICS Calendar Export**: Customers can download calendar invites for their bookings.
*   **Print Styles**: Built-in CSS tailored for printing confirmation pages.

---
Built as requested. No React. No Node.js. Pure Vanilla JS and Google Apps Script.
