const state = {
    currentSection: 'dashboard',
    currentRolePage: 1,
    rolesPerPage: 10,
    currentUserPage: 1,
    usersPerPage: 10,
    currentPeriod: 'monthly',
    roleSearchTerm: '',
    userSearchTerm: '',
    roleBuilderMode: 'create',
    editingRoleId: null,
    editingUserId: null,
    userFormStep: 1,
    userDraft: null,
    activeRoleDetailId: null,
    permissionCatalog: [],
    registrationFlow: {
        otp: null,
        userId: null,
        expiresAt: null,
        token: null,
        stage: 'prepared',
    link: null,
    linkExpiresAt: null
    },
    activeSession: null
};

const permissionActions = [
    { id: 'view', label: 'View' },
    { id: 'enter', label: 'Enter' },
    { id: 'modify', label: 'Modify' },
    { id: 'delete', label: 'Delete' }
];

const permissionSectionsTemplate = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        description: 'Executive KPIs and operational monitoring for the platform.',
        apps: [
            {
                id: 'dashboard-executive',
                label: 'Executive Overview',
                description: 'Top-line performance tiles and leadership scorecards.',
                defaultAction: 'view'
            },
            {
                id: 'dashboard-operations',
                label: 'Operational Insights',
                description: 'Field team utilisation, SLA status, and backlog trends.',
                defaultAction: 'view'
            }
        ]
    },
    {
        id: 'users',
        label: 'Users',
        description: 'Role templates and access provisioning for platform staff.',
        apps: [
            {
                id: 'users-roles',
                label: 'User Roles',
                description: 'Create, edit, and audit system role definitions.',
                defaultAction: 'modify'
            },
            {
                id: 'users-management',
                label: 'Users Management',
                description: 'Onboard, suspend, and maintain user accounts.',
                defaultAction: 'enter'
            }
        ]
    },
    {
        id: 'settings',
        label: 'Settings',
        description: 'Tenant defaults, security controls, and integration setup.',
        apps: [
            {
                id: 'settings-configuration',
                label: 'Configuration',
                description: 'General settings, notifications, and API access.',
                defaultAction: 'delete'
            },
            {
                id: 'settings-integrations',
                label: 'Integrations',
                description: 'Third-party connections and data exchange management.',
                defaultAction: 'delete'
            }
        ]
    },
    {
        id: 'reports',
        label: 'Reports',
        description: 'Analytics, compliance artefacts, and report distribution.',
        apps: [
            {
                id: 'reports-executive',
                label: 'Executive Reports',
                description: 'Inspection coverage, revenue impact, and satisfaction KPIs.',
                defaultAction: 'view'
            },
            {
                id: 'reports-compliance',
                label: 'Compliance Library',
                description: 'Regulatory artefacts, audit packs, and evidence exports.',
                defaultAction: 'modify'
            },
            {
                id: 'reports-distribution',
                label: 'Distribution Schedules',
                description: 'Report scheduling, recipient lists, and delivery tracking.',
                defaultAction: 'modify'
            }
        ]
    },
    {
        id: 'packages',
        label: 'Packages',
        description: 'Subscription tiers, pricing, and performance metrics.',
        apps: [
            {
                id: 'packages-catalog',
                label: 'Package Catalog',
                description: 'Tier definitions, benefits, and pricing structures.',
                defaultAction: 'modify'
            },
            {
                id: 'packages-performance',
                label: 'Performance Metrics',
                description: 'Adoption, renewal rate, and upsell indicators.',
                defaultAction: 'view'
            },
            {
                id: 'packages-bundles',
                label: 'Bundle Builder',
                description: 'Compose bespoke bundles and generate proposals.',
                defaultAction: 'modify'
            }
        ]
    },
    {
        id: 'products',
        label: 'Products',
        description: 'Marketplace catalogue, inventories, and supplier governance.',
        apps: [
            {
                id: 'products-catalog',
                label: 'Catalog',
                description: 'Manage product listings, pricing, and merchandising.',
                defaultAction: 'modify'
            },
            {
                id: 'products-inventory',
                label: 'Inventory & SLAs',
                description: 'Stock levels, service agreements, and alerts.',
                defaultAction: 'modify'
            },
            {
                id: 'products-suppliers',
                label: 'Supplier Matrix',
                description: 'Vendor performance, contracts, and escalation workflows.',
                defaultAction: 'view'
            }
        ]
    },
    {
        id: 'onruf-users',
        label: 'ONRUF Users',
        description: 'Customer lifecycle management and engagement analytics.',
        apps: [
            {
                id: 'onruf-directory',
                label: 'Directory Overview',
                description: 'Account segments, activation status, and sync history.',
                defaultAction: 'view'
            },
            {
                id: 'onruf-verification',
                label: 'Verification Queue',
                description: 'Identity reviews, escalations, and field confirmations.',
                defaultAction: 'modify'
            },
            {
                id: 'onruf-engagement',
                label: 'Engagement Insights',
                description: 'Usage signals, churn watchlists, and success KPIs.',
                defaultAction: 'view'
            }
        ]
    },
    {
        id: 'advertisments',
        label: 'Advertisments',
        description: 'Campaign planning, creative assets, and performance tracking.',
        apps: [
            {
                id: 'advertising-planner',
                label: 'Campaign Planner',
                description: 'Plan programmes, budgets, and rollout timelines.',
                defaultAction: 'modify'
            },
            {
                id: 'advertising-assets',
                label: 'Creative Assets',
                description: 'Manage media kits, templates, and approvals.',
                defaultAction: 'modify'
            }
        ]
    }
];

function buildPermissionCatalog() {
    return permissionSectionsTemplate.map(section => ({
        ...section,
        apps: section.apps.map(app => ({ ...app }))
    }));
}

const defaultRoles = [];

let roles = [];

const defaultUsers = [
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
        auth: {
            passwordHash: 'QWRtaW5AMTIz',
            lastUpdated: '2025-10-05T00:00:00.000Z'
        },
        invitation: {
            token: 'reg-super-admin-seed',
            sentAt: '2025-10-05T00:00:00.000Z',
            completedAt: '2025-10-05T00:00:00.000Z',
            verifiedAt: '2025-10-05T00:00:00.000Z'
        }
    }
];

let users = [];

const platformDirectory = [
    {
        email: 'ahmed.hassan@onruf.com',
        name: 'Ahmed Hassan',
        phone: '+966501234567',
        department: 'Malqaa Field Operations',
        status: 'active'
    },
    {
        email: 'sarah.mohammed@onruf.com',
        name: 'Sarah Mohammed',
        phone: '+966502221458',
        department: 'Central Governance',
        status: 'active'
    },
    {
        email: 'omar.ali@onruf.com',
        name: 'Omar Ali',
        phone: '+966503339874',
        department: 'Inspection Ops',
        status: 'active'
    },
    {
        email: 'fatima.khalil@onruf.com',
        name: 'Fatima Khalil',
        phone: '+966504448210',
        department: 'Quality Assurance',
        status: 'inactive'
    },
    {
        email: 'maya.hassan@onruf.com',
        name: 'Maya Hassan',
        phone: '+966505115447',
        department: 'Tenant Success',
        status: 'active'
    },
    {
        email: 'tariq.almansoori@onruf.com',
        name: 'Tariq Al-Mansoori',
        phone: '+966506664320',
        department: 'Business Accounts',
        status: 'active'
    },
    {
        email: 'laila.alsubaie@onruf.com',
        name: 'Laila Al-Subaie',
        phone: '+966507776123',
        department: 'Platform Integrations',
        status: 'pending'
    }
];

for (let index = 1; index <= 99; index += 1) {
    const email = `user${index}@onruf.com`;
    const exists = platformDirectory.some(account => normalizeEmail(account.email) === normalizeEmail(email));
    if (!exists) {
        platformDirectory.push({
            email,
            name: `Test User ${index}`,
            phone: `+9665000${String(index).padStart(4, '0')}`,
            department: 'Automated Test Accounts',
            status: 'active'
        });
    }
}

const activityFeed = [
    { actor: 'System', action: 'Synced 124 inspection results with Elm.', time: 'just now' },
    { actor: 'Ahmed Hassan', action: 'Approved business account renewal for Malqaa Corp.', time: '8 minutes ago' },
    { actor: 'Sarah Mohammed', action: 'Updated advanced notification preferences.', time: '26 minutes ago' },
    { actor: 'Omar Ali', action: 'Submitted evidence package for violation case #8421.', time: '1 hour ago' },
    { actor: 'Platform Watcher', action: 'Flagged SLA dip in Eastern region.', time: '3 hours ago' }
];

const monthlyPerformance = [
    { label: 'Oct', value: 58 },
    { label: 'Nov', value: 61 },
    { label: 'Dec', value: 64 },
    { label: 'Jan', value: 68 },
    { label: 'Feb', value: 71 },
    { label: 'Mar', value: 75 },
    { label: 'Apr', value: 79 },
    { label: 'May', value: 82 },
    { label: 'Jun', value: 84 },
    { label: 'Jul', value: 86 },
    { label: 'Aug', value: 88 },
    { label: 'Sep', value: 91 }
];

const ROLES_STORAGE_KEY = 'onruf_roles_v1';
const USERS_STORAGE_KEY = 'onruf_users_v1';
const SESSION_STORAGE_KEY = 'onruf_active_session_v1';
const DATA_RESET_VERSION = '20241005-super-admin-seed';
const DATA_RESET_KEY = 'onruf_data_reset_version';
const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

function generateRegistrationToken() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    const random = Math.floor(Math.random() * 1_000_000)
        .toString(36)
        .padStart(4, '0');
    return `reg-${Date.now().toString(36)}-${random}`;
}

function hashPasswordValue(value) {
    if (typeof value !== 'string' || !value) {
        return '';
    }
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    if (encoder) {
        const bytes = encoder.encode(value.normalize('NFKC'));
        let binary = '';
        bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    }
    try {
        return btoa(unescape(encodeURIComponent(value)));
    } catch (error) {
        console.warn('Unable to hash password value', error);
        return '';
    }
}

function normalizeAuthPayload(auth) {
    if (!auth || typeof auth !== 'object') {
        return {
            passwordHash: '',
            lastUpdated: null
        };
    }
    return {
        passwordHash: typeof auth.passwordHash === 'string' ? auth.passwordHash : '',
        lastUpdated: auth.lastUpdated || null
    };
}

function normalizeInvitationPayload(invitation) {
    const normalized = invitation && typeof invitation === 'object' ? { ...invitation } : {};
    const otp = normalized.otp ? String(normalized.otp).replace(/[^0-9]/g, '').padStart(6, '0').slice(-6) : null;
    const token = typeof normalized.token === 'string' && normalized.token.trim()
        ? normalized.token.trim()
        : generateRegistrationToken();
    const sentTimestamp = normalized.sentAt ? Date.parse(normalized.sentAt) : NaN;
    const sentAt = Number.isFinite(sentTimestamp) ? new Date(sentTimestamp).toISOString() : (normalized.sentAt || null);

    let expiresAt = null;
    if (normalized.expiresAt) {
        const expiresTimestamp = Date.parse(normalized.expiresAt);
        if (Number.isFinite(expiresTimestamp)) {
            expiresAt = new Date(expiresTimestamp).toISOString();
        }
    }
    if (!expiresAt) {
        const base = Number.isFinite(sentTimestamp) ? sentTimestamp : Date.now();
        expiresAt = new Date(base + INVITATION_VALIDITY_MS).toISOString();
    }

    return {
        otp,
        token,
        sentAt,
        expiresAt,
        completedAt: normalized.completedAt || null,
        verifiedAt: normalized.verifiedAt || null,
        lastOtpSentAt: normalized.lastOtpSentAt || null
    };
}

function ensureUserAuthRecord(user) {
    if (!user) return;
    if (!user.auth) {
        user.auth = {
            passwordHash: '',
            lastUpdated: null
        };
    }
}

function ensureUserInvitationRecord(user) {
    if (!user) return;
    if (!user.invitation || typeof user.invitation !== 'object') {
        user.invitation = {};
    }
    if (!user.invitation.token) {
        user.invitation.token = generateRegistrationToken();
    }
    if (!user.invitation.sentAt) {
        user.invitation.sentAt = new Date().toISOString();
    }
    if (!user.invitation.expiresAt) {
        const sentTimestamp = Date.parse(user.invitation.sentAt);
        const base = Number.isFinite(sentTimestamp) ? sentTimestamp : Date.now();
        user.invitation.expiresAt = new Date(base + INVITATION_VALIDITY_MS).toISOString();
    }
}

function getLoginPageUrl() {
    return 'login.html';
}

function buildRegistrationCompletionUrl(token) {
    if (!token) {
        return 'complete-registration.html';
    }
    return `complete-registration.html?token=${encodeURIComponent(token)}`;
}

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
    const relativePath = buildRegistrationCompletionUrl(token);
    try {
        return new URL(relativePath, window.location.href).toString();
    } catch (error) {
        console.warn('Unable to construct absolute invitation link, using relative path.', error);
        return relativePath;
    }
}

async function deliverInvitationEmail(user, invitationMeta) {
    if (!user || !user.email) {
        return { status: 'skipped', message: 'Missing recipient email.' };
    }

    const endpoint = resolveInvitationServiceUrl();
    if (!endpoint) {
        return { status: 'skipped', message: 'Invitation email service is not configured.' };
    }

    const payload = {
        recipientEmail: user.email,
        recipientName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        invitationLink: buildAbsoluteInvitationLink(invitationMeta.token),
        otp: invitationMeta.otp || null,
        expiresAt: invitationMeta.expiresAt || null,
        linkExpiresAt: invitationMeta.linkExpiresAt || null,
        invitedBy: invitationMeta.invitedBy || null
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
            const message = details || `Invitation email service returned ${response.status}.`;
            return { status: 'error', message };
        }

        return {
            status: 'sent',
            messageId: responseBody && responseBody.messageId ? responseBody.messageId : null
        };
    } catch (error) {
        console.error('Failed to reach invitation email service.', error);
        return { status: 'error', message: error.message };
    }
}

function resolveInvitationSenderLabel() {
    const session = state.activeSession || null;
    if (!session) {
        return null;
    }
    if (session.user && session.user.name) {
        return session.user.name;
    }
    if (session.email) {
        return session.email;
    }
    return null;
}

function updateRegistrationLinkDisplay(tokenOverride = null) {
    const wrapper = document.getElementById('registrationFlowLinkWrapper');
    const linkEl = document.getElementById('registrationFlowLink');
    const token = tokenOverride || state.registrationFlow.token || null;

    if (!wrapper || !linkEl) {
        return;
    }

    if (!token) {
        wrapper.classList.add('hidden');
        linkEl.removeAttribute('href');
        linkEl.textContent = 'complete-registration.html';
        state.registrationFlow.link = null;
        return;
    }

    const url = buildRegistrationCompletionUrl(token);
    linkEl.href = url;
    linkEl.textContent = url;
    wrapper.classList.remove('hidden');
    state.registrationFlow.link = url;
}

function loadActiveSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        const session = {
            userId: parsed.userId ?? null,
            email: typeof parsed.email === 'string' ? parsed.email : '',
            signedInAt: parsed.signedInAt || null
        };
        return session;
    } catch (error) {
        console.warn('Unable to load active session payload.', error);
        return null;
    }
}

function clearActiveSession() {
    try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to clear active session.', error);
    }
}

function redirectToLogin() {
    const loginUrl = getLoginPageUrl();
    try {
        clearActiveSession();
    } catch (error) {
        console.warn('Unable to reset active session before redirect.', error);
    }
    if (!loginUrl) {
        console.warn('Login page URL is not defined.');
        return false;
    }
    window.location.replace(loginUrl);
    return true;
}

function enforceActiveSession() {
    const session = loadActiveSession();
    if (!session) {
        redirectToLogin();
        return false;
    }
    state.activeSession = session;
    return true;
}

function ensureSessionUserIsActive() {
    const session = state.activeSession;
    if (!session) {
        return false;
    }

    const normalizedEmail = session.email ? session.email.trim().toLowerCase() : '';
    let matchedUser = null;

    if (session.userId !== undefined && session.userId !== null) {
        matchedUser = users.find(user => user && String(user.id) === String(session.userId));
    }
    if (!matchedUser && normalizedEmail) {
        matchedUser = users.find(user => normalizeEmail(user.email) === normalizedEmail);
    }

    if (!matchedUser) {
        redirectToLogin();
        return false;
    }

    const status = (matchedUser.status || '').toLowerCase();
    if (status !== 'active') {
        redirectToLogin();
        return false;
    }

    if (matchedUser.sessionExpiresAt) {
        const expiry = new Date(matchedUser.sessionExpiresAt).getTime();
        if (Number.isFinite(expiry) && Date.now() > expiry) {
            redirectToLogin();
            return false;
        }
    }

    state.activeSession.user = matchedUser;
    return true;
}

function updateActiveUserChip(user) {
    if (!user) {
        return;
    }
    const chip = document.querySelector('.topbar-right .user-chip span');
    if (!chip) {
        return;
    }
    const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
    chip.textContent = name;
}

function handleSignOut(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    redirectToLogin();
}

function clonePermissionEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return entry;
    }
    const cloned = {
        ...entry,
        actions: Array.isArray(entry.actions) ? [...entry.actions] : []
    };
    return cloned;
}

function normalizeRolePayload(role) {
    if (!role || typeof role !== 'object') return null;

    const permissions = Array.isArray(role.permissions)
        ? role.permissions
            .filter(item => item !== null && item !== undefined)
            .map(clonePermissionEntry)
        : [];

    const englishName = typeof role.nameEnglish === 'string' ? role.nameEnglish.trim() : '';
    const generalName = typeof role.name === 'string' ? role.name.trim() : '';
    const fallbackName = englishName || generalName || 'Untitled Role';
    const roleId = typeof role.id === 'string' && role.id.trim()
        ? role.id.trim()
        : `role-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
        id: roleId,
        name: generalName || fallbackName,
        nameEnglish: englishName || fallbackName,
        nameArabic: role.nameArabic || '',
        description: role.description || '',
        users: typeof role.users === 'number' ? role.users : 0,
        permissions,
        status: role.status === 'inactive' ? 'inactive' : 'active',
        lastUpdated: role.lastUpdated || 'Imported'
    };
}

function normalizeUserPayload(user, index = 0) {
    if (!user || typeof user !== 'object') return null;

    const numericId = Number.isInteger(user.id) ? user.id : index + 1;
    const safeName = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : `User ${numericId}`;
    const rawEmail = typeof user.email === 'string' ? user.email.trim() : '';
    const email = rawEmail || `user${numericId}@onruf.com`;
    const rawStatus = typeof user.status === 'string' ? user.status.trim().toLowerCase() : 'active';
    let normalizedStatus = 'Active';
    if (rawStatus === 'inactive') {
        normalizedStatus = 'Inactive';
    } else if (rawStatus === 'pending') {
        normalizedStatus = 'Pending';
    }

    const invitation = normalizeInvitationPayload(user.invitation);
    const auth = normalizeAuthPayload(user.auth);

    const accountType = user.accountType
        ? user.accountType
        : normalizedStatus === 'Pending'
            ? 'pending-invite'
            : 'platform-administrator';

    const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
    const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
    const employeeId = typeof user.employeeId === 'string' ? user.employeeId.trim() : '';

    return {
        id: numericId,
        name: safeName,
        email,
        role: user.role || 'Admin',
        roleId: user.roleId || '',
        accountType,
        status: normalizedStatus,
        firstName,
        lastName,
        employeeId,
        lastLogin: user.lastLogin || 'Never',
        created: user.created || new Date().toLocaleDateString(),
        phone: user.phone || '',
        department: user.department || '',
        permissionSummary: user.permissionSummary || '',
        expiresOn: user.expiresOn || '',
        sessionExpiresAt: user.sessionExpiresAt || null,
        invitation,
        auth
    };
}

function loadRolesFromStorage() {
    try {
        const raw = localStorage.getItem(ROLES_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return null;
        const normalized = parsed
            .map(normalizeRolePayload)
            .filter(Boolean);
        return normalized.length ? normalized : null;
    } catch (error) {
        console.warn('Unable to load roles from storage:', error);
        return null;
    }
}

function loadUsersFromStorage() {
    try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return null;
        const normalized = parsed
            .map((user, index) => normalizeUserPayload(user, index))
            .filter(Boolean);
        return normalized.length ? normalized : null;
    } catch (error) {
        console.warn('Unable to load users from storage:', error);
        return null;
    }
}

function saveRolesToStorage() {
    try {
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch (error) {
        console.warn('Unable to save roles to storage:', error);
    }
}

function saveUsersToStorage() {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
        console.warn('Unable to save users to storage:', error);
    }
}

function syncAppPermissionRow(appCheckbox) {
    if (!appCheckbox) return;
    const row = appCheckbox.closest('.permission-app-row');
    if (!row) return;
    const actionSelect = row.querySelector('.permission-action-ddl');
    if (!actionSelect) return;

    if (appCheckbox.checked) {
        actionSelect.disabled = false;
        if (!actionSelect.value) {
            actionSelect.value = permissionActions[0]?.id || '';
        }
    } else {
        actionSelect.disabled = true;
        actionSelect.selectedIndex = 0;
    }
}

function refreshSectionCheckboxState(sectionCard) {
    if (!sectionCard) return;
    const sectionCheckbox = sectionCard.querySelector('.permission-section-checkbox');
    if (!sectionCheckbox) return;
    const appCheckboxes = sectionCard.querySelectorAll('.permission-app-checkbox');
    const total = appCheckboxes.length;
    const checkedCount = Array.from(appCheckboxes).filter(cb => cb.checked).length;

    if (total === 0 || checkedCount === 0) {
        sectionCheckbox.checked = false;
        sectionCheckbox.indeterminate = false;
    } else if (checkedCount === total) {
        sectionCheckbox.checked = true;
        sectionCheckbox.indeterminate = false;
    } else {
        sectionCheckbox.checked = false;
        sectionCheckbox.indeterminate = true;
    }
}

function setupPermissionMatrixInteractions(root) {
    const appCheckboxes = root.querySelectorAll('.permission-app-checkbox');
    appCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', event => {
            const appCheckbox = event.target;
            syncAppPermissionRow(appCheckbox);
            const sectionCard = appCheckbox.closest('.permission-section');
            refreshSectionCheckboxState(sectionCard);
            setRolePermissionsError('');
        });
    });

    const sectionCheckboxes = root.querySelectorAll('.permission-section-checkbox');
    sectionCheckboxes.forEach(sectionCheckbox => {
        sectionCheckbox.addEventListener('change', event => {
            const sectionCard = event.target.closest('.permission-section');
            if (!sectionCard) return;
            const appCheckboxes = sectionCard.querySelectorAll('.permission-app-checkbox');
            appCheckboxes.forEach(appCheckbox => {
                if (appCheckbox.checked !== event.target.checked) {
                    appCheckbox.checked = event.target.checked;
                }
                syncAppPermissionRow(appCheckbox);
            });
            refreshSectionCheckboxState(sectionCard);
            setRolePermissionsError('');
        });
    });
}

function collectPermissionSelections() {
    const selections = [];
    const catalog = state.permissionCatalog.length ? state.permissionCatalog : buildPermissionCatalog();
    catalog.forEach(section => {
        section.apps.forEach(app => {
            const appCheckbox = document.querySelector(`.permission-app-checkbox[data-app="${app.id}"]`);
            if (!appCheckbox || !appCheckbox.checked) return;

            const actionSelect = document.querySelector(`.permission-action-ddl[data-app="${app.id}"]`);
            const selectedAction = actionSelect ? actionSelect.value : '';
            selections.push({
                sectionId: section.id,
                sectionLabel: section.label,
                appId: app.id,
                appLabel: app.label,
                actions: selectedAction ? [selectedAction] : ['read']
            });
        });
    });
    return selections;
}

function renderPermissionMatrix() {
    const container = document.getElementById('permissionMatrix');
    if (!container) return;

    const catalog = buildPermissionCatalog();
    state.permissionCatalog = catalog.map(section => ({
        ...section,
        apps: section.apps.map(app => ({ ...app }))
    }));

    const matrix = document.createElement('div');
    matrix.className = 'permission-matrix';

    catalog.forEach(section => {
        const sectionCard = document.createElement('div');
        sectionCard.className = 'permission-section';
        sectionCard.dataset.section = section.id;

        const header = document.createElement('div');
        header.className = 'permission-section-header';

        const toggle = document.createElement('label');
        toggle.className = 'permission-section-toggle';

        const sectionCheckbox = document.createElement('input');
        sectionCheckbox.type = 'checkbox';
        sectionCheckbox.className = 'permission-section-checkbox';
        sectionCheckbox.dataset.section = section.id;

        const sectionTitle = document.createElement('span');
        sectionTitle.textContent = section.label;

        toggle.appendChild(sectionCheckbox);
        toggle.appendChild(sectionTitle);

        header.appendChild(toggle);
        sectionCard.appendChild(header);

        const appsContainer = document.createElement('div');
        appsContainer.className = 'permission-apps';

        section.apps.forEach(app => {
            const row = document.createElement('div');
            row.className = 'permission-app-row';

            const info = document.createElement('div');
            info.className = 'permission-app-info';

            const appCheckbox = document.createElement('input');
            appCheckbox.type = 'checkbox';
            appCheckbox.className = 'permission-app-checkbox';
            appCheckbox.dataset.section = section.id;
            appCheckbox.dataset.app = app.id;
            appCheckbox.id = `${section.id}-${app.id}`;

            const label = document.createElement('label');
            label.setAttribute('for', appCheckbox.id);
            label.className = 'permission-app-name';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = app.label;
            label.appendChild(nameSpan);

            info.appendChild(appCheckbox);
            info.appendChild(label);
            row.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'permission-actions';

            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'permission-action-select';

            const actionSelect = document.createElement('select');
            actionSelect.className = 'permission-action-ddl';
            actionSelect.dataset.section = section.id;
            actionSelect.dataset.app = app.id;
            actionSelect.disabled = true;

            permissionActions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.id;
                option.textContent = action.label;
                actionSelect.appendChild(option);
            });

            if (app.defaultAction && actionSelect.querySelector(`option[value="${app.defaultAction}"]`)) {
                actionSelect.value = app.defaultAction;
            } else if (permissionActions.length) {
                actionSelect.value = permissionActions[0].id;
            }

            selectWrapper.appendChild(actionSelect);
            actions.appendChild(selectWrapper);
            row.appendChild(actions);

            appsContainer.appendChild(row);
        });

        sectionCard.appendChild(appsContainer);
        matrix.appendChild(sectionCard);
    });

    container.innerHTML = '';
    container.appendChild(matrix);
    setupPermissionMatrixInteractions(container);
    resetPermissionMatrix();
}

function resetPermissionMatrix() {
    const container = document.getElementById('permissionMatrix');
    if (!container) return;
    container.querySelectorAll('.permission-section-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
    });
    container.querySelectorAll('.permission-app-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    container.querySelectorAll('.permission-action-ddl').forEach(select => {
        select.disabled = true;
        select.selectedIndex = 0;
    });
    container.querySelectorAll('.permission-section').forEach(sectionCard => {
        refreshSectionCheckboxState(sectionCard);
    });
    setRolePermissionsError('');
}

function setRolePermissionsError(message = '') {
    const errorEl = document.getElementById('rolePermissionsError');
    if (!errorEl) return;
    const text = message ? String(message).trim() : '';
    if (text) {
        errorEl.textContent = text;
        errorEl.classList.remove('hidden');
    } else {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }
}

function setRoleBuilderMode(mode = 'create', role = null) {
    state.roleBuilderMode = mode;
    state.editingRoleId = mode === 'edit' && role ? role.id : null;

    const titleEl = document.getElementById('roleFormTitle');
    const subtitleEl = document.getElementById('roleFormSubtitle');
    const submitIconEl = document.getElementById('roleFormSubmitIcon');
    const submitLabelEl = document.getElementById('roleFormSubmitLabel');

    if (mode === 'edit' && role) {
                if (titleEl) {
                    titleEl.textContent = 'Edit User Role';
        }
        if (subtitleEl) {
            subtitleEl.textContent = '';
        }
        if (submitIconEl) {
            submitIconEl.className = 'fas fa-save';
        }
                if (submitLabelEl) {
                    submitLabelEl.textContent = 'Save';
        }
    } else {
        if (titleEl) {
            titleEl.textContent = 'Add New User Role';
        }
        if (subtitleEl) {
            subtitleEl.textContent = '';
        }
        if (submitIconEl) {
            submitIconEl.className = 'fas fa-plus';
        }
        if (submitLabelEl) {
            submitLabelEl.textContent = 'Add';
        }
    }
}

function populateRoleForm(role) {
    if (!role) return;
    const arabicInput = document.getElementById('roleNameArabicInput');
    const englishInput = document.getElementById('roleNameEnglishInput');
    const descriptionInput = document.getElementById('roleDescriptionInput');

    if (arabicInput) {
        arabicInput.value = role.nameArabic || '';
    }
    if (englishInput) {
        englishInput.value = role.name || role.nameEnglish || '';
    }
    if (descriptionInput) {
        descriptionInput.value = role.description || '';
    }

    applyPermissionsToMatrix(role.permissions);
}

function applyPermissionsToMatrix(permissions) {
    if (!Array.isArray(permissions) || !permissions.length) return;
    const container = document.getElementById('permissionMatrix');
    if (!container) return;

    const touchedSections = new Set();

    permissions.forEach(permission => {
        if (!permission || typeof permission === 'string') return;
        const { sectionId, appId, actions } = permission;
        if (!sectionId || !appId) return;

        const appCheckbox = container.querySelector(`.permission-app-checkbox[data-section="${sectionId}"][data-app="${appId}"]`);
        if (!appCheckbox) return;

        appCheckbox.checked = true;
        syncAppPermissionRow(appCheckbox);

        const actionSelect = container.querySelector(`.permission-action-ddl[data-section="${sectionId}"][data-app="${appId}"]`);
        if (actionSelect && Array.isArray(actions) && actions.length) {
            const desiredAction = actions[0];
            if (desiredAction && actionSelect.querySelector(`option[value="${desiredAction}"]`)) {
                actionSelect.value = desiredAction;
            }
        }

        touchedSections.add(sectionId);
    });

    touchedSections.forEach(sectionId => {
        const sectionCard = container.querySelector(`.permission-section[data-section="${sectionId}"]`);
        if (sectionCard) {
            refreshSectionCheckboxState(sectionCard);
        }
    });
}

function showRoleBuilder(mode = 'create', role = null) {
    hideRoleDetails();
    const directory = document.getElementById('roleDirectoryView');
    const builder = document.getElementById('roleBuilderView');
    const addBtn = document.getElementById('addRoleBtn');
    const searchContainer = document.getElementById('roleSearchContainer');
    const roleForm = document.getElementById('roleForm');
    if (!directory || !builder || !addBtn || !roleForm) return;

    const focusArabicInput = () => {
        const focusTarget = document.getElementById('roleNameArabicInput');
        if (focusTarget) {
            focusTarget.focus();
        }
    };

    roleForm.reset();
    resetPermissionMatrix();

    setRoleBuilderMode(mode, role);

    if (mode === 'edit' && role) {
        setTimeout(() => {
            populateRoleForm(role);
            focusArabicInput();
        }, 0);
    } else {
        focusArabicInput();
    }

    directory.classList.add('hidden');
    builder.classList.remove('hidden');
    addBtn.classList.add('hidden');
    searchContainer?.classList.add('hidden');
    updateBreadcrumb('users');
}

function hideRoleBuilder() {
    const directory = document.getElementById('roleDirectoryView');
    const builder = document.getElementById('roleBuilderView');
    const addBtn = document.getElementById('addRoleBtn');
    const searchContainer = document.getElementById('roleSearchContainer');
    const roleForm = document.getElementById('roleForm');
    if (!directory || !builder || !addBtn || !roleForm) return;

    roleForm.reset();
    resetPermissionMatrix();
    setRoleBuilderMode('create');
    builder.classList.add('hidden');
    directory.classList.remove('hidden');
    addBtn.classList.remove('hidden');
    searchContainer?.classList.remove('hidden');
    updateBreadcrumb('users');
}

function ensureSeedDataReset() {
    try {
        const recordedVersion = localStorage.getItem(DATA_RESET_KEY);
        if (recordedVersion !== DATA_RESET_VERSION) {
            localStorage.removeItem(ROLES_STORAGE_KEY);
            localStorage.removeItem(USERS_STORAGE_KEY);
            localStorage.setItem(DATA_RESET_KEY, DATA_RESET_VERSION);
        }
    } catch (error) {
        console.warn('Unable to reset stored datasets:', error);
    }
}

function initializeApp() {
    if (!enforceActiveSession()) {
        return;
    }

    ensureSeedDataReset();
    renderPermissionMatrix();

    const storedRoles = loadRolesFromStorage();
    if (storedRoles && storedRoles.length) {
        roles = storedRoles;
    } else {
        roles = defaultRoles.map(normalizeRolePayload).filter(Boolean);
        saveRolesToStorage();
    }

    const storedUsers = loadUsersFromStorage();
    if (storedUsers && storedUsers.length) {
        users = storedUsers;
        const superAdmin = users.find(user => typeof user.email === 'string' && user.email.trim().toLowerCase() === 'superadmin@onruf.com');
        if (superAdmin && superAdmin.status !== 'Active') {
            superAdmin.status = 'Active';
            if (!superAdmin.accountType || superAdmin.accountType === 'pending-invite') {
                superAdmin.accountType = 'platform-administrator';
            }
            saveUsersToStorage();
        }
    } else {
        users = defaultUsers.map((user, index) => normalizeUserPayload(user, index)).filter(Boolean);
        saveUsersToStorage();
    }

    if (!ensureSessionUserIsActive()) {
        return;
    }
    updateActiveUserChip(state.activeSession.user);

    syncRoleUserCounts();
    saveRolesToStorage();

    setupEventListeners();
    updateRegistrationLinkDisplay(null);
    renderStats();
    renderChart();
    renderActivity();
    renderRolesTable();
    renderUsersTable();
    updateUserRolesCount();
    updateUsersManagementCount();
    renderStats();
    updateBreadcrumb();

    const roleSearchInput = document.getElementById('roleSearchInput');
    if (roleSearchInput) {
        roleSearchInput.value = state.roleSearchTerm || '';
    }

    const userSearchInput = document.getElementById('userSearch');
    if (userSearchInput) {
        userSearchInput.value = state.userSearchTerm || '';
    }

    setupRoleConfirmOverlay();
    setupRolePromptOverlay();
    setupUserConfirmOverlay();
    setupRoleAlertOverlay();
    setupUserAlertOverlay();

    applyRequiredFieldIndicators();
    syncAccountEditLayout();
}

function applyRequiredFieldIndicators() {
    const requiredFields = document.querySelectorAll('input[required], select[required], textarea[required]');
    requiredFields.forEach(field => {
        const explicitLabel = field.id ? document.querySelector(`label[for="${field.id}"]`) : null;
        const candidateLabel = explicitLabel || field.closest('label');
        if (candidateLabel && !candidateLabel.classList.contains('required')) {
            candidateLabel.classList.add('required');
        }
    });
}

function setupEventListeners() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();
            const sectionId = item.dataset.section;
            navigateToSection(sectionId);
        });
    });

    document.querySelectorAll('.sub-app-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.closest('.section-content');
            if (!section) return;
            const sectionId = section.id;
            const targetId = button.dataset.target;
            activateSubApp(sectionId, targetId);
            if (sectionId === 'users' && targetId === 'users-app1') {
                hideRoleBuilder();
            }
            if (sectionId === 'users' && targetId === 'users-app2') {
                hideUserForm();
            }
            updateBreadcrumb();
        });
    });

    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            state.currentPeriod = button.dataset.period;
            renderChart();
        });
    });

    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) {
        addRoleBtn.addEventListener('click', () => {
            showRoleBuilder('create');
        });
    }

    const cancelRoleFormBtn = document.getElementById('cancelRoleFormBtn');
    if (cancelRoleFormBtn) {
        cancelRoleFormBtn.addEventListener('click', () => {
            hideRoleBuilder();
        });
    }

    const roleForm = document.getElementById('roleForm');
    if (roleForm) {
        roleForm.addEventListener('submit', handleRoleSubmit);
        roleForm.addEventListener('reset', () => {
            setTimeout(() => {
                resetPermissionMatrix();
            }, 0);
        });
    }

    const roleSearchInput = document.getElementById('roleSearchInput');
    if (roleSearchInput) {
        roleSearchInput.addEventListener('input', () => {
            handleRoleSearch();
        });
        roleSearchInput.addEventListener('search', handleRoleSearch);
        roleSearchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleRoleSearch();
            }
        });
    }

    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', event => {
            renderUsersTable(event.target.value);
        });
        userSearch.addEventListener('search', event => {
            renderUsersTable(event.target.value);
        });
    }

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            showUserForm('add');
        });
    }

    const userRoleSelect = document.getElementById('userRole');
    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', handleRoleSelectionChange);
    }

    const userAccountExpiration = document.getElementById('userAccountExpiration');
    if (userAccountExpiration) {
        userAccountExpiration.addEventListener('change', handleExpirationDateChange);
    }

    const userSuperAdminToggle = document.getElementById('userSuperAdminToggle');
    if (userSuperAdminToggle) {
        userSuperAdminToggle.addEventListener('change', handleSuperAdminToggle);
    }

    const exportUsersBtn = document.getElementById('exportUsersBtn');
    if (exportUsersBtn) {
        exportUsersBtn.addEventListener('click', exportUsers);
    }

    const importUsersBtn = document.getElementById('importUsersBtn');
    if (importUsersBtn) {
        importUsersBtn.addEventListener('click', () => {
            alert('User import wizard would launch here.');
        });
    }

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    const rolesTableBody = document.getElementById('rolesTableBody');
    if (rolesTableBody) {
        rolesTableBody.addEventListener('click', async event => {
            const button = event.target.closest('.action-btn');
            if (!button) return;
            const roleId = button.dataset.role;
            if (!roleId) return;
            if (button.dataset.action === 'view') {
                viewRole(roleId);
            } else if (button.dataset.action === 'edit') {
                editRole(roleId);
            } else if (button.dataset.action === 'toggle') {
                await toggleRoleStatus(roleId);
            } else if (button.dataset.action === 'delete') {
                await deleteRole(roleId);
            }
        });
    }

    const roleDetailOverlay = document.getElementById('roleDetailOverlay');
    const roleDetailCloseBtn = document.getElementById('roleDetailCloseBtn');
    if (roleDetailCloseBtn) {
        roleDetailCloseBtn.addEventListener('click', hideRoleDetails);
    }
    if (roleDetailOverlay) {
        roleDetailOverlay.addEventListener('click', event => {
            if (event.target === roleDetailOverlay) {
                hideRoleDetails();
            }
        });
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && roleDetailOverlay && !roleDetailOverlay.classList.contains('hidden')) {
            hideRoleDetails();
        }
    });

    // User form event listeners
    const userFormPage = document.getElementById('userFormPage');
    const userForm = document.getElementById('userForm');
    const userFormProgress = document.getElementById('userFormProgress');
    const userInfoNextBtn = document.getElementById('userInfoNextBtn');
    const userInfoCancelBtn = document.getElementById('userInfoCancelBtn');
    const userFormBackBtn = document.getElementById('userFormBackBtn');

    const registrationFlowOverlay = document.getElementById('registrationFlowOverlay');
    const registrationFlowCloseBtn = document.getElementById('registrationFlowCloseBtn');
    const registrationCompletionForm = document.getElementById('registrationCompletionForm');
    const registrationOtpForm = document.getElementById('registrationOtpForm');
    const registrationFlowResendBtn = document.getElementById('registrationFlowResendBtn');
    const registrationFlowDoneBtn = document.getElementById('registrationFlowDoneBtn');

    if (userInfoNextBtn) {
        userInfoNextBtn.addEventListener('click', handleUserInfoStep);
    }
    if (userInfoCancelBtn) {
        userInfoCancelBtn.addEventListener('click', () => {
            hideUserForm();
        });
    }
    if (userFormBackBtn) {
        userFormBackBtn.addEventListener('click', () => {
            setUserFormStep(1);
            focusUserFormStep(1);
        });
    }
    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
    }
    if (userFormProgress) {
        const activateStep = stepItem => {
            if (!stepItem || stepItem.classList.contains('disabled')) {
                return;
            }
            const targetStep = Number(stepItem.dataset.step || 0);
            if (!targetStep || targetStep === state.userFormStep) {
                return;
            }
            if (targetStep < state.userFormStep) {
                return;
            }
            if (targetStep > state.userFormStep) {
                if (!collectUserFormStepData(state.userFormStep)) {
                    return;
                }
            }
            setUserFormStep(targetStep);
            focusUserFormStep(targetStep);
        };

        userFormProgress.addEventListener('click', event => {
            const stepItem = event.target.closest('.step');
            activateStep(stepItem);
        });

        userFormProgress.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            const stepItem = event.target.closest('.step');
            if (!stepItem) {
                return;
            }
            event.preventDefault();
            activateStep(stepItem);
        });
    }

    if (registrationCompletionForm) {
        registrationCompletionForm.addEventListener('submit', handleRegistrationCompletionSubmit);
    }
    if (registrationOtpForm) {
        registrationOtpForm.addEventListener('submit', handleRegistrationOtpSubmit);
    }
    if (registrationFlowCloseBtn) {
        registrationFlowCloseBtn.addEventListener('click', closeRegistrationFlow);
    }
    if (registrationFlowOverlay) {
        registrationFlowOverlay.addEventListener('click', event => {
            if (event.target === registrationFlowOverlay) {
                closeRegistrationFlow();
            }
        });
    }
    if (registrationFlowResendBtn) {
        registrationFlowResendBtn.addEventListener('click', handleRegistrationFlowResend);
    }
    if (registrationFlowDoneBtn) {
        registrationFlowDoneBtn.addEventListener('click', closeRegistrationFlow);
    }

    document.addEventListener('keydown', event => {
        const overlayVisible = registrationFlowOverlay && !registrationFlowOverlay.classList.contains('hidden');
        if (event.key === 'Escape') {
            if (overlayVisible) {
                closeRegistrationFlow();
            } else if (userFormPage && !userFormPage.classList.contains('hidden')) {
                hideUserForm();
            }
        }
    });
}

function navigateToSection(sectionId) {
    if (!sectionId) return;
    state.currentSection = sectionId;

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const menu = document.querySelector(`.menu-item[data-section="${sectionId}"]`);
    if (menu) {
        menu.classList.add('active');
    }

    document.querySelectorAll('.section-content').forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    if (sectionId !== 'users') {
        hideRoleDetails();
        hideUserForm();
    }

    updateBreadcrumb(sectionId);
}

function activateSubApp(sectionId, subAppId) {
    const section = document.getElementById(sectionId);
    if (!section || !subAppId) return;

    section.querySelectorAll('.sub-app').forEach(app => app.classList.remove('active'));
    const targetApp = section.querySelector(`#${subAppId}`);
    if (targetApp) {
        targetApp.classList.add('active');
    }

    section.querySelectorAll('.sub-app-btn').forEach(btn => btn.classList.remove('active'));
    const button = section.querySelector(`.sub-app-btn[data-target="${subAppId}"]`);
    if (button) {
        button.classList.add('active');
    }

    if (sectionId === 'users') {
        if (subAppId !== 'users-app1') {
            hideRoleBuilder();
            hideRoleDetails();
        }
        if (subAppId !== 'users-app2') {
            hideUserForm();
        }
    }
}

function updateBreadcrumb(sectionId = state.currentSection) {
    const breadcrumb = document.getElementById('breadcrumbTrail');
    if (!breadcrumb) return;

    const sectionNames = {
        dashboard: 'Dashboard',
        users: 'Users',
        settings: 'Settings',
        reports: 'Reports',
        packages: 'Packages',
        products: 'Products',
        'onruf-users': 'ONRUF Users',
        advertisments: 'Advertisments'
    };

    const sectionLabel = sectionNames[sectionId] || 'Dashboard';
    const section = document.getElementById(sectionId);
    let appLabel = 'Overview';
    if (section) {
        const activeAppButton = section.querySelector('.sub-app-btn.active');
        if (activeAppButton) {
            if (activeAppButton.dataset && activeAppButton.dataset.label) {
                appLabel = activeAppButton.dataset.label;
            } else {
                const primarySpan = activeAppButton.querySelector('span:first-child');
                if (primarySpan) {
                    appLabel = primarySpan.textContent.trim();
                } else {
                    const fallbackText = activeAppButton.textContent ? activeAppButton.textContent.trim() : '';
                    appLabel = fallbackText || appLabel;
                }
            }
        }
    }

    if (sectionId === 'users') {
        const builder = document.getElementById('roleBuilderView');
        if (builder && !builder.classList.contains('hidden')) {
            appLabel = state.roleBuilderMode === 'edit' ? 'Edit User Role' : 'Add New User Role';
        }
        const userFormPage = document.getElementById('userFormPage');
        if (userFormPage && !userFormPage.classList.contains('hidden')) {
            appLabel = state.editingUserId ? 'Edit User Account' : 'Add New User';
        }
    }

    breadcrumb.textContent = `Control Panel / ${sectionLabel} / ${appLabel}`;
}

function renderStats() {
    const totalUsersStat = document.getElementById('totalUsersStat');
    const activeUsersStat = document.getElementById('activeUsersStat');
    const totalRolesStat = document.getElementById('totalRolesStat');
    const complianceStat = document.getElementById('complianceStat');

    if (totalUsersStat) totalUsersStat.textContent = users.length.toLocaleString();
    if (activeUsersStat) {
        const activeCount = users.filter(user => user.status === 'Active').length;
        activeUsersStat.textContent = activeCount.toLocaleString();
    }
    if (totalRolesStat) totalRolesStat.textContent = roles.length;
    if (complianceStat) complianceStat.textContent = '94.2%';
}

function updateUserRolesCount() {
    const badge = document.getElementById('userRolesCount');
    if (!badge) return;

    const total = Array.isArray(roles) ? roles.length : 0;
    const label = total === 1 ? 'Role' : 'Roles';
    badge.textContent = `#${total} ${label}`;
}

function updateUsersManagementCount() {
    const badge = document.getElementById('usersManagementCount');
    if (!badge) return;

    const total = Array.isArray(users) ? users.length : 0;
    const label = total === 1 ? 'User' : 'Users';
    badge.textContent = `#${total} ${label}`;
}

function renderChart() {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth || 640;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const data = getChartDataset(state.currentPeriod);
    const values = data.map(point => point.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const padding = 40;
    const graphHeight = height - padding * 2;
    const graphWidth = width - padding * 2;
    const stepX = graphWidth / (data.length - 1);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + index * stepX;
        const y = height - padding - ((point.value - minVal) / (maxVal - minVal || 1)) * graphHeight;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.font = '12px Inter';
    data.forEach((point, index) => {
        const x = padding + index * stepX;
        const y = height - padding - ((point.value - minVal) / (maxVal - minVal || 1)) * graphHeight;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(point.label, x - 12, height - padding + 16);
    });
}

function getChartDataset(period) {
    if (period === 'quarterly') {
        return [
            { label: 'Q1', value: average(monthlyPerformance.slice(0, 3)) },
            { label: 'Q2', value: average(monthlyPerformance.slice(3, 6)) },
            { label: 'Q3', value: average(monthlyPerformance.slice(6, 9)) },
            { label: 'Q4', value: average(monthlyPerformance.slice(9, 12)) }
        ];
    }
    if (period === 'yearly') {
        return [
            { label: '2022', value: 61 },
            { label: '2023', value: 73 },
            { label: '2024', value: 85 }
        ];
    }
    return monthlyPerformance.slice(-6);
}

function average(dataset) {
    if (!dataset.length) return 0;
    return Math.round(dataset.reduce((sum, point) => sum + point.value, 0) / dataset.length);
}

function renderActivity() {
    const container = document.getElementById('activityFeed');
    if (!container) return;
    container.innerHTML = '<h3 style="margin:0;">Latest Activity</h3>';
    activityFeed.forEach(item => {
        const entry = document.createElement('div');
        entry.className = 'activity-item';
        entry.innerHTML = `
            <div class="activity-avatar">${initials(item.actor)}</div>
            <div class="activity-content">
                <strong>${item.actor}</strong>
                <span>${item.action}</span>
                <span class="activity-meta">${item.time}</span>
            </div>
        `;
        container.appendChild(entry);
    });
}

function initials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function renderRolesTable(page = state.currentRolePage) {
    const tbody = document.getElementById('rolesTableBody');
    if (!tbody) return;

    const roleSearchInput = document.getElementById('roleSearchInput');
    if (roleSearchInput) {
        const desiredValue = state.roleSearchTerm || '';
        if (roleSearchInput.value !== desiredValue) {
            roleSearchInput.value = desiredValue;
        }
    }

    const searchTerm = (state.roleSearchTerm || '').toLowerCase();
    const filteredRoles = searchTerm
        ? roles.filter(role => {
            const haystack = `${role.name || role.nameEnglish || ''} ${role.nameArabic || ''} ${role.description || ''}`.toLowerCase();
            return haystack.includes(searchTerm);
        })
        : roles;

    const totalPages = Math.max(1, Math.ceil(filteredRoles.length / state.rolesPerPage));
    state.currentRolePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (state.currentRolePage - 1) * state.rolesPerPage;
    const visibleRoles = filteredRoles.slice(startIndex, startIndex + state.rolesPerPage);

    if (!visibleRoles.length) {
        tbody.innerHTML = state.roleSearchTerm
            ? '<tr><td colspan="7">There is no Data Available</td></tr>'
            : '<tr><td colspan="7">There is no Data Available</td></tr>';
    } else {
        let index = (state.currentRolePage - 1) * state.rolesPerPage + 1;
        tbody.innerHTML = visibleRoles.map(role => {
            const permissionCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
            const userCount = updateRoleUserCount(role);
            const rawDescription = role.description && role.description.trim() ? role.description.trim() : '—';
            const descriptionTitleAttr = rawDescription !== '—' ? ` title="${escapeAttribute(rawDescription)}"` : '';
            return `
            <tr>
                <td>${index++}</td>
                <td>
                    <div>
                        <div style="font-weight:600;">${role.name || role.nameEnglish || ''}</div>
                        <div class="role-meta">${role.lastUpdated}</div>
                    </div>
                </td>
                <td class="role-description-cell">
                    <div class="role-description-text"${descriptionTitleAttr}>${rawDescription}</div>
                </td>
                <td>${userCount}</td>
                <td>
                    <div class="permission-cell">
                        <span class="permission-count">${permissionCount} ${permissionCount === 1 ? 'app' : 'apps'}</span>
                        <button class="action-btn view" data-action="view" data-role="${role.id}" title="View permissions">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${role.status}">${role.status === 'active' ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                    <div class="action-group">
                        <button class="action-btn edit" data-action="edit" data-role="${role.id}"><i class="fas fa-pen"></i></button>
                        <button class="action-btn ${role.status === 'active' ? 'deactivate' : 'activate'}" data-action="toggle" data-role="${role.id}">
                            <i class="fas ${role.status === 'active' ? 'fa-power-off' : 'fa-rotate-right'}"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete" data-role="${role.id}" title="Delete role">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }
    renderRolesPagination(totalPages, filteredRoles.length);
    refreshRoleDetailPanel();
}

function renderRolesPagination(totalPages, totalItems) {
    const container = document.getElementById('rolesPagination');
    if (!container) return;
    container.innerHTML = '';

    if (totalPages <= 1 || totalItems <= state.rolesPerPage) return;

    const createButton = (label, page, disabled = false, active = false) => {
        const button = document.createElement('button');
        button.textContent = label;
        if (disabled) button.disabled = true;
        if (active) button.classList.add('active');
        button.addEventListener('click', () => {
            renderRolesTable(page);
        });
        return button;
    };

    container.appendChild(createButton('Prev', state.currentRolePage - 1, state.currentRolePage === 1));

    for (let index = 1; index <= totalPages; index += 1) {
        container.appendChild(createButton(String(index), index, false, index === state.currentRolePage));
    }

    container.appendChild(createButton('Next', state.currentRolePage + 1, state.currentRolePage === totalPages));
}

function renderUsersPagination(totalPages, totalItems) {
    const container = document.getElementById('usersPagination');
    if (!container) return;
    container.innerHTML = '';

    if (totalPages <= 1 || totalItems <= state.usersPerPage) return;

    const createButton = (label, page, disabled = false, active = false) => {
        const button = document.createElement('button');
        button.textContent = label;
        if (disabled) button.disabled = true;
        if (active) button.classList.add('active');
        button.addEventListener('click', () => {
            renderUsersTable(state.userSearchTerm, page);
        });
        return button;
    };

    container.appendChild(createButton('Prev', state.currentUserPage - 1, state.currentUserPage === 1));

    for (let index = 1; index <= totalPages; index += 1) {
        container.appendChild(createButton(String(index), index, false, index === state.currentUserPage));
    }

    container.appendChild(createButton('Next', state.currentUserPage + 1, state.currentUserPage === totalPages));
}

function handleRoleSearch() {
    const input = document.getElementById('roleSearchInput');
    if (!input) return;
    const trimmed = input.value.trim();
    state.roleSearchTerm = trimmed;
    if (input.value !== trimmed) {
        input.value = trimmed;
    }
    state.currentRolePage = 1;
    renderRolesTable(1);
}

function showNotification(type, message, timeout = 4000, areaId = null) {
    const areaCandidates = [];
    if (areaId) {
        areaCandidates.push(areaId);
    }
    areaCandidates.push('globalNotificationArea', 'roleNotificationArea');

    const host = areaCandidates
        .map(id => (id ? document.getElementById(id) : null))
        .find(Boolean);

    if (!host) return;

    const note = document.createElement('div');
    note.className = 'notification';
    if (type) {
        note.classList.add(type);
    }
    note.setAttribute('role', 'status');
    note.tabIndex = 0;

    const messageEl = document.createElement('span');
    messageEl.className = 'notification-message';
    messageEl.textContent = message;
    note.appendChild(messageEl);

    const close = () => {
        if (note._closing) return;
        note._closing = true;
        window.clearTimeout(note._timeoutId);
        note.classList.remove('visible');

        const removeNote = () => {
            note.removeEventListener('transitionend', removeNoteHandler);
            if (note.parentElement) {
                note.parentElement.removeChild(note);
            }
        };

        const removeNoteHandler = event => {
            if (event && event.target !== note) return;
            removeNote();
        };

        note.addEventListener('transitionend', removeNoteHandler);

        setTimeout(removeNote, 320);
    };

    note.addEventListener('click', () => close());
    note.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            close();
        }
    });

    host.appendChild(note);

    requestAnimationFrame(() => {
        note.classList.add('visible');
    });

    if (timeout > 0) {
        note._timeoutId = window.setTimeout(close, timeout);
    }
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeEmployeeId(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function formatNameToken(token) {
    if (!token) {
        return '';
    }
    const lower = token.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function deriveNamePartsFromEmail(email) {
    if (!email || typeof email !== 'string') {
        return { firstName: '', lastName: '', fullName: '' };
    }

    const localPart = email.split('@')[0] || '';
    const sanitized = localPart
        .replace(/[_\.\-\+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!sanitized) {
        return { firstName: '', lastName: '', fullName: '' };
    }

    const tokens = sanitized
        .split(' ')
        .map(formatNameToken)
        .filter(Boolean);

    if (!tokens.length) {
        return { firstName: '', lastName: '', fullName: '' };
    }

    const [firstName, ...rest] = tokens;
    const lastName = rest.join(' ');
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    return { firstName, lastName, fullName };
}

function resolveUserDisplayName(user) {
    if (!user || typeof user !== 'object') {
        return 'User';
    }

    const nameCandidates = [
        typeof user.name === 'string' ? user.name.trim() : '',
        [user.firstName, user.lastName]
            .map(value => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
            .join(' ')
    ];

    const existing = nameCandidates.find(candidate => candidate);
    if (existing) {
        return existing;
    }

    const derived = deriveNamePartsFromEmail(user.email || '');
    if (derived.fullName) {
        return derived.fullName;
    }

    if (typeof user.email === 'string' && user.email.trim()) {
        return user.email.trim();
    }

    if (typeof user.employeeId === 'string' && user.employeeId.trim()) {
        return user.employeeId.trim();
    }

    return user.id ? `User #${user.id}` : 'User';
}

function formatStatusLabel(status) {
    if (!status && status !== 0) {
        return '—';
    }
    const value = String(status).trim();
    if (!value) {
        return '—';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapStatusPillClass(status) {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    if (normalized === 'active') return 'status-pill success';
    if (normalized === 'inactive') return 'status-pill danger';
    if (normalized === 'pending') return 'status-pill warning';
    return 'status-pill info';
}

function findExistingUserByEmail(email, excludeUserId = null) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
        return null;
    }

    const candidate = users.find(user => {
        if (!user || !user.email) {
            return false;
        }
        if (excludeUserId !== null && user.id === excludeUserId) {
            return false;
        }
        return normalizeEmail(user.email) === normalized;
    });

    return candidate || null;
}

function findExistingUserByEmployeeId(employeeId, excludeUserId = null) {
    const normalized = normalizeEmployeeId(employeeId);
    if (!normalized) {
        return null;
    }

    const candidate = users.find(user => {
        if (!user || !user.employeeId) {
            return false;
        }
        if (excludeUserId !== null && user.id === excludeUserId) {
            return false;
        }
        return normalizeEmployeeId(user.employeeId) === normalized;
    });

    return candidate || null;
}

function escapeAttribute(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function resolveUserAccountType(user) {
    if (!user || typeof user !== 'object') {
        return 'platform-administrator';
    }

    const explicit = normalizeEmail(user.accountType);
    if (explicit === 'system-administrator') {
        return 'system-administrator';
    }
    if (explicit === 'platform-administrator') {
        return 'platform-administrator';
    }

    const roleName = (user.role || '').toLowerCase();
    if (roleName.includes('system administrator') || roleName.includes('super admin')) {
        return 'system-administrator';
    }

    return 'platform-administrator';
}

function mapAccountTypeLabel(accountType) {
    return accountType === 'system-administrator' ? 'Super Admin' : 'Admin';
}

function mapAccountTypeClass(accountType) {
    return accountType === 'system-administrator' ? 'account-type-super' : 'account-type-admin';
}

function lookupPlatformAccount(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const directoryAccount = platformDirectory.find(account => normalizeEmail(account.email) === normalized);
    if (directoryAccount) {
        return { ...directoryAccount };
    }

    const existingUser = findExistingUserByEmail(normalized);
    if (!existingUser) {
        return null;
    }

    const fallbackStatus = (existingUser.status || 'Active').toLowerCase();

    return {
        email: existingUser.email,
        name: existingUser.name,
        phone: existingUser.phone || `+96650${String(existingUser.id).padStart(6, '0')}`,
        department: existingUser.department || '',
        status: ['inactive', 'suspended'].includes(fallbackStatus) ? 'inactive' : fallbackStatus === 'pending' ? 'pending' : 'active'
    };
}

function setVerificationBanner(status, message) {
    const banner = document.getElementById('userVerificationBanner');
    if (!banner) return;

    banner.classList.remove('hidden', 'success', 'error', 'neutral');

    if (!message) {
        banner.innerHTML = '';
        banner.classList.add('hidden');
        return;
    }

    const icon = status === 'success'
        ? '<i class="fas fa-circle-check"></i>'
        : status === 'error'
            ? '<i class="fas fa-triangle-exclamation"></i>'
            : '<i class="fas fa-circle-info"></i>';

    banner.innerHTML = `${icon}<span>${message}</span>`;

    if (status === 'success') {
        banner.classList.add('success');
    } else if (status === 'error') {
        banner.classList.add('error');
    } else {
        banner.classList.add('neutral');
    }
}

function getUserAvatarUrl(email) {
    const identifier = email ? encodeURIComponent(email.trim().toLowerCase()) : 'onrev-user';
    return `https://i.pravatar.cc/160?u=${identifier}`;
}

function updateUserInfoSummary(account) {
    const nameEl = document.getElementById('userPreviewName');
    const emailEl = document.getElementById('userPreviewEmail');
    const phoneEl = document.getElementById('userPreviewPhone');
    const photoEl = document.getElementById('userPreviewPhoto');
    const editPanel = document.getElementById('userEditSummaryPanel');
    const editNameEl = document.getElementById('userEditPreviewName');
    const editEmailEl = document.getElementById('userEditPreviewEmail');
    const editPhoneEl = document.getElementById('userEditPreviewPhone');
    const editDepartmentEl = document.getElementById('userEditPreviewDepartment');
    const editPhotoEl = document.getElementById('userEditPreviewPhoto');
    const editStatusEl = document.getElementById('userEditPreviewStatus');
    const editLastLoginEl = document.getElementById('userEditPreviewLastLogin');
    const editCreatedEl = document.getElementById('userEditPreviewCreated');

    const nameValue = account && account.name ? account.name : '—';
    const emailValue = account && account.email ? account.email : '—';
    const phoneValue = account && account.phone ? account.phone : '—';
    const departmentValue = account && account.department ? account.department : '—';
    const statusValue = account && account.status ? formatStatusLabel(account.status) : '—';
    const lastLoginValue = account && account.lastLogin ? account.lastLogin : '—';
    const createdValue = account && account.created ? account.created : '—';
    const avatarUrl = account && account.email ? getUserAvatarUrl(account.email) : getUserAvatarUrl('placeholder');

    if (nameEl) nameEl.textContent = nameValue;
    if (emailEl) emailEl.textContent = emailValue;
    if (phoneEl) phoneEl.textContent = phoneValue;
    if (photoEl) photoEl.src = avatarUrl;

    if (editNameEl) editNameEl.textContent = nameValue;
    if (editEmailEl) editEmailEl.textContent = emailValue;
    if (editPhoneEl) editPhoneEl.textContent = phoneValue;
    if (editDepartmentEl) editDepartmentEl.textContent = departmentValue;
    if (editPhotoEl) editPhotoEl.src = avatarUrl;
    if (editStatusEl) {
        editStatusEl.textContent = statusValue;
        editStatusEl.className = mapStatusPillClass(account && account.status);
    }
    if (editLastLoginEl) editLastLoginEl.textContent = lastLoginValue;
    if (editCreatedEl) editCreatedEl.textContent = createdValue;

    if (editPanel && account && account.name) {
        editPanel.classList.remove('summary-empty');
    } else if (editPanel) {
        editPanel.classList.add('summary-empty');
    }

    syncAccountEditLayout();
}

function syncAccountEditLayout() {
    document.querySelectorAll('.account-edit-grid').forEach(grid => {
        const summary = grid.querySelector('.user-edit-summary');
        const summaryVisible = summary && !summary.classList.contains('hidden');
        grid.classList.toggle('no-summary', !summaryVisible);
    });
}

function resetUserVerification(clearDraft = true) {
    state.userVerification = null;
    setVerificationBanner(null, '');

    const confirmedInput = document.getElementById('userEmailConfirmed');
    if (confirmedInput) {
        confirmedInput.value = '';
    }

    if (clearDraft && state.userDraft) {
        state.userDraft.name = '';
        state.userDraft.phone = '';
        state.userDraft.department = '';
        state.userDraft.email = '';
        state.userDraft.photoUrl = '';
    }

    updateUserInfoSummary(null);
    updateUserFormProgressState();
}

function applyVerificationAccount(account) {
    const normalizedEmail = normalizeEmail(account.email);
    state.userVerification = {
        status: 'verified',
        email: normalizedEmail,
        account: { ...account }
    };

    const emailInput = document.getElementById('userEmail');
    if (emailInput && !emailInput.readOnly) {
        emailInput.value = account.email;
    }

    const confirmedInput = document.getElementById('userEmailConfirmed');
    if (confirmedInput) {
        confirmedInput.value = account.email;
    }
    state.userDraft = {
        ...(state.userDraft || {}),
        email: account.email,
        name: account.name || (state.userDraft ? state.userDraft.name : ''),
        phone: account.phone || (state.userDraft ? state.userDraft.phone : ''),
        department: account.department || (state.userDraft ? state.userDraft.department : ''),
        status: (state.userDraft && state.userDraft.status) || 'Active',
        photoUrl: getUserAvatarUrl(account.email)
    };

    updateUserInfoSummary(account);

    setVerificationBanner('success', 'INF010: Onrev platform account verified. Details imported successfully.');
    showNotification('info', 'This User is Available for Registration.', 5000);

    setUserFormStep(2);
    focusUserFormStep(2);
}

async function handleUserEmailVerification() {
    const emailInput = document.getElementById('userEmail');
    const verifyBtn = document.getElementById('userVerifyBtn');
    if (!emailInput || !verifyBtn) return;

    const email = emailInput.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showNotification('error', 'Please Enter a Valid ONRUF Account Email Before Verifying.', 5000);
        emailInput.focus();
        return;
    }

    const normalizedEmail = normalizeEmail(email);
    const excludeUserId = state.editingUserId || null;
    const duplicateUser = findExistingUserByEmail(email, excludeUserId);

    if (duplicateUser) {
        resetUserVerification(false);
        state.userVerification = {
            status: 'duplicate',
            email: normalizedEmail,
            existingUserId: duplicateUser.id
        };

        const duplicateName = duplicateUser.name || duplicateUser.email;
        showNotification('error', 'Email Already Registered', 6500);
        updateUserFormProgressState();
        emailInput.focus();
        return;
    }

    const cachedVerification = state.userVerification;
    if (cachedVerification && cachedVerification.status === 'verified' && cachedVerification.email === normalizedEmail) {
        setVerificationBanner('success', 'The platform account is already verified for this email address.');
        updateUserFormProgressState();
        return;
    }

    resetUserVerification(false);
    state.userVerification = { status: 'checking', email: normalizedEmail };

    const originalLabel = verifyBtn.innerHTML;
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking...';

    await new Promise(resolve => setTimeout(resolve, 450));

    const account = lookupPlatformAccount(email);

    if (!account) {
        state.userVerification = { status: 'not-found', email: normalizedEmail };
    showNotification('error', 'Email not Associated with an Active ONRUF Account', 6500);
        updateUserFormProgressState();
    } else if (account.status !== 'active') {
        state.userVerification = { status: account.status, email: normalizedEmail, account };
        const statusLabel = account.status === 'pending' ? 'pending activation' : 'inactive';
        setVerificationBanner('error', `The linked Onrev platform account is ${statusLabel}. Complete activation on the Onrev platform before proceeding.`);
        showNotification('error', `The Onrev platform account for ${account.email} is ${statusLabel}. Activate it before adding the user to the control panel.`, 6500);
        updateUserFormProgressState();
    } else {
        applyVerificationAccount(account);
    }

    verifyBtn.disabled = false;
    verifyBtn.innerHTML = originalLabel;
}

function handleUserEmailInputChange() {
    const emailInput = document.getElementById('userEmail');
    if (!emailInput) return;

    const normalized = normalizeEmail(emailInput.value);
    if (state.userVerification && state.userVerification.status === 'verified' && state.userVerification.email === normalized) {
        return;
    }

    resetUserVerification(true);

    if (state.userFormStep > 1) {
        setUserFormStep(1);
        focusUserFormStep(1);
    }

    if (!state.userDraft) {
        state.userDraft = {};
    }
    state.userDraft.email = emailInput.value.trim();
}

function handleUserVerificationCancel() {
    const shouldCloseForm =
        state.editingUserId !== null
        || state.userFormStep <= 1 && (!state.userVerification || state.userVerification.status !== 'verified');

    if (shouldCloseForm) {
        hideUserForm();
        return;
    }

    revertToEmailVerification();
}

function handleSuperAdminToggle(event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    updateAccountTypeUI();
    updateUserFormProgressState();
}

function handleRoleSelectionChange(event) {
    const select = event.target || event.currentTarget;
    const value = select ? select.value : '';
    const selectedOption = select && select.selectedOptions.length ? select.selectedOptions[0] : null;
    const label = selectedOption ? selectedOption.textContent.trim() : value;

    state.userDraft = {
        ...(state.userDraft || {}),
        roleId: value || '',
        role: label || ''
    };
    updateAccountTypeUI();
    updateUserFormProgressState();
}

function revertToEmailVerification() {
    const emailInput = document.getElementById('userEmail');
    const verifyBtn = document.getElementById('userVerifyBtn');
    const registerBtn = document.getElementById('userReviewRegisterBtn');
    const confirmedInput = document.getElementById('userEmailConfirmed');

    resetUserVerification(true);

    if (confirmedInput) {
        confirmedInput.value = '';
    }

    if (emailInput) {
        emailInput.readOnly = false;
        emailInput.focus();
    }

    if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify';
    }

    if (registerBtn) {
        registerBtn.disabled = true;
    }

    setUserFormStep(1);
    focusUserFormStep(1);
    updateUserFormProgressState();
}

function handleExpirationDateChange(event) {
    const value = event && event.target ? event.target.value : '';
    state.userDraft = {
        ...(state.userDraft || {}),
        expiresOn: value || ''
    };
}

function updateAccountTypeUI() {
    const roleSelect = document.getElementById('userRole');
    const summary = document.getElementById('userPermissionsSummary');
    const roleLabel = document.getElementById('userRoleLabel');
    const superAdminToggle = document.getElementById('userSuperAdminToggle');

    const draft = state.userDraft = {
        ...(state.userDraft || {})
    };

    const isSuperAdmin = superAdminToggle ? superAdminToggle.checked : false;

    if (roleSelect) {
        populateUserRoleOptions(roleSelect);
        roleSelect.disabled = isSuperAdmin;
        if (isSuperAdmin) {
            roleSelect.required = false;
            roleSelect.removeAttribute('aria-required');
            roleSelect.value = '';
        } else {
            roleSelect.required = true;
            roleSelect.setAttribute('aria-required', 'true');

            const desiredRoleId = draft.roleId || '';
            const desiredRoleName = (draft.role || '').trim().toLowerCase();

            if (desiredRoleId && Array.from(roleSelect.options).some(option => option.value === desiredRoleId)) {
                roleSelect.value = desiredRoleId;
            } else if (desiredRoleName) {
                const match = Array.from(roleSelect.options).find(option => option.textContent.trim().toLowerCase() === desiredRoleName);
                if (match) {
                    roleSelect.value = match.value;
                }
            }
        }

        if (!isSuperAdmin) {
            const selectedOption = roleSelect.selectedOptions.length ? roleSelect.selectedOptions[0] : null;
            draft.roleId = selectedOption ? selectedOption.value : '';
            draft.role = selectedOption ? selectedOption.textContent.trim() : '';
        } else {
            draft.roleId = 'system-administrator';
            draft.role = 'Super Admin';
        }

        if (roleLabel) {
            roleLabel.classList.toggle('required', !isSuperAdmin);
        }
    }

    draft.accountType = isSuperAdmin ? 'system-administrator' : 'platform-administrator';

    if (isSuperAdmin) {
        draft.permissionSummary = 'Full access to all modules.';
        renderRolePermissionsPreview(null);
    } else if (draft.roleId) {
        draft.permissionSummary = draft.role ? `Inherits permissions from “${draft.role}”.` : '';
        renderRolePermissionsPreview(draft.roleId);
    } else {
        draft.permissionSummary = '';
        renderRolePermissionsPreview(null);
    }

    if (summary) {
        if (isSuperAdmin) {
            summary.textContent = 'Super Admins receive full access to all modules within the control panel.';
        } else if (draft.role) {
            summary.textContent = '';
        } else {
            summary.textContent = 'Select a user role to see the assigned permissions.';
        }
    }
}

function renderRolePermissionsPreview(roleName) {
    const wrapper = document.getElementById('userPermissionsWrapper');
    const container = document.getElementById('userRolePermissionsPreview');
    const list = document.getElementById('userRolePermissionsList');

    if (!container || !list) {
        return;
    }

    list.innerHTML = '';

    if (!roleName) {
        container.classList.add('hidden');
        if (wrapper) {
            wrapper.classList.add('hidden');
        }
        if (state.userDraft) {
            state.userDraft.permissionSummary = '';
        }
        return;
    }

    const role = roles.find(item => item.name === roleName || item.id === roleName || item.nameEnglish === roleName);
    const permissions = role && Array.isArray(role.permissions) ? role.permissions : [];
    const displayLabel = role ? (role.nameEnglish || role.name || role.id) : roleName;

    container.classList.remove('hidden');
    if (wrapper) {
        wrapper.classList.remove('hidden');
    }

    if (!permissions.length) {
        list.innerHTML = '<p class="permissions-preview-placeholder">No structured permissions are defined for this role yet.</p>';
    } else {
        const tableHtml = buildRolePermissionsTableHtml(permissions, { compact: true });
        list.innerHTML = `<div class="role-permissions-table-wrapper">${tableHtml}</div>`;
    }

    if (state.userDraft) {
        state.userDraft.permissionSummary = displayLabel ? `Inherits permissions from “${displayLabel}”.` : '';
    }
}

function populateUserRoleOptions(select) {
    if (!select) {
        return;
    }

    const activeRoles = Array.isArray(roles)
        ? roles.filter(role => role && role.status !== 'inactive')
        : [];

    const placeholderOption = '<option value="">Select a role</option>';

    if (!activeRoles.length) {
        select.innerHTML = `${placeholderOption}<option value="" disabled>No active roles available</option>`;
        select.value = '';
        return;
    }

    const optionsHtml = activeRoles.map(role => {
        const label = role.nameEnglish || role.name || role.id;
        return `<option value="${role.id}">${label}</option>`;
    }).join('');

    select.innerHTML = `${placeholderOption}${optionsHtml}`;

    const desiredRoleId = state.userDraft && state.userDraft.roleId ? state.userDraft.roleId : '';
    const desiredRoleName = state.userDraft && state.userDraft.role ? state.userDraft.role.trim().toLowerCase() : '';

    let matchedOption = null;

    if (desiredRoleId) {
        matchedOption = Array.from(select.options).find(option => option.value === desiredRoleId) || null;
    }

    if (!matchedOption && desiredRoleName) {
        matchedOption = Array.from(select.options).find(option => option.textContent.trim().toLowerCase() === desiredRoleName) || null;
    }

    if (matchedOption) {
        select.value = matchedOption.value;
    } else {
        select.value = '';
    }
}

function mapPermissionActionLabel(actionId) {
    if (!actionId) return 'Read';
    const action = permissionActions.find(item => item.id === actionId);
    return action ? action.label : actionId;
}

function buildRolePermissionRows(permissions) {
    if (!Array.isArray(permissions) || !permissions.length) {
        return '';
    }

    const sectionOrder = new Map();
    let sectionCounter = 0;
    let lastSectionKey = null;

    return permissions.map(permission => {
        if (!permission) {
            return '';
        }

        if (typeof permission === 'string') {
            lastSectionKey = null;
            return `
                <tr class="legacy-permission-row">
                    <td colspan="2" class="legacy-label">${permission}</td>
                    <td class="actions-cell">Legacy</td>
                </tr>
            `;
        }

        const sectionLabel = permission.sectionLabel || permission.sectionId || 'Section';
        const rawSectionKey = (permission.sectionId || sectionLabel || `section-${sectionCounter + 1}`).toString();
        const normalizedSectionKey = rawSectionKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || `section-${sectionCounter + 1}`;

        if (!sectionOrder.has(normalizedSectionKey)) {
            sectionCounter += 1;
            sectionOrder.set(normalizedSectionKey, sectionCounter);
        }

        const sectionIndex = sectionOrder.get(normalizedSectionKey);
        const sectionClass = sectionIndex % 2 === 0 ? 'role-section-even' : 'role-section-odd';
        const displaySectionLabel = normalizedSectionKey === lastSectionKey ? '' : sectionLabel;
        lastSectionKey = normalizedSectionKey;

        const appLabel = permission.appLabel || permission.appId || 'App';
        const actions = Array.isArray(permission.actions) && permission.actions.length
            ? permission.actions.map(mapPermissionActionLabel).join(', ')
            : mapPermissionActionLabel('read');

        return `
            <tr class="${sectionClass}" data-section="${normalizedSectionKey}">
                <td>${displaySectionLabel}</td>
                <td>${appLabel}</td>
                <td class="actions-cell">${actions}</td>
            </tr>
        `;
    }).filter(Boolean).join('');
}

function buildRolePermissionsTableHtml(permissions, options = {}) {
    const { compact = false } = options;
    const rows = buildRolePermissionRows(permissions);
    const hasRows = Boolean(rows && rows.trim());
    const tableClass = compact ? 'role-detail-permissions compact' : 'role-detail-permissions';

    const bodyContent = hasRows
        ? rows
        : `
            <tr>
                <td colspan="3" class="role-detail-empty">No permissions assigned yet.</td>
            </tr>
        `;

    return `
        <table class="${tableClass}">
            <thead>
                <tr>
                    <th>Section</th>
                    <th>Application</th>
                    <th>Permission</th>
                </tr>
            </thead>
            <tbody>
                ${bodyContent}
            </tbody>
        </table>
    `;
}

function showRoleDetailForRole(role) {
    const overlay = document.getElementById('roleDetailOverlay');
    const titleEl = document.getElementById('roleDetailTitle');
    const subtitleEl = document.getElementById('roleDetailSubtitle');
    const contentEl = document.getElementById('roleDetailContent');
    const closeBtn = document.getElementById('roleDetailCloseBtn');
    if (!overlay || !titleEl || !subtitleEl || !contentEl) return;

    const wasHidden = overlay.classList.contains('hidden');
    state.activeRoleDetailId = role.id;
    overlay.classList.remove('hidden');

    const primaryName = role.name || role.nameEnglish || 'Role Permissions';
    titleEl.textContent = primaryName;

    subtitleEl.textContent = '';

    const permissions = Array.isArray(role.permissions) ? role.permissions : [];
    const tableHtml = buildRolePermissionsTableHtml(permissions);

    contentEl.innerHTML = `
        <div class="role-permissions-table-wrapper">
            ${tableHtml}
        </div>
    `;

    if (wasHidden && closeBtn) {
        closeBtn.focus();
    }
}

function showRoleDetails(roleId) {
    const role = roles.find(item => item.id === roleId);
    if (!role) {
        hideRoleDetails();
        return;
    }
    showRoleDetailForRole(role);
}

function hideRoleDetails() {
    const overlay = document.getElementById('roleDetailOverlay');
    const contentEl = document.getElementById('roleDetailContent');
    const titleEl = document.getElementById('roleDetailTitle');
    const subtitleEl = document.getElementById('roleDetailSubtitle');
    if (!overlay || !contentEl || !titleEl || !subtitleEl) return;

    state.activeRoleDetailId = null;
    overlay.classList.add('hidden');
    titleEl.textContent = 'Role Permissions';
    subtitleEl.textContent = 'Review permission coverage and metadata for this role.';
    contentEl.innerHTML = '<p class="role-detail-placeholder">Use the eye icon in the roles table to inspect a role&rsquo;s permissions here.</p>';
}

function refreshRoleDetailPanel() {
    if (!state.activeRoleDetailId) return;
    const overlay = document.getElementById('roleDetailOverlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    const role = roles.find(item => item.id === state.activeRoleDetailId);
    if (!role) {
        hideRoleDetails();
        return;
    }
    showRoleDetailForRole(role);
}

let roleConfirmResolver = null;
let userConfirmResolver = null;
let userAlertResolver = null;
let roleAlertResolver = null;
let rolePromptResolver = null;
let rolePromptValidator = null;

function setupRoleConfirmOverlay() {
    const overlay = document.getElementById('roleConfirmOverlay');
    const okBtn = document.getElementById('roleConfirmOk');
    const cancelBtn = document.getElementById('roleConfirmCancel');
    if (!overlay || !okBtn || !cancelBtn) return;

    const complete = result => {
        if (roleConfirmResolver) {
            const resolver = roleConfirmResolver;
            roleConfirmResolver = null;
            overlay.classList.add('hidden');
            resolver(result);
        }
    };

    okBtn.addEventListener('click', () => complete(true));
    cancelBtn.addEventListener('click', () => complete(false));
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            complete(false);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && roleConfirmResolver) {
            complete(false);
        }
    });
}

function showRoleConfirm(message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
    const overlay = document.getElementById('roleConfirmOverlay');
    const messageEl = document.getElementById('roleConfirmMessage');
    const okBtn = document.getElementById('roleConfirmOk');
    const cancelBtn = document.getElementById('roleConfirmCancel');
    if (!overlay || !messageEl || !okBtn || !cancelBtn) return Promise.resolve(false);

    messageEl.textContent = message;
    okBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    overlay.classList.remove('hidden');
    okBtn.focus();

    return new Promise(resolve => {
        roleConfirmResolver = resolve;
    });
}

function setupUserConfirmOverlay() {
    const overlay = document.getElementById('userConfirmOverlay');
    const okBtn = document.getElementById('userConfirmOk');
    const cancelBtn = document.getElementById('userConfirmCancel');
    if (!overlay || !okBtn || !cancelBtn) return;

    const complete = result => {
        if (userConfirmResolver) {
            const resolver = userConfirmResolver;
            userConfirmResolver = null;
            overlay.classList.add('hidden');
            resolver(result);
        }
    };

    okBtn.addEventListener('click', () => complete(true));
    cancelBtn.addEventListener('click', () => complete(false));
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            complete(false);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && userConfirmResolver) {
            complete(false);
        }
    });
}

function showUserConfirm(message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
    const overlay = document.getElementById('userConfirmOverlay');
    const messageEl = document.getElementById('userConfirmMessage');
    const okBtn = document.getElementById('userConfirmOk');
    const cancelBtn = document.getElementById('userConfirmCancel');
    if (!overlay || !messageEl || !okBtn || !cancelBtn) return Promise.resolve(false);

    messageEl.textContent = message;
    okBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    overlay.classList.remove('hidden');
    okBtn.focus();

    return new Promise(resolve => {
        userConfirmResolver = resolve;
    });
}

function setupUserAlertOverlay() {
    const overlay = document.getElementById('userAlertOverlay');
    const okBtn = document.getElementById('userAlertOk');
    if (!overlay || !okBtn) return;

    const complete = result => {
        if (userAlertResolver) {
            const resolver = userAlertResolver;
            userAlertResolver = null;
            overlay.classList.add('hidden');
            resolver(result);
        }
    };

    okBtn.addEventListener('click', () => complete(true));
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            complete(true);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && userAlertResolver) {
            complete(true);
        }
    });
}

function showUserAlert(message) {
    const overlay = document.getElementById('userAlertOverlay');
    const messageEl = document.getElementById('userAlertMessage');
    const okBtn = document.getElementById('userAlertOk');
    if (!overlay || !messageEl || !okBtn) {
        return Promise.resolve();
    }

    messageEl.textContent = message;
    overlay.classList.remove('hidden');
    okBtn.focus();

    return new Promise(resolve => {
        userAlertResolver = resolve;
    });
}

function setupRoleAlertOverlay() {
    const overlay = document.getElementById('roleAlertOverlay');
    const okBtn = document.getElementById('roleAlertOk');
    if (!overlay || !okBtn) return;

    const complete = result => {
        if (roleAlertResolver) {
            const resolver = roleAlertResolver;
            roleAlertResolver = null;
            overlay.classList.add('hidden');
            resolver(result);
        }
    };

    okBtn.addEventListener('click', () => complete(true));
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            complete(true);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && roleAlertResolver) {
            complete(true);
        }
    });
}

function showRoleAlert(message) {
    const overlay = document.getElementById('roleAlertOverlay');
    const messageEl = document.getElementById('roleAlertMessage');
    const okBtn = document.getElementById('roleAlertOk');
    if (!overlay || !messageEl || !okBtn) {
        return Promise.resolve();
    }

    messageEl.textContent = message;
    overlay.classList.remove('hidden');
    okBtn.focus();

    return new Promise(resolve => {
        roleAlertResolver = resolve;
    });
}

function setupRolePromptOverlay() {
    const overlay = document.getElementById('rolePromptOverlay');
    const confirmBtn = document.getElementById('rolePromptConfirm');
    const cancelBtn = document.getElementById('rolePromptCancel');
    const input = document.getElementById('rolePromptInput');
    const errorEl = document.getElementById('rolePromptError');
    if (!overlay || !confirmBtn || !cancelBtn || !input) return;

    const setPromptError = message => {
        if (!errorEl) return;
        const text = message || '';
        errorEl.textContent = text;
        if (text) {
            errorEl.classList.remove('hidden');
            input.setAttribute('aria-invalid', 'true');
        } else {
            errorEl.classList.add('hidden');
            input.removeAttribute('aria-invalid');
        }
    };

    const resetPromptState = () => {
        input.value = '';
        setPromptError('');
        rolePromptValidator = null;
    };

    const complete = result => {
        if (!rolePromptResolver) {
            return;
        }
        const resolver = rolePromptResolver;
        rolePromptResolver = null;
        resetPromptState();
        overlay.classList.add('hidden');
        resolver(result);
    };

    const attemptConfirm = () => {
        if (rolePromptValidator) {
            const validation = rolePromptValidator(input.value);
            if (!validation.valid) {
                setPromptError(validation.message);
                return;
            }
        }
        complete({ confirmed: true, value: input.value });
    };

    confirmBtn.addEventListener('click', attemptConfirm);

    cancelBtn.addEventListener('click', () => {
        complete({ confirmed: false, value: '' });
    });

    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            complete({ confirmed: false, value: '' });
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && rolePromptResolver) {
            complete({ confirmed: false, value: '' });
        }
        if (event.key === 'Enter' && rolePromptResolver && document.activeElement === input) {
            event.preventDefault();
            attemptConfirm();
        }
    });

    input.addEventListener('input', () => {
        setPromptError('');
    });
}

function showRolePrompt(message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', placeholder = '', options = {}) {
    const overlay = document.getElementById('rolePromptOverlay');
    const messageEl = document.getElementById('rolePromptMessage');
    const confirmBtn = document.getElementById('rolePromptConfirm');
    const cancelBtn = document.getElementById('rolePromptCancel');
    const input = document.getElementById('rolePromptInput');
    const errorEl = document.getElementById('rolePromptError');
    if (!overlay || !messageEl || !confirmBtn || !cancelBtn || !input) {
        return Promise.resolve({ confirmed: false, value: '' });
    }

    const { validate, errorMessage = '' } = options || {};

    messageEl.textContent = message;
    confirmBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    input.placeholder = placeholder || '';
    input.value = '';

    if (errorEl) {
        errorEl.textContent = errorMessage || '';
        if (errorMessage) {
            errorEl.classList.remove('hidden');
            input.setAttribute('aria-invalid', 'true');
        } else {
            errorEl.classList.add('hidden');
            input.removeAttribute('aria-invalid');
        }
    } else {
        input.removeAttribute('aria-invalid');
    }

    if (typeof validate === 'function') {
        rolePromptValidator = value => {
            const validation = validate(value);
            if (typeof validation === 'boolean') {
                return {
                    valid: validation,
                    message: validation ? '' : errorMessage
                };
            }
            if (validation && typeof validation === 'object') {
                return {
                    valid: validation.valid !== false,
                    message: validation.message || errorMessage
                };
            }
            return { valid: true, message: '' };
        };
    } else {
        rolePromptValidator = null;
    }

    overlay.classList.remove('hidden');

    setTimeout(() => {
        input.focus();
        input.select();
    }, 0);

    return new Promise(resolve => {
        rolePromptResolver = resolve;
    });
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

function formatDateForDisplay(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function buildAccessWindowLabel(start, end) {
    const startLabel = formatDateForDisplay(start);
    const endLabel = formatDateForDisplay(end);

    if (startLabel && endLabel) {
        return `${startLabel} – ${endLabel}`;
    }
    if (startLabel) {
        return `${startLabel} onward`;
    }
    if (endLabel) {
        return `Until ${endLabel}`;
    }
    return 'Immediately';
}

function generateRegistrationOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function focusUserFormStep(step) {
    const section = document.querySelector(`.user-form-step[data-step="${step}"]`);
    if (!section) return;
    const focusable = section.querySelector('input, select, textarea, button');
    if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
    }
}

function setUserFormStep(step) {
    const maxStep = 2;
    const nextStep = Math.min(Math.max(step, 1), maxStep);
    state.userFormStep = nextStep;

    document.querySelectorAll('.user-form-step').forEach(section => {
        const sectionStep = Number(section.dataset.step || 0);
        section.classList.toggle('active', sectionStep === nextStep);
    });

    const progress = document.getElementById('userFormProgress');
    if (progress) {
        progress.querySelectorAll('.step').forEach(item => {
            const itemStep = Number(item.dataset.step || 0);
            item.classList.toggle('active', itemStep === nextStep);
            if (itemStep < nextStep) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
        });
    }

    if (nextStep === 1) {
        state.registrationFlow.stage = 'prepared';
    } else if (nextStep === 2) {
        state.registrationFlow.stage = 'account-info';
    }

    const submitBtn = document.getElementById('userFormSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = state.editingUserId ? 'Save' : 'Add';
    }

    const backBtn = document.getElementById('userFormBackBtn');
    if (backBtn) {
        backBtn.classList.toggle('hidden', nextStep === 1 && !state.editingUserId);
    }

    updateUserFormProgressState();
    updateInvitationTimeline();
    updateBreadcrumb();
}

function isUserInfoStepComplete() {
    const draft = state.userDraft || {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return Boolean(
        emailPattern.test(draft.email || '')
        && draft.department
        && draft.employeeId
    );
}

function isAccountStepComplete() {
    const draft = state.userDraft || {};
    const isSuperAdmin = draft.accountType === 'system-administrator';
    if (isSuperAdmin) {
        return true;
    }

    return Boolean((draft.roleId || '').trim());
}

function updateUserFormProgressState() {
    const progress = document.getElementById('userFormProgress');
    if (progress) {
        progress.querySelectorAll('.step').forEach(item => {
            const stepNumber = Number(item.dataset.step || 0);
            if (!item.hasAttribute('role')) {
                item.setAttribute('role', 'button');
            }
            const unlocked = stepNumber === 1 || (stepNumber === 2 && isUserInfoStepComplete());
            item.classList.toggle('disabled', !unlocked);
            item.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
            item.tabIndex = unlocked ? 0 : -1;
        });
    }

    const submitBtn = document.getElementById('userFormSubmitBtn');
    if (submitBtn) {
        const shouldEnable = state.userFormStep === 2;
        submitBtn.disabled = !shouldEnable;
        submitBtn.classList.toggle('disabled', !shouldEnable);
    }
}

const invitationStageOrder = ['prepared', 'account-info', 'otp', 'activated'];

function updateInvitationTimeline() {
    const timeline = document.getElementById('invitationTimeline');
    if (!timeline) {
        return;
    }

    const stageIndex = invitationStageOrder.indexOf(state.registrationFlow.stage);
    const activeIndex = stageIndex >= 0 ? stageIndex : 0;

    timeline.querySelectorAll('li').forEach((item, index) => {
        item.classList.toggle('active', index === activeIndex);
        item.classList.toggle('completed', index < activeIndex);
    });
}

function setInvitationStage(stage) {
    if (!invitationStageOrder.includes(stage)) {
        return;
    }
    state.registrationFlow.stage = stage;
    updateInvitationTimeline();
}

function collectUserFormStepData(step) {
    const draft = { ...(state.userDraft || {}) };

    if (step === 1) {
        const emailInput = document.getElementById('userEmail');
        const departmentInput = document.getElementById('userDepartment');
        const employeeIdInput = document.getElementById('userEmployeeId');
        if (!emailInput || !departmentInput || !employeeIdInput) {
            return false;
        }

        const email = emailInput.value.trim();
        const department = departmentInput.value.trim();
        const employeeId = employeeIdInput.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showNotification('error', 'Please enter a valid email address.');
            emailInput.focus();
            return false;
        }

        const excludeUserId = Number.isInteger(state.editingUserId) ? state.editingUserId : null;
        const duplicateUser = findExistingUserByEmail(email, excludeUserId);
        if (duplicateUser) {
            showNotification('warning', 'This Email Already Exists');
            if (state.userFormStep !== 1) {
                setUserFormStep(1);
            }
            emailInput.focus();
            if (typeof emailInput.select === 'function') {
                emailInput.select();
            }
            return false;
        }
        if (!department) {
            showNotification('error', 'Department is required.');
            departmentInput.focus();
            return false;
        }
        if (!employeeId) {
            showNotification('error', 'ID is required.');
            employeeIdInput.focus();
            return false;
        }

    const duplicateEmployee = findExistingUserByEmployeeId(employeeId, excludeUserId);
        if (duplicateEmployee) {
            showNotification('warning', 'This ID Already Exists');
            if (state.userFormStep !== 1) {
                setUserFormStep(1);
            }
            employeeIdInput.focus();
            if (typeof employeeIdInput.select === 'function') {
                employeeIdInput.select();
            }
            return false;
        }

        draft.email = email;
        draft.department = department;
        draft.employeeId = employeeId;

        const existingFirstName = typeof draft.firstName === 'string' ? draft.firstName.trim() : '';
        const existingLastName = typeof draft.lastName === 'string' ? draft.lastName.trim() : '';
        const derivedNames = (!existingFirstName || !existingLastName) ? deriveNamePartsFromEmail(email) : null;

        if (!existingFirstName && derivedNames && derivedNames.firstName) {
            draft.firstName = derivedNames.firstName;
        }
        if (!existingLastName && derivedNames && derivedNames.lastName) {
            draft.lastName = derivedNames.lastName;
        }

        const emailDisplay = document.getElementById('registrationEmail');
        if (emailDisplay) {
            emailDisplay.value = email;
        }

        state.userDraft = draft;
        updateUserFormProgressState();
        return true;
    }

    if (step === 2) {
        const roleSelect = document.getElementById('userRole');
        const expirationInput = document.getElementById('userAccountExpiration');
        const superAdminToggle = document.getElementById('userSuperAdminToggle');

        if (!roleSelect || !expirationInput || !superAdminToggle) {
            return false;
        }

        const isSuperAdmin = superAdminToggle.checked;
        const expiresOn = expirationInput.value.trim();
        const selectedRoleOption = roleSelect.selectedOptions.length ? roleSelect.selectedOptions[0] : null;
        const roleId = selectedRoleOption ? selectedRoleOption.value : '';
        const roleLabel = selectedRoleOption ? selectedRoleOption.textContent.trim() : '';

        if (!isSuperAdmin && !roleId) {
            showNotification('error', 'Select a user role to define permissions.');
            roleSelect.focus();
            return false;
        }

        if (expiresOn) {
            const expiresDate = new Date(expiresOn);
            if (Number.isNaN(expiresDate.getTime())) {
                showNotification('error', 'Enter a valid account expiration date.');
                expirationInput.focus();
                return false;
            }
        }

        draft.accountType = isSuperAdmin ? 'system-administrator' : 'platform-administrator';
        draft.roleId = isSuperAdmin ? 'system-administrator' : roleId;
        draft.role = isSuperAdmin ? 'Super Admin' : roleLabel;
        draft.permissionSummary = isSuperAdmin
            ? 'Full access to all modules.'
            : (roleLabel ? `Inherits permissions from “${roleLabel}”.` : '');
        draft.expiresOn = expiresOn;

        state.userDraft = draft;
        updateUserFormProgressState();
        return true;
    }

    return true;
}

function handleUserInfoStep() {
    if (!collectUserFormStepData(1)) {
        return;
    }
    setUserFormStep(2);
    focusUserFormStep(2);
}

function showUserForm(mode, userId = null) {
    const formPage = document.getElementById('userFormPage');
    const listView = document.getElementById('usersListView');
    const titleEl = document.getElementById('userFormTitle');
    const subtitleEl = document.getElementById('userFormSubtitle');
    const form = document.getElementById('userForm');
    const emailInput = document.getElementById('userEmail');
    const departmentInput = document.getElementById('userDepartment');
    const employeeIdInput = document.getElementById('userEmployeeId');
    const roleSelect = document.getElementById('userRole');
    const superAdminToggle = document.getElementById('userSuperAdminToggle');
    const expirationInput = document.getElementById('userAccountExpiration');
    const submitBtn = document.getElementById('userFormSubmitBtn');
    const permissionsSummary = document.getElementById('userPermissionsSummary');

    if (!formPage || !listView || !form || !emailInput || !departmentInput || !employeeIdInput || !roleSelect || !superAdminToggle || !expirationInput || !submitBtn) {
        return;
    }

    form.reset();

    const defaultDraft = {
        email: '',
        department: '',
        employeeId: '',
        accountType: '',
        role: '',
        roleId: '',
        firstName: '',
        lastName: '',
        phone: '',
        password: '',
        passwordConfirm: '',
        permissionSummary: '',
        expiresOn: '',
        status: 'Pending',
        photoFileName: ''
    };

    state.userDraft = { ...defaultDraft };
    state.editingUserId = null;
    state.registrationFlow = {
        otp: null,
        userId: null,
        expiresAt: null,
        token: null,
        stage: 'prepared',
        link: null,
        linkExpiresAt: null
    };

    if (permissionsSummary) {
        permissionsSummary.textContent = 'Toggle Super Admin or choose a user role to preview permissions.';
    }

    let initialStep = 1;
    submitBtn.textContent = 'Add';
    emailInput.readOnly = false;

    populateUserRoleOptions(roleSelect);

    roleSelect.value = '';
    expirationInput.value = '';
    superAdminToggle.checked = false;

    if (mode === 'edit' && typeof userId === 'number') {
        const user = users.find(u => u.id === userId);
        if (!user) {
            return;
        }

        state.editingUserId = userId;

        const accountType = resolveUserAccountType(user);
        const roleLabel = user.role || '';
        const roleId = user.roleId || '';
        const expiresOn = user.expiresOn || '';
        const firstName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
        const lastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
        const phone = user.phone || `+96650${String(user.id).padStart(6, '0')}`;

        emailInput.value = user.email || '';
        emailInput.readOnly = true;
        const departmentValue = user.department || '';
        if (departmentValue) {
            const optionExists = Array.from(departmentInput.options).some(option => option.value === departmentValue);
            if (!optionExists) {
                const customOption = document.createElement('option');
                customOption.value = departmentValue;
                customOption.textContent = departmentValue;
                departmentInput.appendChild(customOption);
            }
        }
        departmentInput.value = departmentValue;
        employeeIdInput.value = user.employeeId || '';
        expirationInput.value = expiresOn;
        superAdminToggle.checked = accountType === 'system-administrator';

        state.userDraft = {
            ...defaultDraft,
            email: user.email || '',
            department: user.department || '',
            employeeId: user.employeeId || '',
            accountType,
            role: accountType === 'system-administrator' ? 'Super Admin' : roleLabel,
            roleId: accountType === 'system-administrator' ? 'system-administrator' : (roleId || ''),
            firstName,
            lastName,
            phone,
            permissionSummary: user.permissionSummary || (accountType === 'system-administrator'
                ? 'Full access to all modules.'
                : (roleLabel ? `Inherits permissions from “${roleLabel}”.` : '')),
            expiresOn,
            status: user.status || 'Pending',
            photoFileName: user.photoFileName || ''
        };

        submitBtn.textContent = 'Save';
        initialStep = 2;
    } else {
        emailInput.value = '';
        departmentInput.value = '';
        employeeIdInput.value = '';
        expirationInput.value = '';
        superAdminToggle.checked = false;
        roleSelect.value = '';
    }

    updateAccountTypeUI();

    if (titleEl) {
        titleEl.textContent = state.editingUserId ? 'Edit User' : 'Add New User';
    }
    if (subtitleEl) {
        subtitleEl.textContent = state.editingUserId ? 'Update profile or resend invitation details.' : '';
    }

    listView.classList.add('hidden');
    formPage.classList.remove('hidden');

    setUserFormStep(initialStep);
    focusUserFormStep(initialStep);
    updateUserFormProgressState();
    updateBreadcrumb();
    updateInvitationTimeline();

    if (initialStep === 1) {
        emailInput.focus();
    } else if (!superAdminToggle.checked && roleSelect && !roleSelect.disabled) {
        roleSelect.focus();
    } else {
        expirationInput.focus();
    }
}

function hideUserForm() {
    const formPage = document.getElementById('userFormPage');
    const listView = document.getElementById('usersListView');
    const form = document.getElementById('userForm');
    const emailInput = document.getElementById('userEmail');
    const photoInput = document.getElementById('registrationPhoto');

    if (form) {
        form.reset();
    }
    if (photoInput) {
        photoInput.value = '';
    }

    if (emailInput) {
        emailInput.readOnly = false;
    }

    state.userDraft = null;
    state.editingUserId = null;
    state.registrationFlow = {
        otp: null,
        userId: null,
        expiresAt: null,
        token: null,
        stage: 'prepared',
        link: null,
        linkExpiresAt: null
    };
    state.userFormStep = 1;

    updateUserFormProgressState();
    updateInvitationTimeline();
    updateBreadcrumb();

    if (formPage) {
        formPage.classList.add('hidden');
    }
    if (listView) {
        listView.classList.remove('hidden');
    }
}

async function handleUserFormSubmit(event) {
    event.preventDefault();

    if (!collectUserFormStepData(1)) {
        setUserFormStep(1);
        return;
    }

    if (!collectUserFormStepData(2)) {
        setUserFormStep(2);
        return;
    }

    const draft = state.userDraft;
    if (!draft) {
        showNotification('error', 'Unable to continue. Please try again.');
        return;
    }

    const isEditing = Boolean(state.editingUserId);

    const duplicateEmployee = findExistingUserByEmployeeId(draft.employeeId, isEditing ? state.editingUserId : null);
    if (duplicateEmployee) {
    showNotification('warning', 'This ID Already Exists');
        setUserFormStep(1);
        const employeeIdInput = document.getElementById('userEmployeeId');
        if (employeeIdInput) {
            employeeIdInput.focus();
            if (typeof employeeIdInput.select === 'function') {
                employeeIdInput.select();
            }
        }
        return;
    }

    if (!isEditing) {
        const existingUser = findExistingUserByEmail(draft.email);
        if (existingUser) {
            showNotification('warning', 'This Email Already Exists');
            setUserFormStep(1);
            return;
        }
    }

    const rawFirstName = typeof draft.firstName === 'string' ? draft.firstName.trim() : '';
    const rawLastName = typeof draft.lastName === 'string' ? draft.lastName.trim() : '';
    const derivedFromEmail = deriveNamePartsFromEmail(draft.email);
    const firstName = rawFirstName || derivedFromEmail.firstName;
    const lastName = rawLastName || derivedFromEmail.lastName;
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const effectiveName = combinedName || derivedFromEmail.fullName || (typeof draft.email === 'string' ? draft.email.trim() : '');

    draft.firstName = firstName;
    draft.lastName = lastName;

    if (isEditing) {
        const user = users.find(u => u.id === state.editingUserId);
        if (!user) {
            showNotification('error', 'The selected user is no longer available.');
            hideUserForm();
            return;
        }

        const updatedName = combinedName || user.name || effectiveName;
        user.name = updatedName || user.name || '';
        user.firstName = firstName || user.firstName || '';
        user.lastName = lastName || user.lastName || '';
        user.phone = draft.phone;
        user.department = draft.department;
        user.employeeId = draft.employeeId;
        user.email = draft.email;
        user.accountType = draft.accountType || user.accountType || 'platform-administrator';
        if (draft.accountType === 'system-administrator') {
            user.role = 'Super Admin';
            user.roleId = 'system-administrator';
            user.permissionSummary = 'Full access to all modules.';
        } else {
            user.role = draft.role || user.role || 'Admin';
            user.roleId = draft.roleId || user.roleId || '';
            user.permissionSummary = draft.permissionSummary || user.permissionSummary || '';
        }
        user.expiresOn = draft.expiresOn || '';
        ensureUserAuthRecord(user);
        if (draft.photoFileName) {
            user.photoFileName = draft.photoFileName;
        }
        if (draft.password) {
            const updatedAt = new Date().toISOString();
            user.auth.passwordHash = hashPasswordValue(draft.password);
            user.auth.lastUpdated = updatedAt;
            user.passwordUpdatedAt = updatedAt;
        }

        showNotification('success', 'User details updated successfully.');

        saveUsersToStorage();
        syncRoleUserCounts();
        saveRolesToStorage();
        updateUserRolesCount();
    renderRolesTable(state.currentRolePage);
        renderUsersTable(state.userSearchTerm, state.currentUserPage);
        renderStats();
        hideUserForm();
        return;
    }

    const currentMaxId = users.reduce((max, user) => Math.max(max, user.id), 0);
    const newId = currentMaxId + 1;
    const otpCode = generateRegistrationOtp();
    const invitationToken = generateRegistrationToken();
    const createdIso = new Date().toISOString();
    const invitationExpiresIso = new Date(Date.now() + INVITATION_VALIDITY_MS).toISOString();
    const passwordHash = draft.password ? hashPasswordValue(draft.password) : '';
    const passwordTimestamp = draft.password ? createdIso : null;

    const safeName = effectiveName || `Pending User #${newId}`;
    const accountType = draft.accountType === 'system-administrator' ? 'system-administrator' : 'platform-administrator';
    const roleId = accountType === 'system-administrator' ? 'system-administrator' : (draft.roleId || '');
    const roleLabel = accountType === 'system-administrator' ? 'Super Admin' : (draft.role || 'Admin');
    const permissionSummary = accountType === 'system-administrator'
        ? 'Full access to all modules.'
        : (draft.permissionSummary || (roleLabel ? `Inherits permissions from “${roleLabel}”.` : ''));
    const expiresOn = draft.expiresOn || '';

    const newUser = {
        id: newId,
        name: safeName,
        firstName,
        lastName,
        email: draft.email,
        department: draft.department,
        employeeId: draft.employeeId,
        phone: draft.phone,
        role: roleLabel,
        roleId,
        accountType,
        status: 'Pending',
        lastLogin: 'Never',
        created: new Date().toLocaleDateString(),
        createdAt: createdIso,
        invitation: {
            otp: otpCode,
            token: invitationToken,
            sentAt: createdIso,
            expiresAt: invitationExpiresIso,
            completedAt: null,
            verifiedAt: null,
            lastOtpSentAt: null
        },
        auth: {
            passwordHash,
            lastUpdated: passwordTimestamp
        },
        temporaryPasswordSetAt: passwordTimestamp,
        sessionExpiresAt: null,
        permissionSummary,
        expiresOn,
        photoFileName: draft.photoFileName || ''
    };

    users.unshift(newUser);

    state.registrationFlow.otp = otpCode;
    state.registrationFlow.userId = newId;
    state.registrationFlow.expiresAt = Date.now() + 10 * 60 * 1000;
    state.registrationFlow.token = invitationToken;
    state.registrationFlow.linkExpiresAt = invitationExpiresIso;
    updateRegistrationLinkDisplay(invitationToken);
    setInvitationStage('account-info');

    saveUsersToStorage();
    syncRoleUserCounts();
    saveRolesToStorage();
    updateUserRolesCount();
    renderRolesTable(state.currentRolePage);
    updateUsersManagementCount();
    renderUsersTable('', 1);
    renderStats();

    const invitedBy = resolveInvitationSenderLabel();

    const emailResult = await deliverInvitationEmail(newUser, {
        otp: otpCode,
        token: invitationToken,
        expiresAt: state.registrationFlow.expiresAt,
        linkExpiresAt: invitationExpiresIso,
        invitedBy
    });

    if (emailResult.status === 'sent') {
        showNotification('success', `Invitation email sent to ${draft.email}. The user is now pending activation.`, 6000);
    } else if (emailResult.status === 'skipped') {
        showNotification('info', `Invitation prepared for ${draft.email}, but no email service is configured. Share the link manually from the registration flow.`, 7000);
    } else {
        showNotification('warning', `Invitation created for ${draft.email}, but the email could not be delivered: ${emailResult.message}.`, 8000);
    }

    hideUserForm();
}

function showRegistrationFlowStep(step) {
    document.querySelectorAll('.registration-flow-step').forEach(section => {
        const sectionStep = section.dataset.step;
        if (sectionStep === step) {
            section.classList.remove('hidden');
            section.classList.add('active');
        } else {
            section.classList.add('hidden');
            section.classList.remove('active');
        }
    });
}

function resetRegistrationFlowForms() {
    const completionForm = document.getElementById('registrationCompletionForm');
    const otpForm = document.getElementById('registrationOtpForm');
    const photoInput = document.getElementById('flowPhoto');
    const otpInput = document.getElementById('flowOtp');
    if (completionForm) {
        completionForm.reset();
    }
    if (otpForm) {
        otpForm.reset();
    }
    if (photoInput) {
        photoInput.value = '';
    }
    if (otpInput) {
        otpInput.value = '';
    }
}

function showUserInvitationLink(userId) {
    const user = Number.isInteger(userId) ? users.find(item => item.id === userId) : null;
    if (!user) {
        showNotification('error', 'Unable to locate an invitation for this user.');
        return;
    }

    ensureUserInvitationRecord(user);
    const token = user.invitation.token || generateRegistrationToken();
    if (!user.invitation.token) {
        user.invitation.token = token;
    }

    const link = buildAbsoluteInvitationLink(token);

    state.registrationFlow.userId = userId;
    state.registrationFlow.token = token;
    state.registrationFlow.link = link;
    state.registrationFlow.linkExpiresAt = user.invitation.expiresAt || null;

    saveUsersToStorage();

    window.open(link, '_blank', 'noopener');
}

function openRegistrationFlow(userId, options = {}) {
    const overlay = document.getElementById('registrationFlowOverlay');
    const flowFirstName = document.getElementById('flowFirstName');
    const flowLastName = document.getElementById('flowLastName');
    const flowEmail = document.getElementById('flowEmail');
    const flowPhone = document.getElementById('flowPhone');
    const flowPassword = document.getElementById('flowPassword');
    const flowPasswordConfirm = document.getElementById('flowPasswordConfirm');
    const otpInstructions = document.getElementById('otpInstructions');

    if (!overlay || !flowFirstName || !flowLastName || !flowEmail || !flowPhone || !flowPassword || !flowPasswordConfirm || !otpInstructions) {
        return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('error', 'Unable to load the registration journey for this user.');
        return;
    }

    resetRegistrationFlowForms();

    const initialFirstName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
    const initialLastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
    const initialPhone = user.phone || `+96650${String(user.id).padStart(6, '0')}`;

    flowFirstName.value = initialFirstName;
    flowLastName.value = initialLastName;
    flowEmail.value = user.email;
    flowPhone.value = initialPhone;
    flowPassword.value = '';
    flowPasswordConfirm.value = '';

    ensureUserInvitationRecord(user);
    ensureUserAuthRecord(user);

    if (!user.invitation.sentAt) {
        user.invitation.sentAt = new Date().toISOString();
    }
    if (!user.invitation.expiresAt) {
        const sentTimestamp = Date.parse(user.invitation.sentAt);
        const base = Number.isFinite(sentTimestamp) ? sentTimestamp : Date.now();
        user.invitation.expiresAt = new Date(base + INVITATION_VALIDITY_MS).toISOString();
    }
    if (!user.invitation.otp) {
        user.invitation.otp = generateRegistrationOtp();
    }

    state.registrationFlow.userId = userId;
    state.registrationFlow.otp = user.invitation.otp || generateRegistrationOtp();
    state.registrationFlow.expiresAt = Date.now() + 10 * 60 * 1000;
    state.registrationFlow.token = user.invitation.token;
    state.registrationFlow.linkExpiresAt = user.invitation.expiresAt || null;
    updateRegistrationLinkDisplay(state.registrationFlow.token);

    const shouldStartAtOtp = options && options.resumeOtp;
    if (user.status === 'Active') {
        setInvitationStage('activated');
        showRegistrationFlowStep('success');
    } else if (shouldStartAtOtp) {
        setInvitationStage('otp');
        otpInstructions.textContent = `A new one-time password was sent to ${user.email}. Enter the 6-digit code to activate the account.`;
        showRegistrationFlowStep('otp');
    } else {
        setInvitationStage('account-info');
        showRegistrationFlowStep('account');
    }

    overlay.classList.remove('hidden');
    if (shouldStartAtOtp) {
        const otpInput = document.getElementById('flowOtp');
        if (otpInput) {
            otpInput.focus();
        }
    } else {
        flowFirstName.focus();
    }
}

function closeRegistrationFlow() {
    const overlay = document.getElementById('registrationFlowOverlay');
    if (!overlay || overlay.classList.contains('hidden')) {
        return;
    }

    const user = state.registrationFlow.userId ? users.find(u => u.id === state.registrationFlow.userId) : null;
    const stage = user && user.status === 'Active' ? 'activated' : 'account-info';
    setInvitationStage(stage);

    overlay.classList.add('hidden');
    resetRegistrationFlowForms();
    state.registrationFlow.otp = null;
    state.registrationFlow.userId = null;
    state.registrationFlow.expiresAt = null;
    state.registrationFlow.token = null;
    state.registrationFlow.linkExpiresAt = null;
    updateRegistrationLinkDisplay(null);
}

function handleRegistrationCompletionSubmit(event) {
    event.preventDefault();

    const flowFirstName = document.getElementById('flowFirstName');
    const flowLastName = document.getElementById('flowLastName');
    const flowPhone = document.getElementById('flowPhone');
    const flowPassword = document.getElementById('flowPassword');
    const flowPasswordConfirm = document.getElementById('flowPasswordConfirm');
    const otpInstructions = document.getElementById('otpInstructions');

    if (!flowFirstName || !flowLastName || !flowPhone || !flowPassword || !flowPasswordConfirm || !otpInstructions) {
        return;
    }

    const firstName = flowFirstName.value.trim();
    const lastName = flowLastName.value.trim();
    const phone = flowPhone.value.trim();
    const password = flowPassword.value;
    const confirm = flowPasswordConfirm.value;

    if (!firstName) {
        showNotification('error', 'First name is required to continue.');
        flowFirstName.focus();
        return;
    }
    if (!lastName) {
        showNotification('error', 'Last name is required to continue.');
        flowLastName.focus();
        return;
    }
    if (!phone) {
        showNotification('error', 'Phone number is required to continue.');
        flowPhone.focus();
        return;
    }
    if (password.length < 8) {
        showNotification('error', 'Password must contain at least 8 characters.');
        flowPassword.focus();
        return;
    }
    if (password !== confirm) {
        showNotification('error', 'Password confirmation does not match.');
        flowPasswordConfirm.focus();
        return;
    }

    const userId = state.registrationFlow.userId;
    const user = userId ? users.find(u => u.id === userId) : null;
    if (!user) {
        showNotification('error', 'Unable to continue the registration journey.');
        closeRegistrationFlow();
        return;
    }

    ensureUserAuthRecord(user);
    ensureUserInvitationRecord(user);

    user.firstName = firstName;
    user.lastName = lastName;
    user.name = `${firstName} ${lastName}`.trim();
    user.phone = phone;
    user.temporaryPasswordSetAt = new Date().toISOString();
    user.invitation = user.invitation || {};
    user.invitation.completedAt = new Date().toISOString();

    user.auth.passwordHash = hashPasswordValue(password);
    user.auth.lastUpdated = user.temporaryPasswordSetAt;

    const newOtp = generateRegistrationOtp();
    user.invitation.otp = newOtp;
    user.invitation.lastOtpSentAt = new Date().toISOString();
    state.registrationFlow.otp = newOtp;
    state.registrationFlow.expiresAt = Date.now() + 10 * 60 * 1000;
    state.registrationFlow.token = user.invitation.token;
    updateRegistrationLinkDisplay(state.registrationFlow.token);

    otpInstructions.textContent = `A one-time password was sent to ${user.email}. Enter the 6-digit code to activate the account.`;
    setInvitationStage('otp');
    showRegistrationFlowStep('otp');

    saveUsersToStorage();

    const otpInput = document.getElementById('flowOtp');
    if (otpInput) {
        otpInput.focus();
        otpInput.value = state.registrationFlow.otp;
        otpInput.select();
    }
}

function handleRegistrationOtpSubmit(event) {
    event.preventDefault();

    const otpInput = document.getElementById('flowOtp');
    if (!otpInput) {
        return;
    }

    const entered = otpInput.value.trim();
    if (!/^\d{6}$/.test(entered)) {
        showNotification('error', 'Enter the 6-digit code sent to the user.');
        otpInput.focus();
        return;
    }

    const userId = state.registrationFlow.userId;
    const user = userId ? users.find(u => u.id === userId) : null;
    if (!user || !user.invitation) {
        showNotification('error', 'The invitation for this user is no longer available.');
        closeRegistrationFlow();
        return;
    }

    if (entered !== state.registrationFlow.otp) {
        showNotification('error', 'The code entered is incorrect. Please try again or resend the OTP.');
        otpInput.focus();
        otpInput.select();
        return;
    }

    user.status = 'Active';
    user.accountType = 'platform-user';
    user.role = user.role === 'Pending Role' ? 'Control Panel User' : user.role;
    user.lastLogin = 'Awaiting first login';
    user.invitation.verifiedAt = new Date().toISOString();
    state.registrationFlow.token = user.invitation.token;
    updateRegistrationLinkDisplay(state.registrationFlow.token);

    setInvitationStage('activated');
    showRegistrationFlowStep('success');

    saveUsersToStorage();
    renderUsersTable(state.userSearchTerm, state.currentUserPage);
    renderStats();
    showNotification('success', `${user.email} has completed registration and can now sign in.`);

    const loginTarget = getLoginPageUrl();
    if (loginTarget) {
        window.open(loginTarget, '_blank');
    }
}

async function handleRegistrationFlowResend() {
    const userId = state.registrationFlow.userId;
    const user = userId ? users.find(u => u.id === userId) : null;
    const otpInstructions = document.getElementById('otpInstructions');
    if (!user || !otpInstructions) {
        return;
    }

    ensureUserInvitationRecord(user);

    const newOtp = generateRegistrationOtp();
    state.registrationFlow.otp = newOtp;
    state.registrationFlow.expiresAt = Date.now() + 10 * 60 * 1000;
    state.registrationFlow.token = user.invitation.token;
    state.registrationFlow.linkExpiresAt = user.invitation.expiresAt || null;
    updateRegistrationLinkDisplay(state.registrationFlow.token);

    user.invitation.otp = newOtp;
    user.invitation.lastOtpSentAt = new Date().toISOString();

    saveUsersToStorage();

    const invitedBy = resolveInvitationSenderLabel();
    const emailResult = await deliverInvitationEmail(user, {
        otp: newOtp,
        token: user.invitation.token,
        expiresAt: state.registrationFlow.expiresAt,
        linkExpiresAt: user.invitation.expiresAt || null,
        invitedBy
    });

    if (emailResult.status === 'sent') {
        otpInstructions.textContent = `We emailed a new one-time password to ${user.email}. Use the code within 10 minutes.`;
        showNotification('success', `A new invitation email was sent to ${user.email}.`, 6000);
    } else if (emailResult.status === 'skipped') {
        otpInstructions.textContent = `A new one-time password was generated for ${user.email}. Share the code or link manually within 10 minutes.`;
        showNotification('info', `Email service is not configured. Copy the new code for ${user.email} and share it manually.`, 7000);
    } else {
        otpInstructions.textContent = `A new one-time password was generated for ${user.email}, but delivery failed. Share the code manually within 10 minutes.`;
        showNotification('warning', `Email delivery failed for ${user.email}: ${emailResult.message}.`, 8000);
    }
}

function normalizeRoleLookupValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).trim().toLowerCase();
}

function getUsersAssignedToRole(role) {
    if (!role) {
        return [];
    }

    const lookupKeys = [role.name, role.nameEnglish, role.nameArabic, role.id]
        .map(normalizeRoleLookupValue)
        .filter(Boolean);

    if (!lookupKeys.length) {
        return [];
    }

    const lookup = new Set(lookupKeys);

    return users.filter(user => {
        if (!user) {
            return false;
        }
        const userRoleKey = normalizeRoleLookupValue(user.role);
        if (userRoleKey && lookup.has(userRoleKey)) {
            return true;
        }
        if (user.roleId) {
            const userRoleIdKey = normalizeRoleLookupValue(user.roleId);
            if (userRoleIdKey && lookup.has(userRoleIdKey)) {
                return true;
            }
        }
        return false;
    });
}

function getRoleAssignedUsersCount(role) {
    return getUsersAssignedToRole(role).length;
}

function updateRoleUserCount(role) {
    if (!role) {
        return 0;
    }
    const count = getRoleAssignedUsersCount(role);
    role.users = count;
    return count;
}

function syncRoleUserCounts() {
    roles.forEach(updateRoleUserCount);
}

function applyRoleDeletionToUsers(role, assignedUsers, disableAssignedUsers = false) {
    if (!Array.isArray(assignedUsers) || !assignedUsers.length) {
        return false;
    }

    const label = (role.nameEnglish || role.name || role.nameArabic || 'Role').trim();
    assignedUsers.forEach(user => {
        if (!user) return;
        user.roleId = null;
        user.role = disableAssignedUsers ? `${label} (Disabled)` : 'Unassigned';
        if (disableAssignedUsers && user.status !== 'Inactive') {
            user.status = 'Inactive';
        }
    });

    return true;
}

function finalizeRoleRemoval(role, assignedUsers, options = {}) {
    const { disableAssignedUsers = false } = options;
    const usersChanged = applyRoleDeletionToUsers(role, assignedUsers, disableAssignedUsers);

    if (usersChanged) {
        saveUsersToStorage();
        updateUsersManagementCount();
        renderUsersTable(state.userSearchTerm, state.currentUserPage);
    }

    const roleIndex = roles.findIndex(item => item.id === role.id);
    if (roleIndex !== -1) {
        roles.splice(roleIndex, 1);
    }

    if (state.activeRoleDetailId === role.id) {
        hideRoleDetails();
    }

    if (state.editingRoleId === role.id) {
        state.editingRoleId = null;
        hideRoleBuilder();
    }

    syncRoleUserCounts();
    saveRolesToStorage();
    updateUserRolesCount();
    renderRolesTable(state.currentRolePage);
    renderStats();
}

async function deleteRole(roleId) {
    const role = roles.find(item => item.id === roleId);
    if (!role) return;

    const confirmedDelete = await showRoleConfirm(
        'Are You Sure You Want to Delete the User Role?',
        'OK',
        'Cancel'
    );
    if (!confirmedDelete) return;

    const assignedUsers = getUsersAssignedToRole(role);
    const platformAdminAssignments = assignedUsers.filter(user => resolveUserAccountType(user) === 'platform-administrator');
    const canDeleteImmediately = role.status !== 'active' || platformAdminAssignments.length === 0;

    if (canDeleteImmediately) {
        finalizeRoleRemoval(role, assignedUsers);
        showNotification('success', 'User Role Deleted Successfully');
        return;
    }

    const warningMessage = `The User Role is Assigned to (${platformAdminAssignments.length}) Users. User Accounts Assigned to This Role Will be Disabled. Are You Sure You Want to proceed?`;
    const proceed = await showRoleConfirm(warningMessage, 'OK', 'Cancel');
    if (!proceed) return;

    const roleLabelForPrompt = role.nameEnglish || role.name || role.nameArabic || role.id;
    const promptMessage = `To Confirm, Type "${roleLabelForPrompt}" in the Box Below`;
    const expected = normalizeRoleLookupValue(roleLabelForPrompt);
    const promptResult = await showRolePrompt(
        promptMessage,
        'Delete',
        'Cancel',
        roleLabelForPrompt,
        {
            validate: value => {
                const trimmed = typeof value === 'string' ? value.trim() : '';
                if (!trimmed) {
                    return {
                        valid: false,
                        message: 'Field is Required'
                    };
                }
                return { valid: true };
            }
        }
    );
    if (!promptResult.confirmed) return;

    const provided = normalizeRoleLookupValue(promptResult.value);
    if (!provided || provided !== expected) {
        showNotification('error', 'Role Name Did Not Match. User Role Deletion Cancelled');
        return;
    }

    finalizeRoleRemoval(role, assignedUsers, { disableAssignedUsers: true });
    showNotification('success', 'User Role Deleted Successfully');
}

async function toggleRoleStatus(roleId) {
    const role = roles.find(item => item.id === roleId);
    if (!role) return;

    if (role.status === 'active') {
        const confirmedDisable = await showRoleConfirm(
            'Are You Sure You Want to Disable the User Role?',
            'OK',
            'Cancel'
        );
        if (!confirmedDisable) return;

        const assignedUsers = getUsersAssignedToRole(role);
        const totalAssignedUsers = assignedUsers.length;
        const platformAdminUsers = assignedUsers.filter(user => resolveUserAccountType(user) === 'platform-administrator');
        const hasPlatformAdminAssignments = platformAdminUsers.length > 0;
        let userAccountsUpdated = false;

        if (hasPlatformAdminAssignments && totalAssignedUsers > 0) {
            const warningMessage = `The User Role is Assigned to (${totalAssignedUsers}) Users. User Accounts Assigned to This Role Will be Disabled. Are You Sure You Want to proceed?`;
            const proceed = await showRoleConfirm(
                warningMessage,
                'OK',
                'Cancel'
            );
            if (!proceed) return;

            assignedUsers.forEach(user => {
                if (user && user.status !== 'Inactive') {
                    user.status = 'Inactive';
                    userAccountsUpdated = true;
                }
            });

            if (userAccountsUpdated) {
                saveUsersToStorage();
            }
        }

        role.status = 'inactive';
        role.lastUpdated = `Deactivated ${new Date().toLocaleDateString()}`;
        updateRoleUserCount(role);

        saveRolesToStorage();
        updateUserRolesCount();
        renderRolesTable(state.currentRolePage);
        if (userAccountsUpdated) {
            renderUsersTable(state.userSearchTerm, state.currentUserPage);
        }
        renderStats();
        showNotification('success', 'User Role Disabled Successfully');
    } else {
        const confirmed = await showRoleConfirm(
            'Are You Sure You Want to Enable the User Role Again?',
            'Enable',
            'Cancel'
        );
        if (!confirmed) return;
        role.status = 'active';
        role.lastUpdated = `Reactivated ${new Date().toLocaleDateString()}`;
        updateRoleUserCount(role);
        saveRolesToStorage();
        updateUserRolesCount();
        renderRolesTable(state.currentRolePage);
        renderStats();
        showNotification('success', 'User Role has been Successfully Enabled');
    }
}

async function toggleUserStatus(userId) {
    const user = users.find(item => item.id === userId);
    if (!user) return;
    const activeSearch = state.userSearchTerm || '';

    if (user.status === 'Active') {
        const confirmed = await showUserConfirm(
            'Are You Sure You Want to Deactivate the User Account?',
            'Deactivate',
            'Cancel'
        );
        if (!confirmed) return;
        user.status = 'Inactive';
        saveUsersToStorage();
        renderUsersTable(activeSearch, state.currentUserPage);
        renderStats();
        showNotification('success', 'User Account Deactivated Successfully');
    } else {
        const confirmed = await showUserConfirm(
            'Are You Sure You Want to Activate the User Account?',
            'Activate',
            'Cancel'
        );
        if (!confirmed) return;
        user.status = 'Active';
        saveUsersToStorage();
        renderUsersTable(activeSearch, state.currentUserPage);
        renderStats();
        showNotification('success', 'User Account Activated Successfully');
    }
}

async function handleUserToggle(userId) {
    await toggleUserStatus(userId);
}

async function handleUserDelete(userId) {
    const user = users.find(item => item.id === userId);
    if (!user) {
        showNotification('error', 'We could not locate that user record.');
        return;
    }

    const accountType = resolveUserAccountType(user);
    if (accountType === 'system-administrator') {
        await showUserAlert('Super Admin accounts cannot be deleted.');
        return;
    }

    const isCurrentSessionUser = Boolean(state.activeSession && state.activeSession.user && state.activeSession.user.id === userId);
    if (isCurrentSessionUser) {
        await showUserAlert('You cannot delete the account that is currently signed in.');
        return;
    }

    const userLabel = resolveUserDisplayName(user);
    const confirmed = await showUserConfirm(
        `Delete the user account for ${userLabel}? This action cannot be undone.`,
        'Delete',
        'Cancel'
    );
    if (!confirmed) return;

    const wasEditingTarget = state.editingUserId === userId;
    const registrationFlowMatches = Boolean(state.registrationFlow && state.registrationFlow.userId === userId);

    users = users.filter(item => item.id !== userId);

    syncRoleUserCounts();
    saveRolesToStorage();
    saveUsersToStorage();
    updateUserRolesCount();
    updateUsersManagementCount();
    renderUsersTable(state.userSearchTerm, state.currentUserPage);
    renderRolesTable(state.currentRolePage);
    renderStats();

    if (registrationFlowMatches) {
        closeRegistrationFlow();
    }

    if (wasEditingTarget) {
        hideUserForm();
    }

    if (state.registrationFlow) {
        state.registrationFlow.stage = 'prepared';
        state.registrationFlow.link = null;
    }

    showNotification('success', 'User account deleted successfully.');
}

function viewRole(roleId) {
    showRoleDetails(roleId);
}

function editRole(roleId) {
    const role = roles.find(item => item.id === roleId);
    if (!role) return;
    showRoleBuilder('edit', role);

    const hasStructuredPermissions = Array.isArray(role.permissions)
        && role.permissions.some(permission => permission && typeof permission === 'object');
    if (!hasStructuredPermissions) {
        showNotification('info', 'This role uses legacy permissions. Please assign the appropriate apps before saving.');
    }
}

function handleRoleSubmit(event) {
    event.preventDefault();
    const nameArabic = document.getElementById('roleNameArabicInput').value.trim();
    const nameEnglish = document.getElementById('roleNameEnglishInput').value.trim();
    const description = document.getElementById('roleDescriptionInput').value.trim();
    const permissions = collectPermissionSelections();
    setRolePermissionsError('');

    if (!nameArabic || !nameEnglish) {
        showNotification('warning', 'Arabic name and English name are required.');
        return;
    }

    if (!permissions.length) {
        setRolePermissionsError('Select at Least One App Permission for this Role');
        return;
    }

    if (state.roleBuilderMode === 'edit' && state.editingRoleId) {
        const role = roles.find(item => item.id === state.editingRoleId);
        if (!role) {
            showNotification('warning', 'The role you were editing is no longer available.');
            hideRoleBuilder();
            return;
        }

        role.name = nameEnglish;
        role.nameEnglish = nameEnglish;
        role.nameArabic = nameArabic;
        role.description = description;
        role.permissions = permissions;
        role.lastUpdated = `Updated ${new Date().toLocaleDateString()}`;
        updateRoleUserCount(role);

    saveRolesToStorage();
        renderRolesTable(state.currentRolePage);
        hideRoleBuilder();
        showNotification('success', 'User Role updated successfully.');
        return;
    }

    const slugBase = nameEnglish
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    let roleId = slugBase || `role-${Date.now()}`;
    let counter = 1;
    while (roles.some(existingRole => existingRole.id === roleId)) {
        roleId = `${slugBase || 'role'}-${counter}`;
        counter += 1;
    }

    const newRole = {
        id: roleId,
        name: nameEnglish,
        nameEnglish,
        nameArabic,
        description,
        users: 0,
        permissions,
        status: 'active',
        lastUpdated: `Created ${new Date().toLocaleDateString()}`
    };

    roles.unshift(newRole);
    updateRoleUserCount(newRole);
    saveRolesToStorage();
    updateUserRolesCount();
    renderRolesTable(1);
    hideRoleBuilder();
    showNotification('success', 'User Role Added Successfully');
}

function renderUsersTable(searchTerm = state.userSearchTerm, page = state.currentUserPage) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const rawTerm = typeof searchTerm === 'string' ? searchTerm : '';
    const trimmedTerm = rawTerm.trim();
    const normalizedTerm = trimmedTerm.toLowerCase();

    let targetPage = page;
    if (state.userSearchTerm !== trimmedTerm) {
        targetPage = 1;
    }
    state.userSearchTerm = trimmedTerm;

    const searchInput = document.getElementById('userSearch');
    if (searchInput && searchInput.value !== trimmedTerm) {
        searchInput.value = trimmedTerm;
    }

    const filtered = normalizedTerm
        ? users.filter(user => {
            const displayName = resolveUserDisplayName(user);
            const haystack = `${displayName} ${user.email || ''} ${user.role || ''} ${user.status || ''} ${user.phone || ''} ${user.department || ''}`.toLowerCase();
            return haystack.includes(normalizedTerm);
        })
        : users;

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.usersPerPage));
    state.currentUserPage = Math.min(Math.max(targetPage, 1), totalPages);
    const startIndex = (state.currentUserPage - 1) * state.usersPerPage;
    const visibleUsers = filtered.slice(startIndex, startIndex + state.usersPerPage);

    if (!visibleUsers.length) {
        tbody.innerHTML = '<tr><td colspan="9">There is no Data Available</td></tr>';
    } else {
        let index = startIndex + 1;
        tbody.innerHTML = visibleUsers.map(user => {
            const displayName = resolveUserDisplayName(user);
            const rawStatus = (user.status || 'Active').toLowerCase();
            const isActive = rawStatus === 'active';
            const isPending = rawStatus === 'pending';
            const displayStatus = isPending ? 'Pending' : isActive ? 'Active' : 'Inactive';
            const statusClass = isPending ? 'pending' : isActive ? 'active' : 'inactive';
            const accountType = resolveUserAccountType(user);
            const accountTypeLabel = mapAccountTypeLabel(accountType);
            const accountTypeClass = mapAccountTypeClass(accountType);
            const isSuperAdminAccount = accountType === 'system-administrator';
            const accountTypeTag = isSuperAdminAccount
                ? `<span class="account-type-tag ${accountTypeClass}">${accountTypeLabel}</span>`
                : '';
            const displayRole = isSuperAdminAccount ? '—' : (user.role || '—');
            const expirationLabel = user.expiresOn ? formatDateForDisplay(user.expiresOn) : '—';
            const invitation = user.invitation || {};
            const registrationCompleted = Boolean(invitation.completedAt || invitation.verifiedAt);
            const phoneDisplay = (!isPending || registrationCompleted)
                ? (user.phone && String(user.phone).trim() ? String(user.phone).trim() : '—')
                : '—';
            const employeeIdDisplay = user.employeeId && String(user.employeeId).trim() ? String(user.employeeId).trim() : '—';
            const isCurrentSessionUser = Boolean(state.activeSession && state.activeSession.user && state.activeSession.user.id === user.id);
            const deleteTooltip = isSuperAdminAccount
                ? 'Super Admin accounts cannot be deleted.'
                : isCurrentSessionUser
                    ? 'You cannot delete the account that is currently signed in.'
                    : 'Delete user';
            const deleteAction = (!isSuperAdminAccount && !isCurrentSessionUser)
                ? `<button class="action-btn delete" onclick="(async () => await handleUserDelete(${user.id}))()" title="${escapeAttribute(deleteTooltip)}"><i class="fas fa-trash"></i></button>`
                : `<button class="action-btn delete disabled" type="button" disabled title="${escapeAttribute(deleteTooltip)}"><i class="fas fa-trash"></i></button>`;

            const secondaryAction = isPending
                ? `<button class="action-btn activate" onclick="showUserInvitationLink(${user.id})" title="Show invitation link"><i class="fas fa-envelope-open-text"></i></button>`
                : `<button class="action-btn ${isActive ? 'deactivate' : 'activate'}" onclick="(async () => await handleUserToggle(${user.id}))()" title="${isActive ? 'Deactivate user' : 'Activate user'}"><i class="fas ${isActive ? 'fa-power-off' : 'fa-rotate-right'}"></i></button>`;

            return `
                <tr>
                    <td>${index++}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="https://picsum.photos/seed/${user.id}/40/40" alt="${displayName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div class="user-name-row">
                                    <span class="user-name">${displayName}</span>
                                    ${accountTypeTag}
                                </div>
                                <div class="user-meta">${user.email}</div>
                                <div class="user-meta">${phoneDisplay}</div>
                                <div class="user-meta">ID: ${employeeIdDisplay}</div>
                            </div>
                        </div>
                    </td>
                    <td>${displayRole}</td>
                    <td>${user.department || '—'}</td>
                    <td><span class="status-badge status-${statusClass}">${displayStatus}</span></td>
                    <td>${user.lastLogin}</td>
                    <td>${user.created}</td>
                    <td>${expirationLabel}</td>
                    <td>
                        <div class="action-group">
                            <button class="action-btn edit" onclick="showUserForm('edit', ${user.id})" title="Edit user"><i class="fas fa-pen"></i></button>
                            ${secondaryAction}
                            ${deleteAction}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderUsersPagination(totalPages, filtered.length);
}

function exportUsers() {
    const rows = [
        ['Name', 'Email', 'Role', 'Department', 'Status', 'Last Login', 'Created', 'Account Expiration'],
        ...users.map(user => [
            resolveUserDisplayName(user),
            user.email,
            user.role,
            user.department || '',
            user.status,
            user.lastLogin,
            user.created,
            user.expiresOn || ''
        ])
    ];
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'onruf-users.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
}

function saveSettings() {
    alert('Settings saved successfully. Updates will apply within the next sync cycle.');
}

function openSupport() {
    alert('Support will connect you with the OnRuf help desk.');
}

function manageIntegration(key) {
    alert(`Opening integration settings for ${key}.`);
}

function viewIntegrationRoadmap() {
    alert('Displaying the Municipality Services integration roadmap.');
}

function scheduleIntegrationWorkshop() {
    alert('Scheduling workshop with finance stakeholders.');
}

document.addEventListener('DOMContentLoaded', initializeApp);

