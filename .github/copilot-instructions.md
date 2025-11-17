# ONRUF Central Control Panel – AI Agent Playbook

## Quick Map
- Static shells `index.html`, `login.html`, and `complete-registration.html` load vanilla assets; keep the current `<link>`/`<script defer>` ordering because the JS bootstraps on `DOMContentLoaded`.
- `assets/js/onruf-central-control-panel.js` (~38k LOC) owns every admin workflow; `assets/js/onruf-auth.js` powers sign-in/registration and shares the same storage keys.
- There is no bundler or build: open the HTML files directly, or optionally serve them with the Node invitation service described in `README.md`.

## State & Persistence
- Global `state` (see `assets/js/onruf-central-control-panel.js` around line 2137) tracks current section, pagination, filters, and active overlays; mutate state before calling any `render*` helper.
- All datasets live in `localStorage` (`onruf_*_v1`) with soft caches reset by `ensureSeedDataReset()` / `ensureCategoryDatasetCleared()`; sessions persist in `sessionStorage.onruf_active_session_v1`.
- When schema or seed shapes change, bump `DATA_RESET_VERSION` in both JS bundles and `CATEGORY_RESET_VERSION`, then clear site storage so seed loaders rerun.

## Mutation Workflow
- Follow the pattern `normalize*Payload()` → in-memory array update → `save*ToStorage()` → rebuild any cached collections on `state` → `render*/sync*()`; skipping steps desynchronizes DOM tables from storage.
- Renderers assume the cached lists exist (e.g. `state.specificationFilteredList`, `state.productAdDecisionContext`, `state.financeAuditTrail`); rebuild them before re-rendering.
- Event binding relies on the `dataset.bound === 'true'` guard inside `setupEventListeners()`; only attach new listeners after clearing that flag.
- Overlays/dialogs share helpers such as `setup*Overlay`, `open*Overlay`, `closeOverlay`, and `applyRequiredFieldIndicators()` for focus management and required-field styling.

## Auth & Invitations
- `assets/js/onruf-auth.js` seeds users via `DEFAULT_USERS_SEED`, enforces `PASSWORD_POLICY_REGEX`, and hashes new passwords with `hashPassword()` (Base64 of UTF-8) before persistence.
- Invitation flows call `deliverInvitationEmail()` which respects `window.__ONRUF_CONFIG__.invitationServiceUrl`; running from `file://` returns `{ status: 'skipped' }`.
- Registration and OTP steps keep progress in `authState.pendingPersonalData` and mirror critical fields into `state.registrationFlow`; update both when altering the onboarding sequence.
- Default credentials (`superadmin@onruf.com` / `Admin@123`) are reseeded during `ensureSeedDataReset()` and reactivated if their status drifts from `Active`.

## Domain Modules
- Category tools enforce `CATEGORY_MAX_DEPTH` and rely on `buildCategoryModalHierarchy()` plus `renderCategoryModalTree()`; run `syncCategorySpecificationCounts({ persistCategories: true, persistSpecifications: true, refreshView: true })` after modifying category/spec data.
- Specification builders require both Arabic and English labels and must call `initializeSpecificationCategoriesPicker()` before enabling the submit CTA.
- Product ads use `normalizeProductAdPayload()` and `saveProductAdsToStorage()`; moderation overlays read/write `state.productAdDecisionContext`, so populate it before opening action panels.
- Finance dashboards draw from `state.financeFilters` and `state.financeAuditTrail`; update both ahead of `renderFinanceTransactionsTable()`, `renderFinanceInsights()`, and related summaries.

## Working Effectively
- To add new UI sections, extend the sidebar markup and expand `navigateToSection()` plus the relevant `render*` routine; keep aria hooks and dataset flags consistent.
- CSS expects existing utility classes like `.status-badge`, `.tree-node`, `.user-chip`, `.period-btn`; prefer extending selectors over replacing them.
- When wiring new buttons/toggles, reuse shared helpers (`attachPasswordToggle`, `setupSharedToggles`, overlay initializers) instead of hand-rolling DOM logic.
- Use the optional Node invitation service if you need to test real emails (`README.md` has the setup); otherwise local workflows are served by static files and localStorage state.
