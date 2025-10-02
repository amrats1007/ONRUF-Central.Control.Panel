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
    userVerification: null
};

const permissionActions = [
    { id: 'view', label: 'View only' },
    { id: 'manage', label: 'Manage records' },
    { id: 'admin', label: 'Admin & configure' }
];

const permissionSectionsTemplate = [
    {
        id: 'platform-oversight',
        label: 'Platform Oversight',
        description: 'Monitor cross-tenant platform health and compliance.',
        apps: [
            {
                id: 'operations-console',
                label: 'Operations Console',
                description: 'Daily operations feed, incidents, and live status widgets.',
                defaultAction: 'manage'
            },
            {
                id: 'sustainability-dashboard',
                label: 'Sustainability Dashboard',
                description: 'Environmental KPIs, emission footprints, and waste targets.',
                defaultAction: 'view'
            },
            {
                id: 'governance-insights',
                label: 'Governance Insights',
                description: 'Audit trails, policy adherence, and exception reporting.',
                defaultAction: 'admin'
            }
        ]
    },
    {
        id: 'tenant-operations',
        label: 'Tenant Operations',
        description: 'Coordinate onboarding, inspections, and violation case work.',
        apps: [
            {
                id: 'tenant-directory',
                label: 'Tenant Directory',
                description: 'Primary tenant records, health status, and contact references.',
                defaultAction: 'manage'
            },
            {
                id: 'inspection-scheduler',
                label: 'Inspection Scheduler',
                description: 'Plan field visits, assign inspectors, and monitor progress.',
                defaultAction: 'manage'
            },
            {
                id: 'violation-workbench',
                label: 'Violation Workbench',
                description: 'Casework, appeals, evidence, and escalation handling.',
                defaultAction: 'admin'
            }
        ]
    },
    {
        id: 'business-performance',
        label: 'Business Performance',
        description: 'Track revenue, adoption, and SLA outcomes across segments.',
        apps: [
            {
                id: 'revenue-analytics',
                label: 'Revenue Analytics',
                description: 'Recurring revenue, renewals, and growth pacing dashboards.',
                defaultAction: 'manage'
            },
            {
                id: 'engagement-hub',
                label: 'Engagement Hub',
                description: 'Tenant usage, satisfaction surveys, and playbooks.',
                defaultAction: 'manage'
            },
            {
                id: 'sla-monitor',
                label: 'SLA Monitor',
                description: 'Real-time SLA alerts, root causes, and mitigation history.',
                defaultAction: 'view'
            }
        ]
    },
    {
        id: 'platform-administration',
        label: 'Platform Administration',
        description: 'Configure roles, automations, and API integrations.',
        apps: [
            {
                id: 'role-governance',
                label: 'Role Governance',
                description: 'Role templates, permission guardrails, and audits.',
                defaultAction: 'admin'
            },
            {
                id: 'automation-studio',
                label: 'Automation Studio',
                description: 'Workflow builders, triggers, and orchestration.',
                defaultAction: 'manage'
            },
            {
                id: 'integration-hub',
                label: 'Integration Hub',
                description: 'API credentials, partner connectors, and sync policies.',
                defaultAction: 'admin'
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

const viewerPermissions = [
    { sectionId: 'platform-oversight', appId: 'operations-console', actions: ['view'] },
    { sectionId: 'business-performance', appId: 'sla-monitor', actions: ['view'] }
];

const marketingTeamPermissions = [
    { sectionId: 'business-performance', appId: 'engagement-hub', actions: ['manage'] },
    { sectionId: 'business-performance', appId: 'revenue-analytics', actions: ['manage'] },
    { sectionId: 'tenant-operations', appId: 'tenant-directory', actions: ['view'] }
];

const salesTeamPermissions = [
    { sectionId: 'tenant-operations', appId: 'tenant-directory', actions: ['manage'] },
    { sectionId: 'tenant-operations', appId: 'inspection-scheduler', actions: ['manage'] },
    { sectionId: 'business-performance', appId: 'revenue-analytics', actions: ['manage'] }
];

const complianceOfficerPermissions = [
    { sectionId: 'tenant-operations', appId: 'violation-workbench', actions: ['admin'] },
    { sectionId: 'tenant-operations', appId: 'inspection-scheduler', actions: ['manage'] },
    { sectionId: 'platform-oversight', appId: 'governance-insights', actions: ['admin'] }
];

const customerSuccessPermissions = [
    { sectionId: 'tenant-operations', appId: 'tenant-directory', actions: ['manage'] },
    { sectionId: 'business-performance', appId: 'engagement-hub', actions: ['manage'] },
    { sectionId: 'platform-oversight', appId: 'operations-console', actions: ['view'] }
];

const itSupportPermissions = [
    { sectionId: 'platform-administration', appId: 'integration-hub', actions: ['admin'] },
    { sectionId: 'platform-administration', appId: 'automation-studio', actions: ['manage'] },
    { sectionId: 'platform-administration', appId: 'role-governance', actions: ['manage'] }
];

const riskAnalystPermissions = [
    { sectionId: 'platform-oversight', appId: 'governance-insights', actions: ['manage'] },
    { sectionId: 'business-performance', appId: 'sla-monitor', actions: ['manage'] },
    { sectionId: 'business-performance', appId: 'revenue-analytics', actions: ['view'] }
];

const financeControllerPermissions = [
    { sectionId: 'business-performance', appId: 'revenue-analytics', actions: ['admin'] },
    { sectionId: 'business-performance', appId: 'engagement-hub', actions: ['manage'] },
    { sectionId: 'platform-administration', appId: 'integration-hub', actions: ['manage'] }
];

const vendorManagerPermissions = [
    { sectionId: 'tenant-operations', appId: 'tenant-directory', actions: ['manage'] },
    { sectionId: 'tenant-operations', appId: 'violation-workbench', actions: ['manage'] },
    { sectionId: 'platform-administration', appId: 'automation-studio', actions: ['manage'] }
];

const trainingCoordinatorPermissions = [
    { sectionId: 'tenant-operations', appId: 'inspection-scheduler', actions: ['manage'] },
    { sectionId: 'business-performance', appId: 'engagement-hub', actions: ['view'] },
    { sectionId: 'platform-oversight', appId: 'operations-console', actions: ['view'] }
];

const logisticsSupervisorPermissions = [
    { sectionId: 'tenant-operations', appId: 'inspection-scheduler', actions: ['manage'] },
    { sectionId: 'tenant-operations', appId: 'violation-workbench', actions: ['manage'] },
    { sectionId: 'platform-oversight', appId: 'operations-console', actions: ['manage'] }
];

const defaultRoles = [
    {
        id: 'viewer',
        name: 'Executive Viewer',
        nameArabic: 'المشاهد التنفيذي',
        description: 'Provides read-only dashboards for leadership visibility.',
        users: 8,
        permissions: viewerPermissions,
        status: 'inactive',
        lastUpdated: 'Deactivated 5 days ago'
    },
    {
        id: 'marketing-team',
        name: 'Marketing Team',
        nameArabic: 'فريق التسويق',
        description: 'Plans campaigns and monitors engagement across business accounts.',
        users: 24,
        permissions: marketingTeamPermissions,
        status: 'active',
        lastUpdated: 'Updated 3 days ago'
    },
    {
        id: 'sales-team',
        name: 'Sales Team',
        nameArabic: 'فريق المبيعات',
        description: 'Manages commercial offers, renewals, and partner onboarding.',
        users: 41,
        permissions: salesTeamPermissions,
        status: 'active',
        lastUpdated: 'Updated 6 days ago'
    },
    {
        id: 'compliance-officer',
        name: 'Compliance Officer',
        nameArabic: 'مسؤول الامتثال',
        description: 'Tracks inspection evidence and ensures adherence to governance rules.',
        users: 17,
        permissions: complianceOfficerPermissions,
        status: 'active',
        lastUpdated: 'Updated 2 days ago'
    },
    {
        id: 'customer-success',
        name: 'Customer Success',
        nameArabic: 'نجاح العملاء',
        description: 'Supports tenants and follows up on activation and satisfaction metrics.',
        users: 29,
        permissions: customerSuccessPermissions,
        status: 'active',
        lastUpdated: 'Updated 1 week ago'
    },
    {
        id: 'it-support',
        name: 'IT Support',
        nameArabic: 'دعم تقنية المعلومات',
        description: 'Provides technical assistance and maintains platform access health.',
        users: 12,
        permissions: itSupportPermissions,
        status: 'active',
        lastUpdated: 'Updated yesterday'
    },
    {
        id: 'risk-analyst',
        name: 'Risk Analyst',
        nameArabic: 'محلل المخاطر',
        description: 'Monitors operational risk indicators and highlights anomalies.',
        users: 14,
        permissions: riskAnalystPermissions,
        status: 'active',
        lastUpdated: 'Updated 2 days ago'
    },
    {
        id: 'finance-controller',
        name: 'Finance Controller',
        nameArabic: 'المراقب المالي',
        description: 'Oversees billing cycles, credit notes, and revenue alignment.',
        users: 21,
        permissions: financeControllerPermissions,
        status: 'active',
        lastUpdated: 'Updated yesterday'
    },
    {
        id: 'vendor-manager',
        name: 'Vendor Manager',
        nameArabic: 'مدير المورّدين',
        description: 'Coordinates partner onboarding and supplier performance reviews.',
        users: 19,
        permissions: vendorManagerPermissions,
        status: 'active',
        lastUpdated: 'Updated 5 days ago'
    },
    {
        id: 'training-coordinator',
        name: 'Training Coordinator',
        nameArabic: 'منسق التدريب',
        description: 'Plans onboarding workshops and tracks certification status.',
        users: 11,
        permissions: trainingCoordinatorPermissions,
        status: 'active',
        lastUpdated: 'Updated 4 days ago'
    },
    {
        id: 'logistics-supervisor',
        name: 'Logistics Supervisor',
        nameArabic: 'مشرف اللوجستيات',
        description: 'Manages field deployment schedules and inventory movements.',
        users: 16,
        permissions: logisticsSupervisorPermissions,
        status: 'active',
        lastUpdated: 'Updated today'
    }
];

let roles = [];

const defaultUsers = [
    { id: 1, name: 'Ahmed Hassan', email: 'ahmed.hassan@onruf.com', role: 'Business Owner', accountType: 'system-administrator', status: 'Active', lastLogin: '2 hours ago', created: 'Jan 12, 2024' },
    { id: 2, name: 'Sarah Mohammed', email: 'sarah.mohammed@onruf.com', role: 'Platform Admin', accountType: 'system-administrator', status: 'Active', lastLogin: '38 minutes ago', created: 'Feb 01, 2024' },
    { id: 3, name: 'Omar Ali', email: 'omar.ali@onruf.com', role: 'Inspector', status: 'Active', lastLogin: 'Today 07:12', created: 'Mar 08, 2024' },
    { id: 4, name: 'Fatima Khalil', email: 'fatima.khalil@onruf.com', role: 'Inspector', status: 'Inactive', lastLogin: '3 weeks ago', created: 'Dec 22, 2023' },
    { id: 5, name: 'Khalid Ibrahim', email: 'khalid.ibrahim@onruf.com', role: 'Business Manager', status: 'Inactive', lastLogin: 'Never', created: 'Mar 20, 2024' },
    { id: 6, name: 'Noor Abdel', email: 'noor.abdel@onruf.com', role: 'Business Manager', status: 'Active', lastLogin: 'Yesterday 21:44', created: 'Jan 29, 2024' },
    { id: 7, name: 'Yusuf Nasser', email: 'yusuf.nasser@onruf.com', role: 'Inspector', status: 'Active', lastLogin: '4 hours ago', created: 'Feb 14, 2024' },
    { id: 8, name: 'Layla Mahmoud', email: 'layla.mahmoud@onruf.com', role: 'Reader', status: 'Inactive', lastLogin: '1 month ago', created: 'Nov 30, 2023' },
    { id: 9, name: 'Huda Salem', email: 'huda.salem@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: '5 hours ago', created: 'Mar 02, 2024' },
    { id: 10, name: 'Nasser Al-Qahtani', email: 'nasser.qahtani@onruf.com', role: 'Platform Admin', status: 'Active', lastLogin: 'Yesterday', created: 'Feb 17, 2024' },
    { id: 11, name: 'Amira Hassan', email: 'amira.hassan@onruf.com', role: 'Inspector', status: 'Active', lastLogin: '1 hour ago', created: 'Apr 05, 2024' },
    { id: 12, name: 'Mohammed Saleh', email: 'mohammed.saleh@onruf.com', role: 'Business Manager', status: 'Active', lastLogin: '6 hours ago', created: 'Jan 15, 2024' },
    { id: 13, name: 'Reem Al-Farsi', email: 'reem.alfarsi@onruf.com', role: 'Reader', status: 'Inactive', lastLogin: '2 weeks ago', created: 'Oct 10, 2023' },
    { id: 14, name: 'Tariq Al-Mansoori', email: 'tariq.almansoori@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: 'Today 14:30', created: 'Feb 28, 2024' },
    { id: 15, name: 'Lina Al-Zahra', email: 'lina.alzahra@onruf.com', role: 'Platform Admin', status: 'Active', lastLogin: 'Yesterday 18:45', created: 'Mar 15, 2024' },
    { id: 16, name: 'Sultan Al-Rashid', email: 'sultan.alrashid@onruf.com', role: 'Inspector', status: 'Active', lastLogin: '7 hours ago', created: 'Jan 08, 2024' },
    { id: 17, name: 'Maha Al-Khalifa', email: 'maha.alkhalifa@onruf.com', role: 'Business Manager', status: 'Inactive', lastLogin: '5 days ago', created: 'Dec 05, 2023' },
    { id: 18, name: 'Fahad Al-Saud', email: 'fahad.alsaud@onruf.com', role: 'Inspector', status: 'Active', lastLogin: 'Today 09:15', created: 'Apr 12, 2024' },
    { id: 19, name: 'Nadia Al-Mahmoud', email: 'nadia.almahmoud@onruf.com', role: 'Reader', status: 'Active', lastLogin: '3 hours ago', created: 'Feb 20, 2024' },
    { id: 20, name: 'Rashid Al-Hamad', email: 'rashid.alhamad@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: 'Yesterday 12:00', created: 'Mar 25, 2024' },
    { id: 21, name: 'Aisha Al-Dosari', email: 'aisha.aldosari@onruf.com', role: 'Platform Admin', status: 'Active', lastLogin: '2 hours ago', created: 'Jan 30, 2024' },
    { id: 22, name: 'Hamad Al-Thani', email: 'hamad.althani@onruf.com', role: 'Inspector', status: 'Inactive', lastLogin: '1 week ago', created: 'Nov 18, 2023' },
    { id: 23, name: 'Zahra Al-Mansouri', email: 'zahra.almansouri@onruf.com', role: 'Business Manager', status: 'Active', lastLogin: 'Today 16:20', created: 'Apr 01, 2024' },
    { id: 24, name: 'Othman Al-Jaber', email: 'othman.aljaber@onruf.com', role: 'Reader', status: 'Active', lastLogin: '4 hours ago', created: 'Feb 10, 2024' },
    { id: 25, name: 'Salma Al-Kuwaiti', email: 'salma.alkuwaiti@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: 'Yesterday 08:30', created: 'Mar 18, 2024' },
    { id: 26, name: 'Bandar Al-Otaibi', email: 'bandar.alotaibi@onruf.com', role: 'Platform Admin', status: 'Active', lastLogin: '5 hours ago', created: 'Jan 22, 2024' },
    { id: 27, name: 'Rana Al-Sabah', email: 'rana.alsabah@onruf.com', role: 'Inspector', status: 'Inactive', lastLogin: '3 weeks ago', created: 'Dec 15, 2023' },
    { id: 28, name: 'Jassem Al-Muhannadi', email: 'jassem.almuhannadi@onruf.com', role: 'Business Manager', status: 'Active', lastLogin: 'Today 11:45', created: 'Apr 08, 2024' },
    { id: 29, name: 'Hessa Al-Rumaihi', email: 'hessa.alrumaihi@onruf.com', role: 'Reader', status: 'Active', lastLogin: '1 hour ago', created: 'Feb 05, 2024' },
    { id: 30, name: 'Saad Al-Shammari', email: 'saad.alshammari@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: 'Yesterday 15:20', created: 'Mar 10, 2024' }
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
        users: role.users ?? '—',
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
    const normalizedStatus = rawStatus === 'inactive' ? 'Inactive' : 'Active';
    const accountType = user.accountType === 'system-administrator' ? 'system-administrator' : 'platform-administrator';

    return {
        id: numericId,
        name: safeName,
        email,
    role: user.role || 'Admin',
        accountType,
        status: normalizedStatus,
        lastLogin: user.lastLogin || 'Never',
        created: user.created || new Date().toLocaleDateString(),
        phone: user.phone || '',
        department: user.department || '',
        permissionSummary: user.permissionSummary || '',
        expiresOn: user.expiresOn || ''
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
            titleEl.textContent = 'Add New Role';
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

function initializeApp() {
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
    } else {
        users = defaultUsers.map((user, index) => normalizeUserPayload(user, index)).filter(Boolean);
        saveUsersToStorage();
    }

    setupEventListeners();
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

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    const rolesTableBody = document.getElementById('rolesTableBody');
    if (rolesTableBody) {
        rolesTableBody.addEventListener('click', event => {
            const button = event.target.closest('.action-btn');
            if (!button) return;
            const roleId = button.dataset.role;
            if (!roleId) return;
            if (button.dataset.action === 'view') {
                viewRole(roleId);
            } else if (button.dataset.action === 'edit') {
                editRole(roleId);
            } else if (button.dataset.action === 'toggle') {
                toggleRoleStatus(roleId);
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
    const userReviewRegisterBtn = document.getElementById('userReviewRegisterBtn');
    const userReviewCancelBtn = document.getElementById('userReviewCancelBtn');
    const userForm = document.getElementById('userForm');
    const userVerifyBtn = document.getElementById('userVerifyBtn');
    const userVerificationCancelBtn = document.getElementById('userVerificationCancelBtn');
    const userEmailInput = document.getElementById('userEmail');
    const userRoleSelect = document.getElementById('userRole');
    const accountTypeSelect = document.getElementById('userAccountType');
    const userFormProgress = document.getElementById('userFormProgress');
    const userExpirationInput = document.getElementById('userExpirationDate');
    const userFormCancelStep3Btn = document.getElementById('userFormCancelStep3Btn');

    if (userReviewCancelBtn) {
        userReviewCancelBtn.addEventListener('click', () => {
            revertToEmailVerification();
        });
    }
    if (userReviewRegisterBtn) {
        userReviewRegisterBtn.addEventListener('click', handleUserFormNext);
    }
    if (userVerifyBtn) {
        userVerifyBtn.addEventListener('click', handleUserEmailVerification);
    }
    if (userVerificationCancelBtn) {
        userVerificationCancelBtn.addEventListener('click', handleUserVerificationCancel);
    }
    if (userEmailInput) {
        userEmailInput.addEventListener('input', handleUserEmailInputChange);
    }
    if (accountTypeSelect) {
        accountTypeSelect.addEventListener('change', handleAccountTypeChange);
    }
    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', handleRoleSelectionChange);
    }
    if (userExpirationInput) {
        userExpirationInput.addEventListener('change', handleExpirationDateChange);
    }
    if (userFormCancelStep3Btn) {
        userFormCancelStep3Btn.addEventListener('click', handleUserFormStepThreeCancel);
    }
    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
        userForm.addEventListener('keydown', event => {
            if (event.key === 'Enter' && state.userFormStep === 2 && !event.shiftKey) {
                event.preventDefault();
                handleUserFormNext();
            }
        });
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
            if (state.userFormStep === 2 && targetStep === 1) {
                return;
            }
            if (state.userFormStep === 2 && targetStep === 3) {
                return;
            }
            if (state.userFormStep === 3 && targetStep === 2) {
                return;
            }
            if (state.userFormStep === 3 && targetStep === 1) {
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
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && userFormPage && !userFormPage.classList.contains('hidden')) {
            hideUserForm();
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
        products: 'Products'
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
            appLabel = state.roleBuilderMode === 'edit' ? 'Edit User Role' : 'Add New Role';
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
            : '<tr><td colspan="7">No roles found. Use the "Add New Role" button to create one.</td></tr>';
    } else {
        let index = (state.currentRolePage - 1) * state.rolesPerPage + 1;
        tbody.innerHTML = visibleRoles.map(role => {
            const permissionCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
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
                <td>${role.users ?? '—'}</td>
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
    note.className = `notification ${type}`;
    note.innerHTML = `
        <span>${message}</span>
        <button type="button" class="notification-close" aria-label="Dismiss">&times;</button>
    `;

    const close = () => {
        note.classList.add('hidden');
        setTimeout(() => {
            if (note.parentElement) {
                note.parentElement.removeChild(note);
            }
        }, 150);
    };

    const closeBtn = note.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', close);
    }

    host.appendChild(note);

    if (timeout > 0) {
        setTimeout(close, timeout);
    }
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
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

function handleAccountTypeChange(event) {
    const value = event && event.target ? event.target.value : '';
    const draft = {
        ...(state.userDraft || {}),
        accountType: value || null
    };

    if (value === 'system-administrator') {
        draft.role = 'Super Admin';
    } else if (value === 'platform-administrator') {
        draft.role = draft.role && draft.role !== 'Super Admin' ? draft.role : '';
    } else {
        draft.role = '';
    }

    state.userDraft = draft;

    updateAccountTypeUI();
    updateUserFormProgressState();
}

function handleRoleSelectionChange(event) {
    const value = event.target ? event.target.value : '';

    state.userDraft = {
        ...(state.userDraft || {}),
        role: value
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
    const accountTypeSelect = document.getElementById('userAccountType');
    const roleSelect = document.getElementById('userRole');
    const summary = document.getElementById('userPermissionsSummary');
    const accountTypeLabel = document.getElementById('userAccountTypeLabel');
    const roleLabel = document.getElementById('userRoleLabel');

    const storedAccountType = state.userDraft && state.userDraft.accountType ? state.userDraft.accountType : '';
    let selectedValue = storedAccountType;

    if (accountTypeSelect) {
        accountTypeSelect.value = storedAccountType || '';
        accountTypeSelect.required = true;
        accountTypeSelect.setAttribute('aria-required', 'true');
        selectedValue = accountTypeSelect.value;
    }

    if (accountTypeLabel) {
        accountTypeLabel.classList.add('required');
    }

    if (roleSelect) {
        const shouldEnableRole = selectedValue === 'platform-administrator';
        roleSelect.disabled = !shouldEnableRole;
        if (shouldEnableRole) {
            roleSelect.required = true;
            roleSelect.setAttribute('aria-required', 'true');
        } else {
            roleSelect.required = false;
            roleSelect.removeAttribute('aria-required');
        }

        if (shouldEnableRole) {
            if (state.userDraft && state.userDraft.role && state.userDraft.role !== 'Super Admin') {
                roleSelect.value = state.userDraft.role;
            } else {
                roleSelect.value = '';
            }
        } else {
            roleSelect.value = '';
        }

        if (roleLabel) {
            roleLabel.classList.toggle('required', shouldEnableRole);
        }
    }

    let summaryText = 'Select an account type to see the assigned permissions.';

    if (selectedValue === 'system-administrator') {
        summaryText = 'Super Admins receive full access to all modules within the central control panel.';
        if (state.userDraft) {
            state.userDraft.accountType = 'system-administrator';
            state.userDraft.role = 'Super Admin';
            state.userDraft.permissionSummary = 'Full access to all modules.';
        }
        renderRolePermissionsPreview(null);
    } else if (selectedValue === 'platform-administrator') {
        const roleName = roleSelect ? roleSelect.value : '';
        summaryText = roleName
            ? `Admins inherit the permissions defined for the “${roleName}” role.`
            : 'Select a registered role to apply the relevant permission set for this admin.';
        if (state.userDraft) {
            state.userDraft.accountType = 'platform-administrator';
            state.userDraft.role = roleName || '';
        }
        renderRolePermissionsPreview(roleName || null);
    } else {
        renderRolePermissionsPreview(null);
    }

    if (summary) {
        summary.textContent = summaryText;
    }
}

function renderRolePermissionsPreview(roleName) {
    const container = document.getElementById('userRolePermissionsPreview');
    const list = document.getElementById('userRolePermissionsList');

    if (!container || !list) {
        return;
    }

    list.innerHTML = '';

    if (!roleName) {
        container.classList.add('hidden');
        if (state.userDraft) {
            state.userDraft.permissionSummary = '';
        }
        return;
    }

    const role = roles.find(item => item.name === roleName || item.id === roleName);
    const permissions = role && Array.isArray(role.permissions) ? role.permissions : [];

    container.classList.remove('hidden');

    if (!permissions.length) {
        list.innerHTML = '<p class="permissions-preview-placeholder">No structured permissions are defined for this role yet.</p>';
    } else {
        const tableHtml = buildRolePermissionsTableHtml(permissions, { compact: true });
        list.innerHTML = `<div class="role-permissions-table-wrapper">${tableHtml}</div>`;
    }

    if (state.userDraft) {
        state.userDraft.permissionSummary = `Inherits permissions from “${roleName}”.`;
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

function focusUserFormStep(step) {
    const section = document.querySelector(`.user-form-step[data-step="${step}"]`);
    if (!section) return;
    const focusable = section.querySelector('input, select, textarea, button');
    if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
    }
}

function setUserFormStep(step) {
    const maxStep = 3;
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

    updateUserFormProgressState();

    const submitBtn = document.getElementById('userFormSubmitBtn');
    if (submitBtn) {
        submitBtn.classList.toggle('hidden', nextStep !== maxStep);
        submitBtn.textContent = state.editingUserId ? 'Save' : 'Add User';
    }

    const cancelStep3Btn = document.getElementById('userFormCancelStep3Btn');
    if (cancelStep3Btn) {
        const shouldShowCancel = nextStep === maxStep;
        cancelStep3Btn.classList.toggle('hidden', !shouldShowCancel);
        cancelStep3Btn.textContent = state.editingUserId ? 'Cancel' : 'Cancel';
    }

    updateAccountTypeUI();
    updateBreadcrumb();
    syncAccountEditLayout();
}

function isUserInformationComplete() {
    const verification = state.userVerification;
    const draft = state.userDraft || {};

    if (!verification || verification.status !== 'verified') {
        return false;
    }

    const verifiedEmail = verification.email || '';
    const draftEmail = normalizeEmail(draft.email);

    return Boolean(
        verifiedEmail
        && draftEmail
        && normalizeEmail(verifiedEmail) === draftEmail
        && draft.name
        && draft.phone
    );
}

function isUserFormStepUnlocked(step) {
    if (step <= 1) {
        return true;
    }

    if (step === 2) {
        return Boolean(state.userVerification && state.userVerification.status === 'verified');
    }

    if (step === 3) {
        return Boolean(state.userVerification && state.userVerification.status === 'verified' && isUserInformationComplete());
    }

    return false;
}

function updateUserFormProgressState() {
    const progress = document.getElementById('userFormProgress');
    if (!progress) return;

    progress.querySelectorAll('.step').forEach(item => {
        const stepNumber = Number(item.dataset.step || 0);
        if (!stepNumber) {
            return;
        }
        const forcedDisable = state.userFormStep === 3 && (stepNumber === 1 || stepNumber === 2);
        const unlocked = isUserFormStepUnlocked(stepNumber) && !forcedDisable;
        if (!item.hasAttribute('role')) {
            item.setAttribute('role', 'button');
        }
        item.classList.toggle('disabled', !unlocked);
        item.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
        item.tabIndex = unlocked ? 0 : -1;
    });

    const registerBtn = document.getElementById('userReviewRegisterBtn');
    if (registerBtn) {
        registerBtn.disabled = !isUserFormStepUnlocked(3);
    }
}

function collectUserFormStepData(step) {
    if (step === 1) {
        const emailInput = document.getElementById('userEmail');
        if (!emailInput) {
            return false;
        }

        const email = emailInput.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showNotification('error', 'Enter a valid email address before continuing.');
            emailInput.focus();
            return false;
        }

        const verification = state.userVerification;
        if (!verification || verification.status !== 'verified' || verification.email !== normalizeEmail(email)) {
            showNotification('warning', 'Please verify the email with the "Check" button before proceeding.');
            emailInput.focus();
            return false;
        }

        state.userDraft = {
            ...(state.userDraft || {}),
            email
        };
        return true;
    }

    if (step === 2) {
        const verification = state.userVerification;
        const confirmedEmail = document.getElementById('userEmailConfirmed');

        if (!verification || verification.status !== 'verified' || !verification.account) {
            showNotification('warning', 'Verify an active Onrev platform account before registering.');
            return false;
        }

        const account = verification.account;
        const name = (account.name || (state.userDraft ? state.userDraft.name : '') || '').trim();
        const phone = (account.phone || (state.userDraft ? state.userDraft.phone : '') || '').trim();
        const department = account.department || (state.userDraft ? state.userDraft.department : '');
        const email = account.email || (state.userDraft ? state.userDraft.email : '');

        if (!name) {
            showNotification('error', 'The Onrev profile is missing a name. Update it on the platform before registering.');
            return false;
        }

        if (!phone) {
            showNotification('error', 'The Onrev profile is missing a phone number. Update it on the platform before registering.');
            return false;
        }

        if (confirmedEmail) {
            confirmedEmail.value = email;
        }

        state.userDraft = {
            ...(state.userDraft || {}),
            name,
            phone,
            department,
            email,
            photoUrl: getUserAvatarUrl(email)
        };

        return true;
    }

    if (step === 3) {
        const accountTypeSelect = document.getElementById('userAccountType');
        const roleSelect = document.getElementById('userRole');
        const permissionsSummary = document.getElementById('userPermissionsSummary');
        const expirationInput = document.getElementById('userExpirationDate');

        if (!accountTypeSelect || !accountTypeSelect.value) {
            showNotification('error', 'Please select an account type before adding the user.');
            if (accountTypeSelect) {
                accountTypeSelect.focus();
            }
            return false;
        }

        const accountType = accountTypeSelect.value;
        let role = 'Super Admin';

        if (accountType === 'platform-administrator') {
            if (!roleSelect || !roleSelect.value) {
                showNotification('error', 'Select a registered role for admins.');
                if (roleSelect) {
                    roleSelect.focus();
                }
                return false;
            }
            role = roleSelect.value;
        }

        let expiresOn = '';
        if (expirationInput && expirationInput.value) {
            const parsed = new Date(`${expirationInput.value}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) {
                showNotification('error', 'Enter a valid expiration date or leave it blank.');
                expirationInput.focus();
                return false;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (parsed < today) {
                showNotification('error', 'The expiration date cannot be in the past.');
                expirationInput.focus();
                return false;
            }
            expiresOn = expirationInput.value;
        }

        state.userDraft = {
            ...(state.userDraft || {}),
            accountType,
            role,
            status: (state.userDraft && state.userDraft.status) || 'Active',
            permissionSummary: permissionsSummary ? permissionsSummary.textContent.trim() : '',
            expiresOn
        };
        return true;
    }

    return true;
}

function handleUserFormNext() {
    if (state.userFormStep >= 3) {
        return;
    }
    const currentStep = state.userFormStep;
    if (!collectUserFormStepData(currentStep)) {
        return;
    }
    const nextStep = currentStep + 1;
    setUserFormStep(nextStep);
    focusUserFormStep(nextStep);
}

function handleUserFormStepThreeCancel() {
    if (state.userFormStep !== 3) {
        return;
    }
    if (state.editingUserId) {
        hideUserForm();
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
    const emailConfirmedInput = document.getElementById('userEmailConfirmed');
    const roleSelect = document.getElementById('userRole');
    const submitBtn = document.getElementById('userFormSubmitBtn');
    const verifyBtn = document.getElementById('userVerifyBtn');
    const accountTypeSelect = document.getElementById('userAccountType');
    const registerBtn = document.getElementById('userReviewRegisterBtn');
    const expirationInput = document.getElementById('userExpirationDate');
    const permissionsSummary = document.getElementById('userPermissionsSummary');
    const editSummaryPanel = document.getElementById('userEditSummaryPanel');

    if (
        !formPage ||
        !listView ||
        !form ||
        !emailInput ||
        !emailConfirmedInput ||
        !roleSelect ||
        !submitBtn ||
        !titleEl ||
        !subtitleEl ||
        !verifyBtn ||
        !accountTypeSelect
    ) {
        return;
    }

    formPage.classList.toggle('editing-mode', mode === 'edit');

    roleSelect.innerHTML = '<option value="">Select a role</option>';
    const activeRoles = roles.filter(role => (role.status || 'active').toLowerCase() === 'active');
    activeRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.name;
        option.textContent = role.name;
        roleSelect.appendChild(option);
    });

    accountTypeSelect.value = '';

    if (editSummaryPanel) {
        editSummaryPanel.classList.add('hidden');
    }

    if (permissionsSummary) {
        permissionsSummary.textContent = '';
    }

    syncAccountEditLayout();

    const defaultDraft = {
        name: '',
        email: '',
        phone: '',
        department: '',
        accountType: null,
        role: '',
        status: 'Active',
        permissionSummary: '',
        photoUrl: '',
        expiresOn: ''
    };

    state.editingUserId = null;
    state.userDraft = { ...defaultDraft };

    form.reset();
    resetUserVerification(true);
    updateUserInfoSummary(null);

    emailInput.value = '';
    emailInput.readOnly = false;
    emailConfirmedInput.value = '';

    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify';

    if (registerBtn) {
        registerBtn.disabled = true;
    }

    if (expirationInput) {
        expirationInput.value = '';
    }

    roleSelect.disabled = true;

    let initialStep = 1;

    if (mode === 'edit' && typeof userId === 'number') {
        const user = users.find(u => u.id === userId);
        if (!user) {
            return;
        }

        state.editingUserId = userId;

        const fallbackPhone = user.phone || `+96650${String(user.id).padStart(6, '0')}`;
        const inferredAccountType = user.accountType
            ? user.accountType
            : (user.role === 'Super Admin' ? 'system-administrator' : 'platform-administrator');

        const draft = {
            name: user.name || '',
            email: user.email || '',
            phone: fallbackPhone,
            department: user.department || '',
            accountType: inferredAccountType,
            role: inferredAccountType === 'system-administrator' ? 'Super Admin' : (user.role || ''),
            status: user.status || 'Active',
            permissionSummary: user.permissionSummary || '',
            photoUrl: getUserAvatarUrl(user.email || `user-${userId}`),
            expiresOn: user.expiresOn || ''
        };

        state.userDraft = { ...defaultDraft, ...draft };

        emailInput.value = draft.email;
        emailInput.readOnly = true;
        emailConfirmedInput.value = draft.email;

        updateUserInfoSummary({
            email: draft.email,
            name: draft.name,
            phone: draft.phone,
            department: draft.department
        });

        if (editSummaryPanel) {
            editSummaryPanel.classList.remove('hidden');
            syncAccountEditLayout();
        }

        if (permissionsSummary) {
            permissionsSummary.textContent = draft.permissionSummary || '';
        }

        if (expirationInput && draft.expiresOn) {
            expirationInput.value = draft.expiresOn;
        }

        accountTypeSelect.value = inferredAccountType;

        if (inferredAccountType === 'platform-administrator') {
            roleSelect.disabled = false;
            const hasRoleOption = Array.from(roleSelect.options).some(option => option.value === draft.role);
            if (!hasRoleOption && draft.role && draft.role !== 'Super Admin') {
                const fallbackOption = document.createElement('option');
                fallbackOption.value = draft.role;
                fallbackOption.textContent = draft.role;
                roleSelect.appendChild(fallbackOption);
            }
            roleSelect.value = draft.role;
        } else {
            roleSelect.disabled = true;
            roleSelect.value = '';
        }

        const platformAccount = lookupPlatformAccount(draft.email) || {
            email: draft.email,
            name: draft.name,
            phone: draft.phone,
            department: draft.department,
            status: 'active'
        };

        state.userVerification = {
            status: 'verified',
            email: normalizeEmail(draft.email),
            account: platformAccount
        };

        setVerificationBanner('success', 'This account was previously verified. You can proceed with updates.');
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-circle-check"></i> Verified';

        if (registerBtn) {
            registerBtn.disabled = false;
        }

        if (submitBtn) {
            submitBtn.textContent = 'Update User';
        }

        titleEl.textContent = 'Edit User Account';
    subtitleEl.textContent = '';

        initialStep = 3;
    } else {
        if (submitBtn) {
            submitBtn.textContent = 'Add User';
        }
    titleEl.textContent = 'Add New User';
    subtitleEl.textContent = '';
    if (editSummaryPanel) {
        editSummaryPanel.classList.add('hidden');
    }
    syncAccountEditLayout();
    }

    listView.classList.add('hidden');
    formPage.classList.remove('hidden');

    state.userFormStep = initialStep;
    setUserFormStep(initialStep);
    focusUserFormStep(initialStep);
    updateAccountTypeUI();
    updateUserFormProgressState();
    updateBreadcrumb();

    if (initialStep === 1) {
        emailInput.focus();
    }
}

function hideUserForm() {
    const formPage = document.getElementById('userFormPage');
    const listView = document.getElementById('usersListView');
    const form = document.getElementById('userForm');
    const emailInput = document.getElementById('userEmail');
    const emailConfirmedInput = document.getElementById('userEmailConfirmed');
    const roleSelect = document.getElementById('userRole');
    const verifyBtn = document.getElementById('userVerifyBtn');
    const submitBtn = document.getElementById('userFormSubmitBtn');
    const registerBtn = document.getElementById('userReviewRegisterBtn');
    const accountTypeSelect = document.getElementById('userAccountType');
    const expirationInput = document.getElementById('userExpirationDate');
    const titleEl = document.getElementById('userFormTitle');
    const subtitleEl = document.getElementById('userFormSubtitle');
    const editSummaryPanel = document.getElementById('userEditSummaryPanel');

    if (form) {
        form.reset();
    }

    resetUserVerification(true);
    updateUserInfoSummary(null);
    renderRolePermissionsPreview(null);

    if (emailInput) {
        emailInput.value = '';
        emailInput.readOnly = false;
    }
    if (emailConfirmedInput) {
        emailConfirmedInput.value = '';
    }
    if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify';
    }
    if (registerBtn) {
        registerBtn.disabled = true;
    }
    if (accountTypeSelect) {
        accountTypeSelect.value = '';
    }
    if (roleSelect) {
        roleSelect.disabled = true;
        roleSelect.value = '';
    }
    if (expirationInput) {
        expirationInput.value = '';
    }
    if (submitBtn) {
        submitBtn.textContent = 'Add User';
    }
    if (titleEl) {
        titleEl.textContent = 'Add New User';
    }
    if (subtitleEl) {
        subtitleEl.textContent = '';
    }
    if (editSummaryPanel) {
        editSummaryPanel.classList.add('hidden');
    }

    syncAccountEditLayout();

    state.userDraft = null;
    state.userVerification = null;
    state.editingUserId = null;
    state.userFormStep = 1;

    updateAccountTypeUI();
    updateUserFormProgressState();
    updateBreadcrumb();

    if (formPage) {
        formPage.classList.remove('editing-mode');
        formPage.classList.add('hidden');
    }
    if (listView) {
        listView.classList.remove('hidden');
    }
}

function handleUserFormSubmit(event) {
    event.preventDefault();

    if (!collectUserFormStepData(3)) {
        setUserFormStep(3);
        return;
    }

    const draft = state.userDraft;
    if (!draft || !draft.name || !draft.email || !draft.role || !draft.accountType) {
        showNotification('error', 'Please complete all registration steps before submitting the user.');
        return;
    }

    const isEditing = Boolean(state.editingUserId);

    if (!isEditing) {
        const existingUser = findExistingUserByEmail(draft.email);
        if (existingUser) {
            showNotification('warning', 'This email already has an account in Users Management. Use the edit action instead.');
            return;
        }
    }

    if (isEditing) {
        const user = users.find(u => u.id === state.editingUserId);
        if (user) {
            user.name = draft.name;
            user.email = draft.email;
            user.phone = draft.phone;
            user.department = draft.department;
            user.role = draft.role;
            user.accountType = draft.accountType;
            user.status = draft.status || user.status || 'Active';
            user.permissionSummary = draft.permissionSummary || '';
            user.expiresOn = draft.expiresOn || '';
            showNotification('success', 'User account updated successfully.');
        }
    } else {
        const currentMaxId = users.reduce((max, user) => Math.max(max, user.id), 0);
        const newId = currentMaxId + 1;
        const newUser = {
            id: newId,
            name: draft.name,
            email: draft.email,
            phone: draft.phone,
            department: draft.department,
            role: draft.role,
            accountType: draft.accountType,
            status: draft.status || 'Active',
            lastLogin: 'Never',
            created: new Date().toLocaleDateString(),
            permissionSummary: draft.permissionSummary || '',
            expiresOn: draft.expiresOn || ''
        };
        users.unshift(newUser);
    showNotification('success', 'User Account Created Successfully', 6000);
    }

    saveUsersToStorage();

    updateUsersManagementCount();
    renderStats();

    if (isEditing) {
        renderUsersTable(state.userSearchTerm, state.currentUserPage);
    } else {
        renderUsersTable('', 1);
    }

    hideUserForm();
}

async function toggleRoleStatus(roleId) {
    const role = roles.find(item => item.id === roleId);
    if (!role) return;

    if (role.status === 'active') {
        const confirmed = await showRoleConfirm(
            'Are You Sure You Want to Disable the User Role?',
            'Disable',
            'Cancel'
        );
        if (!confirmed) return;
        role.status = 'inactive';
        role.lastUpdated = `Deactivated ${new Date().toLocaleDateString()}`;
        saveRolesToStorage();
        renderRolesTable(state.currentRolePage);
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
        saveRolesToStorage();
        renderRolesTable(state.currentRolePage);
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

    if (!nameArabic || !nameEnglish) {
        showNotification('warning', 'Arabic name and English name are required.');
        return;
    }

    if (!permissions.length) {
        showNotification('warning', 'Select at least one app permission for this role.');
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
        users: '—',
        permissions,
        status: 'active',
        lastUpdated: `Created ${new Date().toLocaleDateString()}`
    };

    roles.unshift(newRole);
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
        ? users.filter(user => `${user.name} ${user.email} ${user.role} ${user.status} ${user.phone || ''} ${user.department || ''}`.toLowerCase().includes(normalizedTerm))
        : users;

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.usersPerPage));
    state.currentUserPage = Math.min(Math.max(targetPage, 1), totalPages);
    const startIndex = (state.currentUserPage - 1) * state.usersPerPage;
    const visibleUsers = filtered.slice(startIndex, startIndex + state.usersPerPage);

    if (!visibleUsers.length) {
        tbody.innerHTML = '<tr><td colspan="8">There is no Data Available</td></tr>';
    } else {
        let index = startIndex + 1;
        tbody.innerHTML = visibleUsers.map(user => {
        const rawStatus = (user.status || 'Active').toLowerCase();
        const isActive = rawStatus === 'active';
        const displayStatus = isActive ? 'Active' : 'Inactive';
        const accountType = resolveUserAccountType(user);
        const accountTypeLabel = mapAccountTypeLabel(accountType);
        const accountTypeClass = mapAccountTypeClass(accountType);
        const expirationLabel = user.expiresOn ? formatDateForDisplay(user.expiresOn) : '—';
        return `
        <tr>
            <td>${index++}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="https://picsum.photos/seed/${user.id}/40/40" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div class="user-name-row">
                            <span class="user-name">${user.name}</span>
                            <span class="account-type-tag ${accountTypeClass}">${accountTypeLabel}</span>
                        </div>
                        <div class="user-meta">${user.email}</div>
                        ${user.department ? `<div class="user-meta">${user.department}</div>` : ''}
                        <div class="user-meta">${user.phone || '+96650' + user.id.toString().padStart(6, '0')}</div>
                    </div>
                </div>
            </td>
            <td>${user.role}</td>
            <td><span class="status-badge status-${isActive ? 'active' : 'inactive'}">${displayStatus}</span></td>
            <td>${user.lastLogin}</td>
            <td>${user.created}</td>
            <td>${expirationLabel}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn edit" onclick="showUserForm('edit', ${user.id})"><i class="fas fa-pen"></i></button>
                    <button class="action-btn ${isActive ? 'deactivate' : 'activate'}" onclick="(async () => await handleUserToggle(${user.id}))()">
                        <i class="fas ${isActive ? 'fa-power-off' : 'fa-rotate-right'}"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
    }
    renderUsersPagination(totalPages, filtered.length);
}

function exportUsers() {
    const rows = [
        ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Account Expiration'],
        ...users.map(user => [
            user.name,
            user.email,
            user.role,
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

