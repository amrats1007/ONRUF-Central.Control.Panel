(function () {
    'use strict';

    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';
    const DEFAULT_VISIBILITY = 'everyone';

    const state = {
        session: null,
        account: null,
        signup: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initializeEditProfile);

    function initializeEditProfile() {
        cacheElements();
        loadSession();
        if (!state.session) {
            showEmptyState();
            redirectToLogin();
            return;
        }
        state.account = findAccount(state.session);
        state.signup = findSignupRecord(state.session.email);
        if (!state.account && !state.signup) {
            showEmptyState();
            return;
        }
        populateForm();
        bindHandlers();
        if (elements.emptyState) {
            elements.emptyState.hidden = true;
        }
        if (elements.main) {
            elements.main.hidden = false;
        }
    }

    function cacheElements() {
        elements.main = document.getElementById('profileEditMain');
        elements.emptyState = document.getElementById('profileEditEmpty');
        elements.toast = document.getElementById('profileEditToast');
        elements.form = document.getElementById('profileEditForm');
        elements.firstName = document.getElementById('profileFirstName');
        elements.lastName = document.getElementById('profileLastName');
        elements.dob = document.getElementById('profileDob');
        elements.userName = document.getElementById('accountUserName');
        elements.email = document.getElementById('accountEmail');
        elements.phone = document.getElementById('accountPhone');
        elements.password = document.getElementById('accountPassword');
        elements.genderInputs = document.querySelectorAll('input[name="profileGender"]');
        elements.visibilityInputs = document.querySelectorAll('input[name="profileVisibility"]');
        elements.resetButtons = document.querySelectorAll('.reset-btn');
        elements.backBtn = document.getElementById('profileEditBackBtn');
        elements.signOutBtn = document.getElementById('profileEditSignOutBtn');
    }

    function loadSession() {
        try {
            const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                state.session = parsed;
            }
        } catch (error) {
            console.warn('Unable to parse login session payload', error);
        }
    }

    function findAccount(session) {
        if (!session) {
            return null;
        }
        const accounts = loadDataset(INDIVIDUAL_ACCOUNTS_KEY);
        if (!accounts.length) {
            return null;
        }
        if (session.accountId) {
            const byId = accounts.find(entry => entry && entry.id === session.accountId);
            if (byId) {
                return byId;
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

    function populateForm() {
        if (!elements.form) {
            return;
        }
    const signupProfile = state.signup?.profile || {};
        const fallbackName = buildNameFallback();
        const firstName = signupProfile.firstName || fallbackName.firstName;
        const lastName = signupProfile.lastName || fallbackName.lastName;
        const dateOfBirth = signupProfile.dateOfBirth || '';
    const gender = normalizeGender(signupProfile.gender) || normalizeGender(state.account?.gender) || '';
        const visibility = signupProfile.visibility || DEFAULT_VISIBILITY;

        if (elements.userName) {
            const nameLabel = state.signup?.userName || `${firstName} ${lastName}`.trim() || state.session.userName || 'ONRUF member';
            elements.userName.value = nameLabel;
        }
        if (elements.email) {
            elements.email.value = state.session.email || state.signup?.email || state.account?.email || '';
        }
        if (elements.phone) {
            elements.phone.value = state.account?.mobile || state.signup?.phone || signupProfile.mobile || '';
        }
        if (elements.password) {
            elements.password.value = '********';
        }
        if (elements.firstName) {
            elements.firstName.value = firstName || '';
        }
        if (elements.lastName) {
            elements.lastName.value = lastName || '';
        }
        if (elements.dob) {
            elements.dob.value = toInputDate(dateOfBirth);
        }
    setRadioValue(elements.genderInputs, gender);
        setRadioValue(elements.visibilityInputs, visibility || DEFAULT_VISIBILITY);
    }

    function bindHandlers() {
        if (elements.form) {
            elements.form.addEventListener('submit', handleFormSubmit);
        }
        elements.resetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const kind = button.getAttribute('data-reset') || 'field';
                const message = buildResetMessage(kind);
                showToast(message);
            });
        });
        if (elements.backBtn) {
            elements.backBtn.addEventListener('click', () => {
                window.location.href = 'onruf-profile.html';
            });
        }
        if (elements.signOutBtn) {
            elements.signOutBtn.addEventListener('click', handleSignOut);
        }
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        if (!elements.form) {
            return;
        }
        const firstName = (elements.firstName?.value || '').trim();
        const lastName = (elements.lastName?.value || '').trim();
        const dob = elements.dob?.value || '';
    const gender = getRadioValue(elements.genderInputs) || normalizeGender(state.signup?.profile?.gender) || 'female';
        const visibility = getRadioValue(elements.visibilityInputs) || DEFAULT_VISIBILITY;

        if (!firstName) {
            showToast('Enter your first name.');
            elements.firstName?.focus();
            return;
        }
        if (!lastName) {
            showToast('Enter your last name.');
            elements.lastName?.focus();
            return;
        }
        if (!dob) {
            showToast('Select your date of birth.');
            elements.dob?.focus();
            return;
        }

        const userName = `${firstName} ${lastName}`.trim();
        const updates = {
            firstName,
            lastName,
            dateOfBirth: dob,
            gender,
            visibility,
            userName
        };

        updateSignupRecord(updates);
        updateAccountRecord(updates);
        updateSession(updates);

        showToast('Profile updated successfully.');
        window.setTimeout(() => {
            window.location.href = 'onruf-profile.html';
        }, 1200);
    }

    function updateSignupRecord(updates) {
        const records = loadDataset(SIGNUP_RECORDS_KEY);
        const targetEmail = normalizeEmail(state.session.email);
        let target = records.find(entry => normalizeEmail(entry?.email) === targetEmail);
        if (!target) {
            target = {
                accountId: state.account?.id || null,
                email: state.session.email,
                userName: updates.userName,
                phone: state.account?.mobile || null,
                passwordHash: '',
                submittedAt: new Date().toISOString(),
                profile: {}
            };
            records.push(target);
        }
        const profile = target.profile && typeof target.profile === 'object' ? { ...target.profile } : {};
        profile.firstName = updates.firstName;
        profile.lastName = updates.lastName;
        profile.fullName = updates.userName;
        profile.dateOfBirth = updates.dateOfBirth;
        profile.gender = updates.gender;
        profile.visibility = updates.visibility;
        target.profile = profile;
        target.userName = updates.userName;
        target.updatedAt = new Date().toISOString();
        saveDataset(SIGNUP_RECORDS_KEY, records);
        state.signup = target;
    }

    function updateAccountRecord(updates) {
        const accounts = loadDataset(INDIVIDUAL_ACCOUNTS_KEY);
        if (!accounts.length) {
            return;
        }
        const targetEmail = normalizeEmail(state.session.email);
        const target = accounts.find(entry => normalizeEmail(entry?.email) === targetEmail);
        if (!target) {
            return;
        }
        target.fullName = updates.userName || target.fullName;
    target.gender = updates.gender;
        target.lastActiveAt = target.lastActiveAt || new Date().toISOString();
        target.updatedAt = new Date().toISOString();
        saveDataset(INDIVIDUAL_ACCOUNTS_KEY, accounts);
        state.account = target;
    }

    function updateSession(updates) {
        const payload = {
            ...state.session,
            userName: updates.userName || state.session.userName,
            avatarUrl: state.session.avatarUrl || state.signup?.profile?.avatarUrl || state.signup?.profile?.photoDataUrl || null,
            updatedAt: new Date().toISOString()
        };
        try {
            sessionStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(payload));
            state.session = payload;
        } catch (error) {
            console.warn('Unable to persist updated session', error);
        }
    }

    function handleSignOut() {
        try {
            sessionStorage.removeItem(LOGIN_SESSION_KEY);
        } catch (error) {
            console.warn('Unable to clear login session', error);
        }
        showToast('You have been signed out.');
        window.setTimeout(() => {
            window.location.href = 'onruf-login.html';
        }, 800);
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
            console.warn(`Unable to read dataset for ${storageKey}`, error);
            return [];
        }
    }

    function saveDataset(storageKey, dataset) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(dataset));
        } catch (error) {
            console.warn(`Unable to persist dataset for ${storageKey}`, error);
        }
    }

    function setRadioValue(nodeList, value) {
        if (!nodeList || !nodeList.length) {
            return;
        }
        const normalizedTarget = typeof value === 'string' ? value.trim().toLowerCase() : '';
        let matched = false;
        nodeList.forEach(input => {
            const normalizedInput = String(input.value || '').trim().toLowerCase();
            if (normalizedTarget && normalizedInput === normalizedTarget) {
                input.checked = true;
                matched = true;
            } else {
                input.checked = false;
            }
        });
        if (!matched) {
            nodeList[0].checked = true;
        }
    }

    function getRadioValue(nodeList) {
        if (!nodeList || !nodeList.length) {
            return '';
        }
        const checked = Array.from(nodeList).find(input => input.checked);
        return checked ? String(checked.value || '').trim().toLowerCase() : '';
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
        }, 2400);
    }

    function showEmptyState() {
        if (elements.main) {
            elements.main.hidden = true;
        }
        if (elements.emptyState) {
            elements.emptyState.hidden = false;
        }
    }

    function redirectToLogin() {
        window.setTimeout(() => {
            window.location.href = 'onruf-login.html';
        }, 1400);
    }

    function buildResetMessage(kind) {
        switch (kind) {
            case 'username':
                return 'Contact support to update your username. New options are coming soon.';
            case 'email':
                return 'Email changes require verification. We will guide you shortly.';
            case 'phone':
                return 'Phone number updates are handled through support for now.';
            case 'password':
                return 'Use the forgot password flow from the login screen to reset your password.';
            default:
                return 'We are preparing this update option. Stay tuned!';
        }
    }

    function buildNameFallback() {
        const source = state.signup?.userName || state.account?.fullName || state.session?.userName || '';
        const parts = source.split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return { firstName: '', lastName: '' };
        }
        if (parts.length === 1) {
            return { firstName: parts[0], lastName: '' };
        }
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return { firstName, lastName };
    }

    function toInputDate(value) {
        if (!value) {
            return '';
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function normalizeEmail(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().toLowerCase();
    }

    function normalizeGender(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const normalized = value.trim().toLowerCase();
        if (normalized === 'male' || normalized === 'female') {
            return normalized;
        }
        return '';
    }
})();
