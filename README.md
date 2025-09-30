# ONRUF Central Control Panel

## Project layout

- `index.html` – main HTML shell that references external assets.
- `assets/css/onruf-central-control-panel.css` – global styling extracted from the original inline `<style>` block.
- `assets/js/onruf-central-control-panel.js` – application logic originally housed in the inline `<script>` block.
- `onruf.db` – placeholder database snapshot (unchanged).

## Getting started

Open `index.html` in a modern browser. The page now pulls styling and behaviour from the files in `assets/`, so keep the relative directory structure intact when hosting or sharing the project.

## Data persistence

- Roles you create, edit, or toggle are saved locally in the browser via `localStorage`. Refreshing the page will retain your latest role directory.
- To revert to the seeded demo roles, clear the site data for the page (e.g. via DevTools → Application → Storage).