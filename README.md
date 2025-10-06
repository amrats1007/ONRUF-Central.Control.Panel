# ONRUF Central Control Panel

## Project layout

- `index.html` – main HTML shell that references external assets.
- `assets/css/onruf-central-control-panel.css` – global styling extracted from the original inline `<style>` block.
- `assets/js/onruf-central-control-panel.js` – application logic originally housed in the inline `<script>` block.

## Getting started

Open `index.html` in a modern browser. The page now pulls styling and behaviour from the files in `assets/`, so keep the relative directory structure intact when hosting or sharing the project.

### Invitation email service

To deliver real invitation emails to pending users, start the bundled Node.js service:

1. Open a terminal and move into the server directory:
	```powershell
	cd "server"
	```
2. Install the dependencies:
	```powershell
	npm install
	```
3. Copy `.env.example` to `.env` and fill in the Outlook SMTP credentials:
	- Host: `smtp.office365.com`
	- Port: `587`
	- Username / From address: `onruf@outlook.com`
	- Password: use the secret supplied by operations (store it only in your private `.env`).
4. Launch the service and host the UI from the same origin:
	```powershell
	npm start
	```

The service runs on `http://localhost:4000` by default and serves the static UI alongside the `/api/invitations/send` endpoint. With the server running, open `http://localhost:4000/index.html` and sign in using the default credentials. When you add or resend an invitation, the backend queues a real email through your SMTP provider.

If you must host the UI elsewhere, expose the API URL via a global config before loading the main script:

```html
<script>
  window.__ONRUF_CONFIG__ = {
	 invitationServiceUrl: 'https://your-api-host.example.com/api/invitations/send'
  };
</script>
<script src="assets/js/onruf-central-control-panel.js" defer></script>
```

### Verify delivery with the test harness

After starting the server you can trigger a manual test email:

```powershell
cd "server"
npm run test:send your.email@example.com
```

The script sends a sample request to the local API (override the endpoint with `TEST_INVITE_ENDPOINT` if needed) and logs the response or any errors.

### Default credentials

After the initial seed reset completes, the environment provides a super-administrator account you can use to sign in immediately:

- **Email:** `superadmin@onruf.com`
- **Password:** `Admin@123`

Once signed in you can update the profile or create additional users through the control panel.

## Data persistence

- Roles you create, edit, or toggle are saved locally in the browser via `localStorage`. Refreshing the page will retain your latest role directory.
- To revert to the seeded demo roles, clear the site data for the page (e.g. via DevTools → Application → Storage).