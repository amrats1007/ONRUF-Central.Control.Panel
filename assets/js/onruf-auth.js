(function () {
    'use strict';

    const USERS_STORAGE_KEY = 'onruf_users_v1';
    const SESSION_STORAGE_KEY = 'onruf_active_session_v1';
    const OTP_EXPIRY_MINUTES = 10;
    const DATA_RESET_VERSION = '20241005-super-admin-seed';
    const DATA_RESET_KEY = 'onruf_data_reset_version';

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
        return date.toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
        pill.classList.remove('success', 'warning');
        if (type) {
            pill.classList.add(type);
        }
        pill.innerHTML = text;
    }

    function renderSummary(user) {
        const nameEl = document.getElementById('summaryName');
        const emailEl = document.getElementById('summaryEmail');
        const roleEl = document.getElementById('summaryRole');
        const sentAtEl = document.getElementById('summarySentAt');
        const otpStatusEl = document.getElementById('summaryOtpStatus');

        if (nameEl) {
            nameEl.textContent = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '—';
        }
        if (emailEl) {
            emailEl.textContent = user.email || '—';
        }
        if (roleEl) {
            roleEl.textContent = user.role || 'Pending role';
        }
        if (sentAtEl) {
            sentAtEl.textContent = user.invitation && user.invitation.sentAt ? formatDateTime(user.invitation.sentAt) : '—';
        }
        if (otpStatusEl) {
            if (user.status && user.status.toLowerCase() === 'active') {
                otpStatusEl.textContent = 'Verified';
            } else if (user.invitation && user.invitation.verifiedAt) {
                otpStatusEl.textContent = `Verified ${formatDateTime(user.invitation.verifiedAt)}`;
            } else if (user.invitation && user.invitation.lastOtpSentAt) {
                otpStatusEl.textContent = `Sent ${formatDateTime(user.invitation.lastOtpSentAt)}`;
            } else {
                otpStatusEl.textContent = 'Awaiting submission';
            }
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
        const success = document.getElementById('registrationStepSuccess');

        if (account) account.classList.toggle('hidden', step !== 'account');
        if (otp) otp.classList.toggle('hidden', step !== 'otp');
        if (success) success.classList.toggle('hidden', step !== 'success');
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
        const departmentInput = document.getElementById('registrationDepartment');

        if (firstNameInput) firstNameInput.value = user.firstName || '';
        if (lastNameInput) lastNameInput.value = user.lastName || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        if (emailDisplay) emailDisplay.value = user.email || '';
        if (departmentInput) departmentInput.value = user.department || '';

        updateHeadline('Verify your details and create a password to continue.');
        setStatusPill('', '<i class="fas fa-paper-plane"></i> Invitation received');

        if (user.status && user.status.toLowerCase() === 'active') {
            setStatusPill('success', '<i class="fas fa-circle-check"></i> Account already active');
            updateHeadline('This invitation has already been completed. You can sign in below.');
            setRegistrationStep('success');
            renderSummary(user);
            showAlert('success', 'Great news! Your account is already active. You can sign in using the button below.');
            return;
        }

        const accountForm = document.getElementById('registrationAccountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', event => {
                event.preventDefault();
                handleRegistrationAccountSubmit();
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

    function handleRegistrationAccountSubmit() {
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
        const departmentInput = document.getElementById('registrationDepartment');

        const firstName = firstNameInput?.value.trim();
        const lastName = lastNameInput?.value.trim();
        const phone = phoneInput?.value.trim();
        const password = passwordInput?.value || '';
        const confirm = confirmInput?.value || '';
        const department = departmentInput?.value.trim();

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

        user.firstName = firstName;
        user.lastName = lastName;
        user.name = `${firstName} ${lastName}`.trim();
        user.phone = phone;
        user.department = department || user.department || '';

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
        updateHeadline('Enter the one-time password sent to your email to activate your access.');
        setStatusPill('', '<i class="fas fa-user-edit"></i> Account details submitted');
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
        setRegistrationStep('success');
        showAlert('success', 'Success! You can now sign in with your new credentials.');
        showToast('success', 'Account activated. You can sign in now.', 3200);
    }

    function resendOtp() {
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
        showToast('info', 'A new verification code has been generated.', 2600);
    }

    if (pageType === 'login') {
        setupLoginPage();
    } else if (pageType === 'registration') {
        setupRegistrationPage();
    }
})();
