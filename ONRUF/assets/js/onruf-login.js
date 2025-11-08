(function () {
    'use strict';

    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';
    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
    const REMEMBER_KEY = 'onruf_individual_login_remember_v1';
    const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

    const DEFAULT_INDIVIDUAL_ACCOUNTS = [];

    const DEFAULT_SIGNUP_RECORDS = [];

    const elements = {};

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        elements.form = document.getElementById('loginForm');
        elements.emailInput = document.getElementById('loginEmail');
        elements.passwordInput = document.getElementById('loginPassword');
        elements.rememberInput = document.getElementById('rememberMe');
        elements.toast = document.getElementById('signupToast');
        elements.forgotButton = document.getElementById('forgotPasswordBtn');

        ensureAccountsSeeded();
        ensureSignupRecordsSeeded();
        attachLanguageToggle();
        attachPasswordToggles();
        populateRememberedCredentials();

        if (elements.forgotButton) {
            elements.forgotButton.addEventListener('click', () => {
                showToast('info', 'Password support will be available soon. Contact support@onruf.com for assistance.');
            });
        }

        if (elements.form) {
            elements.form.addEventListener('submit', handleLoginSubmit);
        }
    }

    function handleLoginSubmit(event) {
        event.preventDefault();
        if (!elements.emailInput || !elements.passwordInput) {
            return;
        }

        const emailRaw = elements.emailInput.value.trim();
        const password = elements.passwordInput.value;
        if (!validateEmail(emailRaw)) {
            showToast('error', 'Please enter a valid email address.');
            elements.emailInput.focus();
            return;
        }
        if (!password) {
            showToast('error', 'Enter your password to continue.');
            elements.passwordInput.focus();
            return;
        }

        const email = emailRaw.toLowerCase();
        const records = loadSignupRecords();
        const record = records.find(entry => entry && typeof entry.email === 'string' && entry.email.trim().toLowerCase() === email);
        if (!record) {
            showToast('error', 'We could not find an account with that email.');
            elements.emailInput.focus();
            elements.emailInput.select?.();
            return;
        }

        const passwordHash = hashPassword(password);
        if (record.passwordHash !== passwordHash) {
            showToast('error', 'Incorrect password. Please try again.');
            elements.passwordInput.focus();
            elements.passwordInput.select?.();
            return;
        }

        rememberEmailPreference(email, elements.rememberInput?.checked);
        updateRecordLastLogin(records, record);
        persistSignupRecords(records);
        updateAccountActivity(email);
        persistSession(record);

        const welcomeName = record.userName || record.profile?.firstName || 'there';
        showToast('success', `Welcome back, ${welcomeName}! Redirecting…`, 2400);
        window.setTimeout(() => {
            window.location.href = 'onruf-platform.html';
        }, 1500);
    }

    function attachLanguageToggle() {
        document.querySelectorAll('.lang-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.lang-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
            });
        });
    }

    function attachPasswordToggles() {
        document.querySelectorAll('[data-password-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-password-toggle');
                const input = targetId ? document.getElementById(targetId) : null;
                if (!input) {
                    return;
                }
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                button.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
            });
        });
    }

    function populateRememberedCredentials() {
        try {
            const raw = localStorage.getItem(REMEMBER_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                localStorage.removeItem(REMEMBER_KEY);
                return;
            }
            const { email, storedAt } = parsed;
            if (!email || !storedAt || Date.now() - storedAt > REMEMBER_TTL_MS) {
                localStorage.removeItem(REMEMBER_KEY);
                return;
            }
            if (elements.emailInput) {
                elements.emailInput.value = email;
            }
            if (elements.rememberInput) {
                elements.rememberInput.checked = true;
            }
        } catch (error) {
            console.warn('Unable to read remembered login:', error);
        }
    }

    function rememberEmailPreference(email, remember) {
        if (!remember) {
            localStorage.removeItem(REMEMBER_KEY);
            return;
        }
        const payload = {
            email,
            storedAt: Date.now()
        };
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
    }

    function updateRecordLastLogin(records, record) {
        const now = new Date().toISOString();
        record.lastLoginAt = now;
        if (record.accountId) {
            record.lastLoginSource = 'marketplace-login';
        }
    }

    function persistSession(record) {
        try {
            const payload = {
                email: record.email,
                accountId: record.accountId || null,
                userName: record.userName || null,
                signedInAt: new Date().toISOString()
            };
            sessionStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('Unable to persist login session', error);
        }
    }

    function updateAccountActivity(email) {
        const accounts = loadIndividualAccounts();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const account = accounts.find(entry => entry && typeof entry.email === 'string' && entry.email.trim().toLowerCase() === normalizedEmail);
        if (!account) {
            return;
        }
        const nowIso = new Date().toISOString();
        account.lastActiveAt = nowIso;
        const normalizedStatus = typeof account.status === 'string' ? account.status.trim().toLowerCase() : '';
        account.status = normalizedStatus === 'inactive' ? 'inactive' : 'active';
        saveIndividualAccounts(accounts);
    }

    function ensureAccountsSeeded() {
        try {
            const raw = localStorage.getItem(INDIVIDUAL_ACCOUNTS_KEY);
            if (!raw) {
                const normalized = DEFAULT_INDIVIDUAL_ACCOUNTS.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
                localStorage.setItem(INDIVIDUAL_ACCOUNTS_KEY, JSON.stringify(normalized));
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.length) {
                const normalized = DEFAULT_INDIVIDUAL_ACCOUNTS.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
                localStorage.setItem(INDIVIDUAL_ACCOUNTS_KEY, JSON.stringify(normalized));
            }
        } catch (error) {
            console.warn('Unable to seed individual accounts', error);
        }
    }

    function ensureSignupRecordsSeeded() {
        try {
            const raw = localStorage.getItem(SIGNUP_RECORDS_KEY);
            if (!raw) {
                localStorage.setItem(SIGNUP_RECORDS_KEY, JSON.stringify(DEFAULT_SIGNUP_RECORDS));
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.length) {
                localStorage.setItem(SIGNUP_RECORDS_KEY, JSON.stringify(DEFAULT_SIGNUP_RECORDS));
            }
        } catch (error) {
            console.warn('Unable to seed signup records', error);
        }
    }

    function loadSignupRecords() {
        try {
            const raw = localStorage.getItem(SIGNUP_RECORDS_KEY);
            if (!raw) {
                return DEFAULT_SIGNUP_RECORDS.slice();
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : DEFAULT_SIGNUP_RECORDS.slice();
        } catch (error) {
            console.warn('Unable to load signup records', error);
            return DEFAULT_SIGNUP_RECORDS.slice();
        }
    }

    function persistSignupRecords(records) {
        try {
            localStorage.setItem(SIGNUP_RECORDS_KEY, JSON.stringify(records));
        } catch (error) {
            console.warn('Unable to persist signup records', error);
        }
    }

    function loadIndividualAccounts() {
        try {
            const raw = localStorage.getItem(INDIVIDUAL_ACCOUNTS_KEY);
            if (!raw) {
                return DEFAULT_INDIVIDUAL_ACCOUNTS.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return DEFAULT_INDIVIDUAL_ACCOUNTS.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
            }
            return parsed.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
        } catch (error) {
            console.warn('Unable to load individual accounts', error);
            return DEFAULT_INDIVIDUAL_ACCOUNTS.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
        }
    }

    function saveIndividualAccounts(accounts) {
        try {
            localStorage.setItem(INDIVIDUAL_ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch (error) {
            console.warn('Unable to save individual accounts', error);
        }
    }

    function normalizeIndividualAccountPayload(account, index) {
        if (!account || typeof account !== 'object') {
            return null;
        }

        const fallbackId = `IND-${String(index + 1).padStart(4, '0')}`;
        const id = typeof account.id === 'string' && account.id.trim() ? account.id.trim() : fallbackId;
        const fullName = typeof account.fullName === 'string' && account.fullName.trim() ? account.fullName.trim() : `Account ${index + 1}`;
        const emailRaw = typeof account.email === 'string' && account.email.trim() ? account.email.trim() : `${id.toLowerCase()}@example.com`;
        const email = normalizeEmail(emailRaw) || emailRaw.toLowerCase();
        const mobile = typeof account.mobile === 'string' && account.mobile.trim() ? account.mobile.trim() : '';
        const city = typeof account.city === 'string' && account.city.trim() ? account.city.trim() : 'Riyadh';
        const rawStatus = typeof account.status === 'string' && account.status.trim()
            ? account.status.trim().toLowerCase()
            : 'active';
        const activeStatuses = new Set(['active', 'activated', 'approved', 'verified', 'pending']);
        const inactiveStatuses = new Set(['inactive', 'frozen', 'deleted', 'suspended', 'blocked', 'disabled', 'deactivated']);
        const status = inactiveStatuses.has(rawStatus)
            ? 'inactive'
            : activeStatuses.has(rawStatus)
                ? 'active'
                : rawStatus
                    ? 'inactive'
                    : 'active';
        const balance = Number.isFinite(account.balance) ? Number(account.balance) : 0;
        const adsCount = Number.isFinite(account.adsCount) ? Math.max(0, Math.floor(account.adsCount)) : 0;
        const pendingAds = Number.isFinite(account.pendingAds) ? Math.max(0, Math.floor(account.pendingAds)) : 0;
        const rawCreatedAt = account.createdAt;
        const createdAt = normalizeIsoTimestamp(rawCreatedAt, new Date().toISOString());
        const rawLastActiveAt = account.lastActiveAt;
        let lastActiveAt = normalizeIsoTimestamp(rawLastActiveAt, null);
        const hasExplicitLastActive = Object.prototype.hasOwnProperty.call(account, 'lastActiveAt');
        const creationTime = createdAt ? Date.parse(createdAt) : NaN;
        const lastActiveTime = lastActiveAt ? Date.parse(lastActiveAt) : NaN;
        const matchesCreation = hasExplicitLastActive
            && typeof rawLastActiveAt === 'string'
            && typeof rawCreatedAt === 'string'
            && rawLastActiveAt.trim()
            && rawCreatedAt.trim()
            && rawLastActiveAt.trim() === rawCreatedAt.trim();
        const timestampsNearlyEqual = !Number.isNaN(creationTime)
            && !Number.isNaN(lastActiveTime)
            && Math.abs(lastActiveTime - creationTime) <= 1000;
        if (matchesCreation && timestampsNearlyEqual) {
            // Ignore creation-time defaults so "Last Login" stays empty until a real session occurs.
            lastActiveAt = null;
        }

        const permissionsSource = account.permissions && typeof account.permissions === 'object' ? account.permissions : {};
        const permissions = {
            autoPosting: Boolean(permissionsSource.autoPosting),
            manualReview: Boolean(permissionsSource.manualReview)
        };

        const subscriptions = Array.isArray(account.subscriptions)
            ? account.subscriptions.map(subscription => ({
                name: typeof subscription.name === 'string' && subscription.name.trim() ? subscription.name.trim() : 'Subscription',
                status: typeof subscription.status === 'string' && subscription.status.trim() ? subscription.status.trim() : 'active',
                renewsAt: normalizeIsoTimestamp(subscription.renewsAt, null)
            }))
            : [];

        const financialHistory = Array.isArray(account.financialHistory)
            ? account.financialHistory.map((entry, entryIndex) => {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                const idValue = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `txn-${index + 1}-${entryIndex}`;
                const label = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : 'Transaction';
                const amount = Number(entry.amount) || 0;
                const typeCandidate = typeof entry.type === 'string' && entry.type.trim() ? entry.type.trim().toLowerCase() : '';
                const type = typeCandidate || (amount >= 0 ? 'credit' : 'debit');
                const timestamp = normalizeIsoTimestamp(entry.timestamp, createdAt);
                const note = typeof entry.note === 'string' ? entry.note.trim() : '';
                return { id: idValue, label, amount, type, timestamp, note };
            }).filter(Boolean)
            : [];

        const supportRequests = Array.isArray(account.supportRequests)
            ? account.supportRequests.map((entry, entryIndex) => {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                const requestId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `support-${index + 1}-${entryIndex}`;
                const reason = typeof entry.reason === 'string' && entry.reason.trim() ? entry.reason.trim() : 'Support access requested.';
                const requestedAt = normalizeIsoTimestamp(entry.requestedAt, new Date().toISOString());
                const expiresAt = normalizeIsoTimestamp(entry.expiresAt, null);
                const statusLabel = typeof entry.status === 'string' && entry.status.trim() ? entry.status.trim().toLowerCase() : 'pending';
                return { id: requestId, reason, requestedAt, expiresAt, status: statusLabel };
            }).filter(Boolean)
            : [];

        const notes = typeof account.notes === 'string' ? account.notes.trim() : '';

        const invitationCode = typeof account.invitationCode === 'string'
            ? account.invitationCode.trim()
            : '';
        const invitationObject = account.invitation && typeof account.invitation === 'object'
            ? {
                ...account.invitation,
                code: typeof account.invitation.code === 'string' ? account.invitation.code.trim() : account.invitation.code || '',
                token: typeof account.invitation.token === 'string' ? account.invitation.token.trim() : account.invitation.token || ''
            }
            : null;
        const invitationDerived = invitationObject && (invitationObject.code || invitationObject.token || '');

        const normalized = {
            ...account,
            id,
            fullName,
            email,
            mobile,
            city,
            status,
            balance,
            adsCount,
            pendingAds,
            createdAt,
            lastActiveAt,
            permissions,
            subscriptions,
            financialHistory,
            supportRequests,
            notes,
            invitation: invitationObject,
            invitationCode: invitationCode || (typeof invitationDerived === 'string' ? invitationDerived.trim() : '')
        };

        return normalized;
    }

    function normalizeIsoTimestamp(value, fallback) {
        if (!value) {
            return fallback || null;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return fallback || null;
        }
        return date.toISOString();
    }

    function normalizeEmail(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().toLowerCase();
    }

    function validateEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function hashPassword(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const normalized = value.normalize('NFKC');
        const encoder = new TextEncoder();
        const bytes = encoder.encode(normalized);
        let binary = '';
        bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    }

    function showToast(type, message, duration = 3200) {
        if (!elements.toast) {
            return;
        }
        elements.toast.textContent = message;
        elements.toast.classList.remove('visible', 'success', 'error', 'info');
        if (type) {
            elements.toast.classList.add(type);
        }
        requestAnimationFrame(() => {
            elements.toast.classList.add('visible');
        });
        window.clearTimeout(elements.toast._timeoutId);
        elements.toast._timeoutId = window.setTimeout(() => {
            elements.toast.classList.remove('visible');
        }, duration);
    }
})();
