(function () {
    'use strict';

    const USERS_STORAGE_KEY = 'onruf_users_v1';
    const SESSION_STORAGE_KEY = 'onruf_active_session_v1';
    const OTP_EXPIRY_MINUTES = 10;
    const DATA_RESET_VERSION = '20241005-super-admin-seed';
    const DATA_RESET_KEY = 'onruf_data_reset_version';
    const INVITATION_SERVICE_ENDPOINT_DEFAULT = '/api/invitations/send';

    function resolveInvitationServiceUrl() {
        try {
            const config = window.__ONRUF_CONFIG__;
            if (config) {
                const value = config.invitationServiceUrl;
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    if (trimmed.length > 0) {
                        return trimmed;
                    }
                    return null;
                }
                if (value === null) {
                    return null;
                }
            }
        } catch (error) {
            console.warn('Unable to read window.__ONRUF_CONFIG__.invitationServiceUrl', error);
        }
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            return null;
        }
        return INVITATION_SERVICE_ENDPOINT_DEFAULT;
    }

    function buildAbsoluteInvitationLink(token) {
        if (!token) {
            return window.location.href.split('#')[0];
        }
        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('token', token);
            currentUrl.hash = '';
            return currentUrl.toString();
        } catch (error) {
            console.warn('Unable to construct absolute invitation link.', error);
            const base = window.location.origin || '';
            return `${base}/complete-registration.html?token=${encodeURIComponent(token)}`;
        }
    }

    async function deliverInvitationEmail(user, meta = {}) {
        if (!user || !user.email) {
            return { status: 'skipped', message: 'Recipient email missing.' };
        }

        const endpoint = resolveInvitationServiceUrl();
        if (!endpoint) {
            return { status: 'skipped', message: 'Invitation service not configured.' };
        }

        const payload = {
            recipientEmail: user.email,
            recipientName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
            invitationLink: buildAbsoluteInvitationLink(meta.token || (user.invitation && user.invitation.token)),
            otp: meta.otp || null,
            expiresAt: meta.expiresAt || null,
            invitedBy: meta.invitedBy || null
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let responseBody = null;
            try {
                responseBody = await response.json();
            } catch (parseError) {
                responseBody = null;
            }

            if (!response.ok) {
                const details = responseBody && (responseBody.error || responseBody.details);
                const message = details || `Service returned status ${response.status}.`;
                return { status: 'error', message };
            }

            return {
                status: 'sent',
                messageId: responseBody && responseBody.messageId ? responseBody.messageId : null
            };
        } catch (error) {
            console.error('Unable to deliver invitation email.', error);
            return { status: 'error', message: error.message };
        }
    }

    const DEFAULT_USERS_SEED = [
        {
            id: 1,
            name: 'Central Super Admin',
            firstName: 'Central',
            lastName: 'Admin',
            email: 'superadmin@onruf.com',
            role: 'Super Administrator',
            accountType: 'platform-administrator',
            status: 'active',
            department: 'Central Governance',
            phone: '+966500000001',
            employeeId: 'CSA-001',
            permissionSummary: 'Full platform access',
            created: '2025-10-05',
            lastLogin: 'Never',
            sessionExpiresAt: null,
            invitation: {
                token: 'reg-super-admin-seed',
                sentAt: '2025-10-05T00:00:00.000Z',
                completedAt: '2025-10-05T00:00:00.000Z',
                verifiedAt: '2025-10-05T00:00:00.000Z',
                otp: null,
                lastOtpSentAt: null
            },
            auth: {
                passwordHash: 'QWRtaW5AMTIz',
                lastUpdated: '2025-10-05T00:00:00.000Z'
            }
        }
    ];

    const body = document.body;
    if (!body) {
        return;
    }

    const pageType = body.dataset.authPage || '';

    function seedDefaultUsers() {
        try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS_SEED));
        } catch (error) {
            console.warn('Unable to seed default users.', error);
        }
    }

    function ensureSeedDataReset() {
        try {
            const recordedVersion = localStorage.getItem(DATA_RESET_KEY);
            if (recordedVersion !== DATA_RESET_VERSION) {
                localStorage.removeItem(USERS_STORAGE_KEY);
                localStorage.setItem(DATA_RESET_KEY, DATA_RESET_VERSION);
                seedDefaultUsers();
                return;
            }
            const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
            if (!existingUsers) {
                seedDefaultUsers();
            }
        } catch (error) {
            console.warn('Unable to enforce seed data reset.', error);
        }
    }

    ensureSeedDataReset();

    const authState = {
        users: loadUsersFromStorage(),
        currentUser: null,
        otp: null,
        otpExpiresAt: null,
        token: null
    };

    let otpCountdownInterval = null;

    const toastEl = document.getElementById('authToast');

    function loadUsersFromStorage() {
        try {
            const raw = localStorage.getItem(USERS_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Unable to load users from storage', error);
            return [];
        }
    }

    function saveUsersToStorage() {
        try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(authState.users));
        } catch (error) {
            console.warn('Unable to persist user updates', error);
        }
    }

    function formatDateTime(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) {
            return value || '';
        }
        const datePart = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const timePart = date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${datePart} ${timePart}`.trim();
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

    function verifyPassword(user, plain) {
        if (!user || !user.auth || !user.auth.passwordHash) {
            return false;
        }
        return hashPassword(plain) === user.auth.passwordHash;
    }

    function generateOtp() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    function showToast(type, message, timeout = 3500) {
        if (!toastEl) {
            return;
        }
        toastEl.classList.remove('hidden', 'visible', 'success', 'error', 'info');
        if (type) {
            toastEl.classList.add(type);
        }
        toastEl.textContent = message;
        requestAnimationFrame(() => {
            toastEl.classList.add('visible');
        });
        window.clearTimeout(toastEl._timeoutId);
        toastEl._timeoutId = window.setTimeout(() => {
            toastEl.classList.remove('visible');
        }, timeout);
    }

    function attachPasswordToggle(button) {
        if (!button) return;
        const targetId = button.dataset.toggleTarget;
        const icon = button.querySelector('i');
        button.addEventListener('click', () => {
            const input = targetId ? document.getElementById(targetId) : button.previousElementSibling;
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            if (icon) {
                icon.classList.toggle('fa-eye', !isHidden);
                icon.classList.toggle('fa-eye-slash', isHidden);
            }
            input.focus();
        });
    }

    function setupSharedToggles() {
        document.querySelectorAll('.input-toggle').forEach(btn => attachPasswordToggle(btn));
    }

    function findUserByEmail(email) {
        const normalized = (email || '').trim().toLowerCase();
        if (!normalized) return null;
        return authState.users.find(user => typeof user.email === 'string' && user.email.trim().toLowerCase() === normalized) || null;
    }

    function findUserByToken(token) {
        if (!token) return null;
        const normalized = token.trim();
        return authState.users.find(user => {
            const userToken = user && user.invitation && typeof user.invitation.token === 'string' ? user.invitation.token.trim() : '';
            return userToken && userToken === normalized;
        }) || null;
    }

    function persistAuthSession(user) {
        if (!user) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            return;
        }
        const payload = {
            userId: user.id,
            email: user.email,
            signedInAt: new Date().toISOString()
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    }

    function setupLoginPage() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const rememberCheckbox = document.getElementById('loginRemember');
        const form = document.getElementById('loginForm');
        const helpBtn = document.getElementById('authHelpBtn');
        const forgotLink = document.getElementById('forgotPasswordLink');

        setupSharedToggles();

        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                showToast('info', 'Need help? Email support@onruf.com and our team will respond within an hour.');
            });
        }

        if (forgotLink) {
            forgotLink.addEventListener('click', event => {
                event.preventDefault();
                showToast('info', 'Password resets are handled by your account administrator.');
            });
        }

        if (!form || !emailInput || !passwordInput) {
            return;
        }

        form.addEventListener('submit', event => {
            event.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email) {
                showToast('error', 'Enter your email address to continue.');
                emailInput.focus();
                return;
            }
            if (!password) {
                showToast('error', 'Enter your password to sign in.');
                passwordInput.focus();
                return;
            }

            const user = findUserByEmail(email);
            if (!user) {
                showToast('error', 'We could not find an account with that email.');
                return;
            }

            const status = (user.status || '').toLowerCase();
            if (status === 'pending') {
                showToast('error', 'Your invitation is pending. Complete your registration from the invitation email.');
                return;
            }
            if (status === 'inactive') {
                showToast('error', 'This account is inactive. Contact your administrator for access.');
                return;
            }

            if (!verifyPassword(user, password)) {
                showToast('error', 'Incorrect password. Please try again.');
                passwordInput.select();
                return;
            }

            user.lastLogin = formatDateTime(new Date());
            if (rememberCheckbox && rememberCheckbox.checked) {
                user.sessionExpiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
            }

            saveUsersToStorage();
            persistAuthSession(user);

            showToast('success', 'Signed in successfully. Redirecting…', 1800);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1400);
        });
    }

    function setStatusPill(type, text) {
        const pill = document.getElementById('registrationStatusPill');
        if (!pill) return;
        pill.classList.remove('success', 'warning', 'hidden');
        if (!text) {
            pill.innerHTML = '';
            pill.classList.add('hidden');
            return;
        }
        pill.innerHTML = text;
        if (type) {
            pill.classList.add(type);
        }
    }

    function renderSummary(user) {
        const roleEl = document.getElementById('summaryRole');
        const sentAtEl = document.getElementById('summarySentAt');
        const departmentEl = document.getElementById('summaryDepartment');
        const expiresEl = document.getElementById('summaryExpiresOn');
        const employeeIdEl = document.getElementById('summaryEmployeeId');

        if (roleEl) {
            roleEl.textContent = user.role || 'Pending role';
        }
        if (sentAtEl) {
            sentAtEl.textContent = user.invitation && user.invitation.sentAt ? formatDateTime(user.invitation.sentAt) : '—';
        }
        if (departmentEl) {
            const department = user.department || (user.organization && user.organization.department) || '';
            departmentEl.textContent = department || '—';
        }
        if (expiresEl) {
            expiresEl.textContent = user.expiresOn ? formatDateTime(user.expiresOn) : '—';
        }
        if (employeeIdEl) {
            const employeeId = user.employeeId || (user.organization && user.organization.employeeId) || '';
            employeeIdEl.textContent = employeeId ? String(employeeId) : '—';
        }
    }

    function showAlert(type, message) {
        const container = document.getElementById('registrationAlertContainer');
        if (!container) {
            return;
        }
        container.innerHTML = '';
        if (!message) {
            container.classList.add('hidden');
            return;
        }
        const alert = document.createElement('div');
        alert.className = `alert-box ${type || ''}`.trim();
        alert.innerHTML = `<strong>${message}</strong>`;
        container.appendChild(alert);
        container.classList.remove('hidden');
    }

    function setRegistrationStep(step) {
        const account = document.getElementById('registrationStepAccount');
        const otp = document.getElementById('registrationStepOtp');

        if (account) account.classList.toggle('hidden', step !== 'account');
        if (otp) otp.classList.toggle('hidden', step !== 'otp');

        if (step === 'otp') {
            startOtpCountdown();
        } else {
            resetOtpCountdown();
        }
    }

    function collectOtpValue() {
        const inputs = Array.from(document.querySelectorAll('#otpInputGroup input'));
        if (!inputs.length) {
            return '';
        }
        return inputs.map(input => input.value.trim()).join('');
    }

    function resetOtpInputs(code) {
        const inputs = Array.from(document.querySelectorAll('#otpInputGroup input'));
        inputs.forEach((input, index) => {
            input.value = code ? code[index] || '' : '';
        });
        if (inputs.length) {
            inputs[0].focus();
            inputs[0].select();
        }
    }

    function getOtpCountdownElement() {
        return document.getElementById('otpCountdown');
    }

    function stopOtpCountdown() {
        if (otpCountdownInterval !== null) {
            clearInterval(otpCountdownInterval);
            otpCountdownInterval = null;
        }
    }

    function resetOtpCountdown() {
        stopOtpCountdown();
        const countdownEl = getOtpCountdownElement();
        if (countdownEl) {
            const fallback = countdownEl.dataset.default || '--:--';
            countdownEl.textContent = fallback;
            countdownEl.classList.remove('expired');
        }
    }

    function startOtpCountdown() {
        const countdownEl = getOtpCountdownElement();
        if (!countdownEl) {
            return;
        }

        stopOtpCountdown();

        if (!authState.otpExpiresAt) {
            resetOtpCountdown();
            return;
        }

        const update = () => {
            const remainingMs = authState.otpExpiresAt - Date.now();
            if (remainingMs <= 0) {
                countdownEl.textContent = 'Expired';
                countdownEl.classList.add('expired');
                stopOtpCountdown();
                return;
            }

            countdownEl.classList.remove('expired');
            const totalSeconds = Math.ceil(remainingMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            countdownEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        update();

        otpCountdownInterval = window.setInterval(update, 1000);
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('File reading failed'));
            reader.readAsDataURL(file);
        });
    }

    function updateOtpEmailLabel(email) {
        const label = document.getElementById('otpEmailLabel');
        if (label) {
            label.textContent = email || '—';
        }
    }

    function updateHeadline(message) {
        const headline = document.getElementById('registrationHeadline');
        if (headline) {
            headline.textContent = message;
        }
    }

    function ensureUserAuthObject(user) {
        if (!user.auth) {
            user.auth = {
                passwordHash: '',
                lastUpdated: null
            };
        }
    }

    function ensureInvitationObject(user) {
        if (!user.invitation) {
            user.invitation = {};
        }
        if (!user.invitation.token) {
            user.invitation.token = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        }
    }

    function setupOtpInputBehavior() {
        const inputs = Array.from(document.querySelectorAll('#otpInputGroup input'));
        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                const value = input.value.replace(/\D/g, '').slice(0, 1);
                input.value = value;
                if (value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', event => {
                if (event.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                    event.preventDefault();
                }
            });
        });
    }

    function setupRegistrationPage() {
        setupSharedToggles();
        setupOtpInputBehavior();

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        authState.token = token;

        if (!token) {
            const accountSection = document.getElementById('registrationStepAccount');
            setStatusPill('warning', '<i class="fas fa-triangle-exclamation"></i> Invitation token missing');
            showAlert('info', 'This invitation link is missing required details. Please contact your administrator.');
            setRegistrationStep('account');
            if (accountSection) {
                accountSection.classList.add('hidden');
            }
            return;
        }

        const user = findUserByToken(token);
        if (!user) {
            const accountSection = document.getElementById('registrationStepAccount');
            setStatusPill('warning', '<i class="fas fa-triangle-exclamation"></i> Invitation not found');
            showAlert('error', 'We could not find an invitation that matches this link. It may have expired or already been used.');
            setRegistrationStep('account');
            if (accountSection) {
                accountSection.classList.add('hidden');
            }
            return;
        }

        authState.currentUser = user;
        ensureInvitationObject(user);
        ensureUserAuthObject(user);
        renderSummary(user);

        const firstNameInput = document.getElementById('registrationFirstName');
        const lastNameInput = document.getElementById('registrationLastName');
        const phoneInput = document.getElementById('registrationPhone');
        const emailDisplay = document.getElementById('registrationEmailDisplay');

        if (firstNameInput) firstNameInput.value = user.firstName || '';
        if (lastNameInput) lastNameInput.value = user.lastName || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        if (emailDisplay) emailDisplay.value = user.email || '';

    updateHeadline('');
    setStatusPill('', '');

        if (user.status && user.status.toLowerCase() === 'active') {
            setStatusPill('success', '<i class="fas fa-circle-check"></i> Account already active');
            updateHeadline('This invitation has already been completed. Redirecting you to sign in.');
            showAlert('info', 'This invitation was already used. We\'ll take you to the login page.');
            resetOtpCountdown();
            showToast('info', 'Account already active. Redirecting to sign in...', 2200);
            window.location.href = 'login.html';
            return;
        }

        const accountForm = document.getElementById('registrationAccountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', event => {
                event.preventDefault();
                handleRegistrationAccountSubmit().catch(error => {
                    console.error('Registration submission failed', error);
                    showToast('error', 'Something went wrong while saving your details. Please try again.');
                });
            });
        }

        const otpForm = document.getElementById('registrationOtpForm');
        if (otpForm) {
            otpForm.addEventListener('submit', event => {
                event.preventDefault();
                handleOtpSubmit();
            });
        }

        const resendBtn = document.getElementById('registrationResendOtp');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => {
                resendOtp();
            });
        }

        updateOtpEmailLabel(user.email);
        setRegistrationStep('account');
    }

    async function handleRegistrationAccountSubmit() {
        const user = authState.currentUser;
        if (!user) {
            showToast('error', 'This invitation is no longer available.');
            return;
        }

        const firstNameInput = document.getElementById('registrationFirstName');
        const lastNameInput = document.getElementById('registrationLastName');
        const phoneInput = document.getElementById('registrationPhone');
        const passwordInput = document.getElementById('registrationPassword');
        const confirmInput = document.getElementById('registrationPasswordConfirm');
        const photoInput = document.getElementById('registrationPhoto');

        const firstName = firstNameInput?.value.trim();
        const lastName = lastNameInput?.value.trim();
        const phone = phoneInput?.value.trim();
        const password = passwordInput?.value || '';
        const confirm = confirmInput?.value || '';
        const photoFile = photoInput?.files?.[0] || null;

        if (!firstName) {
            showToast('error', 'First name is required.');
            firstNameInput?.focus();
            return;
        }
        if (!lastName) {
            showToast('error', 'Last name is required.');
            lastNameInput?.focus();
            return;
        }
        if (!phone) {
            showToast('error', 'Phone number is required.');
            phoneInput?.focus();
            return;
        }
        if (password.length < 8) {
            showToast('error', 'Password must be at least 8 characters long.');
            passwordInput?.focus();
            return;
        }
        if (password !== confirm) {
            showToast('error', 'Passwords do not match.');
            confirmInput?.focus();
            return;
        }

        if (photoFile) {
            const isImage = photoFile.type ? photoFile.type.startsWith('image/') : false;
            if (!isImage) {
                showToast('error', 'Please choose a valid image file.');
                photoInput.value = '';
                return;
            }
            const maxSizeBytes = 5 * 1024 * 1024;
            if (photoFile.size > maxSizeBytes) {
                showToast('error', 'Photo must be 5 MB or smaller.');
                photoInput.value = '';
                return;
            }
        }

        user.firstName = firstName;
        user.lastName = lastName;
        user.name = `${firstName} ${lastName}`.trim();
        user.phone = phone;

        if (photoFile) {
            try {
                user.photoDataUrl = await readFileAsDataUrl(photoFile);
                user.photoFileName = photoFile.name;
            } catch (error) {
                console.error('Failed to read uploaded photo', error);
                showToast('error', 'We could not read the selected photo. Please try again with a different image.');
                return;
            }
        }

        ensureUserAuthObject(user);
        user.auth.passwordHash = hashPassword(password);
        user.auth.lastUpdated = new Date().toISOString();

        ensureInvitationObject(user);
        user.invitation.completedAt = new Date().toISOString();
        user.invitation.lastOtpSentAt = new Date().toISOString();
        authState.otp = user.invitation.otp && String(user.invitation.otp).length === 6 ? String(user.invitation.otp) : generateOtp();
        user.invitation.otp = authState.otp;
        authState.otpExpiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

        saveUsersToStorage();
        renderSummary(user);
        updateOtpEmailLabel(user.email);
        resetOtpInputs(authState.otp);
        showToast('success', 'Details saved. A one-time code has been generated.', 3000);
        updateHeadline('');
        setStatusPill('', '');
        setRegistrationStep('otp');
    }

    function handleOtpSubmit() {
        const user = authState.currentUser;
        if (!user) {
            showToast('error', 'Invitation no longer available.');
            return;
        }

        const entered = collectOtpValue();
        if (!/^[0-9]{6}$/.test(entered)) {
            showToast('error', 'Enter the 6-digit code to continue.');
            resetOtpInputs('');
            return;
        }

        if (authState.otp && entered !== authState.otp) {
            showToast('error', 'That code is incorrect. Please try again or resend.');
            resetOtpInputs('');
            return;
        }

        if (authState.otpExpiresAt && Date.now() > authState.otpExpiresAt) {
            showToast('error', 'The code has expired. Request a new one.');
            resetOtpInputs('');
            return;
        }

        user.status = 'Active';
        user.accountType = user.accountType === 'pending-invite' ? 'platform-user' : user.accountType;
        ensureInvitationObject(user);
        user.invitation.verifiedAt = new Date().toISOString();
        user.lastLogin = 'Awaiting first login';

        saveUsersToStorage();
        renderSummary(user);
        setStatusPill('success', '<i class="fas fa-circle-check"></i> Account activated');
        showToast('success', 'Account activated. Redirecting you to sign in...', 1800);
        resetOtpCountdown();
        window.location.href = 'login.html';
    }

    async function resendOtp() {
        const user = authState.currentUser;
        if (!user) {
            showToast('error', 'Invitation not available.');
            return;
        }

        authState.otp = generateOtp();
        authState.otpExpiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
        ensureInvitationObject(user);
        user.invitation.otp = authState.otp;
        user.invitation.lastOtpSentAt = new Date().toISOString();

        saveUsersToStorage();
        renderSummary(user);
        resetOtpInputs(authState.otp);
        startOtpCountdown();
        const emailResult = await deliverInvitationEmail(user, {
            otp: authState.otp,
            expiresAt: authState.otpExpiresAt,
            token: user.invitation && user.invitation.token ? user.invitation.token : authState.token
        });

        if (emailResult.status === 'sent') {
            showToast('success', 'We emailed you a fresh verification code. Check your inbox.', 3200);
        } else if (emailResult.status === 'skipped') {
            showToast('info', 'A new code is ready. Email delivery is disabled, so copy the code shown on screen.', 3600);
        } else {
            showToast('error', `We couldn\'t email the code: ${emailResult.message}. Use the code shown on screen.`, 4200);
        }
    }

    if (pageType === 'login') {
        setupLoginPage();
    } else if (pageType === 'registration') {
        setupRegistrationPage();
    }
})();
