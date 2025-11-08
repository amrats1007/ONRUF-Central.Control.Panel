(function () {
    'use strict';

    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';
    const DEFAULT_INVITE_REWARD = 100;
    const INVITE_CODE_LENGTH = 8;

    const state = {
        session: null,
        account: null,
        signup: null,
        model: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initializePointsDashboard);

    function initializePointsDashboard() {
        cacheElements();
        state.session = readSession();
        if (!state.session) {
            redirectToLogin();
            return;
        }
        state.account = findIndividualAccount(state.session);
        state.signup = findSignupRecord(state.session.email);
        state.model = buildPointsModel();
        if (!state.model) {
            redirectToLogin();
            return;
        }
        renderHeader(state.model);
        renderPointsSummary(state.model);
        renderPointsHistory(state.model);
        bindInteractions();
        if (elements.main) {
            elements.main.hidden = false;
        }
    }

    function cacheElements() {
        elements.main = document.getElementById('pointsMain');
        elements.toast = document.getElementById('pointsToast');
        elements.pointsValue = document.getElementById('pointsBalanceValue');
        elements.pointsUpdatedAt = document.getElementById('pointsUpdatedAt');
        elements.inviteReward = document.getElementById('pointsInviteReward');
        elements.inviteCode = document.getElementById('pointsInviteCode');
        elements.copyInviteButton = document.getElementById('copyInviteCodeBtn');
        elements.historyList = document.getElementById('pointsHistoryList');
        elements.historyEmpty = document.getElementById('pointsHistoryEmpty');
        elements.historyButton = document.getElementById('viewPointsHistoryBtn');
        elements.backButton = document.getElementById('pointsBackBtn');
        elements.languageToggle = document.getElementById('pointsLanguageToggle');
        elements.loginButton = document.getElementById('pointsLoginBtn');
        elements.userMenu = document.getElementById('pointsUserMenu');
        elements.userMenuTrigger = document.getElementById('pointsUserMenuTrigger');
        elements.userMenuLabel = document.getElementById('pointsUserMenuLabel');
        elements.userMenuEmail = document.getElementById('pointsUserMenuEmail');
        elements.userAvatar = document.getElementById('pointsUserAvatar');
        elements.guestActions = document.getElementById('pointsGuestActions');
    }

    function readSession() {
        try {
            const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('Unable to read login session for points dashboard', error);
            return null;
        }
    }

    function findIndividualAccount(session) {
        if (!session) {
            return null;
        }
        const accounts = loadDataset(INDIVIDUAL_ACCOUNTS_KEY);
        if (!accounts.length) {
            return null;
        }
        if (session.accountId) {
            const match = accounts.find(entry => entry && entry.id === session.accountId);
            if (match) {
                return match;
            }
        }
        const targetEmail = normalizeEmail(session.email);
        if (!targetEmail) {
            return null;
        }
        return accounts.find(entry => normalizeEmail(entry?.email) === targetEmail) || null;
    }

    function findSignupRecord(email) {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            return null;
        }
        const records = loadDataset(SIGNUP_RECORDS_KEY);
        return records.find(entry => normalizeEmail(entry?.email) === normalized) || null;
    }

    function loadDataset(storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn(`Unable to load dataset for ${storageKey}`, error);
            return [];
        }
    }

    function buildPointsModel() {
        const account = state.account || {};
        const signup = state.signup || {};
        const email = state.session.email || account.email || signup.email || '';
        const profileName = account.fullName
            || signup.profile?.fullName
            || state.session.userName
            || buildNameFromEmail(email);
        const avatarUrl = account.avatarUrl
            || signup.profile?.avatarUrl
            || signup.profile?.photoDataUrl
            || state.session.avatarUrl
            || '';
        const membershipId = account.id || signup.accountId || buildMembershipIdFromEmail(email);
        const rawPoints = account.pointsBalance ?? account.points ?? signup.profile?.points;
        const fallbackPoints = Math.max(150, (account.adsCount || 0) * 12);
        const pointsBalance = resolveNumber(rawPoints, fallbackPoints, 0);
        const inviteCode = resolveInviteCode({ account, signup, membershipId, email });
        const updatedAt = account.pointsUpdatedAt || account.lastActiveAt || account.updatedAt || new Date().toISOString();
        const historySource = Array.isArray(account.pointsHistory) ? account.pointsHistory.slice(0) : [];
        const history = normalizeHistory(historySource, membershipId, inviteCode, pointsBalance, updatedAt);

        return {
            name: profileName,
            email,
            avatarUrl,
            membershipId,
            pointsBalance,
            inviteCode,
            inviteReward: DEFAULT_INVITE_REWARD,
            updatedAt,
            history
        };
    }

    function normalizeHistory(entries, membershipId, inviteCode, balance, updatedAt) {
        if (!Array.isArray(entries) || !entries.length) {
            const placeholder = {
                id: `${membershipId}-seed`,
                label: 'Welcome bonus',
                delta: balance,
                timestamp: updatedAt,
                balanceAfter: balance
            };
            return [placeholder];
        }
        return entries
            .map((entry, index) => {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                const label = entry.label || entry.reason || entry.title || `Reward ${index + 1}`;
                const delta = Number.parseFloat(entry.delta ?? entry.amount ?? 0) || 0;
                const timestamp = entry.timestamp || entry.date || entry.recordedAt || new Date().toISOString();
                const balanceAfter = Number.isFinite(entry.balanceAfter) ? entry.balanceAfter : balance;
                return {
                    id: entry.id || `${membershipId}-hist-${index}`,
                    label,
                    delta,
                    timestamp,
                    balanceAfter
                };
            })
            .filter(Boolean)
            .sort((a, b) => Date.parse(b.timestamp || '') - Date.parse(a.timestamp || ''))
            .slice(0, 6);
    }

    function renderHeader(model) {
        if (!elements.userMenu || !elements.guestActions) {
            return;
        }
        elements.guestActions.classList.add('is-hidden');
        elements.userMenu.classList.remove('is-hidden');
        if (elements.userMenuLabel) {
            elements.userMenuLabel.textContent = model.name;
        }
        if (elements.userMenuEmail) {
            elements.userMenuEmail.textContent = model.email;
        }
        if (elements.userAvatar) {
            if (model.avatarUrl) {
                elements.userAvatar.style.backgroundImage = `url("${model.avatarUrl}")`;
                elements.userAvatar.style.backgroundSize = 'cover';
                elements.userAvatar.style.backgroundPosition = 'center';
                elements.userAvatar.innerHTML = '';
            } else {
                elements.userAvatar.style.backgroundImage = '';
                elements.userAvatar.innerHTML = `<span>${escapeHtml(buildInitials(model.name))}</span>`;
            }
        }
    }

    function renderPointsSummary(model) {
        if (elements.pointsValue) {
            const suffix = model.pointsBalance === 1 ? 'point' : 'points';
            elements.pointsValue.textContent = `${model.pointsBalance.toLocaleString('en-US')} ${suffix}`;
        }
        if (elements.pointsUpdatedAt) {
            elements.pointsUpdatedAt.textContent = `Updated ${formatRelativeDate(model.updatedAt)}`;
        }
        if (elements.inviteReward) {
            elements.inviteReward.textContent = model.inviteReward;
        }
        if (elements.inviteCode) {
            elements.inviteCode.textContent = model.inviteCode;
        }
    }

    function renderPointsHistory(model) {
        if (!elements.historyList || !elements.historyEmpty) {
            return;
        }
        if (!model.history.length) {
            elements.historyList.innerHTML = '';
            elements.historyEmpty.hidden = false;
            return;
        }
        const items = model.history.map(entry => {
            const deltaLabel = formatDelta(entry.delta);
            const timestampLabel = formatDateTime(entry.timestamp);
            const balanceLabel = Number.isFinite(entry.balanceAfter)
                ? `${entry.balanceAfter.toLocaleString('en-US')} pts`
                : '';
            return `
                <li>
                    <strong>${escapeHtml(entry.label)}</strong>
                    <span class="points-delta">${escapeHtml(deltaLabel)}</span>
                    <span>${escapeHtml(timestampLabel)}${balanceLabel ? ` &middot; Balance ${escapeHtml(balanceLabel)}` : ''}</span>
                </li>
            `;
        }).join('');
        elements.historyList.innerHTML = items;
        elements.historyEmpty.hidden = true;
    }

    function bindInteractions() {
        if (elements.copyInviteButton) {
            elements.copyInviteButton.addEventListener('click', handleCopyInviteCode);
        }
        if (elements.backButton) {
            elements.backButton.addEventListener('click', () => {
                window.location.href = 'onruf-profile.html';
            });
        }
        if (elements.historyButton) {
            elements.historyButton.addEventListener('click', () => {
                showToast('Full history view coming soon.');
            });
        }
        if (elements.languageToggle) {
            elements.languageToggle.addEventListener('click', () => {
                showToast('Arabic view will be available soon.');
            });
        }
        if (elements.loginButton) {
            elements.loginButton.addEventListener('click', () => {
                window.location.href = 'onruf-login.html';
            });
        }
        if (elements.userMenuTrigger) {
            elements.userMenuTrigger.addEventListener('click', () => {
                window.location.href = 'onruf-profile.html';
            });
        }
    }

    function handleCopyInviteCode() {
        const code = state.model?.inviteCode;
        if (!code) {
            showToast('Invite code not available yet.');
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                showToast('Invite code copied to clipboard.');
            }).catch(() => {
                fallbackCopyToClipboard(code);
            });
        } else {
            fallbackCopyToClipboard(code);
        }
    }

    function fallbackCopyToClipboard(value) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Invite code copied to clipboard.');
        } catch (error) {
            console.warn('Unable to copy invite code', error);
            showToast('Copy not supported in this browser.');
        }
        document.body.removeChild(textarea);
    }

    function showToast(message) {
        if (!elements.toast) {
            window.alert(message);
            return;
        }
        elements.toast.textContent = message;
        elements.toast.classList.add('visible');
        window.clearTimeout(elements.toast._timeoutId);
        elements.toast._timeoutId = window.setTimeout(() => {
            elements.toast.classList.remove('visible');
        }, 2200);
    }

    function redirectToLogin() {
        window.setTimeout(() => {
            window.location.href = 'onruf-login.html';
        }, 1200);
    }

    function resolveNumber(value, fallback, precision) {
        const numeric = Number.parseFloat(value);
        if (Number.isFinite(numeric)) {
            const digits = Math.max(precision || 0, 0);
            return Number.parseFloat(numeric.toFixed(digits));
        }
        const fallbackNumeric = Number.parseFloat(fallback);
        if (Number.isFinite(fallbackNumeric)) {
            return Number.parseFloat(fallbackNumeric.toFixed(Math.max(precision || 0, 0)));
        }
        return 0;
    }

    function resolveInviteCode({ account, signup, membershipId, email }) {
        const existing = extractInviteCode(account, signup);
        if (existing) {
            return existing;
        }

        const existingCodes = collectExistingInviteCodes();
        let inviteCode = generateRandomInviteCode(existingCodes, INVITE_CODE_LENGTH);

        if (!inviteCode) {
            let attempt = 0;
            while (attempt < 50 && !inviteCode) {
                const candidate = buildInviteCodeFromSeed(`${membershipId}|${email}|${attempt}`, INVITE_CODE_LENGTH);
                const normalizedCandidate = candidate.toLowerCase();
                if (!existingCodes.has(normalizedCandidate) && isInviteCodeValid(candidate)) {
                    existingCodes.add(normalizedCandidate);
                    inviteCode = candidate;
                }
                attempt += 1;
            }
        }

        if (!inviteCode) {
            const entropySeed = `${Date.now()}|${Math.random()}|${email}`;
            inviteCode = buildInviteCodeFromSeed(entropySeed, INVITE_CODE_LENGTH);
        }

        if (inviteCode && isInviteCodeValid(inviteCode)) {
            existingCodes.add(inviteCode.trim().toLowerCase());
        }

        applyInviteCode(account, signup, inviteCode);
        persistInviteCode({ accountId: account?.id || null, email, inviteCode });

        return inviteCode;
    }

    function extractInviteCode(account, signup) {
        const candidates = [];
        if (account && typeof account === 'object') {
            candidates.push(account.invitationCode);
            if (account.invitation && typeof account.invitation === 'object') {
                candidates.push(account.invitation.code, account.invitation.token);
            }
        }
        if (signup && typeof signup === 'object') {
            candidates.push(signup.invitationCode);
            if (signup.invitation && typeof signup.invitation === 'object') {
                candidates.push(signup.invitation.code);
            }
            if (signup.profile && typeof signup.profile === 'object') {
                candidates.push(signup.profile.inviteCode);
            }
        }
        for (const candidate of candidates) {
            if (isInviteCodeValid(candidate)) {
                return String(candidate).trim();
            }
        }
        return null;
    }

    function applyInviteCode(account, signup, inviteCode) {
        const normalizedCode = typeof inviteCode === 'string' ? inviteCode.trim() : String(inviteCode || '').trim();
        if (!normalizedCode || !isInviteCodeValid(normalizedCode)) {
            return;
        }
        if (account && typeof account === 'object') {
            account.invitationCode = normalizedCode;
            if (account.invitation && typeof account.invitation === 'object') {
                account.invitation.code = normalizedCode;
                if (!account.invitation.token) {
                    account.invitation.token = normalizedCode;
                }
            } else {
                account.invitation = { code: normalizedCode, token: normalizedCode };
            }
        }
        if (signup && typeof signup === 'object') {
            signup.invitationCode = normalizedCode;
            if (signup.invitation && typeof signup.invitation === 'object') {
                signup.invitation.code = normalizedCode;
            }
            if (!signup.profile || typeof signup.profile !== 'object') {
                signup.profile = {};
            }
            signup.profile.inviteCode = normalizedCode;
        }
        if (state.session && typeof state.session === 'object') {
            state.session.invitationCode = normalizedCode;
            try {
                sessionStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(state.session));
            } catch (error) {
                console.warn('Unable to persist invite code to session storage', error);
            }
        }
    }

    function buildInviteCodeFromSeed(seed, length = INVITE_CODE_LENGTH) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const allChars = `${uppercase}${lowercase}${digits}`;
        const chars = [];

        let hash = Math.abs(hashString(seed)) || 1;

        const pullChar = (pool, modifier) => {
            hash = (hash * 1664525 + modifier) >>> 0;
            return pool.charAt(hash % pool.length);
        };

        chars.push(pullChar(uppercase, 1013904223));
        chars.push(pullChar(lowercase, 1103515245));
        chars.push(pullChar(digits, 12345));

        while (chars.length < length) {
            hash = (hash * 22695477 + 1) >>> 0;
            chars.push(allChars.charAt(hash % allChars.length));
        }

        for (let index = chars.length - 1; index > 0; index -= 1) {
            hash = (hash * 134775813 + 1) >>> 0;
            const swapIndex = hash % (index + 1);
            const temp = chars[index];
            chars[index] = chars[swapIndex];
            chars[swapIndex] = temp;
        }

        return chars.join('').slice(0, length);
    }

    function collectExistingInviteCodes() {
        const codes = new Set();
        const addCode = value => {
            if (!isInviteCodeValid(value)) {
                return;
            }
            const normalized = String(value).trim();
            if (!normalized) {
                return;
            }
            codes.add(normalized.toLowerCase());
        };

        const accounts = loadDataset(INDIVIDUAL_ACCOUNTS_KEY);
        accounts.forEach(entry => {
            if (!entry || typeof entry !== 'object') {
                return;
            }
            addCode(entry.invitationCode);
            if (entry.invitation && typeof entry.invitation === 'object') {
                addCode(entry.invitation.code);
                addCode(entry.invitation.token);
            }
        });

        const signupRecords = loadDataset(SIGNUP_RECORDS_KEY);
        signupRecords.forEach(entry => {
            if (!entry || typeof entry !== 'object') {
                return;
            }
            addCode(entry.invitationCode);
            if (entry.invitation && typeof entry.invitation === 'object') {
                addCode(entry.invitation.code);
            }
            if (entry.profile && typeof entry.profile === 'object') {
                addCode(entry.profile.inviteCode);
            }
        });

        return codes;
    }

    function isInviteCodeValid(value) {
        if (typeof value !== 'string') {
            return false;
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return false;
        }
        const requiredLength = Math.max(6, INVITE_CODE_LENGTH);
        if (trimmed.length < requiredLength) {
            return false;
        }
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]+$/.test(trimmed);
    }

    function generateRandomInviteCode(existingCodes, length = INVITE_CODE_LENGTH) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const allChars = `${uppercase}${lowercase}${digits}`;
        const pools = [uppercase, lowercase, digits];
        const maxAttempts = 120;

        const getRandomIndex = max => {
            if (max <= 0) {
                return 0;
            }
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                const array = new Uint32Array(1);
                crypto.getRandomValues(array);
                return array[0] % max;
            }
            return Math.floor(Math.random() * max);
        };

        const shuffle = array => {
            for (let index = array.length - 1; index > 0; index -= 1) {
                const swapIndex = getRandomIndex(index + 1);
                const temp = array[index];
                array[index] = array[swapIndex];
                array[swapIndex] = temp;
            }
            return array;
        };

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const chars = pools.map(pool => pool.charAt(getRandomIndex(pool.length)));
            while (chars.length < length) {
                chars.push(allChars.charAt(getRandomIndex(allChars.length)));
            }
            const candidate = shuffle(chars).join('');
            const normalized = candidate.toLowerCase();
            if (!existingCodes.has(normalized)) {
                existingCodes.add(normalized);
                return candidate;
            }
        }
        return '';
    }

    function persistInviteCode({ accountId, email, inviteCode }) {
        const normalizedCode = typeof inviteCode === 'string' ? inviteCode.trim() : String(inviteCode || '').trim();
        if (!normalizedCode || !isInviteCodeValid(normalizedCode)) {
            return;
        }
        const normalizedEmail = normalizeEmail(email);

        try {
            const accounts = loadDataset(INDIVIDUAL_ACCOUNTS_KEY);
            let accountUpdated = false;
            const updatedAccounts = accounts.map(entry => {
                if (!entry || typeof entry !== 'object') {
                    return entry;
                }
                const matchesId = accountId && entry.id === accountId;
                const matchesEmail = normalizedEmail && normalizeEmail(entry.email) === normalizedEmail;
                if (!matchesId && !matchesEmail) {
                    return entry;
                }
                const clone = { ...entry, invitationCode: normalizedCode };
                const invitationPayload = clone.invitation && typeof clone.invitation === 'object'
                    ? { ...clone.invitation }
                    : {};
                invitationPayload.code = normalizedCode;
                invitationPayload.token = invitationPayload.token || normalizedCode;
                clone.invitation = invitationPayload;
                accountUpdated = true;
                return clone;
            });
            if (accountUpdated) {
                localStorage.setItem(INDIVIDUAL_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
            }
        } catch (error) {
            console.warn('Unable to persist invite code to individual accounts dataset', error);
        }

        try {
            const signupRecords = loadDataset(SIGNUP_RECORDS_KEY);
            let recordsUpdated = false;
            const updatedRecords = signupRecords.map(entry => {
                if (!entry || typeof entry !== 'object') {
                    return entry;
                }
                const matchesEmail = normalizedEmail && normalizeEmail(entry.email) === normalizedEmail;
                if (!matchesEmail) {
                    return entry;
                }
                const clone = { ...entry, invitationCode: normalizedCode };
                const invitationPayload = clone.invitation && typeof clone.invitation === 'object'
                    ? { ...clone.invitation }
                    : {};
                invitationPayload.code = normalizedCode;
                clone.invitation = invitationPayload;
                const profilePayload = clone.profile && typeof clone.profile === 'object'
                    ? { ...clone.profile }
                    : {};
                profilePayload.inviteCode = normalizedCode;
                clone.profile = profilePayload;
                recordsUpdated = true;
                return clone;
            });
            if (recordsUpdated) {
                localStorage.setItem(SIGNUP_RECORDS_KEY, JSON.stringify(updatedRecords));
            }
        } catch (error) {
            console.warn('Unable to persist invite code to signup records dataset', error);
        }
    }

    function buildMembershipIdFromEmail(email) {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            return 'IND-0000';
        }
        const hash = Math.abs(hashString(normalized)) % 9000 + 1000;
        return `IND-${hash}`;
    }

    function buildNameFromEmail(email) {
        if (!email) {
            return 'ONRUF Member';
        }
        const prefix = email.split('@')[0];
        return prefix.replace(/[._-]+/g, ' ').trim() || 'ONRUF Member';
    }

    function buildInitials(value) {
        if (!value) {
            return 'ON';
        }
        const parts = value.split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return value.slice(0, 2).toUpperCase();
        }
        return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    }

    function normalizeEmail(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().toLowerCase();
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDelta(value) {
        const numeric = Number.parseFloat(value) || 0;
        const formatted = Math.abs(numeric).toLocaleString('en-US');
        if (numeric > 0) {
            return `+${formatted}`;
        }
        if (numeric < 0) {
            return `-${formatted}`;
        }
        return '0';
    }

    function formatRelativeDate(value) {
        if (!value) {
            return 'just now';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'just now';
        }
        const diffMs = Date.now() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 1) {
            return 'just now';
        }
        if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        }
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        }
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
        return formatDateTime(value);
    }

    function formatDateTime(value) {
        if (!value) {
            return '—';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function hashString(value) {
        if (typeof value !== 'string') {
            return 0;
        }
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
            const charCode = value.charCodeAt(index);
            hash = (hash << 5) - hash + charCode;
            hash |= 0;
        }
        return hash;
    }
})();
