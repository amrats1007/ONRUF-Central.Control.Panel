(function () {
    'use strict';

    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
    const PRODUCT_ADS_KEY = 'onruf_product_ads_v1';
    const CATEGORIES_KEY = 'onruf_categories_v1';
    const SPECIFICATIONS_KEY = 'onruf_specifications_v1';
    const CHECKOUT_DRAFT_KEY = 'onruf_add_product_draft_v1';
    const EDIT_STEP_KEY = 'onruf_add_product_edit_step';
    const FLASH_MESSAGE_KEY = 'onruf_add_product_flash_v1';

    const TAX_RATE = 0.15;
    const DEFAULT_FIXED_FEE = 3;
    const DEFAULT_MEDIA_RULES = Object.freeze({
        freeImages: 3,
        freeVideos: 1,
        extraImageFee: 1,
        extraVideoFee: 1
    });
    const DEFAULT_SUBTITLE_FEE = 3;

    const FALLBACK_CATEGORIES = [
        {
            id: 'electronics',
            label: 'Electronics',
            children: [
                {
                    id: 'mobiles',
                    label: 'Mobiles',
                    children: [
                        { id: 'smartphones', label: 'Smartphones' },
                        { id: 'accessories', label: 'Accessories' }
                    ]
                },
                {
                    id: 'computers',
                    label: 'Computers',
                    children: [
                        { id: 'laptops', label: 'Laptops' },
                        { id: 'desktops', label: 'Desktops' }
                    ]
                }
            ]
        },
        {
            id: 'fashion',
            label: 'Fashion',
            children: [
                {
                    id: 'women-fashion',
                    label: 'Women',
                    children: [
                        { id: 'dresses', label: 'Dresses' },
                        { id: 'handbags', label: 'Handbags' }
                    ]
                },
                {
                    id: 'men-fashion',
                    label: 'Men',
                    children: [
                        { id: 'suits', label: 'Suits' },
                        { id: 'footwear', label: 'Footwear' }
                    ]
                }
            ]
        },
        {
            id: 'services',
            label: 'Services',
            children: [
                {
                    id: 'maintenance',
                    label: 'Maintenance',
                    children: [
                        { id: 'electronics-repair', label: 'Electronics repair' },
                        { id: 'home-repair', label: 'Home repair' }
                    ]
                }
            ]
        }
    ];

    const FALLBACK_SPECIFICATIONS = [];
    const SPECIFICATION_TYPE_ALIASES = new Map([
        ['dropdownlist', 'dropdownlist'],
        ['dropdown list', 'dropdownlist'],
        ['dropdown', 'dropdownlist'],
        ['list', 'dropdownlist'],
        ['select', 'dropdownlist'],
        ['short-text', 'short-text'],
        ['short text', 'short-text'],
        ['text', 'short-text'],
        ['long-text', 'long-text'],
        ['long text', 'long-text'],
        ['textarea', 'long-text'],
        ['paragraph', 'long-text'],
        ['number', 'number'],
        ['numeric', 'number'],
        ['radio', 'radio'],
        ['checkbox', 'checkbox'],
        ['boolean', 'checkbox'],
        ['document', 'document'],
        ['file', 'document']
    ]);
    const SPECIFICATION_TYPE_DEFAULT = 'short-text';

    const COUNTRY_OPTIONS = ['Saudi Arabia', 'United Arab Emirates', 'Bahrain'];
    const REGION_OPTIONS = {
        'Saudi Arabia': ['Riyadh Province', 'Makkah Province', 'Eastern Province'],
        'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
        Bahrain: ['Capital Governorate', 'Northern Governorate']
    };
    const CITY_OPTIONS = {
        'Riyadh Province': ['Riyadh', 'Al Kharj', 'Al Majmaah'],
        'Makkah Province': ['Jeddah', 'Makkah', 'Taif'],
        'Eastern Province': ['Dammam', 'Khobar', 'Dhahran'],
        Dubai: ['Dubai'],
        'Abu Dhabi': ['Abu Dhabi'],
        Sharjah: ['Sharjah'],
        'Capital Governorate': ['Manama'],
        'Northern Governorate': ['Jidhafs', 'Al Hidd']
    };

    const PAYMENT_METHODS = [
        { id: 'visa', label: 'Visa / Mastercard' },
        { id: 'mada', label: 'Mada' },
        { id: 'points', label: 'My points' }
    ];

    function generatePhotoId() {
        return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function generateVideoLinkId() {
        return `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function createVideoLinkEntry(value = '') {
        return {
            id: generateVideoLinkId(),
            value: typeof value === 'string' ? value.trim() : ''
        };
    }

    function cloneVideoLinks(values) {
        if (!Array.isArray(values)) {
            return [];
        }
        return values
            .map(entry => {
                if (typeof entry === 'string') {
                    const trimmed = entry.trim();
                    return trimmed ? createVideoLinkEntry(trimmed) : null;
                }
                if (entry && typeof entry === 'object') {
                    const value = typeof entry.value === 'string' ? entry.value.trim() : '';
                    if (!value) {
                        return null;
                    }
                    const id = typeof entry.id === 'string' ? entry.id : generateVideoLinkId();
                    return { id, value };
                }
                return null;
            })
            .filter(Boolean);
    }

    function exportVideoLinkValues() {
        if (!Array.isArray(state.videoLinks)) {
            return [];
        }
        return state.videoLinks
            .map(entry => (typeof entry?.value === 'string' ? entry.value.trim() : ''))
            .filter(Boolean);
    }

    const state = {
        session: null,
        categories: [],
        specifications: [],
        categoryPath: [],
        categoryOptionsByLevel: {},
        selectedCategory: null,
        selectedSubcategory: null,
        selectedChild: null,
        categoryLeaf: null,
        photos: [],
        activeSpecifications: [],
        specificationSelections: {},
        videoLinks: [],
        saleFees: {
            fixed: false,
            auction: false,
            negotiable: false
        },
        subtitleFee: DEFAULT_SUBTITLE_FEE,
        paymentMethods: new Set(['visa']),
        summary: {
            subtotal: 0,
            tax: 0,
            total: 0,
            points: 0
        },
        checkoutDraft: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        cacheElements();
        state.session = readSession();
        if (!state.session) {
            showGuard();
            return;
        }
        state.checkoutDraft = readCheckoutDraft();
        const draftPaymentMethods = state.checkoutDraft?.snapshot?.paymentMethods;
        state.paymentMethods = new Set(Array.isArray(draftPaymentMethods) && draftPaymentMethods.length ? draftPaymentMethods : ['visa']);
        state.categories = loadCategories();
        const savedCategoryPath = state.checkoutDraft?.snapshot?.categoryPathIds;
        if (Array.isArray(savedCategoryPath) && savedCategoryPath.length) {
            state.categoryPath = buildCategoryPathFromIds(savedCategoryPath);
        } else if (state.checkoutDraft?.snapshot?.category) {
            const legacyIds = legacyCategoryToIds(state.checkoutDraft.snapshot.category);
            state.categoryPath = buildCategoryPathFromIds(legacyIds);
        } else {
            state.categoryPath = [];
        }
        state.specifications = loadSpecifications();
        state.specificationSelections = {};
        renderCategoryLevels();
        syncCategoryStateFromPath();
    renderSpecificationFields();
        populateAddressOptions();
        populatePaymentToggles();
        bindEvents();
        renderVideoLinks();
        updatePhotoNextState();
        if (state.checkoutDraft?.snapshot) {
            restoreFormFromSnapshot(state.checkoutDraft.snapshot);
        }
        updateCategoryNextState();
        updateFeeSummary();
        updatePointsSummary();
        const pendingStep = consumePendingStepFocus();
        if (pendingStep) {
            openStep(pendingStep);
        }
        elements.main.hidden = false;
        if (elements.toast) {
            elements.toast.textContent = '';
        }
        showDeferredToast();
    }

    function cacheElements() {
        elements.main = document.getElementById('addProductMain');
        elements.guard = document.getElementById('addProductGuard');
        elements.toast = document.getElementById('addProductToast');
        elements.categoryForm = document.getElementById('categoryForm');
        elements.categoryLevels = document.getElementById('categoryLevels');
        elements.categoryNextBtn = document.getElementById('categoryNextBtn');
        elements.photoGuidance = document.getElementById('photoGuidance');
        elements.photoUpload = document.getElementById('photoUpload');
        elements.uploadGallery = document.getElementById('uploadGallery');
        elements.photoNextBtn = document.getElementById('photoNextBtn');
        elements.stepNextButtons = document.querySelectorAll('[data-step-next]');
        elements.videoLinkList = document.getElementById('videoLinkList');
        elements.videoLinkAddBtn = document.getElementById('videoLinkAddBtn');
        elements.specificationContainer = document.getElementById('itemSpecificationContainer');
        elements.specificationHint = document.getElementById('itemSpecificationHint');
        elements.specificationNextBtn = document.querySelector('.form-step[data-step="2"] [data-step-next]');
    elements.subtitleFeeHint = document.getElementById('subtitleFeeHint');
    elements.subtitleFeeValue = document.getElementById('subtitleFeeValue');
        elements.addressCountry = document.getElementById('addressCountry');
        elements.addressRegion = document.getElementById('addressRegion');
        elements.addressCity = document.getElementById('addressCity');
        elements.quantityInput = document.getElementById('itemQuantity');
        elements.quantityButtons = document.querySelectorAll('[data-quantity]');
        elements.saleFixedToggle = document.getElementById('saleFixedToggle');
        elements.saleAuctionToggle = document.getElementById('saleAuctionToggle');
        elements.saleNegotiableToggle = document.getElementById('saleNegotiableToggle');
        elements.pricePurchase = document.getElementById('pricePurchase');
        elements.priceMinimum = document.getElementById('priceMinimum');
        elements.priceBid = document.getElementById('priceBid');
        elements.auctionLength = document.getElementById('auctionLength');
        elements.auctionClosing = document.getElementById('auctionClosing');
        elements.paymentOptions = document.getElementById('paymentOptions');
        elements.feeFixed = document.getElementById('feeFixed');
        elements.feeNegotiable = document.getElementById('feeNegotiable');
        elements.feeAuction = document.getElementById('feeAuction');
        elements.feeSubtotal = document.getElementById('feeSubtotal');
        elements.feeTax = document.getElementById('feeTax');
        elements.feeTotal = document.getElementById('feeTotal');
        elements.feeUpdatedAt = document.getElementById('feeCardUpdatedAt');
        elements.publishBtn = document.getElementById('publishListingBtn');
        elements.pointsOutput = document.getElementById('pointsToApply');
        elements.profileBtn = document.getElementById('addProductProfileBtn');
        elements.signOutBtn = document.getElementById('addProductSignOutBtn');
        elements.paymentMethodList = document.getElementById('paymentMethodList');
        elements.form = document.getElementById('addProductForm');
        elements.packageAddBtn = document.getElementById('packageAddBtn');
        elements.packageSkipBtn = document.getElementById('packageSkipBtn');
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

    function showGuard() {
        if (elements.guard) {
            elements.guard.hidden = false;
        }
        if (elements.main) {
            elements.main.hidden = true;
        }
    }

    function loadCategories() {
        try {
            const raw = localStorage.getItem(CATEGORIES_KEY);
            if (!raw) {
                return FALLBACK_CATEGORIES.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.length) {
                return FALLBACK_CATEGORIES.slice();
            }
            return normalizeCategoryTree(parsed);
        } catch (error) {
            console.warn('Unable to read categories dataset', error);
            return FALLBACK_CATEGORIES.slice();
        }
    }

    function loadSpecifications() {
        try {
            const raw = localStorage.getItem(SPECIFICATIONS_KEY);
            if (!raw) {
                return FALLBACK_SPECIFICATIONS.slice();
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.length) {
                return FALLBACK_SPECIFICATIONS.slice();
            }
            return parsed
                .map((entry, index) => normalizeSpecificationEntry(entry, index))
                .filter(Boolean);
        } catch (error) {
            console.warn('Unable to read specifications dataset', error);
            return FALLBACK_SPECIFICATIONS.slice();
        }
    }

    function normalizeSpecificationEntry(entry, index) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const fallbackIndex = Number.isInteger(index) && index >= 0 ? index : 0;
        const fallbackId = `SPEC-${String(fallbackIndex + 1).padStart(3, '0')}`;

        const extractIdCandidate = value => (typeof value === 'string' ? value.trim().toUpperCase() : '');
        const id = extractIdCandidate(entry.id)
            || extractIdCandidate(entry.specificationId)
            || extractIdCandidate(entry.specificationCode)
            || fallbackId;

        const nameEnglish = extractTextCandidate([
            entry.nameEnglish,
            entry.englishName,
            entry.name,
            entry.title,
            entry.label
        ]);
        const nameArabic = extractTextCandidate([
            entry.nameArabic,
            entry.arabicName,
            entry.titleArabic,
            entry.name_ar
        ]);
        const displayName = composeSpecificationLabel(nameEnglish, nameArabic, id);

        const description = extractTextCandidate([
            entry.descriptionEnglish,
            entry.description,
            entry.descriptionArabic,
            entry.description_en,
            entry.description_ar
        ]);
        const placeholder = extractTextCandidate([
            entry.placeholderEnglish,
            entry.placeholder,
            entry.placeholderArabic,
            entry.placeholder_en,
            entry.placeholder_ar
        ]);

        const dataType = normalizeSpecificationType(entry.dataType ?? entry.type);
        const isRequired = normalizeSpecificationRequired(entry);
        const categoryIds = sanitizeSpecificationCategorySelection(
            entry.categoryIds ?? entry.categories ?? entry.category
        );
        const subSpecifications = sanitizeSubSpecificationEntries(
            entry.subSpecifications ?? entry.subSpecificationOptions ?? entry.subSpecs
        );

        return {
            id,
            dataType,
            isRequired,
            nameEnglish,
            nameArabic,
            displayName,
            description,
            placeholder,
            categoryIds,
            subSpecifications
        };
    }

    function extractTextCandidate(candidates) {
        if (!Array.isArray(candidates)) {
            return '';
        }
        for (const candidate of candidates) {
            if (typeof candidate === 'string') {
                const trimmed = candidate.trim();
                if (trimmed) {
                    return trimmed;
                }
            }
        }
        return '';
    }

    function composeSpecificationLabel(english, arabic, fallback) {
        const safeEnglish = typeof english === 'string' ? english.trim() : '';
        const safeArabic = typeof arabic === 'string' ? arabic.trim() : '';
        if (safeEnglish && safeArabic && safeEnglish !== safeArabic) {
            return `${safeEnglish} / ${safeArabic}`;
        }
        return safeEnglish || safeArabic || (typeof fallback === 'string' ? fallback : '');
    }

    function normalizeSpecificationType(value) {
        if (typeof value !== 'string') {
            return SPECIFICATION_TYPE_DEFAULT;
        }
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            return SPECIFICATION_TYPE_DEFAULT;
        }
        return SPECIFICATION_TYPE_ALIASES.get(normalized) || SPECIFICATION_TYPE_DEFAULT;
    }

    function normalizeSpecificationRequired(entry) {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        if (typeof entry.isRequired === 'boolean') {
            return entry.isRequired;
        }
        if (typeof entry.required === 'boolean') {
            return entry.required;
        }
        if (typeof entry.required === 'string') {
            const normalized = entry.required.trim().toLowerCase();
            if (!normalized) {
                return false;
            }
            return ['true', 'yes', '1', 'required'].includes(normalized);
        }
        if (typeof entry.required === 'number') {
            return entry.required !== 0;
        }
        return false;
    }

    function sanitizeSpecificationCategorySelection(value) {
        const collected = [];
        const append = candidate => {
            if (candidate == null) {
                return;
            }
            if (Array.isArray(candidate)) {
                candidate.forEach(append);
                return;
            }
            if (typeof candidate === 'string') {
                candidate
                    .split(/[;,]/)
                    .map(part => part.trim())
                    .filter(Boolean)
                    .forEach(item => collected.push(item));
                return;
            }
            if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                collected.push(String(candidate));
                return;
            }
        };

        append(value);
        const seen = new Set();
        return collected.filter(item => {
            const lowered = item.toLowerCase();
            if (seen.has(lowered)) {
                return false;
            }
            seen.add(lowered);
            return true;
        });
    }

    function sanitizeSubSpecificationEntries(entries) {
        if (!entries) {
            return [];
        }
        const raw = Array.isArray(entries)
            ? entries
            : typeof entries === 'string'
                ? entries.split(/[;,]/)
                : [];

        const seen = new Set();
        return raw
            .map((entry, index) => {
                if (entry == null) {
                    return null;
                }
                let value = '';
                let nameEnglish = '';
                let nameArabic = '';

                if (typeof entry === 'string') {
                    nameEnglish = entry.trim();
                    value = nameEnglish;
                } else if (typeof entry === 'object') {
                    nameEnglish = extractTextCandidate([
                        entry.nameEnglish,
                        entry.englishName,
                        entry.label,
                        entry.value,
                        entry.name
                    ]);
                    nameArabic = extractTextCandidate([
                        entry.nameArabic,
                        entry.arabicName
                    ]);
                    value = extractTextCandidate([
                        entry.id,
                        entry.value,
                        entry.code
                    ]);
                }

                if (!value) {
                    value = nameEnglish || nameArabic || `option-${index + 1}`;
                }

                const lowered = value.toLowerCase();
                if (seen.has(lowered)) {
                    let deduplicated = `${value}-${index + 1}`;
                    while (seen.has(deduplicated.toLowerCase())) {
                        deduplicated = `${value}-${Math.random().toString(36).slice(2, 6)}`;
                    }
                    value = deduplicated;
                }
                seen.add(value.toLowerCase());

                const label = composeSpecificationLabel(nameEnglish, nameArabic, value);
                return {
                    id: value,
                    value,
                    label,
                    nameEnglish,
                    nameArabic
                };
            })
            .filter(Boolean);
    }

    function normalizeCategoryTree(entries) {
        if (!Array.isArray(entries) || !entries.length) {
            return FALLBACK_CATEGORIES.slice();
        }

        const knownIds = new Set();
        entries.forEach(entry => {
            const normalizedId = extractCategoryId(entry?.id);
            if (normalizedId) {
                knownIds.add(normalizedId);
            }
        });

        const nodes = [];
        const byId = new Map();
        const byCode = new Map();

        entries.forEach(entry => {
            if (!entry) {
                return;
            }

            const id = extractCategoryId(entry.id);
            if (!id) {
                return;
            }

            const code = normalizeCategoryCode(entry.categoryCode);
            const label = buildCategoryLabel(entry, code);
            const parentCandidate = resolveParentCandidate(entry, knownIds);
            const mediaRules = extractCategoryMediaRules(entry);
            const subtitleFee = extractCategorySubtitleFee(entry);

            const node = {
                id,
                label,
                code,
                parentCandidate,
                parentId: null,
                children: [],
                mediaRules,
                subtitleFee
            };

            nodes.push(node);
            byId.set(id, node);
            if (code) {
                byCode.set(code, node);
            }
        });

        const roots = [];

        nodes.forEach(node => {
            let parentNode = null;

            if (node.parentCandidate && byId.has(node.parentCandidate)) {
                parentNode = byId.get(node.parentCandidate);
            }

            if (!parentNode && node.code) {
                const parentCode = deriveParentCategoryCode(node.code);
                if (parentCode && byCode.has(parentCode)) {
                    parentNode = byCode.get(parentCode);
                }
            }

            if (parentNode && parentNode !== node) {
                node.parentId = parentNode.id;
                parentNode.children.push(node);
            } else {
                node.parentId = null;
                roots.push(node);
            }

            delete node.parentCandidate;
        });

        if (!roots.length) {
            return FALLBACK_CATEGORIES.slice();
        }

        sortCategoryNodes(roots);

        return roots;
    }

    function extractCategoryId(value) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || '';
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        return '';
    }

    function resolveParentCandidate(entry, knownIds) {
        if (!entry || typeof entry !== 'object') {
            return '';
        }

        const prioritized = [
            entry.parentCategoryId,
            entry.parentCategoryID,
            entry.parentId,
            entry.parentID
        ];

        for (const candidate of prioritized) {
            const normalized = extractCategoryId(candidate);
            if (normalized && (knownIds.has(normalized) || /^CAT-\d{3,}$/i.test(normalized))) {
                return normalized;
            }
        }

        if (entry.parentCategory && typeof entry.parentCategory === 'object') {
            const nested = resolveParentCandidate(entry.parentCategory, knownIds);
            if (nested) {
                return nested;
            }
        }

        if (typeof entry.parentCategory === 'string') {
            const nestedFromString = extractCategoryId(entry.parentCategory);
            if (nestedFromString && (knownIds.has(nestedFromString) || /^CAT-\d{3,}$/i.test(nestedFromString))) {
                return nestedFromString;
            }
        }

        const fallback = extractCategoryId(entry.parent);
        if (fallback && (knownIds.has(fallback) || /^CAT-\d{3,}$/i.test(fallback))) {
            return fallback;
        }

        return '';
    }

    function normalizeCategoryCode(code) {
        if (typeof code !== 'string') {
            return '';
        }
        const trimmed = code.trim();
        if (!trimmed) {
            return '';
        }
        const numericPattern = /^\d+(\.\d+)*\.?$/;
        if (numericPattern.test(trimmed)) {
            return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
        }
        return trimmed;
    }

    function deriveParentCategoryCode(code) {
        if (typeof code !== 'string') {
            return '';
        }
        const normalized = normalizeCategoryCode(code);
        if (!normalized) {
            return '';
        }
        const segments = normalized.split('.').filter(Boolean);
        if (segments.length <= 1) {
            return '';
        }
        segments.pop();
        return `${segments.join('.')}.`;
    }

    function parseNonNegativeInteger(value) {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        const source = typeof value === 'string' ? value.replace(/[^0-9-]/g, '') : value;
        const parsed = Number.parseInt(source, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }

    function parseNonNegativeNumber(value) {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        const source = typeof value === 'string' ? value.replace(/[^0-9.-]/g, '') : value;
        const parsed = Number.parseFloat(source);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }

    function pickFirstValidNumber(candidates, parser) {
        if (!Array.isArray(candidates)) {
            return null;
        }
        for (const candidate of candidates) {
            const parsed = parser(candidate);
            if (parsed !== null) {
                return parsed;
            }
        }
        return null;
    }

    function extractCategoryMediaRules(entry) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const freeImages = pickFirstValidNumber([
            entry.freeProductImagesCount,
            entry.freeImagesCount,
            entry.freeImages,
            entry.freeProductImages,
            entry.freeImagesPerAd,
            entry.freeProductImageCount
        ], parseNonNegativeInteger);

        const freeVideos = pickFirstValidNumber([
            entry.freeProductVideosCount,
            entry.freeVideoLinksCount,
            entry.freeVideos,
            entry.freeProductVideos,
            entry.freeVideoLinks,
            entry.freeVideosPerAd,
            entry.freeProductVideoCount
        ], parseNonNegativeInteger);

        const extraImageFee = pickFirstValidNumber([
            entry.extraProductImageFee,
            entry.additionalImageFee,
            entry.additionalImageFees,
            entry.productImageFee,
            entry.additionalImageCost
        ], parseNonNegativeNumber);

        const extraVideoFee = pickFirstValidNumber([
            entry.extraProductVideoFee,
            entry.additionalVideoFee,
            entry.additionalVideoLinkFee,
            entry.additionalVideoLinkFees,
            entry.productVideoFee,
            entry.additionalVideoCost
        ], parseNonNegativeNumber);

        if (freeImages === null && freeVideos === null && extraImageFee === null && extraVideoFee === null) {
            return null;
        }

        return {
            freeImages,
            freeVideos,
            extraImageFee,
            extraVideoFee
        };
    }

    function extractCategorySubtitleFee(entry) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }
        const candidates = [
            entry.subtitleFee,
            entry.subtitleFees,
            entry.subtitleFeeAmount,
            entry.subtitleFeeValue,
            entry.subtitleFeeSar,
            entry.subtitleFeeSAR,
            entry.subtitle_fee,
            entry.subTitleFee
        ];
        return pickFirstValidNumber(candidates, parseNonNegativeNumber);
    }

    function buildCategoryLabel(entry, code) {
        const candidates = [
            entry?.nameEnglish,
            entry?.labelEnglish,
            entry?.displayName,
            entry?.nameArabic,
            entry?.title,
            entry?.label,
            entry?.categoryCode,
            entry?.id
        ];

        let baseLabel = '';
        for (const candidate of candidates) {
            const normalized = extractCategoryId(candidate);
            if (normalized) {
                baseLabel = normalized;
                break;
            }
        }

        if (!baseLabel) {
            baseLabel = 'Category';
        }

        if (code) {
            const lowercaseLabel = baseLabel.toLowerCase();
            const lowercaseCode = code.toLowerCase();
            if (!lowercaseLabel.startsWith(lowercaseCode)) {
                return `${code} ${baseLabel}`.trim();
            }
        }

        return baseLabel;
    }

    function sortCategoryNodes(nodes) {
        if (!Array.isArray(nodes)) {
            return;
        }
        nodes.sort(compareCategoryNodes);
        nodes.forEach(node => {
            if (Array.isArray(node.children) && node.children.length) {
                sortCategoryNodes(node.children);
            }
        });
    }

    function compareCategoryNodes(a, b) {
        const aCode = typeof a.code === 'string' ? a.code : '';
        const bCode = typeof b.code === 'string' ? b.code : '';

        if (aCode || bCode) {
            return aCode.localeCompare(bCode, undefined, { numeric: true, sensitivity: 'base' });
        }

        const aLabel = typeof a.label === 'string' ? a.label : '';
        const bLabel = typeof b.label === 'string' ? b.label : '';
        return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
    }

    function getCategoryMediaRules(categoryNode) {
        const rules = categoryNode && typeof categoryNode === 'object' ? categoryNode.mediaRules || {} : {};
        const freeImages = parseNonNegativeInteger(rules.freeImages);
        const freeVideos = parseNonNegativeInteger(rules.freeVideos);
        const extraImageFee = parseNonNegativeNumber(rules.extraImageFee);
        const extraVideoFee = parseNonNegativeNumber(rules.extraVideoFee);

        return {
            freeImages: freeImages !== null ? freeImages : DEFAULT_MEDIA_RULES.freeImages,
            freeVideos: freeVideos !== null ? freeVideos : DEFAULT_MEDIA_RULES.freeVideos,
            extraImageFee: extraImageFee !== null ? extraImageFee : DEFAULT_MEDIA_RULES.extraImageFee,
            extraVideoFee: extraVideoFee !== null ? extraVideoFee : DEFAULT_MEDIA_RULES.extraVideoFee
        };
    }

    function formatFeeAmount(amount) {
        const parsed = parseNonNegativeNumber(amount);
        const value = parsed !== null ? parsed : 0;
        const formatOptions = value % 1 === 0
            ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
            : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        return `${value.toLocaleString('en-US', formatOptions)} SAR`;
    }

    function getSubtitleFeeForCategoryPath() {
        const path = Array.isArray(state.categoryPath) ? state.categoryPath : [];
        for (let index = path.length - 1; index >= 0; index -= 1) {
            const candidate = path[index];
            const fee = parseNonNegativeNumber(candidate && candidate.subtitleFee);
            if (fee !== null) {
                return fee;
            }
        }
        return null;
    }

    function updateSubtitleFeeHint() {
        const hint = elements.subtitleFeeHint;
        if (!hint) {
            return;
        }
        const valueNode = elements.subtitleFeeValue;
        const resolvedFee = getSubtitleFeeForCategoryPath();
        const effectiveFee = resolvedFee !== null ? resolvedFee : DEFAULT_SUBTITLE_FEE;
        state.subtitleFee = effectiveFee;
        const label = formatFeeAmount(effectiveFee);
        if (valueNode) {
            valueNode.textContent = label;
        } else {
            hint.textContent = `Please Note That Adding A Subtitle To Your Product Ad Will Cost You ${label}.`;
        }
    }

    function populateAddressOptions() {
        if (!elements.addressCountry) {
            return;
        }
        elements.addressCountry.innerHTML = '<option value="">Choose country</option>' + COUNTRY_OPTIONS.map(country => `<option value="${country}">${escapeHtml(country)}</option>`).join('');
        elements.addressRegion.innerHTML = '<option value="">Choose region</option>';
        elements.addressCity.innerHTML = '<option value="">Choose city</option>';
    }

    function populatePaymentToggles() {
        if (!elements.paymentMethodList) {
            return;
        }
        elements.paymentMethodList.innerHTML = PAYMENT_METHODS.map(method => {
            const checked = state.paymentMethods.has(method.id) ? 'checked' : '';
            return `
                <label class="toggle-item">
                    <span>${escapeHtml(method.label)}</span>
                    <label class="switch">
                        <input type="checkbox" data-payment-toggle="${method.id}" ${checked} />
                        <span class="slider"></span>
                    </label>
                </label>
            `;
        }).join('');
    }

    function toDomSafeFragment(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'spec';
    }

    function buildSpecElementId(specId, suffix) {
        const base = toDomSafeFragment(specId);
        const fragment = suffix ? `-${toDomSafeFragment(suffix)}` : '';
        return `spec-${base}${fragment}`;
    }

    function getSpecDomKeyById(specId) {
        return buildSpecElementId(specId, 'field');
    }

    function buildPlaceholderAttribute(value) {
        const trimmed = typeof value === 'string' ? value.trim() : '';
        return trimmed ? ` placeholder="${escapeHtml(trimmed)}"` : '';
    }

    function getActiveSpecificationById(specId) {
        if (!specId || !Array.isArray(state.activeSpecifications)) {
            return null;
        }
        return state.activeSpecifications.find(entry => entry && entry.id === specId) || null;
    }

    function getSpecificationOptionByValue(spec, value) {
        if (!spec || !Array.isArray(spec.subSpecifications)) {
            return null;
        }
        return spec.subSpecifications.find(option => option && option.value === value) || null;
    }

    function sanitizeStringArray(values) {
        if (!Array.isArray(values)) {
            return [];
        }
        return values
            .map(entry => {
                if (entry === null || entry === undefined) {
                    return '';
                }
                if (typeof entry === 'string') {
                    return entry.trim();
                }
                return String(entry).trim();
            })
            .filter(Boolean);
    }

    function renderSpecificationFields() {
        if (!elements.specificationContainer) {
            return;
        }
        const container = elements.specificationContainer;
        const hint = elements.specificationHint;
        const hasSpecifications = Array.isArray(state.specifications) && state.specifications.length;

        if (!hasSpecifications) {
            container.innerHTML = '<p class="specification-empty">No specifications are configured for this marketplace yet.</p>';
            state.activeSpecifications = [];
            if (hint) {
                hint.textContent = 'No specifications are configured for this category yet.';
            }
            updateItemSpecificationNextState();
            return;
        }

        const categoryIds = Array.isArray(state.categoryPath)
            ? state.categoryPath.map(node => node && node.id).filter(Boolean)
            : [];

        if (!categoryIds.length) {
            container.innerHTML = '';
            state.activeSpecifications = [];
            if (hint) {
                hint.textContent = 'Select a category to load the required item details.';
            }
            updateItemSpecificationNextState();
            return;
        }

        const specificationsForPath = getSpecificationsForCategoryPath(categoryIds);
        state.activeSpecifications = specificationsForPath;

        if (!specificationsForPath.length) {
            container.innerHTML = '<p class="specification-empty">No additional item details are required for this category.</p>';
            if (hint) {
                hint.textContent = 'No additional item details are required for this category.';
            }
            updateItemSpecificationNextState();
            return;
        }

        if (hint) {
            hint.textContent = 'Fill in the specifications required for this category.';
        }

        const activeIds = new Set(specificationsForPath.map(spec => spec.id));
        Object.keys(state.specificationSelections || {}).forEach(id => {
            if (!activeIds.has(id)) {
                delete state.specificationSelections[id];
            }
        });

        const markup = specificationsForPath
            .map((spec, index) => buildSpecificationFieldMarkup(spec, index))
            .join('');
        container.innerHTML = markup;
        applySpecificationSelections();
        updateItemSpecificationNextState();
    }

    function getSpecificationsForCategoryPath(categoryIds) {
        if (!Array.isArray(state.specifications) || !state.specifications.length) {
            return [];
        }
        const pathSet = new Set(categoryIds);
        const seen = new Set();
        const matches = [];
        state.specifications.forEach((spec, index) => {
            if (!spec || seen.has(spec.id)) {
                return;
            }
            const links = Array.isArray(spec.categoryIds) ? spec.categoryIds : [];
            const isGlobal = !links.length;
            const intersects = links.some(link => pathSet.has(link));
            if (!isGlobal && !intersects) {
                return;
            }
            seen.add(spec.id);
            matches.push({ spec, order: index });
        });
        return matches
            .sort((a, b) => {
                if (a.order !== b.order) {
                    return a.order - b.order;
                }
                return a.spec.displayName.localeCompare(b.spec.displayName, undefined, { sensitivity: 'base' });
            })
            .map(entry => entry.spec);
    }

    function buildSpecificationFieldMarkup(spec, index) {
        const specIdAttr = escapeHtml(spec.id);
        const specKey = getSpecDomKeyById(spec.id);
        const baseId = buildSpecElementId(spec.id, `field-${index + 1}`);
        const labelId = `${baseId}-label`;
        const requiredAttr = spec.isRequired ? ' data-spec-required="true"' : ' data-spec-required="false"';
        const requiredBadge = spec.isRequired ? '<span class="specification-required">*</span>' : '';
        const descriptionHtml = spec.description ? `<p class="specification-description">${escapeHtml(spec.description)}</p>` : '';
        const errorHtml = `<p class="specification-error" data-spec-error="${specKey}"></p>`;
        const placeholderAttr = buildPlaceholderAttribute(spec.placeholder);
        const ariaRequired = spec.isRequired ? ' aria-required="true"' : '';

        if (spec.dataType === 'long-text') {
            return `
                <div class="specification-field" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                    <label class="specification-label" id="${labelId}" for="${baseId}-input">${escapeHtml(spec.displayName)}${requiredBadge}</label>
                    ${descriptionHtml}
                    <textarea id="${baseId}-input" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="long-text"${ariaRequired}${placeholderAttr}></textarea>
                    ${errorHtml}
                </div>
            `;
        }

        if (spec.dataType === 'number') {
            return `
                <div class="specification-field" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                    <label class="specification-label" id="${labelId}" for="${baseId}-input">${escapeHtml(spec.displayName)}${requiredBadge}</label>
                    ${descriptionHtml}
                    <input type="number" id="${baseId}-input" inputmode="decimal" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="number"${ariaRequired}${placeholderAttr} />
                    ${errorHtml}
                </div>
            `;
        }

        if (spec.dataType === 'dropdownlist' && Array.isArray(spec.subSpecifications) && spec.subSpecifications.length) {
            const options = spec.subSpecifications.map(option => `
                <option value="${escapeHtml(option.value)}" data-option-label="${escapeHtml(option.label)}">${escapeHtml(option.label)}</option>
            `).join('');
            return `
                <div class="specification-field" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                    <label class="specification-label" id="${labelId}" for="${baseId}-select">${escapeHtml(spec.displayName)}${requiredBadge}</label>
                    ${descriptionHtml}
                    <select id="${baseId}-select" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="dropdownlist"${ariaRequired}>
                        <option value="">Select an option</option>
                        ${options}
                    </select>
                    ${errorHtml}
                </div>
            `;
        }

        if (spec.dataType === 'radio' && Array.isArray(spec.subSpecifications) && spec.subSpecifications.length) {
            const groupName = buildSpecElementId(spec.id, 'choice');
            const options = spec.subSpecifications.map((option, optionIndex) => {
                const optionId = `${baseId}-option-${optionIndex + 1}`;
                return `
                    <label class="specification-option" for="${optionId}">
                        <input type="radio" id="${optionId}" name="${groupName}" value="${escapeHtml(option.value)}" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="radio" data-spec-option-label="${escapeHtml(option.label)}"${ariaRequired} />
                        <span>${escapeHtml(option.label)}</span>
                    </label>
                `;
            }).join('');
            const groupAriaRequired = spec.isRequired ? ' aria-required="true"' : '';
            return `
                <div class="specification-field specification-field--options" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                    <span class="specification-label" id="${labelId}">${escapeHtml(spec.displayName)}${requiredBadge}</span>
                    ${descriptionHtml}
                    <div class="specification-options" role="radiogroup" aria-labelledby="${labelId}"${groupAriaRequired}>
                        ${options}
                    </div>
                    ${errorHtml}
                </div>
            `;
        }

        if (spec.dataType === 'checkbox' && Array.isArray(spec.subSpecifications) && spec.subSpecifications.length) {
            const groupName = buildSpecElementId(spec.id, 'choice');
            const options = spec.subSpecifications.map((option, optionIndex) => {
                const optionId = `${baseId}-option-${optionIndex + 1}`;
                return `
                    <label class="specification-option" for="${optionId}">
                        <input type="checkbox" id="${optionId}" name="${groupName}" value="${escapeHtml(option.value)}" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="checkbox" data-spec-option-label="${escapeHtml(option.label)}" />
                        <span>${escapeHtml(option.label)}</span>
                    </label>
                `;
            }).join('');
            const groupAriaRequired = spec.isRequired ? ' aria-required="true"' : '';
            return `
                <div class="specification-field specification-field--options" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                    <span class="specification-label" id="${labelId}">${escapeHtml(spec.displayName)}${requiredBadge}</span>
                    ${descriptionHtml}
                    <div class="specification-options" role="group" aria-labelledby="${labelId}"${groupAriaRequired}>
                        ${options}
                    </div>
                    ${errorHtml}
                </div>
            `;
        }

        if (spec.dataType === 'document') {
            return `
                <div class="specification-field" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                    <label class="specification-label" id="${labelId}" for="${baseId}-file">${escapeHtml(spec.displayName)}${requiredBadge}</label>
                    ${descriptionHtml}
                    <input type="file" id="${baseId}-file" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="document"${ariaRequired} />
                    ${errorHtml}
                </div>
            `;
        }

        return `
            <div class="specification-field" data-spec-field="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}"${requiredAttr}>
                <label class="specification-label" id="${labelId}" for="${baseId}-input">${escapeHtml(spec.displayName)}${requiredBadge}</label>
                ${descriptionHtml}
                <input type="text" id="${baseId}-input" data-spec-control="true" data-spec-key="${specKey}" data-spec-id="${specIdAttr}" data-spec-type="short-text" autocomplete="off"${ariaRequired}${placeholderAttr} />
                ${errorHtml}
            </div>
        `;
    }

    function applySpecificationSelections() {
        if (!elements.specificationContainer || !Array.isArray(state.activeSpecifications)) {
            return;
        }
        const selections = state.specificationSelections || {};
        state.activeSpecifications.forEach(spec => {
            const selection = selections[spec.id];
            if (!selection) {
                setSpecificationFieldValidity(spec.id, true);
                return;
            }
            const field = findSpecificationField(spec.id);
            if (!field) {
                return;
            }
            switch (spec.dataType) {
                case 'dropdownlist': {
                    const select = field.querySelector('select[data-spec-control]');
                    if (select) {
                        select.value = typeof selection.value === 'string' ? selection.value : '';
                    }
                    break;
                }
                case 'radio': {
                    const value = typeof selection.value === 'string' ? selection.value : '';
                    field.querySelectorAll('input[type="radio"][data-spec-control]').forEach(input => {
                        input.checked = input.value === value;
                    });
                    break;
                }
                case 'checkbox': {
                    const values = new Set(sanitizeStringArray(selection.values));
                    field.querySelectorAll('input[type="checkbox"][data-spec-control]').forEach(input => {
                        input.checked = values.has(input.value);
                    });
                    break;
                }
                case 'document': {
                    // File inputs cannot be pre-filled for security reasons; nothing to restore.
                    break;
                }
                case 'long-text':
                case 'short-text':
                case 'number':
                default: {
                    const control = field.querySelector('[data-spec-control]');
                    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
                        control.value = typeof selection.value === 'string' ? selection.value : '';
                    }
                    break;
                }
            }
            const isValid = isSpecificationResponseValid(spec, selection);
            const message = getSpecificationErrorMessage(spec);
            setSpecificationFieldValidity(spec.id, spec.isRequired ? isValid : true, message);
        });
        updateItemSpecificationNextState();
    }

    function getSpecificationSelection(specId) {
        if (!state.specificationSelections) {
            return null;
        }
        return state.specificationSelections[specId] || null;
    }

    function setSpecificationSelection(specId, type, payload = {}) {
        if (!specId) {
            return;
        }
        const canonicalType = normalizeSpecificationType(type);
        const selection = { type: canonicalType };
        if (canonicalType === 'checkbox') {
            selection.values = sanitizeStringArray(payload.values || []);
            selection.labels = sanitizeStringArray(payload.labels || []);
        } else if (canonicalType === 'document') {
            selection.files = sanitizeStringArray(payload.files || []);
        } else {
            const value = typeof payload.value === 'string' ? payload.value.trim() : '';
            selection.value = value;
            if (payload.label !== undefined && payload.label !== null) {
                selection.label = typeof payload.label === 'string' ? payload.label.trim() : String(payload.label).trim();
            }
        }
        state.specificationSelections = state.specificationSelections || {};
        state.specificationSelections[specId] = selection;
    }

    function handleSpecificationFieldInput(event) {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.dataset.specId) {
            return;
        }
        const specId = target.dataset.specId;
        const specType = target.dataset.specType;
        if (!specId || !specType) {
            return;
        }
        if (specType === 'short-text' || specType === 'long-text' || specType === 'number') {
            const value = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
                ? target.value.trim()
                : '';
            setSpecificationSelection(specId, specType, { value });
            evaluateSpecificationValidity(specId);
        }
    }

    function handleSpecificationFieldChange(event) {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.dataset.specId) {
            return;
        }
        const specId = target.dataset.specId;
        const specType = target.dataset.specType;
        if (!specId || !specType) {
            return;
        }
        if (specType === 'dropdownlist' && target instanceof HTMLSelectElement) {
            const value = target.value.trim();
            const selectedOption = target.selectedOptions && target.selectedOptions[0];
            const label = selectedOption ? (selectedOption.dataset.optionLabel || selectedOption.textContent || value) : '';
            setSpecificationSelection(specId, specType, { value, label });
            evaluateSpecificationValidity(specId);
            return;
        }
        if (specType === 'radio' && target instanceof HTMLInputElement) {
            const value = target.value;
            const label = target.dataset.specOptionLabel || (target.nextElementSibling ? target.nextElementSibling.textContent : value) || value;
            setSpecificationSelection(specId, specType, { value, label });
            evaluateSpecificationValidity(specId);
            return;
        }
        if (specType === 'checkbox' && target instanceof HTMLInputElement) {
            const field = findSpecificationField(specId);
            if (!field) {
                return;
            }
            const inputs = Array.from(field.querySelectorAll('input[type="checkbox"][data-spec-control]'));
            const values = [];
            const labels = [];
            inputs.forEach(input => {
                if (input.checked) {
                    values.push(input.value);
                    const optionLabel = input.dataset.specOptionLabel || (input.nextElementSibling ? input.nextElementSibling.textContent : input.value) || input.value;
                    labels.push(optionLabel);
                }
            });
            setSpecificationSelection(specId, specType, { values, labels });
            evaluateSpecificationValidity(specId);
            return;
        }
        if (specType === 'document' && target instanceof HTMLInputElement) {
            const files = target.files ? Array.from(target.files).map(file => file.name) : [];
            setSpecificationSelection(specId, specType, { files });
            evaluateSpecificationValidity(specId);
            return;
        }
        if (specType === 'number' && target instanceof HTMLInputElement) {
            const value = target.value.trim();
            setSpecificationSelection(specId, specType, { value });
            evaluateSpecificationValidity(specId);
        }
    }

    function focusSpecificationInput(specId) {
        const field = findSpecificationField(specId);
        if (!field) {
            return;
        }
        const focusable = field.querySelector('[data-spec-control]');
        if (focusable instanceof HTMLElement) {
            focusable.focus();
        }
    }

    function findSpecificationField(specId) {
        if (!elements.specificationContainer) {
            return null;
        }
        const key = getSpecDomKeyById(specId);
        return elements.specificationContainer.querySelector(`[data-spec-field][data-spec-key="${key}"]`);
    }

    function setSpecificationFieldValidity(specId, isValid, message) {
        const field = findSpecificationField(specId);
        if (!field) {
            return;
        }
        field.classList.toggle('has-error', !isValid);
        const errorNode = field.querySelector('.specification-error');
        if (errorNode) {
            errorNode.textContent = isValid ? '' : (message || 'This field is required.');
        }
    }

    function evaluateSpecificationValidity(specId) {
        const spec = getActiveSpecificationById(specId);
        if (!spec) {
            return;
        }
        const selection = getSpecificationSelection(specId);
        const isValid = isSpecificationResponseValid(spec, selection);
        const message = getSpecificationErrorMessage(spec);
        setSpecificationFieldValidity(spec.id, spec.isRequired ? isValid : true, message);
        updateItemSpecificationNextState();
    }

    function updateItemSpecificationNextState() {
        const button = elements.specificationNextBtn;
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }
        if (!Array.isArray(state.categoryPath) || !state.categoryPath.length) {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            return;
        }
        if (!isFinalCategorySelected()) {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            return;
        }
        const specs = Array.isArray(state.activeSpecifications) ? state.activeSpecifications : [];
        const ready = specs.every(spec => {
            if (!spec || !spec.isRequired) {
                return true;
            }
            const selection = getSpecificationSelection(spec.id);
            return isSpecificationResponseValid(spec, selection);
        });
        button.disabled = !ready;
        button.setAttribute('aria-disabled', String(!ready));
    }

    function isSpecificationResponseValid(spec, selection) {
        if (!spec || spec.isRequired !== true) {
            return true;
        }
        if (!selection) {
            return false;
        }
        switch (spec.dataType) {
            case 'checkbox':
                return Array.isArray(selection.values) && selection.values.length > 0;
            case 'dropdownlist':
            case 'radio':
            case 'short-text':
            case 'long-text': {
                const value = typeof selection.value === 'string' ? selection.value.trim() : '';
                return Boolean(value);
            }
            case 'number': {
                const value = typeof selection.value === 'string' ? selection.value.trim() : '';
                if (!value) {
                    return false;
                }
                return !Number.isNaN(Number(value));
            }
            case 'document':
                return Array.isArray(selection.files) && selection.files.length > 0;
            default: {
                const value = typeof selection.value === 'string' ? selection.value.trim() : '';
                return Boolean(value);
            }
        }
    }

    function getSpecificationErrorMessage(spec) {
        if (!spec || !spec.isRequired) {
            return '';
        }
        switch (spec.dataType) {
            case 'checkbox':
                return 'Select at least one option.';
            case 'dropdownlist':
            case 'radio':
                return 'Choose an option before continuing.';
            case 'number':
                return 'Enter a valid number.';
            case 'document':
                return 'Attach at least one file.';
            default:
                return 'This field is required.';
        }
    }

    function buildSpecificationPayload() {
        const selections = state.specificationSelections || {};
        const specs = Array.isArray(state.specifications) ? state.specifications : [];
        const lookup = new Map(specs.map(spec => [spec.id, spec]));
        return Object.entries(selections)
            .map(([id, selection]) => {
                const spec = lookup.get(id) || getActiveSpecificationById(id);
                const type = selection?.type || spec?.dataType || SPECIFICATION_TYPE_DEFAULT;
                const result = {
                    id,
                    type,
                    label: spec?.displayName || id,
                    required: spec?.isRequired === true,
                    values: sanitizeStringArray(selection?.values || []),
                    labels: sanitizeStringArray(selection?.labels || []),
                    files: sanitizeStringArray(selection?.files || [])
                };
                if (type === 'checkbox') {
                    result.value = result.values.join(', ');
                    result.displayValue = result.labels.length ? result.labels.join(', ') : result.value;
                } else if (type === 'document') {
                    result.value = result.files.join(', ');
                    result.displayValue = result.value;
                } else {
                    const value = typeof selection?.value === 'string' ? selection.value.trim() : '';
                    const label = typeof selection?.label === 'string' ? selection.label.trim() : '';
                    result.value = value;
                    result.displayValue = label || value;
                }
                return result;
            })
            .filter(entry => {
                if (entry.type === 'checkbox') {
                    return entry.values.length > 0;
                }
                if (entry.type === 'document') {
                    return entry.files.length > 0;
                }
                return Boolean(entry.value);
            });
    }

    function exportSpecificationSelections() {
        if (!state.specificationSelections) {
            return [];
        }
        return Object.entries(state.specificationSelections).map(([id, selection]) => ({
            id,
            type: selection?.type || '',
            value: typeof selection?.value === 'string' ? selection.value : '',
            label: typeof selection?.label === 'string' ? selection.label : '',
            values: sanitizeStringArray(selection?.values || []),
            labels: sanitizeStringArray(selection?.labels || []),
            files: sanitizeStringArray(selection?.files || [])
        }));
    }

    function importSpecificationSelections(entries) {
        const selections = {};
        if (!Array.isArray(entries)) {
            return selections;
        }
        entries.forEach(entry => {
            if (!entry || typeof entry.id !== 'string') {
                return;
            }
            selections[entry.id] = {
                type: normalizeSpecificationType(entry.type),
                value: typeof entry.value === 'string' ? entry.value : '',
                label: typeof entry.label === 'string' ? entry.label : '',
                values: sanitizeStringArray(entry.values || []),
                labels: sanitizeStringArray(entry.labels || []),
                files: sanitizeStringArray(entry.files || [])
            };
        });
        return selections;
    }

    function bindEvents() {
        document.querySelectorAll('[data-step-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                const step = button.closest('.form-step');
                if (step) {
                    step.classList.toggle('is-open');
                }
            });
        });

        if (elements.categoryForm) {
            elements.categoryForm.addEventListener('submit', handleCategorySubmit);
            elements.categoryForm.addEventListener('change', handleCategoryFormChange);
        }
        if (elements.photoUpload) {
            elements.photoUpload.addEventListener('change', handlePhotoUpload);
        }
        if (elements.photoNextBtn) {
            elements.photoNextBtn.addEventListener('click', handlePhotoStepNext);
        }
        elements.stepNextButtons?.forEach(button => {
            button.addEventListener('click', handleStepNextClick);
        });
        if (elements.videoLinkAddBtn) {
            elements.videoLinkAddBtn.addEventListener('click', handleVideoLinkAdd);
        }
        if (elements.videoLinkList) {
            elements.videoLinkList.addEventListener('input', handleVideoLinkInput);
            elements.videoLinkList.addEventListener('click', handleVideoLinkListClick);
        }
        if (elements.specificationContainer) {
            elements.specificationContainer.addEventListener('input', handleSpecificationFieldInput);
            elements.specificationContainer.addEventListener('change', handleSpecificationFieldChange);
        }
        elements.quantityButtons.forEach(button => {
            button.addEventListener('click', handleQuantityControl);
        });
        if (elements.saleFixedToggle) elements.saleFixedToggle.addEventListener('change', handleSaleToggleUpdate);
        if (elements.saleAuctionToggle) elements.saleAuctionToggle.addEventListener('change', handleSaleToggleUpdate);
        if (elements.saleNegotiableToggle) elements.saleNegotiableToggle.addEventListener('change', handleSaleToggleUpdate);
        if (elements.paymentOptions) {
            elements.paymentOptions.addEventListener('change', updateFeeSummary);
        }
        if (elements.paymentMethodList) {
            elements.paymentMethodList.addEventListener('change', handlePaymentMethodChange);
        }
        if (elements.addressCountry) {
            elements.addressCountry.addEventListener('change', handleCountryChange);
        }
        if (elements.addressRegion) {
            elements.addressRegion.addEventListener('change', handleRegionChange);
        }
        if (elements.publishBtn) {
            elements.publishBtn.addEventListener('click', handlePublish);
        }
        if (elements.form) {
            elements.form.addEventListener('submit', handlePublish);
        }
        if (elements.profileBtn) {
            elements.profileBtn.addEventListener('click', () => {
                window.location.href = 'onruf-profile.html';
            });
        }
        if (elements.signOutBtn) {
            elements.signOutBtn.addEventListener('click', () => {
                try {
                    sessionStorage.removeItem(LOGIN_SESSION_KEY);
                } catch (error) {
                    console.warn('Unable to remove login session', error);
                }
                showToast('Signed out. Redirecting…');
                setTimeout(() => {
                    window.location.href = 'onruf-login.html';
                }, 900);
            });
        }
        if (elements.packageAddBtn) {
            elements.packageAddBtn.addEventListener('click', handlePackageAdd);
        }
        if (elements.packageSkipBtn) {
            elements.packageSkipBtn.addEventListener('click', handlePackageSkip);
        }
    }

    function handleCategoryFormChange(event) {
        const select = event.target;
        if (!(select instanceof HTMLSelectElement)) {
            return;
        }
        const level = Number.parseInt(select.dataset.categoryLevel, 10);
        if (!Number.isInteger(level)) {
            return;
        }
        const options = state.categoryOptionsByLevel[level] || [];
        state.categoryPath = state.categoryPath.slice(0, level);
        const value = select.value;
        if (value) {
            const node = options.find(option => option.id === value);
            if (node) {
                state.categoryPath.push(node);
            }
        }
        renderCategoryLevels();
        syncCategoryStateFromPath();
        renderSpecificationFields();
        updateCategoryNextState();
        updateSubtitleFeeHint();
    }

    function renderCategoryLevels() {
        if (!elements.categoryLevels) {
            return;
        }
        const container = elements.categoryLevels;
        container.innerHTML = '';
        state.categoryOptionsByLevel = {};

        const topLevelNodes = state.categories || [];
        if (!Array.isArray(state.categoryPath)) {
            state.categoryPath = [];
        }

        const mainLevel = createCategoryLevel({
            level: 0,
            label: 'Main Category',
            nodes: topLevelNodes,
            selectedId: state.categoryPath[0]?.id || ''
        });
        state.categoryOptionsByLevel[0] = topLevelNodes;
        container.appendChild(mainLevel.wrapper);
        elements.categorySelect = mainLevel.select;

        let currentNode = null;
        if (mainLevel.select.value) {
            currentNode = topLevelNodes.find(node => node.id === mainLevel.select.value) || null;
        } else if (state.categoryPath[0]) {
            currentNode = topLevelNodes.find(node => node.id === state.categoryPath[0].id) || null;
            if (currentNode) {
                mainLevel.select.value = currentNode.id;
                state.categoryPath[0] = currentNode;
            } else {
                state.categoryPath = [];
            }
        }

        let level = 0;
        while (currentNode && Array.isArray(currentNode.children) && currentNode.children.length) {
            level += 1;
            const childNodes = currentNode.children;
            const childSelectedId = state.categoryPath[level]?.id || '';
            const childLevel = createCategoryLevel({
                level,
                label: 'Subcategory',
                nodes: childNodes,
                selectedId: childSelectedId
            });
            state.categoryOptionsByLevel[level] = childNodes;
            container.appendChild(childLevel.wrapper);

            if (childLevel.select.value) {
                const matched = childNodes.find(node => node.id === childLevel.select.value) || null;
                if (matched) {
                    if (state.categoryPath.length <= level) {
                        state.categoryPath.push(matched);
                    } else {
                        state.categoryPath[level] = matched;
                    }
                    currentNode = matched;
                    continue;
                }
            } else if (state.categoryPath[level]) {
                const matched = childNodes.find(node => node.id === state.categoryPath[level].id) || null;
                if (matched) {
                    childLevel.select.value = matched.id;
                    if (state.categoryPath.length <= level) {
                        state.categoryPath.push(matched);
                    } else {
                        state.categoryPath[level] = matched;
                    }
                    currentNode = matched;
                    continue;
                }
            }

            state.categoryPath = state.categoryPath.slice(0, level);
            currentNode = null;
        }
    }

    function createCategoryLevel({ level, label, nodes, selectedId }) {
        const wrapper = document.createElement('div');
        wrapper.className = 'category-level';
        wrapper.dataset.categoryLevelWrapper = String(level);

        const selectId = `categoryLevel${level}`;
        const labelEl = document.createElement('label');
        labelEl.className = 'category-label';
        labelEl.setAttribute('for', selectId);
        labelEl.textContent = label;

        const select = document.createElement('select');
        select.id = selectId;
        select.dataset.categoryLevel = String(level);
        select.innerHTML = buildCategoryOptions(nodes, label === 'Main Category' ? 'Select main category' : 'Select subcategory');
        if (level === 0) {
            select.required = true;
        }
        if (selectedId && nodes.some(node => node.id === selectedId)) {
            select.value = selectedId;
        }

        wrapper.appendChild(labelEl);
        wrapper.appendChild(select);
        return { wrapper, select };
    }

    function buildCategoryOptions(nodes, placeholder) {
        const safePlaceholder = placeholder || 'Select option';
        const options = Array.isArray(nodes) ? nodes : [];
        const html = options.map(node => `<option value="${node.id}">${escapeHtml(node.label)}</option>`).join('');
        return `<option value="">${escapeHtml(safePlaceholder)}</option>${html}`;
    }

    function buildCategoryPathFromIds(ids) {
        if (!Array.isArray(ids) || !ids.length) {
            return [];
        }
        const path = [];
        let candidates = state.categories || [];
        for (const id of ids) {
            if (!Array.isArray(candidates) || !candidates.length) {
                break;
            }
            const match = candidates.find(node => node.id === id);
            if (!match) {
                break;
            }
            path.push(match);
            candidates = match.children || [];
        }
        return path;
    }

    function legacyCategoryToIds(legacy) {
        if (!legacy || typeof legacy !== 'object') {
            return [];
        }
        const ids = [];
        if (legacy.id) ids.push(legacy.id);
        if (legacy.subId) ids.push(legacy.subId);
        if (legacy.childId) ids.push(legacy.childId);
        return ids.filter(Boolean);
    }

    function buildLegacyCategorySnapshot() {
        const path = Array.isArray(state.categoryPath) ? state.categoryPath : [];
        const leaf = getSelectedLeaf();
        return {
            id: path[0]?.id || leaf?.id || '',
            subId: path[1]?.id || '',
            childId: path.length > 2 ? leaf?.id || '' : ''
        };
    }

    function buildFeeSnapshot() {
        const fixedComponent = state.saleFees.fixed ? DEFAULT_FIXED_FEE : 0;
        const auctionComponent = state.saleFees.auction ? DEFAULT_FIXED_FEE : 0;
        const negotiableComponent = state.saleFees.negotiable ? DEFAULT_FIXED_FEE : 0;
        return {
            fixed: formatCurrencyValue(fixedComponent),
            negotiable: formatCurrencyValue(negotiableComponent),
            auction: formatCurrencyValue(auctionComponent),
            subtotal: formatCurrencyValue(state.summary.subtotal),
            tax: formatCurrencyValue(state.summary.tax),
            total: formatCurrencyValue(state.summary.total)
        };
    }

    function syncCategoryStateFromPath() {
        state.selectedCategory = state.categoryPath[0] || null;
        state.selectedSubcategory = state.categoryPath[1] || null;
        state.categoryLeaf = getSelectedLeaf();
        state.selectedChild = state.categoryPath.length > 2 ? state.categoryLeaf : null;
        updateUploadGuidance();
        updateSubtitleFeeHint();
    }

    function updateUploadGuidance() {
        if (!elements.photoGuidance) {
            return;
        }
        const rules = getCategoryMediaRules(state.categoryLeaf);
        const imageLabel = rules.freeImages === 1 ? 'image' : 'images';
        const videoLabel = rules.freeVideos === 1 ? 'video link' : 'video links';
        const imageFeeLabel = formatFeeAmount(rules.extraImageFee);
        const videoFeeLabel = formatFeeAmount(rules.extraVideoFee);
        const imagePart = rules.freeImages === 0
            ? 'no images for free'
            : `${rules.freeImages} ${imageLabel} for free`;
        const videoPart = rules.freeVideos === 0
            ? 'no video links for free'
            : `${rules.freeVideos} ${videoLabel} for free`;
        elements.photoGuidance.textContent = `You can upload ${imagePart} and ${videoPart}; each additional image costs ${imageFeeLabel}, and each additional video link costs ${videoFeeLabel}.`;
    }

    function getSelectedLeaf() {
        return state.categoryPath.length ? state.categoryPath[state.categoryPath.length - 1] : null;
    }

    function isFinalCategorySelected() {
        const leaf = getSelectedLeaf();
        if (!leaf) {
            return false;
        }
        return !Array.isArray(leaf.children) || !leaf.children.length;
    }

    function updateCategoryNextState() {
        if (!elements.categoryNextBtn) {
            return;
        }
        const ready = isFinalCategorySelected();
        elements.categoryNextBtn.disabled = !ready;
        elements.categoryNextBtn.setAttribute('aria-disabled', String(!ready));
    }

    function findFirstIncompleteCategorySelect() {
        if (!elements.categoryLevels) {
            return null;
        }
        const selects = Array.from(elements.categoryLevels.querySelectorAll('select[data-category-level]'));
        return selects.find(select => !select.value) || null;
    }

    function handleCategorySubmit(event) {
        event.preventDefault();
        if (!isFinalCategorySelected()) {
            showToast('Select the final category level before continuing.');
            const pending = findFirstIncompleteCategorySelect();
            if (pending) {
                pending.focus();
            }
            return;
        }
        showToast('Category saved. Continue filling the details.');
        openStep(1);
        focusStepToggle(1);
    }

    function handlePhotoUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) {
            return;
        }
        const batches = files.slice(0, 6);
        batches.forEach(file => {
            const reader = new FileReader();
            reader.onload = loadEvent => {
                state.photos.push({
                    id: generatePhotoId(),
                    name: file.name,
                    dataUrl: loadEvent.target.result,
                    isPrimary: false
                });
                ensurePrimaryPhoto();
                renderPhotoGallery();
            };
            reader.readAsDataURL(file);
        });
        event.target.value = '';
    }

    function handlePhotoStepNext(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (!state.photos.length) {
            showToast('Add at least one image before continuing.');
            if (elements.photoUpload instanceof HTMLElement) {
                elements.photoUpload.focus();
            }
            return;
        }
        if (!validateVideoLinks()) {
            return;
        }
        closeStep(1);
        openStep(2);
        focusStepToggle(2);
    }

    function handleStepNextClick(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        const button = event.currentTarget;
        if (!(button instanceof HTMLElement)) {
            return;
        }
        const stepElement = button.closest('.form-step');
        const currentStep = stepElement ? Number.parseInt(stepElement.getAttribute('data-step'), 10) : NaN;
        if (!Number.isInteger(currentStep)) {
            return;
        }
        if (!validateStepBeforeProceed(currentStep)) {
            return;
        }
        if (currentStep >= 6) {
            focusPackageActions();
            return;
        }
        const targetStep = deriveTargetStep(button, currentStep);
        if (!Number.isInteger(targetStep) || targetStep <= currentStep) {
            focusPackageActions();
            return;
        }
        closeStep(currentStep);
        openStep(targetStep);
        focusStepToggle(targetStep);
    }

    function deriveTargetStep(button, currentStep) {
        if (!(button instanceof HTMLElement)) {
            return currentStep + 1;
        }
        const attr = button.getAttribute('data-step-next');
        const parsed = attr ? Number.parseInt(attr, 10) : NaN;
        if (Number.isInteger(parsed) && parsed > currentStep) {
            const candidate = document.querySelector(`.form-step[data-step="${parsed}"]`);
            if (candidate) {
                return parsed;
            }
        }
        const fallback = currentStep + 1;
        const fallbackCandidate = document.querySelector(`.form-step[data-step="${fallback}"]`);
        return fallbackCandidate ? fallback : currentStep;
    }

    function validateStepBeforeProceed(stepNumber) {
        switch (stepNumber) {
            case 2:
                return validateItemDetailsStep();
            case 3:
                return validateAdDetailsStep();
            case 4:
                return validateSaleDetailsStep();
            case 5:
                return validateShippingStep();
            default:
                return true;
        }
    }

    function validateItemDetailsStep() {
        if (!Array.isArray(state.activeSpecifications) || !state.activeSpecifications.length) {
            return true;
        }
        for (const spec of state.activeSpecifications) {
            if (!spec || !spec.isRequired) {
                continue;
            }
            const selection = getSpecificationSelection(spec.id);
            if (isSpecificationResponseValid(spec, selection)) {
                continue;
            }
            const message = getSpecificationErrorMessage(spec) || 'Complete the required field before continuing.';
            setSpecificationFieldValidity(spec.id, false, message);
            focusSpecificationInput(spec.id);
            showToast(`Complete "${spec.displayName || 'this field'}" before continuing.`);
            return false;
        }
        return true;
    }

    function validateAdDetailsStep() {
        const titleAr = document.getElementById('adTitleAr');
        if (!titleAr || !titleAr.value.trim()) {
            showToast('Add an Arabic title for your ad.');
            titleAr?.focus();
            return false;
        }
        const detailsAr = document.getElementById('adDetailsAr');
        if (!detailsAr || !detailsAr.value.trim()) {
            showToast('Provide Arabic details for your ad.');
            detailsAr?.focus();
            return false;
        }
        const statusInput = document.querySelector('input[name="itemStatus"]:checked');
        if (!statusInput) {
            showToast('Select the item status.');
            const firstStatus = document.querySelector('input[name="itemStatus"]');
            if (firstStatus instanceof HTMLElement) {
                firstStatus.focus();
            }
            return false;
        }
        if (elements.quantityInput) {
            const quantityValue = Number.parseInt(elements.quantityInput.value, 10);
            if (!Number.isInteger(quantityValue) || quantityValue < 1) {
                showToast('Quantity must be at least 1.');
                elements.quantityInput.value = '1';
                elements.quantityInput.focus();
                return false;
            }
        }
        return true;
    }

    function validateSaleDetailsStep() {
        if (!elements.saleFixedToggle?.checked && !elements.saleAuctionToggle?.checked && !elements.saleNegotiableToggle?.checked) {
            showToast('Enable at least one sales type.');
            elements.saleFixedToggle?.focus();
            return false;
        }
        if (!elements.pricePurchase || !elements.pricePurchase.value.trim()) {
            showToast('Enter the purchasing price.');
            elements.pricePurchase?.focus();
            return false;
        }
        const purchaseValue = Number.parseFloat(elements.pricePurchase.value);
        if (Number.isNaN(purchaseValue) || purchaseValue <= 0) {
            showToast('The purchasing price must be greater than 0.');
            elements.pricePurchase.focus();
            return false;
        }
        const paymentChecked = elements.paymentOptions ? elements.paymentOptions.querySelector('input[type="checkbox"]:checked') : null;
        if (!paymentChecked) {
            showToast('Select at least one payment option.');
            const firstOption = elements.paymentOptions?.querySelector('input[type="checkbox"]');
            if (firstOption instanceof HTMLElement) {
                firstOption.focus();
            }
            return false;
        }
        return true;
    }

    function validateShippingStep() {
        const pickupChecked = document.querySelector('[data-shipping]:checked');
        if (!pickupChecked) {
            showToast('Choose at least one pick-up option.');
            const firstPickup = document.querySelector('[data-shipping]');
            if (firstPickup instanceof HTMLElement) {
                firstPickup.focus();
            }
            return false;
        }
        const shippingChecked = document.querySelector('[data-shipping-option]:checked');
        if (!shippingChecked) {
            showToast('Select at least one shipping option.');
            const firstShipping = document.querySelector('[data-shipping-option]');
            if (firstShipping instanceof HTMLElement) {
                firstShipping.focus();
            }
            return false;
        }
        return true;
    }

    function focusStepToggle(stepNumber) {
        const toggle = document.querySelector(`.form-step[data-step="${stepNumber}"] [data-step-toggle]`);
        if (toggle instanceof HTMLElement) {
            toggle.focus();
        }
    }

    function focusPackageActions() {
        const primary = elements.packageAddBtn instanceof HTMLElement ? elements.packageAddBtn : null;
        const fallback = elements.packageSkipBtn instanceof HTMLElement ? elements.packageSkipBtn : null;
        const target = primary || fallback;
        if (target) {
            target.focus();
        }
        showToast('Wrap up by adding a package or choose "No thanks".');
    }

    function renderPhotoGallery() {
        if (!elements.uploadGallery) {
            updatePhotoNextState();
            return;
        }
        if (!state.photos.length) {
            elements.uploadGallery.innerHTML = '';
            updatePhotoNextState();
            return;
        }
        ensurePrimaryPhoto();
        const galleryMarkup = state.photos.map(photo => {
            const badge = photo.isPrimary
                ? '<span class="upload-preview__badge" aria-label="Default image">Default</span>'
                : '';
            const defaultButton = photo.isPrimary
                ? '<button type="button" class="upload-preview__default-btn is-active" aria-pressed="true" disabled>Default image</button>'
                : `<button type="button" class="upload-preview__default-btn" data-default-photo="${photo.id}" aria-pressed="false">Set as default</button>`;
            const safeName = escapeHtml(photo.name || 'Uploaded preview');
            return `
                <div class="upload-preview" data-photo-id="${photo.id}">
                    ${badge}
                    <img src="${photo.dataUrl}" alt="${safeName}" />
                    <button type="button" data-remove-photo="${photo.id}" aria-label="Remove photo">
                        <i class="fas fa-times"></i>
                    </button>
                    ${defaultButton}
                </div>
            `;
        }).join('');
        elements.uploadGallery.innerHTML = galleryMarkup;
        elements.uploadGallery.querySelectorAll('[data-remove-photo]').forEach(button => {
            button.addEventListener('click', () => {
                const photoId = button.getAttribute('data-remove-photo');
                if (photoId) {
                    removePhoto(photoId);
                }
            });
        });
        elements.uploadGallery.querySelectorAll('[data-default-photo]').forEach(button => {
            button.addEventListener('click', () => {
                const photoId = button.getAttribute('data-default-photo');
                if (photoId) {
                    setPrimaryPhoto(photoId);
                }
            });
        });
        updatePhotoNextState();
    }

    function updatePhotoNextState() {
        if (!elements.photoNextBtn) {
            return;
        }
        const ready = state.photos.length > 0;
        elements.photoNextBtn.disabled = !ready;
        elements.photoNextBtn.setAttribute('aria-disabled', String(!ready));
    }

    function removePhoto(photoId) {
        const index = state.photos.findIndex(photo => photo.id === photoId);
        if (index === -1) {
            return;
        }
        state.photos.splice(index, 1);
        ensurePrimaryPhoto();
        renderPhotoGallery();
    }

    function setPrimaryPhoto(photoId) {
        let found = false;
        let updated = false;
        state.photos.forEach(photo => {
            if (photo.id === photoId) {
                found = true;
                if (!photo.isPrimary) {
                    updated = true;
                }
                photo.isPrimary = true;
            } else if (photo.isPrimary) {
                photo.isPrimary = false;
                updated = true;
            } else {
                photo.isPrimary = false;
            }
        });
        if (!found) {
            return;
        }
        ensurePrimaryPhoto();
        if (updated) {
            renderPhotoGallery();
        }
    }

    function ensurePrimaryPhoto() {
        if (!state.photos.length) {
            return;
        }
        const currentIndex = state.photos.findIndex(photo => photo.isPrimary);
        if (currentIndex === -1) {
            state.photos[0].isPrimary = true;
            for (let i = 1; i < state.photos.length; i += 1) {
                state.photos[i].isPrimary = false;
            }
        } else {
            state.photos.forEach((photo, index) => {
                photo.isPrimary = index === currentIndex;
            });
        }
    }

    function getPrimaryPhoto() {
        return state.photos.find(photo => photo.isPrimary) || state.photos[0] || null;
    }

    function renderVideoLinks() {
        if (!elements.videoLinkList) {
            return;
        }
        if (!Array.isArray(state.videoLinks)) {
            state.videoLinks = [];
        }
        if (!state.videoLinks.length) {
            state.videoLinks.push(createVideoLinkEntry(''));
        }
        const markup = state.videoLinks.map((entry, index) => {
            const inputId = `videoLink-${entry.id}`;
            const safeValue = escapeHtml(entry.value || '');
            const removable = state.videoLinks.length > 1;
            const removeButton = removable
                ? `<button type="button" class="video-link-remove" data-remove-video-link="${entry.id}" aria-label="Remove video link ${index + 1}"><i class="fas fa-times" aria-hidden="true"></i></button>`
                : '';
            return `
                <div class="video-link-row" data-video-link-row="${entry.id}">
                    <input type="url" id="${inputId}" class="video-link-input" data-video-link-input="${entry.id}" placeholder="https://" value="${safeValue}" autocomplete="off" inputmode="url" aria-label="Video link ${index + 1}" />
                    ${removeButton}
                </div>
            `;
        }).join('');
        elements.videoLinkList.innerHTML = markup;
    }

    function handleVideoLinkAdd(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (!Array.isArray(state.videoLinks)) {
            state.videoLinks = [];
        }
        const entry = createVideoLinkEntry('');
        state.videoLinks.push(entry);
        renderVideoLinks();
        focusVideoLinkInput(entry.id);
    }

    function handleVideoLinkInput(event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || !target.dataset.videoLinkInput) {
            return;
        }
        const id = target.dataset.videoLinkInput;
        const entry = Array.isArray(state.videoLinks) ? state.videoLinks.find(link => link.id === id) : null;
        if (!entry) {
            return;
        }
        entry.value = target.value;
        target.classList.remove('is-invalid');
    }

    function handleVideoLinkListClick(event) {
        const button = event.target instanceof HTMLElement ? event.target.closest('[data-remove-video-link]') : null;
        if (!button) {
            return;
        }
        event.preventDefault();
        const id = button.getAttribute('data-remove-video-link');
        if (!id) {
            return;
        }
        removeVideoLink(id);
    }

    function removeVideoLink(id) {
        if (!Array.isArray(state.videoLinks)) {
            return;
        }
        state.videoLinks = state.videoLinks.filter(entry => entry.id !== id);
        if (!state.videoLinks.length) {
            state.videoLinks.push(createVideoLinkEntry(''));
        }
        const nextFocusId = state.videoLinks.length ? state.videoLinks[state.videoLinks.length - 1].id : null;
        renderVideoLinks();
        if (nextFocusId) {
            focusVideoLinkInput(nextFocusId);
        }
    }

    function focusVideoLinkInput(id) {
        if (!elements.videoLinkList) {
            return;
        }
        const node = elements.videoLinkList.querySelector(`[data-video-link-input="${id}"]`);
        if (node instanceof HTMLElement) {
            node.focus();
        }
    }

    function validateVideoLinks() {
        if (!Array.isArray(state.videoLinks)) {
            state.videoLinks = [];
        }
        if (!state.videoLinks.length) {
            renderVideoLinks();
        }
        elements.videoLinkList?.querySelectorAll('.video-link-input').forEach(input => {
            input.classList.remove('is-invalid');
        });
        let firstInvalidId = null;
        state.videoLinks.forEach(entry => {
            const trimmed = typeof entry.value === 'string' ? entry.value.trim() : '';
            entry.value = trimmed;
            const input = elements.videoLinkList?.querySelector(`[data-video-link-input="${entry.id}"]`);
            if (input instanceof HTMLInputElement && input.value !== trimmed) {
                input.value = trimmed;
            }
            if (!trimmed || firstInvalidId) {
                return;
            }
            if (!isValidHttpUrl(trimmed)) {
                firstInvalidId = entry.id;
            }
        });
        if (firstInvalidId) {
            const invalidInput = elements.videoLinkList?.querySelector(`[data-video-link-input="${firstInvalidId}"]`);
            if (invalidInput instanceof HTMLElement) {
                invalidInput.classList.add('is-invalid');
                invalidInput.focus();
            }
            showToast('Enter a valid video link URL (include http:// or https://).');
            return false;
        }
        return true;
    }

    function handleQuantityControl(event) {
        const direction = Number.parseInt(event.currentTarget.getAttribute('data-quantity'), 10);
        if (!Number.isInteger(direction)) {
            return;
        }
        const current = Number.parseInt(elements.quantityInput.value, 10) || 1;
        let next = current + direction;
        if (next < 1) {
            next = 1;
        }
        elements.quantityInput.value = next;
    }

    function handleSaleToggleUpdate() {
        state.saleFees.fixed = Boolean(elements.saleFixedToggle?.checked);
        state.saleFees.auction = Boolean(elements.saleAuctionToggle?.checked);
        state.saleFees.negotiable = Boolean(elements.saleNegotiableToggle?.checked);
        updateFeeSummary();
        updatePointsSummary();
    }

    function handlePaymentMethodChange(event) {
        const method = event.target.getAttribute('data-payment-toggle');
        if (!method) {
            return;
        }
        if (event.target.checked) {
            state.paymentMethods.add(method);
        } else {
            state.paymentMethods.delete(method);
        }
        if (!state.paymentMethods.size) {
            state.paymentMethods.add('visa');
            event.target.checked = true;
            showToast('At least one payment method must remain enabled.');
        }
    }

    function handleCountryChange(event) {
        const country = event.target.value;
        const regions = REGION_OPTIONS[country] || [];
        elements.addressRegion.innerHTML = '<option value="">Choose region</option>' + regions.map(region => `<option value="${region}">${escapeHtml(region)}</option>`).join('');
        elements.addressCity.innerHTML = '<option value="">Choose city</option>';
    }

    function handleRegionChange(event) {
        const region = event.target.value;
        const cities = CITY_OPTIONS[region] || [];
        elements.addressCity.innerHTML = '<option value="">Choose city</option>' + cities.map(city => `<option value="${city}">${escapeHtml(city)}</option>`).join('');
    }

    function updateFeeSummary() {
        const fixedFee = state.saleFees.fixed ? DEFAULT_FIXED_FEE : 0;
        const auctionFee = state.saleFees.auction ? DEFAULT_FIXED_FEE : 0;
        const negotiableFee = state.saleFees.negotiable ? DEFAULT_FIXED_FEE : 0;
        const subtotal = fixedFee + auctionFee + negotiableFee;
        const tax = Number.parseFloat((subtotal * TAX_RATE).toFixed(2));
        const total = Number.parseFloat((subtotal + tax).toFixed(2));
        state.summary.subtotal = subtotal;
        state.summary.tax = tax;
        state.summary.total = total;
        if (elements.feeFixed) elements.feeFixed.textContent = `${fixedFee.toFixed(2)} SAR`;
        if (elements.feeAuction) elements.feeAuction.textContent = `${auctionFee.toFixed(2)} SAR`;
        if (elements.feeNegotiable) elements.feeNegotiable.textContent = `${negotiableFee.toFixed(2)} SAR`;
        if (elements.feeSubtotal) elements.feeSubtotal.textContent = `${subtotal.toFixed(2)} SAR`;
        if (elements.feeTax) elements.feeTax.textContent = `${tax.toFixed(2)} SAR`;
        if (elements.feeTotal) elements.feeTotal.textContent = `${total.toFixed(2)} SAR`;
        if (elements.feeUpdatedAt) elements.feeUpdatedAt.textContent = `Updated ${formatTime(new Date())}`;
    }

    function updatePointsSummary() {
        const points = Math.max(state.saleFees.fixed + state.saleFees.auction + state.saleFees.negotiable, 1) * 25;
        state.summary.points = points;
        if (elements.pointsOutput) {
            elements.pointsOutput.textContent = points.toLocaleString('en-US');
        }
    }

    function handlePublish(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        startCheckoutFlow();
    }

    function startCheckoutFlow() {
        if (!validateForm()) {
            return;
        }
        const payload = buildAdPayload();
        if (!payload) {
            showToast('Unable to build the product ad payload.');
            return;
        }
        const model = buildCheckoutModel(payload);
        if (!model) {
            showToast('Review failed. Please double-check the required fields.');
            return;
        }
        const snapshot = collectFormSnapshot();
        state.checkoutDraft = { payload, model, snapshot };
        persistCheckoutDraft(payload, model, snapshot);
        window.location.href = 'onruf-add-product-checkout.html';
    }

    function validateForm() {
        if (!isFinalCategorySelected()) {
            showToast('Select the final category level before continuing.');
            const pending = findFirstIncompleteCategorySelect();
            if (pending) {
                pending.focus();
            }
            return false;
        }
        if (!state.photos.length) {
            showToast('Add at least one image before continuing.');
            if (elements.photoUpload instanceof HTMLElement) {
                elements.photoUpload.focus();
            }
            return false;
        }
        if (!validateVideoLinks()) {
            return false;
        }
        if (!validateItemDetailsStep()) {
            openStep(2);
            return false;
        }
        if (!validateAdDetailsStep()) {
            openStep(3);
            return false;
        }
        if (!validateSaleDetailsStep()) {
            openStep(4);
            return false;
        }
        if (!validateShippingStep()) {
            openStep(5);
            return false;
        }
        return true;
    }

    function buildAdPayload() {
        const now = new Date();
        const purchasePrice = Number.parseFloat(elements.pricePurchase.value) || 0;
        const minPrice = Number.parseFloat(elements.priceMinimum.value) || purchasePrice;
        const auctionClosing = elements.auctionClosing.value ? new Date(elements.auctionClosing.value) : null;
        const auctionDays = Number.parseInt(elements.auctionLength.value, 10) || 1;
        const endsAt = auctionClosing && !Number.isNaN(auctionClosing.getTime())
            ? auctionClosing.toISOString()
            : new Date(now.getTime() + auctionDays * 24 * 60 * 60 * 1000).toISOString();
        const categoryPath = Array.isArray(state.categoryPath) ? state.categoryPath : [];
        const leafCategory = getSelectedLeaf();
        const primaryCategory = categoryPath[0] || leafCategory;
        const secondaryCategory = categoryPath[1] || null;
        const categoryLabel = leafCategory?.label || 'General';
        const city = elements.addressCity.value || elements.addressRegion.value || elements.addressCountry.value || 'Riyadh';
        const titleAr = document.getElementById('adTitleAr').value.trim();
        const titleEn = document.getElementById('adTitleEn')?.value.trim();
        const title = titleEn || titleAr || 'ONRUF Listing';
        const subtitle = `${city} • ${formatDateShort(endsAt)}`;
        const description = document.getElementById('adDetailsAr').value.trim();
    const badge = state.saleFees.auction ? 'Auction' : state.saleFees.negotiable ? 'Negotiable' : 'Featured';
    const primaryPhoto = getPrimaryPhoto();
    const image = primaryPhoto?.dataUrl || getFallbackImageForCategory(categoryLabel);
        const itemStatusInput = document.querySelector('input[name="itemStatus"]:checked');
        return {
            id: generateAdId(),
            title,
            subtitle,
            description,
            category: categoryLabel,
            categoryId: primaryCategory?.id || null,
            subcategoryId: secondaryCategory?.id || null,
            childCategoryId: categoryPath.length > 2 ? leafCategory?.id || null : null,
            city,
            account: state.session?.email || 'onruf-seller@onruf.com',
            status: 'pending',
            itemStatus: itemStatusInput ? itemStatusInput.value : 'new',
            priceMin: purchasePrice,
            priceMax: Math.max(minPrice, purchasePrice),
            createdAt: now.toISOString(),
            endsAt,
            badge,
            image,
            saleOptions: {
                fixedPrice: state.saleFees.fixed,
                auction: state.saleFees.auction,
                negotiable: state.saleFees.negotiable
            },
            paymentOptions: Array.from(elements.paymentOptions.querySelectorAll('input[type="checkbox"]')).filter(input => input.checked).map(input => input.getAttribute('data-method')),
            shippingOptions: Array.from(document.querySelectorAll('[data-shipping-option]')).filter(input => input.checked).map(input => input.getAttribute('data-shipping-option')),
            pickupOptions: Array.from(document.querySelectorAll('[data-shipping]')).filter(input => input.checked).map(input => input.getAttribute('data-shipping')),
            quantity: Number.parseInt(elements.quantityInput.value, 10) || 1,
            videoLinks: exportVideoLinkValues(),
            specifications: buildSpecificationPayload()
        };
    }

    function handlePackageAdd(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        startCheckoutFlow();
    }

    function handlePackageSkip(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        showToast('No additional packages selected. Publish when you are ready.');
    }

    function buildCheckoutModel(payload) {
    const draft = payload || buildAdPayload();
        if (!draft) {
            return null;
        }
    const conditionInput = document.querySelector('input[name="itemStatus"]:checked');
    const description = document.getElementById('adDetailsAr')?.value.trim() || draft.description || '';
    const primaryPhoto = getPrimaryPhoto();
    const categoryLabels = Array.isArray(state.categoryPath) ? state.categoryPath.map(node => node.label) : [];
    const categoryBreadcrumb = formatList(categoryLabels, '', ' › ');
        const city = elements.addressCity?.value || elements.addressRegion?.value || elements.addressCountry?.value || 'Riyadh';
        const saleTypes = [];
        if (draft.saleOptions?.fixedPrice) saleTypes.push('Fixed price');
        if (draft.saleOptions?.auction) saleTypes.push('Auction');
        if (draft.saleOptions?.negotiable) saleTypes.push('Price negotiable');
        const purchasePriceValue = Number.parseFloat(elements.pricePurchase.value) || 0;
        const minimumBidValue = Number.parseFloat(elements.priceBid.value) || 0;
        const minimumPriceValue = Number.parseFloat(elements.priceMinimum.value) || 0;
        const paymentOptionLabels = collectCheckedLabels('#paymentOptions input[type="checkbox"]');
        const shippingOptionLabels = collectCheckedLabels('input[type="checkbox"][data-shipping-option]');
        const pickupOptionLabels = collectCheckedLabels('input[type="checkbox"][data-shipping]');
        const paymentMethodTags = Array.from(state.paymentMethods).map(id => {
            const method = PAYMENT_METHODS.find(entry => entry.id === id);
            return method ? method.label : id;
        });
        const auctionSource = elements.auctionClosing && elements.auctionClosing.value ? new Date(elements.auctionClosing.value) : new Date(draft.endsAt);
        const negotiableLabel = state.saleFees.negotiable
            ? minimumPriceValue > 0 ? `Yes (min ${formatCurrency(minimumPriceValue)})` : 'Yes'
            : 'No';
        return {
            title: draft.title || 'ONRUF listing',
            subtitle: formatList([categoryBreadcrumb || null, city], '—', ' • '),
            notes: truncateText(description, 140) || 'No additional details provided.',
            condition: capitalizeWord(conditionInput ? conditionInput.value : '') || 'Not specified',
            quantity: String(draft.quantity || 1),
            saleTypes: formatList(saleTypes, 'Fixed price'),
            purchasePrice: formatCurrency(purchasePriceValue),
            minimumBid: draft.saleOptions?.auction ? formatCurrency(minimumBidValue || purchasePriceValue) : '—',
            negotiable: negotiableLabel,
            paymentOptions: formatList(paymentOptionLabels, '—'),
            shippingOptions: formatList(shippingOptionLabels, '—'),
            pickupOptions: formatList(pickupOptionLabels, '—'),
            auctionClosing: formatDateTime(auctionSource),
            image: draft.image || primaryPhoto?.dataUrl || getFallbackImageForCategory(categoryBreadcrumb || 'General'),
            category: draft.category,
            fee: buildFeeSnapshot(),
            points: state.summary.points || 0,
            paymentMethodTags: paymentMethodTags.length ? paymentMethodTags : ['Visa / Mastercard'],
            videoLinks: draft.videoLinks && draft.videoLinks.length ? draft.videoLinks : exportVideoLinkValues(),
            specifications: buildSpecificationPayload()
        };
    }

    function persistCheckoutDraft(payload, model, snapshot) {
        try {
            sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({
                payload,
                model,
                snapshot,
                createdAt: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('Unable to persist checkout draft', error);
        }
    }

    function readCheckoutDraft() {
        try {
            const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('Unable to read checkout draft', error);
            return null;
        }
    }

    function closeStep(stepNumber) {
        if (!Number.isInteger(stepNumber)) {
            return;
        }
        const target = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
        if (target) {
            target.classList.remove('is-open');
        }
    }

    function openStep(stepNumber) {
        if (!Number.isInteger(stepNumber)) {
            return;
        }
        const target = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
        if (!target) {
            return;
        }
        target.classList.add('is-open');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function consumePendingStepFocus() {
        try {
            const value = sessionStorage.getItem(EDIT_STEP_KEY);
            if (!value) {
                return null;
            }
            sessionStorage.removeItem(EDIT_STEP_KEY);
            const parsed = Number.parseInt(value, 10);
            return Number.isInteger(parsed) ? parsed : null;
        } catch (error) {
            console.warn('Unable to read pending step focus', error);
            return null;
        }
    }

    function showDeferredToast() {
        try {
            const message = sessionStorage.getItem(FLASH_MESSAGE_KEY);
            if (!message) {
                return;
            }
            sessionStorage.removeItem(FLASH_MESSAGE_KEY);
            showToast(message);
        } catch (error) {
            console.warn('Unable to surface deferred toast', error);
        }
    }

    function collectFormSnapshot() {
        const snapshot = {
            category: buildLegacyCategorySnapshot(),
            categoryPathIds: Array.isArray(state.categoryPath) ? state.categoryPath.map(node => node.id) : [],
            photos: clonePhotos(state.photos),
            videoLinks: exportVideoLinkValues(),
            specifications: exportSpecificationSelections(),
            saleFees: {
                fixed: Boolean(elements.saleFixedToggle?.checked),
                auction: Boolean(elements.saleAuctionToggle?.checked),
                negotiable: Boolean(elements.saleNegotiableToggle?.checked)
            },
            paymentMethods: Array.from(state.paymentMethods),
            paymentOptions: collectCheckedAttributes('#paymentOptions input[type="checkbox"]', 'data-method'),
            shippingOptions: collectCheckedAttributes('input[type="checkbox"][data-shipping-option]', 'data-shipping-option'),
            pickupOptions: collectCheckedAttributes('input[type="checkbox"][data-shipping]', 'data-shipping'),
            quantity: elements.quantityInput?.value || '1',
            englishInfoEnabled: Boolean(document.getElementById('enableEnglishInfo')?.checked),
            form: {
                specifications: exportSpecificationSelections(),
                adTitleAr: getFieldValue('adTitleAr'),
                adSubtitleAr: getFieldValue('adSubtitleAr'),
                adDetailsAr: getFieldValue('adDetailsAr'),
                adTitleEn: getFieldValue('adTitleEn'),
                adDetailsEn: getFieldValue('adDetailsEn'),
                itemStatus: getRadioValue('itemStatus'),
                addressCountry: elements.addressCountry?.value || '',
                addressRegion: elements.addressRegion?.value || '',
                addressCity: elements.addressCity?.value || '',
                videoLinks: exportVideoLinkValues(),
                pricePurchase: elements.pricePurchase?.value || '',
                priceMinimum: elements.priceMinimum?.value || '',
                priceBid: elements.priceBid?.value || '',
                auctionLength: elements.auctionLength?.value || '',
                auctionClosing: elements.auctionClosing?.value || ''
            }
        };
        return snapshot;
    }

    function restoreFormFromSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }
        if (Array.isArray(snapshot.photos)) {
            state.photos = clonePhotos(snapshot.photos);
            ensurePrimaryPhoto();
            renderPhotoGallery();
            updatePhotoNextState();
        }
        const snapshotSpecifications = Array.isArray(snapshot.specifications)
            ? snapshot.specifications
            : Array.isArray(snapshot.form?.specifications)
                ? snapshot.form.specifications
                : [];
        state.specificationSelections = importSpecificationSelections(snapshotSpecifications);
        if (Array.isArray(snapshot.categoryPathIds)) {
            state.categoryPath = buildCategoryPathFromIds(snapshot.categoryPathIds);
            syncCategoryStateFromPath();
            renderCategoryLevels();
            syncCategoryStateFromPath();
            updateCategoryNextState();
        } else if (snapshot.category) {
            const legacyIds = legacyCategoryToIds(snapshot.category);
            state.categoryPath = buildCategoryPathFromIds(legacyIds);
            syncCategoryStateFromPath();
            renderCategoryLevels();
            syncCategoryStateFromPath();
            updateCategoryNextState();
        }
        renderSpecificationFields();
        updateSubtitleFeeHint();
        if (snapshot.form) {
            safeSetValue('adTitleAr', snapshot.form.adTitleAr);
            safeSetValue('adSubtitleAr', snapshot.form.adSubtitleAr);
            safeSetValue('adDetailsAr', snapshot.form.adDetailsAr);
            safeSetValue('adTitleEn', snapshot.form.adTitleEn);
            safeSetValue('adDetailsEn', snapshot.form.adDetailsEn);
            setRadioValue('itemStatus', snapshot.form.itemStatus);
            if (elements.addressCountry) {
                elements.addressCountry.value = snapshot.form.addressCountry || '';
                handleCountryChange({ target: elements.addressCountry });
            }
            if (elements.addressRegion) {
                elements.addressRegion.value = snapshot.form.addressRegion || '';
                handleRegionChange({ target: elements.addressRegion });
            }
            if (elements.addressCity) {
                elements.addressCity.value = snapshot.form.addressCity || '';
            }
            if (elements.pricePurchase) {
                elements.pricePurchase.value = snapshot.form.pricePurchase || '';
            }
            if (elements.priceMinimum) {
                elements.priceMinimum.value = snapshot.form.priceMinimum || '';
            }
            if (elements.priceBid) {
                elements.priceBid.value = snapshot.form.priceBid || '';
            }
            if (elements.auctionLength) {
                elements.auctionLength.value = snapshot.form.auctionLength || '1';
            }
            if (elements.auctionClosing) {
                elements.auctionClosing.value = snapshot.form.auctionClosing || '';
            }
        }
        const restoredVideoLinks = (() => {
            if (Array.isArray(snapshot.videoLinks) && snapshot.videoLinks.length) {
                return cloneVideoLinks(snapshot.videoLinks);
            }
            if (snapshot.form) {
                if (Array.isArray(snapshot.form.videoLinks) && snapshot.form.videoLinks.length) {
                    return cloneVideoLinks(snapshot.form.videoLinks);
                }
                if (typeof snapshot.form.videoLink === 'string' && snapshot.form.videoLink.trim()) {
                    return cloneVideoLinks([snapshot.form.videoLink]);
                }
            }
            return [];
        })();
        state.videoLinks = restoredVideoLinks;
        renderVideoLinks();
        if (elements.quantityInput) {
            elements.quantityInput.value = snapshot.quantity || '1';
        }
        const englishToggle = document.getElementById('enableEnglishInfo');
        if (englishToggle) {
            englishToggle.checked = Boolean(snapshot.englishInfoEnabled);
        }
        if (snapshot.saleFees) {
            if (elements.saleFixedToggle) elements.saleFixedToggle.checked = Boolean(snapshot.saleFees.fixed);
            if (elements.saleAuctionToggle) elements.saleAuctionToggle.checked = Boolean(snapshot.saleFees.auction);
            if (elements.saleNegotiableToggle) elements.saleNegotiableToggle.checked = Boolean(snapshot.saleFees.negotiable);
            handleSaleToggleUpdate();
        }
        if (Array.isArray(snapshot.paymentMethods)) {
            state.paymentMethods = new Set(snapshot.paymentMethods.length ? snapshot.paymentMethods : ['visa']);
            if (elements.paymentMethodList) {
                elements.paymentMethodList.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    const method = input.getAttribute('data-payment-toggle');
                    input.checked = method ? state.paymentMethods.has(method) : input.checked;
                });
            }
        }
        applyCheckedAttributes('#paymentOptions input[type="checkbox"]', 'data-method', snapshot.paymentOptions);
        applyCheckedAttributes('input[type="checkbox"][data-shipping-option]', 'data-shipping-option', snapshot.shippingOptions);
        applyCheckedAttributes('input[type="checkbox"][data-shipping]', 'data-shipping', snapshot.pickupOptions);
        updateFeeSummary();
        updatePointsSummary();
    }

    function clonePhotos(photos) {
        if (!Array.isArray(photos)) {
            return [];
        }
        return photos
            .map(photo => {
                const dataUrl = photo?.dataUrl || '';
                if (!dataUrl) {
                    return null;
                }
                const id = photo?.id ? String(photo.id) : generatePhotoId();
                const name = photo?.name || '';
                const isPrimary = Boolean(photo?.isPrimary);
                return { id, name, dataUrl, isPrimary };
            })
            .filter(Boolean);
    }

    function safeSetValue(id, value) {
        const field = document.getElementById(id);
        if (field) {
            field.value = value || '';
        }
    }

    function getFieldValue(id) {
        const field = document.getElementById(id);
        return field ? field.value || '' : '';
    }

    function getRadioValue(name) {
        const input = document.querySelector(`input[name="${name}"]:checked`);
        return input ? input.value : '';
    }

    function setRadioValue(name, value) {
        if (!value) {
            return;
        }
        const escaped = escapeCssValue(value);
        const target = document.querySelector(`input[name="${name}"][value="${escaped}"]`);
        if (target) {
            target.checked = true;
        }
    }

    function collectCheckedAttributes(selector, attribute) {
        return Array.from(document.querySelectorAll(selector))
            .filter(node => node instanceof HTMLInputElement && node.checked)
            .map(node => attribute === 'value' ? node.value : node.getAttribute(attribute))
            .filter(Boolean);
    }

    function applyCheckedAttributes(selector, attribute, values) {
        const selection = new Set(Array.isArray(values) ? values : []);
        document.querySelectorAll(selector).forEach(node => {
            if (!(node instanceof HTMLInputElement)) {
                return;
            }
            const key = attribute === 'value' ? node.value : node.getAttribute(attribute);
            node.checked = selection.has(key);
        });
    }

    function escapeCssValue(value) {
        if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
            return CSS.escape(value);
        }
        return String(value || '').replace(/"/g, '\\"');
    }


    function collectCheckedLabels(selector) {
        return Array.from(document.querySelectorAll(selector))
            .filter(node => node instanceof HTMLInputElement && node.checked)
            .map(node => {
                const label = node.closest('label');
                if (label) {
                    return label.textContent.replace(/\s+/g, ' ').trim();
                }
                const dataLabel = node.getAttribute('data-method') || node.value;
                return dataLabel ? dataLabel.replace(/[-_]/g, ' ') : 'Option';
            });
    }

    function formatCurrency(value) {
        const amount = Number.parseFloat(value);
        if (!Number.isFinite(amount) || amount <= 0) {
            return '—';
        }
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
    }

    function formatCurrencyValue(amount) {
        const numeric = Number.isFinite(amount) ? amount : Number.parseFloat(amount);
        const safe = Number.isFinite(numeric) ? numeric : 0;
        return `${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
    }

    function isValidHttpUrl(value) {
        if (typeof value !== 'string') {
            return false;
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return false;
        }
        try {
            const url = new URL(trimmed);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    function formatList(list, fallback = '—', joiner = ', ') {
        const values = (Array.isArray(list) ? list : [list])
            .map(entry => typeof entry === 'string' ? entry.trim() : entry)
            .filter(entry => Boolean(entry));
        if (!values.length) {
            return fallback;
        }
        return values.join(joiner);
    }

    function truncateText(value, maxLength) {
        const text = String(value || '').trim();
        if (!text) {
            return '';
        }
        if (text.length <= maxLength) {
            return text;
        }
        return `${text.slice(0, maxLength - 1).trimEnd()}…`;
    }

    function capitalizeWord(value) {
        const text = String(value || '').trim();
        if (!text) {
            return '';
        }
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function generateAdId() {
        const existing = loadDataset(PRODUCT_ADS_KEY);
        const ids = existing
            .map(entry => entry && typeof entry.id === 'string' ? entry.id : null)
            .filter(Boolean)
            .map(id => {
                const match = id.match(/AD-(\d+)/i);
                return match ? Number.parseInt(match[1], 10) : NaN;
            })
            .filter(Number.isFinite);
        const next = ids.length ? Math.max(...ids) + 1 : 1200;
        return `AD-${String(next).padStart(4, '0')}`;
    }

    function getFallbackImageForCategory(category) {
        const normalized = (category || '').toLowerCase();
        if (normalized.includes('mobile') || normalized.includes('phone')) {
            return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80';
        }
        if (normalized.includes('fashion')) {
            return 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80';
        }
        if (normalized.includes('service')) {
            return 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80';
        }
        return 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';
    }

    function loadDataset(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn(`Unable to read dataset for ${key}`, error);
            return [];
        }
    }

    function saveDataset(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn(`Unable to save dataset for ${key}`, error);
        }
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
        }, 2600);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDateShort(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'Soon';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDateTime(value) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
})();
