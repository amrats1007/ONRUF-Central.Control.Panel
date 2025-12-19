# ONRUF Central Control Panel – AI Agent Playbook

## Quick Start
- Open `index.html`, `login.html`, or `complete-registration.html` directly in browser—**no bundler**. Preserve `assets/` tree and `<script defer>` order in each HTML shell.
- Default credentials: `superadmin@onruf.com` / `Admin@123`
- Optional email server: `cd server && npm install && npm start` → `http://localhost:4000`

## Architecture
Two mega-bundles with **no build step**:
- [assets/js/onruf-central-control-panel.js](assets/js/onruf-central-control-panel.js) (~56k LOC) – admin panel, all domain logic
- [assets/js/onruf-auth.js](assets/js/onruf-auth.js) (~1.5k LOC) – login, OTP, registration completion

**Global state object** at line ~2532 holds navigation, filters, pagination, overlays, and visible counts. Always mutate `state` first, then call the matching `render*()` function.

## Storage Keys & Seed Resets
All data persists in `localStorage` under `onruf_*_v1` keys:
```
onruf_users_v1, onruf_roles_v1, onruf_categories_v1, onruf_specifications_v1,
onruf_product_ads_v1, onruf_individual_accounts_v1, onruf_business_accounts_v1,
onruf_finance_transactions_v1, onruf_finance_audit_v1
```
Session lives in `sessionStorage.onruf_active_session_v1`.

**Version guards** (bump to force reseed):
- `DATA_RESET_VERSION` – shared between both bundles (~line 4567 admin, ~line 7 auth)
- `CATEGORY_RESET_VERSION` – admin only (~line 4569)

`initializeApp()` runs `ensureSeedDataReset()` + `ensureCategoryDatasetCleared()` before loading data.

## Mutation Pattern
Follow this sequence for every data change:
1. `normalize*Payload()` – validate/clean the record
2. Mutate the in-memory array (`users`, `roles`, `categories`, etc.)
3. `save*ToStorage()` – persist to localStorage
4. Run derived syncs if needed (`syncCategorySpecificationCounts`, `syncRoleUserCounts`)
5. Call matching `render*()` to update UI

Example normalizers: `normalizeUserPayload()`, `normalizeRolePayload()`, `normalizeCategoryPayload()`, `normalizeProductAdPayload()`

## Event Binding & Overlays
- `dataset.bound === 'true'` prevents duplicate listeners—clear flag before rebinding after re-render.
- Reuse overlay helpers: `setup*Overlay()`, `open*Overlay()`, `closeOverlay()`, `applyRequiredFieldIndicators()`
- Auth ↔ admin coupling: `state.registrationFlow` mirrors `authState.pendingPersonalData` – keep in sync when changing registration fields.

## Domain Specifics

**Categories/Specs**: Hierarchical tree rendered via `buildCategoryModalHierarchy()` + `renderCategoryModalTree()`. Enforce `CATEGORY_MAX_DEPTH`, require Arabic + English labels, then `syncCategorySpecificationCounts({ persistCategories: true, refreshView: true })`.

**Product Ads**: Set `state.productAdDecisionContext` before opening moderation overlays. Flow: `normalizeProductAdPayload()` → `saveProductAdsToStorage()` → `renderProductAdsTable()`.

**Accounts**: Pagination and visible counts tracked on `state`. After edits, run `rebuildIndividualVisibleCounts()` / `rebuildBusinessVisibleCounts()` before table renders.

**Finance**: Shared filters at `state.financeFilters`. Any change triggers: `renderFinanceTransactionsTable()`, `renderFinanceInsights()`, `renderFinanceChannelSummaries()`, `renderFinanceAuditTimeline()`.

## Cross-Bundle Password Sync
Both bundles implement `hashPassword()` / `hashPasswordValue()` producing Base64 UTF-8 hashes. **Never store plaintext**. Keep implementations identical—mismatches break auth.

## Config Override
Set before loading scripts to configure API endpoint:
```html
<script>window.__ONRUF_CONFIG__ = { invitationServiceUrl: 'https://...' };</script>
```
When running from `file://`, invitation service short-circuits with `{ status: 'skipped' }`.

## Troubleshooting
- **Stale data**: Clear `localStorage` for the origin, or bump `DATA_RESET_VERSION`
- **Broken auth**: Verify `hashPassword()` symmetry between bundles
- **Drifting counts**: Run rebuild helpers (`rebuildIndividualVisibleCounts`, `syncRoleUserCounts`)
