(function () {
    'use strict';

    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';

    const state = {
        session: null,
        account: null,
        signup: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initializeProfile);

    function initializeProfile() {
        cacheElements();
        const session = readSession();
        if (!session) {
            showEmptyState();
            redirectToLogin();
            return;
        }
        state.session = session;
        state.account = findIndividualAccount(session);
        state.signup = findSignupRecord(session.email);
        if (!state.account && !state.signup) {
            showEmptyState();
            return;
        }
        applyProfileView();
        bindInteractions();
    }

    function cacheElements() {
        elements.main = document.getElementById('profileMain');
        elements.emptyState = document.getElementById('profileEmptyState');
        elements.avatar = document.getElementById('profileAvatar');
        elements.name = document.getElementById('profileName');
        elements.memberSince = document.getElementById('profileMemberSince');
        elements.membershipNumber = document.getElementById('profileMembershipNumber');
        elements.ratingValue = document.getElementById('profileRatingValue');
        elements.pointsValue = document.getElementById('profilePointsValue');
        elements.walletValue = document.getElementById('profileWalletValue');
        elements.followersValue = document.getElementById('profileFollowersValue');
        elements.saleList = document.getElementById('profileSaleList');
        elements.purchaseList = document.getElementById('profilePurchaseList');
        elements.settingsList = document.getElementById('profileSettingsList');
        elements.detailsList = document.getElementById('profileDetailsList');
        elements.toast = document.getElementById('profileToast');
        elements.signOutButtons = [
            document.getElementById('profileTopSignOutBtn'),
            document.getElementById('profileCardSignOutBtn')
        ].filter(Boolean);
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
            console.warn('Unable to parse login session payload', error);
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

    function applyProfileView() {
        if (elements.emptyState) {
            elements.emptyState.hidden = true;
        }
        const profile = buildProfileModel();
        renderSummary(profile);
        renderShortcuts(profile);
        renderSettings(profile);
        renderDetails(profile);
        if (elements.main) {
            elements.main.hidden = false;
        }
    }

    function buildProfileModel() {
        const account = state.account || {};
        const signup = state.signup || {};
        const profile = {};
        profile.name = account.fullName || signup.profile?.fullName || state.session.userName || signup.profile?.firstName || signup.profile?.lastName || 'ONRUF member';
        profile.memberSince = account.createdAt || signup.createdAt || signup.completedAt || new Date().toISOString();
        profile.membershipId = account.id || signup.accountId || buildMembershipIdFromEmail(state.session.email);
        profile.rating = resolveNumber(account.rating, 4.7, 1);
        profile.points = resolveNumber(account.points, 0, 0);
        profile.wallet = resolveNumber(account.balance, 0, 2);
    profile.followers = resolveNumber(account.followers, Math.max(account.adsCount || 0, 0) * 2, 0);
        profile.avatarUrl = account.avatarUrl || signup.profile?.avatarUrl || null;
        profile.city = account.city || signup.profile?.city || '';
        profile.email = state.session.email || account.email || signup.email || '';
        profile.mobile = account.mobile || signup.profile?.phone || signup.profile?.mobile || '';
        profile.status = account.status || 'active';
        profile.lastActiveAt = account.lastActiveAt || signup.lastActiveAt || '';
        profile.adsCount = resolveNumber(account.adsCount, 0, 0);
        profile.pendingAds = resolveNumber(account.pendingAds, 0, 0);
        profile.ordersCount = resolveNumber(account.ordersCount, Math.max(profile.adsCount - profile.pendingAds, 0), 0);
        profile.bidCount = resolveNumber(account.bidCount, Math.round(profile.adsCount / 2), 0);
        profile.negotiationCount = resolveNumber(account.negotiationCount, Math.round(profile.adsCount / 3), 0);
        profile.lostCount = resolveNumber(account.lostCount, Math.max(profile.bidCount - profile.ordersCount, 0), 0);
    profile.points = profile.points || Math.max(150, profile.adsCount * 12);
    profile.followers = profile.followers || Math.max(25, profile.adsCount * 3);
        return profile;
    }

    function renderSummary(profile) {
        if (elements.avatar) {
            if (profile.avatarUrl) {
                elements.avatar.style.backgroundImage = `url("${profile.avatarUrl}")`;
                elements.avatar.style.backgroundSize = 'cover';
                elements.avatar.style.backgroundPosition = 'center';
                elements.avatar.textContent = '';
            } else {
                elements.avatar.style.backgroundImage = '';
                elements.avatar.textContent = buildInitials(profile.name);
            }
        }
        if (elements.name) {
            elements.name.textContent = profile.name;
        }
        if (elements.memberSince) {
            elements.memberSince.textContent = `Member since ${formatDate(profile.memberSince)}`;
        }
        if (elements.membershipNumber) {
            elements.membershipNumber.textContent = `Membership #${profile.membershipId}`;
        }
        if (elements.ratingValue) {
            elements.ratingValue.textContent = profile.rating.toFixed(1);
        }
        if (elements.pointsValue) {
            elements.pointsValue.textContent = profile.points.toLocaleString('en-US');
        }
        if (elements.walletValue) {
            elements.walletValue.textContent = `${profile.wallet.toLocaleString('en-US', { maximumFractionDigits: 0 })} SAR`;
        }
        if (elements.followersValue) {
            elements.followersValue.textContent = profile.followers.toLocaleString('en-US');
        }
    }

    function renderShortcuts(profile) {
        const saleItems = [
            { icon: 'fa-box', label: 'My products', pill: `${profile.adsCount} active` },
            { icon: 'fa-receipt', label: 'My orders', pill: `${profile.ordersCount} orders` },
            { icon: 'fa-gavel', label: 'My bids', pill: `${profile.bidCount} bids` },
            { icon: 'fa-circle-xmark', label: 'Lost', pill: `${profile.lostCount} listings` },
            { icon: 'fa-handshake', label: 'Negotiation offers', pill: `${profile.negotiationCount} offers` }
        ];
        const purchaseItems = [
            { icon: 'fa-clock-rotate-left', label: 'Recent activity', pill: 'Latest 30 days' },
            { icon: 'fa-heart', label: 'Favorites', pill: `${Math.max(5, Math.round(profile.followers / 4))} saved` },
            { icon: 'fa-ticket', label: 'Coupons', pill: 'Wallet credits available' }
        ];
        if (elements.saleList) {
            elements.saleList.innerHTML = buildShortcutMarkup(saleItems);
        }
        if (elements.purchaseList) {
            elements.purchaseList.innerHTML = buildShortcutMarkup(purchaseItems);
        }
    }

    function renderSettings(profile) {
        const settingsItems = [
            { icon: 'fa-pen', label: 'Edit profile' },
            { icon: 'fa-credit-card', label: 'Payment cards' },
            { icon: 'fa-location-dot', label: 'Saved addresses' },
            { icon: 'fa-circle-question', label: 'Help' },
            { icon: 'fa-headset', label: 'Technical support' }
        ];
        if (elements.settingsList) {
            elements.settingsList.innerHTML = buildShortcutMarkup(settingsItems);
        }
    }

    function renderDetails(profile) {
        if (!elements.detailsList) {
            return;
        }
        const detailPairs = [
            ['Full name', profile.name],
            ['Email', profile.email || '—'],
            ['Mobile', profile.mobile || '—'],
            ['City', profile.city || '—'],
            ['Status', titleCase(profile.status)],
            ['Member since', formatDate(profile.memberSince)],
            ['Last active', formatRelativeDate(profile.lastActiveAt) || 'Today'],
            ['Wallet balance', `${profile.wallet.toLocaleString('en-US', { maximumFractionDigits: 0 })} SAR`]
        ];
        elements.detailsList.innerHTML = detailPairs.map(([label, value]) => {
            return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`;
        }).join('');
    }

    function buildShortcutMarkup(items) {
        return items.map(item => {
            return `<li class="profile-list__item"><i class="fas ${item.icon}" aria-hidden="true"></i><span>${escapeHtml(item.label)}</span>${item.pill ? `<span class="profile-list__pill">${escapeHtml(item.pill)}</span>` : ''}<i class="fas fa-chevron-right" aria-hidden="true"></i></li>`;
        }).join('');
    }

    function bindInteractions() {
        elements.signOutButtons.forEach(button => {
            button.addEventListener('click', handleSignOut);
        });
    }

    function handleSignOut() {
        try {
            sessionStorage.removeItem(LOGIN_SESSION_KEY);
        } catch (error) {
            console.warn('Unable to clear login session', error);
        }
        showToast('You have been signed out.');
        setTimeout(() => {
            window.location.href = 'onruf-login.html';
        }, 800);
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

    function resolveNumber(value, fallback, precision) {
        const numeric = Number.parseFloat(value);
        if (Number.isFinite(numeric)) {
            const digits = Math.max(precision || 0, 0);
            return Number.parseFloat(numeric.toFixed(digits));
        }
        const fallbackNumeric = Number.parseFloat(fallback);
        if (Number.isFinite(fallbackNumeric)) {
            return fallbackNumeric;
        }
        return 0;
    }

    function buildMembershipIdFromEmail(email) {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            return 'IND-0000';
        }
        const hash = Math.abs(hashString(normalized)) % 9000 + 1000;
        return `IND-${hash}`;
    }

    function formatDate(value) {
        if (!value) {
            return '—';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatRelativeDate(value) {
        if (!value) {
            return '';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const diffMs = Date.now() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
            return 'Today';
        }
        if (diffDays === 1) {
            return 'Yesterday';
        }
        if (diffDays < 31) {
            return `${diffDays} days ago`;
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function buildInitials(value) {
        if (!value) {
            return 'ON';
        }
        const parts = value.split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return value.slice(0, 2).toUpperCase();
        }
        const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
        return initials || 'ON';
    }

    function normalizeEmail(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim().toLowerCase();
    }

    function titleCase(value) {
        if (!value) {
            return '—';
        }
        return value
            .toString()
            .split(/[_\s-]+/)
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function hashString(value) {
        if (typeof value !== 'string') {
            return 0;
        }
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = (hash << 5) - hash + value.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
})();
