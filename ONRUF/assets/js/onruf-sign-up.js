(function () {
    'use strict';

    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';
    const OTP_LENGTH = 4;
    const OTP_EXPIRY_MS = 2 * 60 * 1000;
    const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    const DEFAULT_INDIVIDUAL_ACCOUNTS = [
        {
            id: 'IND-2001',
            fullName: 'Sara Al-Qahtani',
            email: 'sara.alqahtani@example.com',
            mobile: '+966512345678',
            city: 'Riyadh',
            status: 'active',
            balance: 2450.75,
            adsCount: 11,
            pendingAds: 2,
            createdAt: '2025-04-18T07:50:00.000Z',
            lastActiveAt: '2025-10-26T16:30:00.000Z',
            permissions: { autoPosting: true, manualReview: false },
            subscriptions: [
                { name: 'Featured Ads Boost', status: 'active', renewsAt: '2025-12-01T00:00:00.000Z' }
            ],
            financialHistory: [
                { id: 'txn-2001-1', label: 'Wallet Top-up', amount: 1200, type: 'credit', timestamp: '2025-09-01T09:20:00.000Z' },
                { id: 'txn-2001-2', label: 'Ad Publishing Fee', amount: -150, type: 'debit', timestamp: '2025-09-10T12:00:00.000Z' }
            ],
            supportRequests: [],
            notes: 'Prefers SMS notifications.'
        },
        {
            id: 'IND-2078',
            fullName: 'Hassan Al-Mutairi',
            email: 'hassan.mutairi@example.com',
            mobile: '+966598887766',
            city: 'Jeddah',
            status: 'frozen',
            balance: 520,
            adsCount: 4,
            pendingAds: 0,
            createdAt: '2025-05-11T10:05:00.000Z',
            lastActiveAt: '2025-09-30T21:15:00.000Z',
            permissions: { autoPosting: false, manualReview: true },
            subscriptions: [
                { name: 'Auto Renew Ads', status: 'paused', renewsAt: '2025-11-15T00:00:00.000Z' }
            ],
            financialHistory: [
                { id: 'txn-2078-1', label: 'Manual Adjustment', amount: -80, type: 'debit', timestamp: '2025-09-28T08:45:00.000Z' }
            ],
            supportRequests: [
                { id: 'support-2078-1', reason: 'Fraud review', expiresAt: '2025-11-01T00:00:00.000Z', requestedAt: '2025-10-02T12:10:00.000Z', status: 'pending' }
            ],
            notes: 'Account frozen pending identity confirmation.'
        },
        {
            id: 'IND-2110',
            fullName: 'Maya Al-Salem',
            email: 'maya.alsalem@example.com',
            mobile: '+966533112244',
            city: 'Dammam',
            status: 'pending',
            balance: 0,
            adsCount: 0,
            pendingAds: 1,
            createdAt: '2025-10-10T13:25:00.000Z',
            lastActiveAt: '2025-10-10T13:25:00.000Z',
            permissions: { autoPosting: false, manualReview: true },
            subscriptions: [],
            financialHistory: [],
            supportRequests: [],
            notes: 'Awaiting OTP verification.'
        }
    ];

    const LOCATION_MATRIX = {
        'Saudi Arabia': {
            'Riyadh Province': ['Riyadh', 'Al Kharj', 'Al Majmaah'],
            'Makkah Province': ['Jeddah', 'Makkah', 'Taif'],
            'Eastern Province': ['Dammam', 'Khobar', 'Dhahran']
        }
    };

    const state = {
        currentStep: 1,
        generatedOtp: null,
        otpExpiresAt: null,
        countdownTimer: null,
        basicInfo: null,
        profilePreview: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        elements.stepAccount = document.getElementById('signUpStepAccount');
        elements.stepOtp = document.getElementById('signUpStepOtp');
        elements.stepProfile = document.getElementById('signUpStepProfile');
        elements.stepSuccess = document.getElementById('signUpStepSuccess');

        elements.basicInfoForm = document.getElementById('basicInfoForm');
        elements.otpForm = document.getElementById('otpForm');
        elements.profileForm = document.getElementById('profileForm');
        elements.phoneDisplay = document.getElementById('otpPhoneDisplay');
        elements.otpInputs = Array.from(document.querySelectorAll('.otp-inputs input'));
        elements.otpCountdown = document.getElementById('otpCountdown');
        elements.otpResendBtn = document.getElementById('otpResendBtn');
        elements.otpBackBtn = document.getElementById('otpBackBtn');
        elements.toast = document.getElementById('signupToast');
        elements.successName = document.getElementById('successName');
        elements.uploadPreview = document.getElementById('profilePreview');
        elements.countrySelect = document.getElementById('profileCountry');
        elements.regionSelect = document.getElementById('profileRegion');
        elements.citySelect = document.getElementById('profileCity');

        if (!elements.stepAccount || !elements.basicInfoForm || !elements.toast) {
            return;
        }

        attachLanguageToggle();
        attachPasswordToggles();
        attachOtpHandlers();
        attachForms();
        populateCountryOptions();
        updateRegionOptions();
        updateCityOptions();

        showStep(1);
    }

    function attachForms() {
        elements.basicInfoForm.addEventListener('submit', handleBasicInfoSubmit);
        if (elements.otpForm) {
            elements.otpForm.addEventListener('submit', handleOtpSubmit);
        }
        if (elements.profileForm) {
            elements.profileForm.addEventListener('submit', handleProfileSubmit);
        }
        if (elements.otpResendBtn) {
            elements.otpResendBtn.addEventListener('click', handleOtpResend);
        }
        if (elements.otpBackBtn) {
            elements.otpBackBtn.addEventListener('click', () => {
                stopOtpCountdown();
                showStep(1);
            });
        }
        const country = document.getElementById('profileCountry');
        if (country) {
            country.addEventListener('change', () => {
                updateRegionOptions();
                updateCityOptions();
            });
        }
        const region = document.getElementById('profileRegion');
        if (region) {
            region.addEventListener('change', updateCityOptions);
        }
        const photoInput = document.getElementById('profilePhoto');
        if (photoInput) {
            photoInput.addEventListener('change', handlePhotoPreview);
        }
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

    function attachOtpHandlers() {
        if (!elements.otpInputs) {
            return;
        }
        elements.otpInputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                const sanitized = input.value.replace(/\D/g, '').slice(0, 1);
                input.value = sanitized;
                if (sanitized && index < elements.otpInputs.length - 1) {
                    elements.otpInputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', event => {
                if (event.key === 'Backspace' && !input.value && index > 0) {
                    elements.otpInputs[index - 1].focus();
                    elements.otpInputs[index - 1].value = '';
                    event.preventDefault();
                }
            });
        });
    }

    function populateCountryOptions() {
        if (!elements.countrySelect) {
            return;
        }
        const countries = Object.keys(LOCATION_MATRIX);
        const options = countries.map(country => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`);
        elements.countrySelect.innerHTML = options.join('');
        elements.countrySelect.value = countries[0] || '';
    }

    function updateRegionOptions() {
        if (!elements.countrySelect || !elements.regionSelect) {
            return;
        }
        const country = elements.countrySelect.value;
        const regions = LOCATION_MATRIX[country] ? Object.keys(LOCATION_MATRIX[country]) : [];
        const options = regions.map(region => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`);
        elements.regionSelect.innerHTML = options.join('');
        elements.regionSelect.value = regions[0] || '';
    }

    function updateCityOptions() {
        if (!elements.countrySelect || !elements.regionSelect || !elements.citySelect) {
            return;
        }
        const country = elements.countrySelect.value;
        const region = elements.regionSelect.value;
        const cities = LOCATION_MATRIX[country] && LOCATION_MATRIX[country][region]
            ? LOCATION_MATRIX[country][region]
            : [];
        const options = cities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`);
        elements.citySelect.innerHTML = options.join('');
        elements.citySelect.value = cities[0] || '';
    }

    function handlePhotoPreview(event) {
        if (!elements.uploadPreview) {
            return;
        }
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        if (!file) {
            elements.uploadPreview.textContent = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'Profile photo must be 5 MB or smaller.');
            event.target.value = '';
            elements.uploadPreview.textContent = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            state.profilePreview = reader.result;
            elements.uploadPreview.textContent = `${file.name}`;
        };
        reader.onerror = () => {
            showToast('error', 'Unable to preview the selected photo.');
            state.profilePreview = null;
            elements.uploadPreview.textContent = '';
        };
        reader.readAsDataURL(file);
    }

    function handleBasicInfoSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const userNameInput = form.querySelector('#basicUserName');
        const emailInput = form.querySelector('#basicEmail');
        const passwordInput = form.querySelector('#basicPassword');
        const confirmInput = form.querySelector('#basicPasswordConfirm');
        const invitationInput = form.querySelector('#invitationCode');
        const phoneInput = form.querySelector('#basicPhone');
        const termsCheckbox = form.querySelector('#termsToggle');

        const userName = (userNameInput?.value || '').trim();
        const email = (emailInput?.value || '').trim();
        const password = passwordInput?.value || '';
        const confirmPassword = confirmInput?.value || '';
        const invitationCode = (invitationInput?.value || '').trim();
        const phoneRaw = (phoneInput?.value || '').trim();
        const phone = normalizePhone('+966', phoneRaw);

        if (!userName) {
            showToast('error', 'Enter your user name to continue.');
            userNameInput?.focus();
            return;
        }
        if (!email || !validateEmail(email)) {
            showToast('error', 'Please enter a valid email address.');
            emailInput?.focus();
            return;
        }
        if (!password) {
            showToast('error', 'Create a password to continue.');
            passwordInput?.focus();
            return;
        }
        if (!PASSWORD_POLICY_REGEX.test(password)) {
            showToast('error', 'Password must include upper and lower case letters, a number, and be at least 8 characters.');
            passwordInput?.focus();
            return;
        }
        if (!confirmPassword || confirmPassword !== password) {
            showToast('error', 'Password confirmation does not match.');
            confirmInput?.focus();
            return;
        }
        if (!phone) {
            showToast('error', 'Enter a valid Saudi mobile number.');
            phoneInput?.focus();
            return;
        }
        if (!termsCheckbox?.checked) {
            showToast('error', 'Please agree to the terms to sign up.');
            termsCheckbox?.focus();
            return;
        }

        state.basicInfo = {
            userName,
            email: email.toLowerCase(),
            password,
            invitationCode: invitationCode || null,
            phone
        };

        state.generatedOtp = generateOtp();
        state.otpExpiresAt = Date.now() + OTP_EXPIRY_MS;
        resetOtpInputs();
        updateOtpPhoneDisplay(phone);
        startOtpCountdown();
        showToast('success', 'Information Saved. A One-Time Verification Code has been sent to your Phone Number');
        console.log(`[DEV] OTP code: ${state.generatedOtp}`);
        showStep(2);
    }

    function handleOtpSubmit(event) {
        event.preventDefault();
        if (!state.generatedOtp) {
            showToast('error', 'Request a new verification code to continue.');
            return;
        }
        if (state.otpExpiresAt && Date.now() > state.otpExpiresAt) {
            showToast('error', 'This code expired. Request a new one.');
            return;
        }
        const value = collectOtpValue();
        if (value.length !== OTP_LENGTH) {
            showToast('error', 'Enter the full verification code.');
            return;
        }
        if (value !== state.generatedOtp) {
            showToast('error', 'The code is incorrect.');
            resetOtpInputs();
            return;
        }
        stopOtpCountdown();
        showToast('success', 'Verification successfulled');
        setTimeout(() => {
            showStep(3);
            const firstName = document.getElementById('profileFirstName');
            firstName?.focus();
        }, 1500);
    }

    async function handleProfileSubmit(event) {
        event.preventDefault();
        if (!state.basicInfo) {
            showToast('error', 'Please start from the sign-up step.');
            showStep(1);
            return;
        }

        const form = event.currentTarget;
        const firstNameInput = form.querySelector('#profileFirstName');
        const lastNameInput = form.querySelector('#profileLastName');
        const dobInput = form.querySelector('#profileDob');
        const genderInputs = form.querySelectorAll('input[name="profileGender"]');
        const districtInput = form.querySelector('#profileDistrict');
        const streetInput = form.querySelector('#profileStreet');
        const zipInput = form.querySelector('#profileZip');
        const photoInput = form.querySelector('#profilePhoto');

        const firstName = (firstNameInput?.value || '').trim();
        const lastName = (lastNameInput?.value || '').trim();
        const dob = (dobInput?.value || '').trim();
        const gender = Array.from(genderInputs).find(input => input.checked)?.value || '';
        const country = (elements.countrySelect?.value || '').trim();
        const region = (elements.regionSelect?.value || '').trim();
        const city = (elements.citySelect?.value || '').trim();
        const district = (districtInput?.value || '').trim();
        const street = (streetInput?.value || '').trim();
        const zip = (zipInput?.value || '').trim();
        const photoFile = photoInput?.files && photoInput.files[0] ? photoInput.files[0] : null;

        if (!firstName) {
            showToast('error', 'Enter your first name.');
            firstNameInput?.focus();
            return;
        }
        if (!lastName) {
            showToast('error', 'Enter your last name.');
            lastNameInput?.focus();
            return;
        }
        if (!dob) {
            showToast('error', 'Select your date of birth.');
            dobInput?.focus();
            return;
        }
        if (!gender) {
            showToast('error', 'Select your gender.');
            genderInputs[0]?.focus();
            return;
        }
        if (!district) {
            showToast('error', 'Enter your district name.');
            districtInput?.focus();
            return;
        }
        if (!street) {
            showToast('error', 'Enter your street name.');
            streetInput?.focus();
            return;
        }
        if (!zip) {
            showToast('error', 'Enter your zip code.');
            zipInput?.focus();
            return;
        }
        if (photoFile && photoFile.size > 5 * 1024 * 1024) {
            showToast('error', 'Profile photo must be 5 MB or smaller.');
            return;
        }

        let photoDataUrl = state.profilePreview;
        if (!photoDataUrl && photoFile) {
            try {
                photoDataUrl = await readFileAsDataUrl(photoFile);
            } catch (error) {
                console.warn('Unable to read profile photo', error);
                showToast('error', 'We could not process the selected photo.');
                return;
            }
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const accounts = loadIndividualAccounts();
        const newId = createNextAccountId(accounts);
        const notes = `Self-registration submitted on ${now.toLocaleDateString()} (${country}, ${city}).`;

        const pendingSupport = {
            id: `support-${newId}-review`,
            reason: 'Identity verification pending for new self-registration.',
            requestedAt: nowIso,
            expiresAt: null,
            status: 'pending'
        };

        const normalizedAccount = normalizeIndividualAccountPayload({
            id: newId,
            fullName: `${firstName} ${lastName}`.trim() || state.basicInfo.userName,
            email: state.basicInfo.email,
            mobile: state.basicInfo.phone,
            city: city || 'Riyadh',
            status: 'pending',
            balance: 0,
            adsCount: 0,
            pendingAds: 0,
            createdAt: nowIso,
            lastActiveAt: nowIso,
            permissions: { autoPosting: false, manualReview: true },
            subscriptions: [],
            financialHistory: [],
            supportRequests: [pendingSupport],
            notes
        }, accounts.length);

        accounts.push(normalizedAccount);
        saveIndividualAccounts(accounts);

        appendSignupRecord({
            accountId: normalizedAccount.id,
            userName: state.basicInfo.userName,
            email: normalizedAccount.email,
            phone: normalizedAccount.mobile,
            invitationCode: state.basicInfo.invitationCode,
            passwordHash: hashPassword(state.basicInfo.password),
            submittedAt: nowIso,
            profile: {
                firstName,
                lastName,
                dateOfBirth: dob,
                gender,
                country,
                region,
                city,
                district,
                street,
                zip,
                photoDataUrl
            }
        });

        const fullName = `${firstName} ${lastName}`.trim() || state.basicInfo.userName;
        
        resetForms();
        
        if (elements.successName) {
            elements.successName.textContent = fullName;
        }
        showToast('success', 'Registered Successfully, Redirecting…');
        setTimeout(() => {
            window.location.href = 'onruf-login.html';
        }, 2000);
    }

    function resetForms() {
        state.currentStep = 4;
        state.basicInfo = null;
        state.generatedOtp = null;
        state.otpExpiresAt = null;
        state.profilePreview = null;
        stopOtpCountdown();
        elements.basicInfoForm.reset();
        elements.otpForm?.reset();
        elements.profileForm?.reset();
        if (elements.uploadPreview) {
            elements.uploadPreview.textContent = '';
        }
        resetOtpInputs();
    }

    function showStep(step) {
        state.currentStep = step;
        toggleStep(elements.stepAccount, step === 1);
        toggleStep(elements.stepOtp, step === 2);
        toggleStep(elements.stepProfile, step === 3);
        toggleStep(elements.stepSuccess, step === 4);
        if (step === 2) {
            fillOtpInputs(state.generatedOtp);
        }
    }

    function toggleStep(container, isActive) {
        if (!container) {
            return;
        }
        container.classList.toggle('active', isActive);
    }

    function fillOtpInputs(code) {
        if (!elements.otpInputs || !Array.isArray(elements.otpInputs)) {
            return;
        }
        const digits = typeof code === 'string' ? code.split('') : [];
        let lastFilled = null;
        elements.otpInputs.forEach((input, index) => {
            const value = digits[index] || '';
            input.value = value;
            if (value) {
                lastFilled = input;
            }
        });
        if (lastFilled) {
            lastFilled.focus();
        } else if (elements.otpInputs.length) {
            elements.otpInputs[0].focus();
        }
    }

    function generateOtp() {
        const min = Math.pow(10, OTP_LENGTH - 1);
        const max = Math.pow(10, OTP_LENGTH) - 1;
        return String(Math.floor(min + Math.random() * (max - min + 1)));
    }

    function collectOtpValue() {
        if (!elements.otpInputs) {
            return '';
        }
        return elements.otpInputs.map(input => input.value.trim()).join('');
    }

    function resetOtpInputs() {
        if (!elements.otpInputs) {
            return;
        }
        elements.otpInputs.forEach(input => {
            input.value = '';
        });
        if (elements.otpInputs.length) {
            elements.otpInputs[0].focus();
        }
    }

    function updateOtpPhoneDisplay(phone) {
        if (elements.phoneDisplay) {
            elements.phoneDisplay.textContent = phone;
        }
    }

    function startOtpCountdown() {
        stopOtpCountdown();
        if (!elements.otpCountdown) {
            return;
        }
        const update = () => {
            if (!state.otpExpiresAt) {
                elements.otpCountdown.textContent = '--';
                return;
            }
            const diff = state.otpExpiresAt - Date.now();
            if (diff <= 0) {
                elements.otpCountdown.textContent = '00';
                stopOtpCountdown();
                return;
            }
            const seconds = Math.ceil(diff / 1000);
            elements.otpCountdown.textContent = seconds.toString().padStart(2, '0');
        };
        update();
        state.countdownTimer = window.setInterval(update, 1000);
    }

    function stopOtpCountdown() {
        if (state.countdownTimer) {
            window.clearInterval(state.countdownTimer);
            state.countdownTimer = null;
        }
    }

    function handleOtpResend() {
        if (!state.basicInfo) {
            showToast('error', 'Complete the first step to request a code.');
            return;
        }
        state.generatedOtp = generateOtp();
        state.otpExpiresAt = Date.now() + OTP_EXPIRY_MS;
        resetOtpInputs();
        startOtpCountdown();
        showToast('info', `Your new code is ${state.generatedOtp}.`);
        fillOtpInputs(state.generatedOtp);
    }

    function loadIndividualAccounts() {
        try {
            const raw = localStorage.getItem(INDIVIDUAL_ACCOUNTS_KEY);
            if (!raw) {
                return DEFAULT_INDIVIDUAL_ACCOUNTS.map((entry, index) => normalizeIndividualAccountPayload(entry, index)).filter(Boolean);
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || !parsed.length) {
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

    function appendSignupRecord(record) {
        try {
            const existingRaw = localStorage.getItem(SIGNUP_RECORDS_KEY);
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            const list = Array.isArray(existing) ? existing : [];
            list.push(record);
            localStorage.setItem(SIGNUP_RECORDS_KEY, JSON.stringify(list));
        } catch (error) {
            console.warn('Unable to store sign-up record', error);
        }
    }

    function createNextAccountId(accounts) {
        const existingIds = new Set(accounts.map(entry => entry && entry.id ? String(entry.id) : ''));
        let highest = 2000;
        existingIds.forEach(id => {
            const match = /^IND-(\d+)$/.exec(id);
            if (match) {
                const value = Number.parseInt(match[1], 10);
                if (Number.isFinite(value) && value > highest) {
                    highest = value;
                }
            }
        });
        const next = highest + 1;
        return `IND-${String(next).padStart(4, '0')}`;
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
        const statusCandidate = typeof account.status === 'string' && account.status.trim() ? account.status.trim().toLowerCase() : 'pending';
        const allowedStatuses = new Set(['active', 'frozen', 'pending', 'deleted', 'suspended']);
        const status = allowedStatuses.has(statusCandidate) ? statusCandidate : 'pending';
        const balance = Number.isFinite(account.balance) ? Number(account.balance) : 0;
        const adsCount = Number.isFinite(account.adsCount) ? Math.max(0, Math.floor(account.adsCount)) : 0;
        const pendingAds = Number.isFinite(account.pendingAds) ? Math.max(0, Math.floor(account.pendingAds)) : 0;
        const createdAt = normalizeIsoTimestamp(account.createdAt, new Date().toISOString());
        const lastActiveAt = normalizeIsoTimestamp(account.lastActiveAt, createdAt);
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
        return {
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
            notes
        };
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
        const trimmed = value.trim().toLowerCase();
        return trimmed;
    }

    function normalizePhone(prefix, value) {
        const digits = (value || '').replace(/\D/g, '');
        if (!digits) {
            return '';
        }
        const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
        if (normalized.length < 8) {
            return '';
        }
        return `${prefix}${normalized}`;
    }

    function validateEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('File read error'));
            reader.readAsDataURL(file);
        });
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

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
