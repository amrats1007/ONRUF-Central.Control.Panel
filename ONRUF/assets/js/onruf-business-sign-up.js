(function () {
    'use strict';

    const LOCATION_MATRIX = {
        'Saudi Arabia': {
            'Riyadh Province': ['Riyadh', 'Al Kharj', 'Al Majmaah'],
            'Makkah Province': ['Jeddah', 'Makkah', 'Taif'],
            'Eastern Province': ['Dammam', 'Khobar', 'Dhahran']
        }
    };
    const BUSINESS_ACCOUNTS_KEY = 'onruf_business_accounts_v1';
    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';

    const elements = {};
    let isSubmitting = false;

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        cacheElements();
        attachLanguageToggle();
        attachDocTypeToggle();
        attachFilePickers();
        attachFormHandler();
        populateCountryOptions();
        updateRegionOptions();
        updateCityOptions();
    }

    function cacheElements() {
        elements.form = document.getElementById('businessSignupForm');
        elements.logoInput = document.getElementById('businessLogo');
        elements.logoBtn = document.getElementById('businessLogoBtn');
        elements.logoHint = document.getElementById('businessLogoHint');
        elements.certificateInput = document.getElementById('certificateUpload');
        elements.certificateBtn = document.getElementById('certificateUploadBtn');
        elements.certificateHint = document.getElementById('certificateUploadHint');
        elements.docTypeButtons = Array.from(document.querySelectorAll('[data-doc-type]'));
        elements.docTypeValue = document.getElementById('docTypeValue');
        elements.countrySelect = document.getElementById('businessCountry');
        elements.regionSelect = document.getElementById('businessRegion');
        elements.citySelect = document.getElementById('businessCity');
        elements.toast = document.getElementById('businessToast');
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

    function attachDocTypeToggle() {
        if (!elements.docTypeButtons || !elements.docTypeButtons.length) {
            return;
        }
        elements.docTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                elements.docTypeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (elements.docTypeValue) {
                    elements.docTypeValue.value = button.getAttribute('data-doc-type') || 'commercial';
                }
            });
        });
    }

    function attachFilePickers() {
        if (elements.logoBtn && elements.logoInput) {
            elements.logoBtn.addEventListener('click', () => {
                elements.logoInput.click();
            });
            elements.logoInput.addEventListener('change', () => {
                updateFileHint(elements.logoInput, elements.logoHint);
            });
        }
        if (elements.certificateBtn && elements.certificateInput) {
            elements.certificateBtn.addEventListener('click', () => {
                elements.certificateInput.click();
            });
            elements.certificateInput.addEventListener('change', () => {
                updateFileHint(elements.certificateInput, elements.certificateHint);
            });
        }
    }

    function attachFormHandler() {
        if (!elements.form) {
            return;
        }
        elements.form.addEventListener('submit', async event => {
            event.preventDefault();
            if (isSubmitting) {
                return;
            }
            const formData = collectBusinessFormData();
            if (!formData) {
                return;
            }

            let logoDataUrl = null;
            if (typeof File !== 'undefined' && formData.logoFile instanceof File) {
                try {
                    logoDataUrl = await readFileAsDataUrl(formData.logoFile);
                } catch (error) {
                    console.warn('Unable to read business logo file', error);
                    showToast('error', 'Unable to read the business logo. Please try again.');
                    return;
                }
            }

            const sanitizedFormData = { ...formData, logoDataUrl };
            delete sanitizedFormData.logoFile;

            const existingAccounts = loadBusinessAccounts();
            const accountId = generateBusinessAccountId(existingAccounts);
            const payload = createBusinessAccountPayload(sanitizedFormData, accountId);

            existingAccounts.push(payload);
            saveBusinessAccounts(existingAccounts);
            linkBusinessAccountToCurrentIndividual(payload);

            isSubmitting = true;
            showToast('success', 'Business registration submitted. Redirecting to ONRUF…', 2600);
            setTimeout(() => {
                window.location.href = 'onruf-platform.html';
            }, 1500);
        });
    }

    function populateCountryOptions() {
        if (!elements.countrySelect) {
            return;
        }
        const countries = Object.keys(LOCATION_MATRIX);
        elements.countrySelect.innerHTML = countries
            .map(country => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`)
            .join('');
        if (elements.countrySelect.options.length) {
            elements.countrySelect.selectedIndex = 0;
        }
        elements.countrySelect.addEventListener('change', () => {
            updateRegionOptions();
            updateCityOptions();
        });
    }

    function updateRegionOptions() {
        if (!elements.regionSelect || !elements.countrySelect) {
            return;
        }
        const country = elements.countrySelect.value;
        const regions = LOCATION_MATRIX[country] ? Object.keys(LOCATION_MATRIX[country]) : [];
        elements.regionSelect.innerHTML = regions
            .map(region => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`)
            .join('');
        if (elements.regionSelect.options.length) {
            elements.regionSelect.selectedIndex = 0;
        }
        elements.regionSelect.onchange = updateCityOptions;
    }

    function updateCityOptions() {
        if (!elements.citySelect || !elements.regionSelect || !elements.countrySelect) {
            return;
        }
        const country = elements.countrySelect.value;
        const region = elements.regionSelect.value;
        const cities = LOCATION_MATRIX[country] && LOCATION_MATRIX[country][region]
            ? LOCATION_MATRIX[country][region]
            : [];
        elements.citySelect.innerHTML = cities
            .map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)
            .join('');
        if (elements.citySelect.options.length) {
            elements.citySelect.selectedIndex = 0;
        }
    }

    function updateFileHint(input, hint, reset) {
        if (!hint) {
            return;
        }
        if (!input || reset) {
            hint.textContent = 'No file selected';
            return;
        }
        if (!input.files || !input.files.length) {
            hint.textContent = 'No file selected';
            return;
        }
        const names = Array.from(input.files).map(file => file.name).join(', ');
        hint.textContent = names;
    }

    function collectBusinessFormData() {
        const companyNameArabicInput = document.getElementById('companyNameArabic');
        const companyNameEnglishInput = document.getElementById('companyNameEnglish');
        const userNameInput = document.getElementById('businessUserName');
        const registrationNumberInput = document.getElementById('registrationNumber');
        const emailInput = document.getElementById('businessEmail');
        const detailRegNumberInput = document.getElementById('detailRegNumber');
        const expiryDateInput = document.getElementById('expiryDate');
        const vatNumberInput = document.getElementById('vatNumber');
        const websiteInput = document.getElementById('businessWebsite');
        const facebookInput = document.getElementById('facebookUrl');
        const instagramInput = document.getElementById('instagramUrl');
        const twitterInput = document.getElementById('twitterUrl');
        const youtubeInput = document.getElementById('youtubeUrl');
        const linkedinInput = document.getElementById('linkedinUrl');
        const snapchatInput = document.getElementById('snapchatUrl');
        const tiktokInput = document.getElementById('tiktokUrl');
        const maroofInput = document.getElementById('maroofUrl');
        const districtInput = document.getElementById('businessDistrict');
        const streetInput = document.getElementById('businessStreet');
        const zipInput = document.getElementById('businessZip');
        const tradeToggle = document.getElementById('tradeToggle');

        const companyNameArabic = getTrimmedValue(companyNameArabicInput);
        if (!companyNameArabic) {
            return focusWithMessage(companyNameArabicInput, 'Enter the company name in Arabic.');
        }

        const companyNameEnglish = getTrimmedValue(companyNameEnglishInput);
        if (!companyNameEnglish) {
            return focusWithMessage(companyNameEnglishInput, 'Enter the company name in English.');
        }

        const registrationNumber = getTrimmedValue(registrationNumberInput);
        if (!registrationNumber) {
            return focusWithMessage(registrationNumberInput, 'Enter the business registration number.');
        }

        const email = getTrimmedValue(emailInput);
        if (!email || !validateEmail(email)) {
            showToast('error', 'Enter a valid email address.');
            emailInput?.focus();
            return null;
        }

        const detailRegNumber = getTrimmedValue(detailRegNumberInput);
        if (!detailRegNumber) {
            return focusWithMessage(detailRegNumberInput, 'Enter the detailed registration number.');
        }

        const expiryDate = expiryDateInput?.value || '';
        if (!expiryDate) {
            showToast('error', 'Select the registration expiry date.');
            expiryDateInput?.focus();
            return null;
        }

        const vatNumber = getTrimmedValue(vatNumberInput);
        if (!vatNumber) {
            return focusWithMessage(vatNumberInput, 'Enter the VAT number.');
        }

        const country = getTrimmedValue(elements.countrySelect);
        if (!country) {
            showToast('error', 'Select a country.');
            elements.countrySelect?.focus();
            return null;
        }

        const region = getTrimmedValue(elements.regionSelect);
        if (!region) {
            showToast('error', 'Select a region.');
            elements.regionSelect?.focus();
            return null;
        }

        const city = getTrimmedValue(elements.citySelect);
        if (!city) {
            showToast('error', 'Select a city.');
            elements.citySelect?.focus();
            return null;
        }

        const district = getTrimmedValue(districtInput);
        if (!district) {
            return focusWithMessage(districtInput, 'Enter the district name.');
        }

        const street = getTrimmedValue(streetInput);
        if (!street) {
            return focusWithMessage(streetInput, 'Enter the street number and name.');
        }

        const zip = getTrimmedValue(zipInput);
        if (!zip) {
            return focusWithMessage(zipInput, 'Enter the zip code.');
        }

        const certificateFiles = elements.certificateInput && elements.certificateInput.files
            ? Array.from(elements.certificateInput.files)
            : [];
        if (!certificateFiles.length) {
            showToast('error', 'Upload at least one certificate.');
            elements.certificateBtn?.focus();
            return null;
        }

        const documentType = elements.docTypeValue?.value || 'commercial';
        const userName = getTrimmedValue(userNameInput);
        const certificateNames = certificateFiles.map(file => file.name);
        const website = getTrimmedValue(websiteInput);
        const socials = {
            facebook: getTrimmedValue(facebookInput),
            instagram: getTrimmedValue(instagramInput),
            twitter: getTrimmedValue(twitterInput),
            youtube: getTrimmedValue(youtubeInput),
            linkedin: getTrimmedValue(linkedinInput),
            snapchat: getTrimmedValue(snapchatInput),
            tiktok: getTrimmedValue(tiktokInput)
        };
        const maroofUrl = getTrimmedValue(maroofInput);
        const logoFile = elements.logoInput && elements.logoInput.files && elements.logoInput.files[0]
            ? elements.logoInput.files[0]
            : null;
        const logoFileName = logoFile ? logoFile.name : '';
        const tradeExperience = Boolean(tradeToggle?.checked);

        return {
            companyNameArabic,
            companyNameEnglish,
            userName,
            registrationNumber,
            email: email.toLowerCase(),
            detailRegNumber,
            expiryDate,
            vatNumber,
            website,
            socials,
            maroofUrl,
            country,
            region,
            city,
            district,
            street,
            zip,
            documentType,
            certificateNames,
            tradeExperience,
            logoFileName,
            logoFile
        };
    }

    function getTrimmedValue(element) {
        if (!element || typeof element.value !== 'string') {
            return '';
        }
        return element.value.trim();
    }

    function focusWithMessage(element, message) {
        showToast('error', message);
        element?.focus();
        return null;
    }

    function validateEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
    }

    function normalizeEmail(value) {
        return typeof value === 'string' ? value.trim().toLowerCase() : '';
    }

    function loadBusinessAccounts() {
        try {
            const raw = localStorage.getItem(BUSINESS_ACCOUNTS_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.slice() : [];
        } catch (error) {
            console.warn('Unable to read business accounts dataset', error);
            return [];
        }
    }

    function saveBusinessAccounts(accounts) {
        try {
            localStorage.setItem(BUSINESS_ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch (error) {
            console.warn('Unable to persist business accounts dataset', error);
        }
    }

    function linkBusinessAccountToCurrentIndividual(businessAccount) {
        if (!businessAccount || typeof businessAccount !== 'object') {
            return;
        }

        const session = readActiveIndividualSession();
        if (!session) {
            return;
        }

        const accounts = loadIndividualAccounts();
        if (!accounts.length) {
            return;
        }

        const sessionAccountId = typeof session.accountId === 'string' && session.accountId.trim()
            ? session.accountId.trim()
            : '';
        const sessionEmail = normalizeEmail(session.email);

        let targetAccount = null;
        if (sessionAccountId) {
            targetAccount = accounts.find(account => typeof account?.id === 'string' && account.id.trim() === sessionAccountId) || null;
        }
        if (!targetAccount && sessionEmail) {
            targetAccount = accounts.find(account => normalizeEmail(account?.email) === sessionEmail) || null;
        }
        if (!targetAccount) {
            return;
        }

        const businessId = typeof businessAccount.id === 'string' && businessAccount.id.trim()
            ? businessAccount.id.trim()
            : '';
        if (!businessId) {
            return;
        }

        const associationName = businessAccount.companyName || businessAccount.contactName || businessId;
        const associationLogo = typeof businessAccount.logoDataUrl === 'string' && businessAccount.logoDataUrl.trim()
            ? businessAccount.logoDataUrl.trim()
            : null;
        const associationLogoName = typeof businessAccount.logoFileName === 'string' && businessAccount.logoFileName.trim()
            ? businessAccount.logoFileName.trim()
            : '';
        const nowIso = new Date().toISOString();
        const existingAssociations = Array.isArray(targetAccount.businessAssociations)
            ? targetAccount.businessAssociations.slice()
            : [];

        let associationExists = false;
        const updatedAssociations = existingAssociations.map(entry => {
            const candidateId = extractAssociationBusinessId(entry);
            if (candidateId && candidateId === businessId) {
                associationExists = true;
                const base = entry && typeof entry === 'object' ? entry : {};
                return {
                    ...base,
                    businessId,
                    businessAccountId: base.businessAccountId || businessId,
                    companyName: associationName,
                    relationship: base.relationship || 'Owner',
                    linkedAt: base.linkedAt || nowIso,
                    logoDataUrl: associationLogo || base.logoDataUrl || null,
                    logoFileName: associationLogoName || base.logoFileName || ''
                };
            }
            return entry;
        });

        if (!associationExists) {
            updatedAssociations.push({
                businessId,
                businessAccountId: businessId,
                companyName: associationName,
                relationship: 'Owner',
                linkedAt: nowIso,
                logoDataUrl: associationLogo,
                logoFileName: associationLogoName
            });

            if (!Array.isArray(targetAccount.activityLog)) {
                targetAccount.activityLog = [];
            }
            targetAccount.activityLog.push({
                id: `biz-link-${businessId}-${Date.now()}`,
                action: 'business-link',
                label: 'Business account linked',
                context: `Linked ${associationName} via marketplace signup.`,
                actor: 'Marketplace signup',
                timestamp: nowIso
            });
        }

        targetAccount.businessAssociations = updatedAssociations;
        saveIndividualAccounts(accounts);
    }

    function loadIndividualAccounts() {
        try {
            const raw = localStorage.getItem(INDIVIDUAL_ACCOUNTS_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Unable to read individual accounts dataset', error);
            return [];
        }
    }

    function saveIndividualAccounts(accounts) {
        try {
            localStorage.setItem(INDIVIDUAL_ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch (error) {
            console.warn('Unable to persist individual accounts dataset', error);
        }
    }

    function readActiveIndividualSession() {
        try {
            const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('Unable to read individual login session', error);
            return null;
        }
    }

    function extractAssociationBusinessId(entry) {
        if (!entry) {
            return '';
        }
        if (typeof entry === 'string') {
            return entry.trim();
        }
        if (typeof entry.businessId === 'string' && entry.businessId.trim()) {
            return entry.businessId.trim();
        }
        if (typeof entry.businessAccountId === 'string' && entry.businessAccountId.trim()) {
            return entry.businessAccountId.trim();
        }
        if (typeof entry.id === 'string' && entry.id.trim()) {
            return entry.id.trim();
        }
        return '';
    }

    function generateBusinessAccountId(accounts) {
        const base = 'BUS-';
        let maxNumeric = 3000;
        accounts.forEach(account => {
            if (!account || typeof account.id !== 'string') {
                return;
            }
            const match = account.id.match(/BUS-(\d+)/i);
            if (match) {
                const value = parseInt(match[1], 10);
                if (!Number.isNaN(value) && value > maxNumeric) {
                    maxNumeric = value;
                }
            }
        });
        const next = maxNumeric + 1;
        return `${base}${String(next).padStart(4, '0')}`;
    }

    function createBusinessAccountPayload(formData, accountId) {
        const now = new Date();
        const nowIso = now.toISOString();
        const historyEntry = {
            id: `evt-${accountId}-${now.getTime()}`,
            action: 'request-submitted',
            timestamp: nowIso,
            actor: formData.companyNameEnglish || formData.companyNameArabic || formData.userName || 'Applicant',
            context: `Business registration submitted via ONRUF marketplace. CR: ${formData.registrationNumber || 'N/A'}.`
        };

        const logoFileName = typeof formData.logoFileName === 'string' && formData.logoFileName.trim()
            ? formData.logoFileName.trim()
            : null;
        const logoDataUrl = typeof formData.logoDataUrl === 'string' && formData.logoDataUrl.trim().startsWith('data:')
            ? formData.logoDataUrl.trim()
            : null;
        const addressPayload = {
            country: formData.country || '',
            region: formData.region || '',
            city: formData.city || '',
            district: formData.district || '',
            street: formData.street || '',
            zipCode: formData.zip || '',
            zip: formData.zip || ''
        };

        return {
            id: accountId,
            companyName: formData.companyNameEnglish || formData.companyNameArabic,
            contactName: formData.userName || formData.companyNameEnglish || formData.companyNameArabic,
            email: formData.email,
            phone: '',
            city: formData.city || 'Riyadh',
            status: 'pending',
            submittedAt: nowIso,
            approvedAt: null,
            packageId: '',
            requestedDocuments: formData.certificateNames.map(name => `Certificate: ${name}`),
            invoices: [],
            autoRenew: false,
            financialStatus: 'pending',
            history: [historyEntry],
            registrationNumber: formData.registrationNumber,
            detailRegistrationNumber: formData.detailRegNumber,
            registrationDocumentType: formData.documentType,
            expiryDate: formData.expiryDate,
            vatNumber: formData.vatNumber,
            maroofUrl: formData.maroofUrl,
            tradeExperience15Years: Boolean(formData.tradeExperience),
            certificates: formData.certificateNames.slice(),
            address: addressPayload,
            socials: { ...(formData.socials || {}) },
            logoFileName,
            logoDataUrl,
            application: {
                companyNameArabic: formData.companyNameArabic,
                companyNameEnglish: formData.companyNameEnglish,
                userName: formData.userName,
                registrationNumber: formData.registrationNumber,
                detailRegistrationNumber: formData.detailRegNumber,
                expiryDate: formData.expiryDate,
                vatNumber: formData.vatNumber,
                documentType: formData.documentType,
                website: formData.website,
                socials: formData.socials,
                maroofUrl: formData.maroofUrl,
                tradeExperience15Years: formData.tradeExperience,
                uploadedCertificates: formData.certificateNames,
                logoFileName,
                logoDataUrl,
                address: addressPayload
            }
        };
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = event => {
                const result = event?.target?.result;
                resolve(typeof result === 'string' ? result : null);
            };
            reader.onerror = () => {
                reader.abort();
                reject(new Error('File reading failed'));
            };
            reader.readAsDataURL(file);
        });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showToast(type, message, duration = 3000) {
        if (!elements.toast) {
            window.alert(message);
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
