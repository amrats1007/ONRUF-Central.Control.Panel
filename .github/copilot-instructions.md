# ONRUF Central Control Panel – AI Agent Playbook

## Architecture & Entrypoints
- Static admin shell `index.html`, auth shells `login.html`/`complete-registration.html`, and consumer mirrors under `ONRUF/` load vanilla assets; preserve current `<script>`/`<link>` order, `defer`, and data-* hooks.
- `assets/js/onruf-central-control-panel.js` (~26k LOC) owns all admin behaviour; `assets/js/onruf-auth.js` powers auth screens; consumer pages read the same storage-backed models.
- No bundler or build step—test changes by opening the HTML files directly or serving them alongside the optional invitation service.

## Global State & Storage
- The global `state` (line ~2094) caches pagination, filters, decision contexts, and `registrationFlow`; adjust state before invoking `render*` helpers.
- Persistence lives in `localStorage` (`onruf_*_v1`) and `sessionStorage.onruf_active_session_v1`; seeds hydrate through `ensureSeedDataReset()` and `ensureCategoryDatasetCleared()`.
- Keep `DATA_RESET_VERSION` (`assets/js/onruf-central-control-panel.js`: `20251105...`) in sync with `assets/js/onruf-auth.js` (`20251029...`) plus `CATEGORY_RESET_VERSION` when altering schemas to avoid stale caches.

## Mutation & Rendering Pattern
- Follow `normalize*Payload()` → `save*ToStorage()` → update `state` caches → `render*/sync*()`; skipping steps desynchronizes overlays, tables, or storage.
- Renderers expect cached collections (e.g. `state.specificationFilteredList`, `state.productAdDecisionContext`, `state.financeAuditTrail`); rebuild them ahead of `render*` calls.
- Event binding depends on `setupEventListeners()` guards (`dataset.bound === 'true'`); respect the flag to prevent duplicate listeners after re-renders.
- Dialogs/overlays reuse shared helpers (`setup*Overlay`, `open*Overlay`, `applyRequiredFieldIndicators()`); lean on them for focus management and aria wiring.

## Auth, Sessions & Invitations
- `assets/js/onruf-auth.js` seeds users (`DEFAULT_USERS_SEED`), enforces `PASSWORD_POLICY_REGEX`, and stores invitation metadata on each user record.
- `deliverInvitationEmail()` honours `window.__ONRUF_CONFIG__.invitationServiceUrl`; when running via `file://`, expect `status: 'skipped'` outcomes.
- OTP/token flows persist in `authState.pendingPersonalData` and `state.registrationFlow`; update both when adjusting registration steps.
- Passwords store as Base64; call `hashPassword()` before writing and `verifyPassword()` when authenticating.

## Catalog & Specifications
- Category tools enforce `CATEGORY_MAX_DEPTH`, fee label maps, and export definitions; run `syncCategorySpecificationCounts({ persistCategories: true, persistSpecifications: true, refreshView: true })` after changes.
- Category pickers rely on `buildCategoryModalHierarchy()`/`renderCategoryModalTree()`; pass `disableEntry` to keep business constraints intact.
- Specification builders require Arabic and English labels and category linkage; initialize selectors via `initializeSpecificationCategoriesPicker()` first.

## Product Ads & Automations
- Ads normalize with `normalizeProductAdPayload()` and persist via `saveProductAdsToStorage()`; refresh grids with `renderProductAdsTable(page)`.
- Automation lists use `normalizeAutomationEntry()` + `renderProductAdAutomationLists()` so schedule chips stay consistent.
- Moderation overlays read `state.productAdDecisionContext`; populate it before opening action panels.

## Accounts & Finance
- Individual account views honour `state.individualAccountsFilters`; detail overlays pull from `renderIndividualAccountsTable(page)` outputs.
- Business approvals require `state.businessDecisionContext` before `renderBusinessAccountsTable()` so buttons operate on the active member.
- Finance dashboards consume `state.financeFilters` and `state.financeAuditTrail`; update both before calling `renderFinanceTransactionsTable()`, `renderFinanceInsights()`, and related helpers.

## Consumer Mirror
- `ONRUF/assets/js/*.js` (e.g. `onruf-platform.js`) read the same `onruf_*_v1` payloads; update consumer normalizers (`normalizeAdPayload()`, fallbacks) whenever admin schemas change.
- Extend admin exporters and consumer fallbacks in tandem so storefront views keep rendering newly added fields.

## Developer Workflow
- Daily testing: open `index.html`/`login.html` directly or serve via the invitation service sketched in `README.md`; there is no bundler.
- To point at another invite API, define `window.__ONRUF_CONFIG__` before script tags as shown in `README.md`.
- After changing seed data or schemas, bump the reset versions, clear site storage, and confirm `ensureSeedDataReset()` reruns.
- CSS under `assets/css/*.css` expects hooks like `.status-badge`, `.tree-node`, `.user-chip`, `.period-btn`; extend existing selectors instead of replacing them.
