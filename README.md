# ONRUF Central Control Panel

## Project layout

- `index.html` – admin shell that boots the control panel UI.
- `login.html` / `complete-registration.html` – auth flows that reuse the same storage keys as the admin UI.
- `assets/css/onruf-central-control-panel.css` – styling for the main admin dashboard.
- `assets/css/onruf-auth.css` – styling for the login and registration flows.
- `assets/js/onruf-central-control-panel.js` – ~56k LOC powering every admin workflow.
- `assets/js/onruf-auth.js` – login, OTP, and registration logic that shares seed data and storage config with the admin bundle.

## Running the UI

1. Open `index.html` (admin) or `login.html` (auth) directly in a modern browser. Keep the `assets/` directory structure intact—there is no bundler or build step.
2. Sign in with the default credentials after the seed reset completes:
	 - Email: `superadmin@onruf.com`
	 - Password: `Admin@123`
3. If the UI is hosted elsewhere, configure the API endpoint before loading the scripts:
	 ```html
	 <script>
		 window.__ONRUF_CONFIG__ = {
			 invitationServiceUrl: 'https://your-api-host.example.com/api/invitations/send'
		 };
	 </script>
	 <script src="assets/js/onruf-central-control-panel.js" defer></script>
	 ```

## State & storage

- Both bundles cache datasets under `localStorage` keys prefixed with `onruf_` and persist sessions in `sessionStorage.onruf_active_session_v1`.
- Seed resets run through `ensureSeedDataReset()` (control panel) and `ensureSeedDataReset()` (auth). When schemas or seed shapes change, bump the shared `DATA_RESET_VERSION` constants in both bundles along with `CATEGORY_RESET_VERSION` in `assets/js/onruf-central-control-panel.js`.
- To force reseeding, clear site storage (DevTools → Application → Storage) or manually remove the relevant keys.

## Development patterns

- The admin bundle orchestrates everything through a global `state` object (see `assets/js/onruf-central-control-panel.js` around line 2532). Update `state` first, then call the matching `render*` helper.
- Persist mutations with the sequence `normalize*Payload()` → mutate in-memory arrays → `save*ToStorage()` → refresh any derived collections on `state` → `render*/sync*()`.
- Event listeners guard on `dataset.bound === 'true'`; when re-rendering interactive blocks, clear that flag before rebinding to avoid duplicate handlers.
- Shared overlay helpers (`setup*Overlay`, `open*Overlay`, `applyRequiredFieldIndicators()`) manage focus and required-field visuals. Reuse them when adding dialogs.

## Troubleshooting tips

- If lists or badges fall out of sync, confirm the cached collections on `state` were rebuilt before invoking the renderer.
- After updating seed data, verify that `ensureSeedDataReset()` ran by checking `localStorage.onruf_data_reset_version`.
- Password issues usually trace back to missing `hashPassword()` calls in the auth bundle—stored hashes are Base64 representations of the UTF-8 password.

## Reverting to demo data

- Clear the browser storage for the app origin to return to the seeded datasets and re-enable the default super-admin account.
