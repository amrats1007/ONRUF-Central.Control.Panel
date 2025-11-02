'use strict';

const PRODUCT_ADS_STORAGE_KEY = 'onruf_product_ads_v1';
const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';
const BUSINESS_ACCOUNTS_KEY = 'onruf_business_accounts_v1';
const BUSINESS_DASHBOARD_URL = 'onruf-business-dashboard.html';

const FALLBACK_CATEGORIES = [
    { id: 'clothes', label: 'clothes', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=260&q=80' },
    { id: 'men-clothes', label: 'men clothes', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=260&q=80' },
    { id: 'women-clothes', label: 'women clothes', image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=260&q=80' },
    { id: 'mobiles', label: 'mobiles', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=260&q=80' },
    { id: 'electronics', label: 'electronics', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=260&q=80' },
    { id: 'furniture', label: 'furniture', image: 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=260&q=80' },
    { id: 'books', label: 'books', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=260&q=80' },
    { id: 'bicycles', label: 'bicycles', image: 'https://images.unsplash.com/photo-1517503734580-05ad07f01597?auto=format&fit=crop&w=260&q=80' }
];

const FALLBACK_ADS = [
    {
        id: 'AD-BK-1001',
        title: 'TEST 1',
        subtitle: 'Dammam - 30/10/2025',
        category: 'books',
        city: 'Dammam',
        priceMin: 400,
        priceMax: 500,
        createdAt: '2025-10-18T08:02:00.000Z',
        endsAt: '2025-10-30T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=600&q=80',
        account: 'Malqaa Marketplace'
    },
    {
        id: 'AD-BK-1002',
        title: 'test 3',
        subtitle: 'Cairo - 22/10/2025',
        category: 'books',
        city: 'Cairo',
        priceMin: 100,
        priceMax: 320,
        createdAt: '2025-10-16T12:00:00.000Z',
        endsAt: '2025-10-25T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
        account: 'BookVerse'
    },
    {
        id: 'AD-BK-1003',
        title: 'Test today 21/10',
        subtitle: 'Cairo - 21/10/2025',
        category: 'books',
        city: 'Cairo',
        priceMin: 400,
        priceMax: 500,
        createdAt: '2025-10-15T09:12:00.000Z',
        endsAt: '2025-10-28T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80',
        account: 'LitWorld'
    },
    {
        id: 'AD-BY-1101',
        title: 'test',
        subtitle: 'Riyadh - 27/10/2025',
        category: 'bicycles',
        city: 'Riyadh',
        priceMin: 1000,
        priceMax: 1150,
        createdAt: '2025-10-20T11:30:00.000Z',
        endsAt: '2025-11-01T21:00:00.000Z',
        badge: 'Merchant',
        image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=600&q=80',
        account: 'Cycling Hub'
    },
    {
        id: 'AD-CR-1201',
        title: 'bank transfer',
        subtitle: 'Dammam - 26/10/2025',
        category: 'cars',
        city: 'Dammam',
        priceMin: 33,
        priceMax: 55,
        createdAt: '2025-10-11T10:25:00.000Z',
        endsAt: '2025-10-27T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=600&q=80',
        account: 'Speed Auto'
    },
    {
        id: 'AD-CR-1202',
        title: 'تست تفاوض',
        subtitle: 'Riyadh - 21/10/2025',
        category: 'cars',
        city: 'Riyadh',
        priceMin: 66,
        priceMax: 95,
        createdAt: '2025-10-10T08:05:00.000Z',
        endsAt: '2025-10-24T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=600&q=80',
        account: 'Speed Auto'
    },
    {
        id: 'AD-CR-1203',
        title: 'تست تفاوض',
        subtitle: 'Riyadh - 21/10/2025',
        category: 'cars',
        city: 'Riyadh',
        priceMin: 66,
        priceMax: 96,
        createdAt: '2025-10-12T15:25:00.000Z',
        endsAt: '2025-10-29T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
        account: 'Grand Motors'
    },
    {
        id: 'AD-CL-1301',
        title: 'Fashion Flash Sale',
        subtitle: 'Jeddah - 24/10/2025',
        category: 'clothes',
        city: 'Jeddah',
        priceMin: 120,
        priceMax: 190,
        createdAt: '2025-10-18T14:45:00.000Z',
        endsAt: '2025-10-26T21:00:00.000Z',
        badge: 'Featured',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
        account: 'Style Loft'
    }
];

const CATEGORY_IMAGE_MAP = new Map(
    FALLBACK_CATEGORIES.map(category => [category.label.toLowerCase(), category.image])
);

const state = {
    ads: [],
    filteredAds: [],
    session: null,
    businessAccounts: []
};

document.addEventListener('DOMContentLoaded', initializeMarketplace);

function initializeMarketplace() {
    const ads = loadProductAds();
    state.ads = ads;
    state.filteredAds = ads;
    renderCategories(ads);
    renderShowcaseSections(ads);
    renderClosingSoon(ads);
    wireSearch();
    setupMarketplaceAuth();
    attachSellShortcut();
}

function loadProductAds() {
    try {
        const raw = localStorage.getItem(PRODUCT_ADS_STORAGE_KEY);
        if (!raw) {
            return FALLBACK_ADS.map(normalizeAdPayload);
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) {
            return FALLBACK_ADS.map(normalizeAdPayload);
        }
        const normalized = parsed
            .map(entry => normalizeAdPayload(entry))
            .filter(Boolean);
        return normalized.length ? normalized : FALLBACK_ADS.map(normalizeAdPayload);
    } catch (error) {
        console.warn('Unable to read product ads, using fallback dataset.', error);
        return FALLBACK_ADS.map(normalizeAdPayload);
    }
}

function normalizeAdPayload(entry) {
    if (!entry) return null;
    const category = (entry.category || entry.categoryName || 'general').toString().toLowerCase();
    const createdAt = safeDate(entry.createdAt) || new Date().toISOString();
    const rawEndsAt = safeDate(entry.endsAt) || safeDate(entry.expiresAt);
    const endsAt = rawEndsAt || new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const priceMin = toNumber(entry.priceMin ?? entry.price ?? entry.minimumPrice ?? entry.startingPrice, 0);
    const priceMax = toNumber(entry.priceMax ?? entry.maximumPrice ?? entry.highestPrice, priceMin);
    const badge = resolveBadge(entry);
    const image = resolveImage(entry, category);
    const subtitle = buildSubtitle(entry);

    return {
    id: entry.id || generateId(),
        title: compactText(entry.title || entry.name || 'Marketplace Listing'),
        subtitle,
        account: entry.account || entry.accountName || 'ONRUF Seller',
        city: compactText(entry.city || entry.location || 'Riyadh'),
        category,
        badge,
        priceMin,
        priceMax,
        createdAt,
        endsAt,
        image
    };
}

function resolveBadge(entry) {
    if (entry.badge) return entry.badge;
    const status = (entry.status || '').toString().toLowerCase();
    if (status === 'approved') return 'Featured';
    if (status === 'pending') return 'Pending';
    if (entry.flags && entry.flags.manualReview) return 'Manual Review';
    if (entry.flags && entry.flags.autoPosting) return 'Trusted';
    return 'Featured';
}

function resolveImage(entry, category) {
    if (entry.imageUrl) return entry.imageUrl;
    if (Array.isArray(entry.images) && entry.images[0]) return entry.images[0];
    if (CATEGORY_IMAGE_MAP.has(category)) return CATEGORY_IMAGE_MAP.get(category);
    return 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';
}

function buildSubtitle(entry) {
    const city = entry.city || entry.location || '';
    const createdAt = safeDate(entry.createdAt);
    const formattedDate = createdAt ? formatDate(new Date(createdAt)) : '';
    if (city && formattedDate) return `${city} - ${formattedDate}`;
    if (city) return city;
    return formattedDate || '';
}

function toNumber(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function safeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function compactText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function renderCategories(ads) {
    const track = document.getElementById('categoriesCarousel');
    if (!track) return;
    track.innerHTML = '';
    const dynamic = buildDynamicCategories(ads);
    const combined = mergeCategories(dynamic);
    combined.forEach(category => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'category-chip';
        chip.innerHTML = `
            <img src="${category.image}" alt="${category.label}" />
            <span>${category.label}</span>
        `;
        chip.addEventListener('click', () => {
            focusCategory(category.label.toLowerCase());
        });
        track.appendChild(chip);
    });
}

function buildDynamicCategories(ads) {
    const map = new Map();
    ads.forEach(ad => {
        const key = ad.category.toLowerCase();
        if (!map.has(key)) {
            map.set(key, {
                id: key,
                label: key,
                image: CATEGORY_IMAGE_MAP.get(key) || CATEGORY_IMAGE_MAP.get('clothes')
            });
        }
    });
    return Array.from(map.values());
}

function mergeCategories(dynamic) {
    const base = new Map(FALLBACK_CATEGORIES.map(category => [category.label.toLowerCase(), category]));
    dynamic.forEach(category => {
        if (!base.has(category.label.toLowerCase())) {
            base.set(category.label.toLowerCase(), category);
        }
    });
    return Array.from(base.values());
}

function renderShowcaseSections(ads) {
    const container = document.getElementById('showcaseContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!ads.length) {
        container.innerHTML = '<div class="showcase-section"><p>No listings match your current filters.</p></div>';
        return;
    }

    const categories = rankCategories(ads);
    categories.slice(0, 4).forEach(category => {
        const section = document.createElement('section');
        section.className = 'showcase-section';
        section.innerHTML = `
            <div class="showcase-header">
                <h2>${category}</h2>
                <a href="#">View All</a>
            </div>
            <div class="card-grid"></div>
        `;
        const grid = section.querySelector('.card-grid');
        const items = ads.filter(ad => ad.category === category).slice(0, 4);
        items.forEach(ad => grid.appendChild(buildListingCard(ad)));
        container.appendChild(section);
    });
}

function renderClosingSoon(ads) {
    const grid = document.getElementById('closingSoonGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const soon = [...ads]
        .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
        .slice(0, 3);
    soon.forEach(ad => grid.appendChild(buildListingCard(ad)));
}

function rankCategories(ads) {
    const counts = new Map();
    ads.forEach(ad => {
        counts.set(ad.category, (counts.get(ad.category) || 0) + 1);
    });
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category);
}

function buildListingCard(ad) {
    const card = document.createElement('article');
    card.className = 'listing-card';
    const priceLabel = formatPriceRange(ad.priceMin, ad.priceMax);
    const timer = buildTimerBadge(ad.endsAt);
    card.innerHTML = `
        <div class="listing-card__media">
            <img src="${ad.image}" alt="${escapeHtml(ad.title)}" />
            <span class="listing-card__badge">${escapeHtml(ad.badge)}</span>
            <span class="listing-card__timer">${timer}</span>
        </div>
        <div class="listing-card__body">
            <div>
                <h3 class="listing-card__title">${escapeHtml(ad.title)}</h3>
                ${ad.subtitle ? `<div class="listing-card__location">${escapeHtml(ad.subtitle)}</div>` : ''}
            </div>
            <div class="listing-card__meta">
                <span>${escapeHtml(ad.account)}</span>
                <span>${formatDate(new Date(ad.createdAt))}</span>
            </div>
            <div class="listing-card__price">
                <span>Purchasing price</span>
                <strong>${priceLabel}</strong>
                <span>Highest price ${formatCurrency(ad.priceMax)}</span>
            </div>
            <div class="listing-card__actions">
                <span>${escapeHtml(ad.city)}</span>
                <div class="action-buttons">
                    <button type="button" class="icon-btn" title="Save"><i class="fas fa-star"></i></button>
                    <button type="button" class="icon-btn" title="Share"><i class="fas fa-share-nodes"></i></button>
                </div>
            </div>
        </div>
    `;
    return card;
}

function buildTimerBadge(endsAt) {
    const remaining = getRemainingTimeParts(endsAt);
    if (!remaining) return 'Live';
    return `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`;
}

function getRemainingTimeParts(endsAt) {
    if (!endsAt) return null;
    const now = Date.now();
    const target = new Date(endsAt).getTime();
    if (!Number.isFinite(target)) return null;
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
    const minutes = Math.floor((diff / (60 * 1000)) % 60);
    return { days, hours, minutes };
}

function formatPriceRange(min, max) {
    if (min && max && min !== max) {
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
    }
    if (max) return formatCurrency(max);
    if (min) return formatCurrency(min);
    return 'Request quote';
}

function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString('en-US')} R.S`;
}

function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function focusCategory(category) {
    const filtered = state.ads.filter(ad => ad.category === category);
    state.filteredAds = filtered.length ? filtered : state.ads;
    renderShowcaseSections(state.filteredAds);
    renderClosingSoon(state.filteredAds);
}

function wireSearch() {
    const input = document.getElementById('marketSearchInput');
    const button = document.getElementById('marketSearchBtn');
    if (!input) return;

    const apply = () => {
        const term = input.value.trim().toLowerCase();
        if (!term) {
            state.filteredAds = state.ads;
        } else {
            state.filteredAds = state.ads.filter(ad => {
                return [ad.title, ad.subtitle, ad.city, ad.category, ad.account]
                    .join(' ')
                    .toLowerCase()
                    .includes(term);
            });
        }
        renderShowcaseSections(state.filteredAds);
        renderClosingSoon(state.filteredAds);
    };

    input.addEventListener('input', debounce(apply, 200));
    input.addEventListener('search', apply);
    if (button) {
        button.addEventListener('click', apply);
    }
}

function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
    };
}

function generateId() {
    const random = Math.random().toString(36).slice(2, 10);
    const timestamp = Date.now().toString(36);
    return `ad-${timestamp}-${random}`;
}

function setupMarketplaceAuth() {
    const loginBtn = document.getElementById('marketLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'onruf-login.html';
        });
    }

    attachUserMenuInteractions();
    state.session = readMarketplaceSession();
    applyAuthState(state.session);
}

function readMarketplaceSession() {
    try {
        const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        console.warn('Unable to parse login session payload', error);
    }
    return null;
}

function applyAuthState(session) {
    const guestActions = document.getElementById('guestActions');
    const userMenu = document.getElementById('userMenu');
    state.session = session;
    if (!guestActions || !userMenu) {
        return;
    }

    if (session) {
        guestActions.classList.add('is-hidden');
        userMenu.classList.remove('is-hidden');
        updateUserMenuView(session);
        renderBusinessAccountsSection(session);
    } else {
        guestActions.classList.remove('is-hidden');
        userMenu.classList.add('is-hidden');
        closeUserMenu();
        renderBusinessAccountsSection(null);
    }
}

function updateUserMenuView(session) {
    const labelEl = document.getElementById('userMenuLabel');
    const roleEl = document.getElementById('userMenuRole');
    const fullNameEl = document.getElementById('userMenuFullName');
    const emailEl = document.getElementById('userMenuEmail');
    const avatarEl = document.querySelector('.user-menu__avatar');

    if (!session) {
        return;
    }

    const signupRecord = findSignupRecord(session.email);
    const account = findAccountBySession(session);

    const firstName = (signupRecord?.profile?.firstName || session.userName || '').trim();
    const labelText = firstName || (session.userName || 'Your account');
    const fullName = buildFullName(signupRecord, account, session);
    const emailText = session.email || signupRecord?.email || account?.email || '—';
    const initials = buildInitials(labelText);

    if (labelEl) {
        labelEl.textContent = labelText;
    }
    if (roleEl) {
        roleEl.textContent = '';
        roleEl.classList.add('is-hidden');
        roleEl.setAttribute('aria-hidden', 'true');
    }
    if (fullNameEl) {
        fullNameEl.textContent = fullName;
    }
    if (emailEl) {
        emailEl.textContent = emailText;
    }
    if (avatarEl) {
        avatarEl.textContent = initials || 'U';
    }

    closeUserMenu();
}

function attachUserMenuInteractions() {
    const trigger = document.getElementById('userMenuTrigger');
    if (trigger) {
        trigger.addEventListener('click', event => {
            event.preventDefault();
            if (!state.session) {
                window.location.href = 'onruf-login.html';
                return;
            }
            toggleUserMenu();
        });
    }

    const merchantBtn = document.getElementById('userMenuMerchantBtn');
    if (merchantBtn) {
        merchantBtn.addEventListener('click', () => {
            closeUserMenu();
            window.location.href = 'onruf-business-sign-up.html';
        });
    }

    const profileLinkBtn = document.getElementById('userMenuProfileLink');
    if (profileLinkBtn) {
        profileLinkBtn.addEventListener('click', () => {
            closeUserMenu();
            window.location.href = 'onruf-profile.html';
        });
    }

    const signOutBtn = document.getElementById('userMenuSignOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            closeUserMenu();
            try {
                sessionStorage.removeItem(LOGIN_SESSION_KEY);
            } catch (error) {
                console.warn('Unable to remove login session', error);
            }
            state.session = null;
            applyAuthState(null);
            window.location.href = 'onruf-login.html';
        });
    }

    document.addEventListener('click', handleUserMenuOutsideClick);
    document.addEventListener('keydown', handleUserMenuKeydown);
}

function attachSellShortcut() {
    const sellBtn = document.getElementById('sellNavButton');
    if (!sellBtn) {
        return;
    }
    sellBtn.addEventListener('click', () => {
        if (!state.session) {
            window.location.href = 'onruf-login.html';
            return;
        }
        window.location.href = 'onruf-add-product.html';
    });
}

function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) {
        return;
    }
    if (userMenu.classList.contains('is-open')) {
        closeUserMenu();
    } else {
        openUserMenu();
    }
}

function openUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const trigger = document.getElementById('userMenuTrigger');
    const dropdown = document.getElementById('userMenuDropdown');
    if (!userMenu || !trigger || !dropdown) {
        return;
    }
    userMenu.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.setAttribute('aria-hidden', 'false');
}

function closeUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const trigger = document.getElementById('userMenuTrigger');
    const dropdown = document.getElementById('userMenuDropdown');
    if (!userMenu || !trigger || !dropdown) {
        return;
    }
    userMenu.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
}

function handleUserMenuOutsideClick(event) {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu || !userMenu.classList.contains('is-open')) {
        return;
    }
    if (!userMenu.contains(event.target)) {
        closeUserMenu();
    }
}

function handleUserMenuKeydown(event) {
    if (event.key === 'Escape') {
        closeUserMenu();
    }
}

function findSignupRecord(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return null;
    }
    const records = loadDataset(SIGNUP_RECORDS_KEY);
    return records.find(entry => normalizeEmail(entry?.email) === normalizedEmail) || null;
}

function findAccountBySession(session) {
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
    const normalizedEmail = normalizeEmail(session.email);
    if (!normalizedEmail) {
        return null;
    }
    return accounts.find(entry => normalizeEmail(entry?.email) === normalizedEmail) || null;
}

function renderBusinessAccountsSection(session) {
    const section = document.getElementById('userMenuBusinessSection');
    const list = document.getElementById('userMenuBusinessList');
    if (!section || !list) {
        return;
    }

    const accounts = session ? getBusinessAccountsForEmail(session.email) : [];
    state.businessAccounts = accounts;
    list.innerHTML = '';

    if (!accounts.length) {
        section.classList.add('is-hidden');
        return;
    }

    section.classList.remove('is-hidden');

    accounts.forEach(account => {
        const item = document.createElement('div');
        item.className = 'business-account-item';

        const info = document.createElement('div');
        info.className = 'business-account-item__info';

        const nameEl = document.createElement('span');
        nameEl.className = 'business-account-item__name';
        nameEl.textContent = account.companyName || account.contactName || account.id || 'Business account';

        const statusEl = document.createElement('span');
        statusEl.className = 'business-account-item__status';
        statusEl.textContent = mapBusinessAccountStatus(account.status);

        info.appendChild(nameEl);
        info.appendChild(statusEl);

        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'business-account-item__action';
        actionBtn.textContent = 'Login';
        actionBtn.addEventListener('click', () => {
            handleBusinessAccountLogin(account);
        });

        item.appendChild(info);
        item.appendChild(actionBtn);
        list.appendChild(item);
    });
}

function getBusinessAccountsForEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return [];
    }
    const dataset = loadDataset(BUSINESS_ACCOUNTS_KEY);
    if (!dataset.length) {
        return [];
    }
    const filtered = dataset.filter(entry => normalizeEmail(entry?.email) === normalizedEmail);
    filtered.sort((a, b) => {
        const aStamp = getBusinessAccountSortValue(a);
        const bStamp = getBusinessAccountSortValue(b);
        return bStamp - aStamp;
    });
    return filtered;
}

function mapBusinessAccountStatus(status) {
    const normalized = String(status || '').toLowerCase();
    switch (normalized) {
        case 'active':
            return 'Active';
        case 'approved':
            return 'Approved';
        case 'pending':
            return 'Pending review';
        case 'docs-requested':
            return 'Documents requested';
        case 'suspended':
            return 'Suspended';
        default:
            return normalized ? titleCase(normalized) : 'Pending review';
    }
}

function isBusinessAccountApproved(account) {
    const status = String(account?.status || '').toLowerCase();
    return status === 'active' || status === 'approved';
}

function handleBusinessAccountLogin(account) {
    if (!account) {
        return;
    }
    closeUserMenu();
    if (!isBusinessAccountApproved(account)) {
        const statusLabel = mapBusinessAccountStatus(account.status);
        window.alert(`This business account is currently ${statusLabel}. We will notify you once it is ready to access.`);
        return;
    }

    const targetUrl = buildBusinessDashboardUrl(account);
    window.open(targetUrl, '_blank', 'noopener');
}

function buildBusinessDashboardUrl(account) {
    try {
        const url = new URL(BUSINESS_DASHBOARD_URL, window.location.href);
        if (account?.id) {
            url.searchParams.set('businessAccountId', account.id);
        }
        return url.toString();
    } catch (error) {
        console.warn('Unable to build business dashboard URL', error);
        return BUSINESS_DASHBOARD_URL;
    }
}

function getBusinessAccountSortValue(account) {
    const approved = safeDate(account?.approvedAt);
    const submitted = safeDate(account?.submittedAt);
    const target = approved || submitted;
    if (!target) {
        return 0;
    }
    const date = new Date(target);
    const time = date.getTime();
    return Number.isNaN(time) ? 0 : time;
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

function buildFullName(signupRecord, account, session) {
    const firstName = signupRecord?.profile?.firstName || '';
    const lastName = signupRecord?.profile?.lastName || '';
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) {
        return combined;
    }
    if (account?.fullName) {
        return account.fullName;
    }
    if (session?.userName) {
        return session.userName;
    }
    return 'Your ONRUF account';
}

function buildInitials(label) {
    if (!label) {
        return '';
    }
    const parts = label.split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return label.slice(0, 2).toUpperCase();
    }
    const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    return initials || label.slice(0, 2).toUpperCase();
}

function normalizeEmail(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLowerCase();
}

function titleCase(value) {
    return value
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function showComingSoon(featureName) {
    const message = `${featureName} will be available soon.`;
    window.alert(message);
}
