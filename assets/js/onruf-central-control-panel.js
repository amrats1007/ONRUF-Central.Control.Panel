const state = {
    currentSection: 'dashboard',
    currentRolePage: 1,
    rolesPerPage: 10,
    currentUserPage: 1,
    usersPerPage: 10,
    currentPeriod: 'monthly',
    roleSearchTerm: '',
    roleBuilderMode: 'create',
    editingRoleId: null,
    editingUserId: null,
    userFormStep: 1,
    userDraft: null,
    activeRoleDetailId: null,
    permissionCatalog: [],
    userVerification: null
};

function buildPermissionCatalog() {
    const catalog = [];
    const sectionMenus = document.querySelectorAll('.menu-item[data-section]');

    sectionMenus.forEach(menuItem => {
        const sectionId = menuItem.dataset.section;
        if (!sectionId || sectionId === 'users') {
            return;
        }

        const sectionEl = document.getElementById(sectionId);
        if (!sectionEl) {
            return;
        }

        const apps = Array.from(sectionEl.querySelectorAll('.sub-apps-nav .sub-app-btn'))
            .map(button => {
                const appId = button.dataset.target;
                if (!appId) return null;

                const labelSpans = button.querySelectorAll('span');
                let appLabel = '';
                if (labelSpans.length > 1) {
                    appLabel = labelSpans[labelSpans.length - 1].textContent.trim();
                } else if (button.dataset.label) {
                    appLabel = button.dataset.label.trim();
                } else {
                    appLabel = button.textContent.trim();
                }

                return {
                    id: appId,
                    label: appLabel || appId
                };
            })
            .filter(Boolean);

        if (!apps.length) {
            return;
        }

        const sectionLabel = menuItem.querySelector('.menu-text')
            ? menuItem.querySelector('.menu-text').textContent.trim()
            : menuItem.textContent.trim();

        catalog.push({
            id: sectionId,
            label: sectionLabel || sectionId,
            apps
        });
    });

    return catalog;
}

const permissionActions = [
    { id: 'read', label: 'Read' },
    { id: 'enter', label: 'Enter' },
    { id: 'edit', label: 'Edit' },
    { id: 'delete', label: 'Delete' }
];

const initialPermissionCatalog = buildPermissionCatalog();
state.permissionCatalog = initialPermissionCatalog.slice();

function createPermissionEntries(entries, defaultAction = 'read') {
    return entries
        .map(({ sectionId, appId, action }) => {
            const section = initialPermissionCatalog.find(item => item.id === sectionId);
            if (!section) return null;
            const app = section.apps.find(item => item.id === appId);
            if (!app) return null;
            const requestedAction = action || defaultAction;
            const validAction = permissionActions.some(item => item.id === requestedAction)
                ? requestedAction
                : defaultAction;
            return {
                sectionId: section.id,
                sectionLabel: section.label,
                appId: app.id,
                appLabel: app.label,
                actions: [validAction]
            };
        })
        .filter(Boolean);
}

const platformAdminPermissions = initialPermissionCatalog.flatMap(section =>
    section.apps.map(app => ({
        sectionId: section.id,
        sectionLabel: section.label,
        appId: app.id,
        appLabel: app.label,
        actions: ['edit']
    }))
);

const businessOwnerPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app1', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app1', action: 'edit' },
    { sectionId: 'packages', appId: 'packages-app2', action: 'edit' },
    { sectionId: 'products', appId: 'products-app1', action: 'read' },
    { sectionId: 'products', appId: 'products-app2', action: 'read' }
], 'read');

const businessManagerPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'users', appId: 'users-app2', action: 'edit' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app2', action: 'edit' },
    { sectionId: 'packages', appId: 'packages-app3', action: 'edit' },
    { sectionId: 'products', appId: 'products-app2', action: 'edit' },
    { sectionId: 'products', appId: 'products-app3', action: 'edit' }
], 'enter');

const inspectorPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'read' },
    { sectionId: 'products', appId: 'products-app1', action: 'enter' },
    { sectionId: 'products', appId: 'products-app3', action: 'read' }
], 'enter');

const viewerPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'read' },
    { sectionId: 'reports', appId: 'reports-app1', action: 'read' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'read' },
    { sectionId: 'packages', appId: 'packages-app1', action: 'read' }
], 'read');

const marketingTeamPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'enter' },
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'read' },
    { sectionId: 'reports', appId: 'reports-app1', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'read' },
    { sectionId: 'packages', appId: 'packages-app1', action: 'edit' }
], 'read');

const salesTeamPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app2', action: 'edit' },
    { sectionId: 'packages', appId: 'packages-app3', action: 'edit' },
    { sectionId: 'products', appId: 'products-app2', action: 'enter' },
    { sectionId: 'products', appId: 'products-app3', action: 'edit' }
], 'enter');

const complianceOfficerPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'read' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app3', action: 'read' }
], 'read');

const customerSuccessPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'read' },
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app1', action: 'read' },
    { sectionId: 'products', appId: 'products-app1', action: 'enter' },
    { sectionId: 'products', appId: 'products-app2', action: 'read' }
], 'read');

const itSupportPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'read' },
    { sectionId: 'packages', appId: 'packages-app1', action: 'read' },
    { sectionId: 'products', appId: 'products-app1', action: 'read' }
], 'enter');

const riskAnalystPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'read' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app3', action: 'read' }
], 'read');

const financeControllerPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app1', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app3', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app1', action: 'edit' },
    { sectionId: 'packages', appId: 'packages-app2', action: 'edit' }
], 'enter');

const vendorManagerPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app2', action: 'edit' },
    { sectionId: 'products', appId: 'products-app1', action: 'enter' },
    { sectionId: 'products', appId: 'products-app2', action: 'edit' }
], 'enter');

const trainingCoordinatorPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app1', action: 'read' },
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app1', action: 'read' },
    { sectionId: 'products', appId: 'products-app3', action: 'read' }
], 'read');

const logisticsSupervisorPermissions = createPermissionEntries([
    { sectionId: 'dashboard', appId: 'dashboard-app2', action: 'enter' },
    { sectionId: 'reports', appId: 'reports-app2', action: 'enter' },
    { sectionId: 'packages', appId: 'packages-app3', action: 'edit' },
    { sectionId: 'products', appId: 'products-app1', action: 'enter' }
], 'enter');

const defaultRoles = [
    {
        id: 'platform-admin',
        name: 'Platform Admin',
        nameArabic: 'مسؤول المنصة',
        description: 'Configures system defaults, integrations, and tenant preferences.',
        users: 6,
        permissions: platformAdminPermissions,
        status: 'active',
        lastUpdated: 'Updated yesterday'
    },
    {
        id: 'business-owner',
        name: 'Business Owner',
        nameArabic: 'مالك النشاط التجاري',
        description: 'Controls business account data, payments, and team licensing.',
        users: 58,
        permissions: businessOwnerPermissions,
        status: 'active',
        lastUpdated: 'Updated 4 days ago'
    },
    {
        id: 'business-manager',
        name: 'Business Manager',
        nameArabic: 'مدير النشاط التجاري',
        description: 'Handles day-to-day operations, inspections, and evidence uploads.',
        users: 132,
        permissions: businessManagerPermissions,
        status: 'active',
        lastUpdated: 'Updated 1 week ago'
    },
    {
        id: 'inspector',
        name: 'Inspector',
        nameArabic: 'مفتش',
        description: 'Executes inspection tasks and submits compliance reports.',
        users: 214,
        permissions: inspectorPermissions,
        status: 'active',
        lastUpdated: 'Updated 2 weeks ago'
    },
    {
        id: 'viewer',
        name: 'Read-Only Viewer',
        nameArabic: 'مطلع فقط',
        description: 'Reviews reports, dashboards, and invoices without edit rights.',
        users: 39,
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

function saveRolesToStorage() {
    try {
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch (error) {
        console.warn('Unable to save roles to storage:', error);
    }
}

function normalizeUserPayload(user) {
    if (!user || typeof user !== 'object') {
        return null;
    }

    const parsedId = Number.parseInt(user.id, 10);
    if (!Number.isFinite(parsedId)) {
        return null;
    }

    const normalizedStatus = (user.status || 'Active').toString().trim().toLowerCase();
    const status = normalizedStatus === 'inactive' ? 'Inactive' : 'Active';

    let accountType = null;
    if (typeof user.accountType === 'string' && user.accountType.trim()) {
        const lowered = user.accountType.trim().toLowerCase();
        if (lowered === 'system-administrator') {
            accountType = 'system-administrator';
        } else if (lowered === 'platform-administrator') {
            accountType = 'platform-administrator';
        } else {
            accountType = user.accountType.trim();
        }
    }

    return {
        id: parsedId,
        name: (user.name || '').toString().trim(),
        email: (user.email || '').toString().trim(),
        role: (user.role || '').toString().trim(),
        accountType,
        status,
        lastLogin: user.lastLogin || '',
        created: user.created || '',
        phone: user.phone || '',
        department: user.department || ''
    };
}

function loadUsersFromStorage() {
    try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return null;
        const normalized = parsed
            .map(normalizeUserPayload)
            .filter(Boolean);
        return normalized.length ? normalized : null;
    } catch (error) {
        console.warn('Unable to load users from storage:', error);
        return null;
    }
}

function saveUsersToStorage() {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
        console.warn('Unable to save users to storage:', error);
    }
}

function updateUserRolesCount() {
    const countEl = document.getElementById('userRolesCount');
    if (countEl) {
        const count = roles.length;
        const text = count === 1 ? `#${count} Role` : `#${count} Roles`;
        countEl.textContent = text;
    }
}

function updateUsersManagementCount() {
    const countEl = document.getElementById('usersManagementCount');
    if (countEl) {
        const count = users.length;
        const text = count === 1 ? `#${count} User` : `#${count} Users`;
        countEl.textContent = text;
    }
}

function initializeRoles() {
    const normalizedDefaults = defaultRoles.map(role => normalizeRolePayload(role)).filter(Boolean);
    const storedRoles = loadRolesFromStorage();

    if (storedRoles && storedRoles.length) {
        const mergedRoles = [...storedRoles];
        const existingIds = new Set(storedRoles.map(role => role.id));

        normalizedDefaults.forEach(defaultRole => {
            if (!existingIds.has(defaultRole.id)) {
                mergedRoles.push(defaultRole);
            }
        });

        roles = mergedRoles;
        saveRolesToStorage();
        return;
    }

    roles = normalizedDefaults;
    saveRolesToStorage();
}

function initializeUsers() {
    const normalizedDefaults = defaultUsers.map(user => normalizeUserPayload(user)).filter(Boolean);
    const storedUsers = loadUsersFromStorage();

    if (storedUsers && storedUsers.length) {
        const mergedUsers = [...storedUsers];
        const existingIds = new Set(storedUsers.map(user => user.id));

        normalizedDefaults.forEach(defaultUser => {
            if (!existingIds.has(defaultUser.id)) {
                mergedUsers.push(defaultUser);
            }
        });

        users = mergedUsers;
        saveUsersToStorage();
        return;
    }

    users = normalizedDefaults;
    saveUsersToStorage();
}

initializeRoles();
initializeUsers();
updateUserRolesCount();
updateUsersManagementCount();

document.addEventListener('DOMContentLoaded', initializeApp);

function renderPermissionMatrix() {
    const container = document.getElementById('permissionMatrix');
    if (!container) return;

    const catalog = buildPermissionCatalog();
    state.permissionCatalog = catalog;

    if (!catalog.length) {
        container.innerHTML = '<div class="permission-empty">No panel sections available.</div>';
        return;
    }

    const matrix = document.createElement('div');
    matrix.className = 'permission-matrix';

    catalog.forEach(section => {
        const sectionCard = document.createElement('div');
        sectionCard.className = 'permission-section';
        sectionCard.dataset.section = section.id;

        const header = document.createElement('div');
        header.className = 'permission-section-header';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'permission-section-toggle';

        const sectionCheckbox = document.createElement('input');
        sectionCheckbox.type = 'checkbox';
        sectionCheckbox.className = 'permission-section-checkbox';
        sectionCheckbox.dataset.section = section.id;

        const toggleText = document.createElement('span');
        toggleText.textContent = section.label;

        toggleLabel.appendChild(sectionCheckbox);
        toggleLabel.appendChild(toggleText);

        const sectionMeta = document.createElement('span');
        sectionMeta.className = 'permission-section-meta';
        const appCount = section.apps.length;
        sectionMeta.textContent = `${appCount} ${appCount === 1 ? 'app' : 'apps'}`;

        header.appendChild(toggleLabel);
        header.appendChild(sectionMeta);
        sectionCard.appendChild(header);

        const appsContainer = document.createElement('div');
        appsContainer.className = 'permission-apps';

        section.apps.forEach(app => {
            const row = document.createElement('div');
            row.className = 'permission-app-row';
            row.dataset.app = app.id;
            row.dataset.section = section.id;

            const info = document.createElement('div');
            info.className = 'permission-app-info';

            const toggleId = `perm-${section.id}-${app.id}`;
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.id = toggleId;
            toggle.className = 'permission-app-checkbox';
            toggle.dataset.app = app.id;
            toggle.dataset.section = section.id;

                    const label = document.createElement('label');
                    label.setAttribute('for', toggleId);
                    label.title = app.id;

                    const labelText = document.createElement('span');
                    labelText.className = 'permission-app-name';
                    labelText.textContent = app.label;

                    label.appendChild(labelText);

            info.appendChild(toggle);
            info.appendChild(label);
            row.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'permission-actions';

            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'permission-action-select';

            const actionSelect = document.createElement('select');
            actionSelect.className = 'permission-action-ddl';
            actionSelect.dataset.app = app.id;
            actionSelect.dataset.section = section.id;
            actionSelect.disabled = true;

            permissionActions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.id;
                option.textContent = action.label;
                actionSelect.appendChild(option);
            });

            actionSelect.value = permissionActions[0]?.id || '';
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
            const displayName = role.name || role.nameEnglish || 'this role';
            subtitleEl.textContent = `Modify permissions and details for ${displayName}.`;
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
            subtitleEl.textContent = 'Define permissions and assign default usage limits.';
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
        roleSearchInput.value = state.roleSearchTerm;
    }

    setupRoleConfirmOverlay();
    setupUserConfirmOverlay();
    setupRoleAlertOverlay();
    setupUserAlertOverlay();
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
    const userFormCancelBtn = document.getElementById('userFormCancelBtn');
    const userFormBackStepBtn = document.getElementById('userFormBackStepBtn');
    const userForm = document.getElementById('userForm');
    const userVerifyBtn = document.getElementById('userVerifyBtn');
    const userEmailInput = document.getElementById('userEmail');
    const userRoleSelect = document.getElementById('userRole');
    const accountTypeRadios = document.querySelectorAll('input[name="userAccountType"]');
    const userFormProgress = document.getElementById('userFormProgress');
    const userNameInput = document.getElementById('userName');
    const userPhoneInput = document.getElementById('userPhone');
    const userDepartmentInput = document.getElementById('userDepartment');

    if (userFormCancelBtn) {
        userFormCancelBtn.addEventListener('click', hideUserForm);
    }
    if (userFormBackStepBtn) {
        userFormBackStepBtn.addEventListener('click', handleUserFormBackStep);
    }
    if (userVerifyBtn) {
        userVerifyBtn.addEventListener('click', handleUserEmailVerification);
    }
    if (userEmailInput) {
        userEmailInput.addEventListener('input', handleUserEmailInputChange);
    }
    accountTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleAccountTypeChange);
    });
    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', handleRoleSelectionChange);
    }
    if (userNameInput) {
        userNameInput.addEventListener('input', handleUserInfoInputChange);
    }
    if (userPhoneInput) {
        userPhoneInput.addEventListener('input', handleUserInfoInputChange);
    }
    if (userDepartmentInput) {
        userDepartmentInput.addEventListener('input', handleUserInfoInputChange);
    }
    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
        userForm.addEventListener('keydown', event => {
            if (event.key === 'Enter' && state.userFormStep !== 3 && !event.shiftKey) {
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
        users: 'Users & Roles',
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
            const appName = activeAppButton.querySelector('span:last-child');
            appLabel = appName ? appName.textContent.trim() : (activeAppButton.dataset.label || 'App 1');
        }
    }

    if (sectionId === 'users') {
        const builder = document.getElementById('roleBuilderView');
        if (builder && !builder.classList.contains('hidden')) {
            appLabel = state.roleBuilderMode === 'edit' ? 'Edit User Role' : 'Create Role';
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
            ? '<tr><td colspan="7">No roles match the current search.</td></tr>'
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
            renderUsersTable('', page);
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
    state.roleSearchTerm = input.value.trim();
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

    const existingUser = users.find(user => normalizeEmail(user.email) === normalized);
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

function resetUserVerification(clearDraft = true) {
    state.userVerification = null;
    setVerificationBanner(null, '');

    const confirmedInput = document.getElementById('userEmailConfirmed');
    if (confirmedInput) {
        confirmedInput.value = '';
    }

    if (clearDraft) {
        const nameInput = document.getElementById('userName');
        const phoneInput = document.getElementById('userPhone');
        const departmentInput = document.getElementById('userDepartment');

        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (departmentInput) departmentInput.value = '';

        if (state.userDraft) {
            state.userDraft.name = '';
            state.userDraft.phone = '';
            state.userDraft.department = '';
        }
    }

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

    const nameInput = document.getElementById('userName');
    if (nameInput) {
        nameInput.value = account.name || nameInput.value || '';
    }

    const phoneInput = document.getElementById('userPhone');
    if (phoneInput) {
        phoneInput.value = account.phone || phoneInput.value || '';
    }

    const departmentInput = document.getElementById('userDepartment');
    if (departmentInput) {
        departmentInput.value = account.department || departmentInput.value || '';
    }

    state.userDraft = {
        ...(state.userDraft || {}),
        email: account.email,
        name: account.name || (state.userDraft ? state.userDraft.name : ''),
        phone: account.phone || (state.userDraft ? state.userDraft.phone : ''),
        department: account.department || (state.userDraft ? state.userDraft.department : ''),
        status: (state.userDraft && state.userDraft.status) || 'Active'
    };

    setVerificationBanner('success', 'INF010: OnRuf platform account verified. Details imported successfully.');
    showNotification('info', 'INF010: Platform account verified and synced.', 5000);

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
        showNotification('error', 'Please enter a valid OnRuf platform email before checking.', 5000);
        await showUserAlert('Please enter a valid OnRuf platform email before checking.');
        emailInput.focus();
        return;
    }

    const cachedVerification = state.userVerification;
    if (cachedVerification && cachedVerification.status === 'verified' && cachedVerification.email === normalizeEmail(email)) {
        setVerificationBanner('success', 'The platform account is already verified for this email address.');
        updateUserFormProgressState();
        return;
    }

    resetUserVerification(false);
    state.userVerification = { status: 'checking', email: normalizeEmail(email) };

    const originalLabel = verifyBtn.innerHTML;
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking...';

    await new Promise(resolve => setTimeout(resolve, 450));

    const account = lookupPlatformAccount(email);

    if (!account) {
        state.userVerification = { status: 'not-found', email: normalizeEmail(email) };
        setVerificationBanner('error', 'No active OnRuf platform account was found for this email.');
        await showUserAlert('No active OnRuf platform account was found for this email.');
        updateUserFormProgressState();
    } else if (account.status !== 'active') {
        state.userVerification = { status: account.status, email: normalizeEmail(email), account };
        const statusLabel = account.status === 'pending' ? 'pending activation' : 'inactive';
        setVerificationBanner('error', `The linked OnRuf platform account is ${statusLabel}. Complete activation on the OnRuf platform before proceeding.`);
        showNotification('error', `The OnRuf platform account for ${account.email} is ${statusLabel}. Activate it before adding the user to the control panel.`, 6500);
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

function handleAccountTypeChange(event) {
    const value = event.target ? event.target.value : null;
    if (!value) return;

    state.userDraft = {
        ...(state.userDraft || {}),
        accountType: value
    };

    if (value === 'system-administrator') {
        state.userDraft.role = 'System Administrator';
    }

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

function updateAccountTypeUI() {
    const selector = document.getElementById('userAccountTypeSelector');
    const roleSelect = document.getElementById('userRole');
    const summary = document.getElementById('userPermissionsSummary');

    let selectedValue = state.userDraft && state.userDraft.accountType ? state.userDraft.accountType : null;

    if (selector) {
        const radios = selector.querySelectorAll('input[name="userAccountType"]');
        radios.forEach(radio => {
            if (radio.checked) {
                selectedValue = radio.value;
            }
            const card = radio.closest('.account-type-card');
            if (card) {
                card.classList.toggle('active', radio.checked);
            }
        });
    }

    if (roleSelect) {
        if (selectedValue === 'platform-administrator') {
            roleSelect.disabled = false;
            if (state.userDraft && state.userDraft.role) {
                roleSelect.value = state.userDraft.role;
            }
        } else {
            roleSelect.disabled = true;
            roleSelect.value = '';
        }
    }

    let summaryText = 'Select an account type to see the assigned permissions.';

    if (selectedValue === 'system-administrator') {
        summaryText = 'System Administrators receive full access to all modules within the central control panel.';
        if (state.userDraft) {
            state.userDraft.accountType = 'system-administrator';
            state.userDraft.role = 'System Administrator';
        }
    } else if (selectedValue === 'platform-administrator') {
        const roleName = roleSelect ? roleSelect.value : '';
        summaryText = roleName
            ? `Platform Administrators inherit the permissions defined for the “${roleName}” role.`
            : 'Select a registered role to apply the relevant permission set for this platform administrator.';
        if (state.userDraft) {
            state.userDraft.accountType = 'platform-administrator';
            state.userDraft.role = roleName || '';
        }
    }

    if (summary) {
        summary.textContent = summaryText;
    }
}

function mapPermissionActionLabel(actionId) {
    if (!actionId) return 'Read';
    const action = permissionActions.find(item => item.id === actionId);
    return action ? action.label : actionId;
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

    subtitleEl.textContent = 'Review permission coverage for this role.';

    const permissions = Array.isArray(role.permissions) ? role.permissions : [];

    let permissionRows = '';
    if (permissions.length) {
        const sectionOrder = new Map();
        let sectionCounter = 0;
        let lastSectionKey = null;
        permissionRows = permissions
            .map(permission => {
                if (!permission) return '';
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
            })
            .filter(Boolean)
            .join('');
    }

    if (!permissionRows.trim()) {
        permissionRows = `
            <tr>
                <td colspan="3" class="role-detail-empty">No permissions assigned yet.</td>
            </tr>
        `;
    }

    contentEl.innerHTML = `
        <div>
            <table class="role-detail-permissions">
                <thead>
                    <tr>
                        <th>Section</th>
                        <th>Application</th>
                        <th>Permission</th>
                    </tr>
                </thead>
                <tbody>
                    ${permissionRows}
                </tbody>
            </table>
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

    const backBtn = document.getElementById('userFormBackStepBtn');
    if (backBtn) {
        backBtn.classList.toggle('hidden', nextStep === 1);
    }

    const submitBtn = document.getElementById('userFormSubmitBtn');
    if (submitBtn) {
        submitBtn.classList.toggle('hidden', nextStep !== maxStep);
        submitBtn.textContent = state.editingUserId ? 'Save Changes' : 'Add User';
    }

    updateAccountTypeUI();
    updateBreadcrumb();
}

function isUserInformationComplete() {
    const confirmedInput = document.getElementById('userEmailConfirmed');
    const nameInput = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    if (!confirmedInput || !nameInput || !phoneInput) {
        return false;
    }

    return Boolean(
        confirmedInput.value.trim()
        && nameInput.value.trim()
        && phoneInput.value.trim()
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
        const unlocked = isUserFormStepUnlocked(stepNumber);
        if (!item.hasAttribute('role')) {
            item.setAttribute('role', 'button');
        }
        item.classList.toggle('disabled', !unlocked);
        item.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
        item.tabIndex = unlocked ? 0 : -1;
    });
}

function handleUserInfoInputChange() {
    const nameInput = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    const departmentInput = document.getElementById('userDepartment');

    state.userDraft = {
        ...(state.userDraft || {}),
        name: nameInput ? nameInput.value.trim() : (state.userDraft ? state.userDraft.name : ''),
        phone: phoneInput ? phoneInput.value.trim() : (state.userDraft ? state.userDraft.phone : ''),
        department: departmentInput ? departmentInput.value.trim() : (state.userDraft ? state.userDraft.department : '')
    };

    updateUserFormProgressState();
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
        const nameInput = document.getElementById('userName');
        const phoneInput = document.getElementById('userPhone');
        const departmentInput = document.getElementById('userDepartment');
        const confirmedEmail = document.getElementById('userEmailConfirmed');

        if (!nameInput || !phoneInput || !departmentInput || !confirmedEmail) {
            return false;
        }

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const department = departmentInput.value.trim();

        if (!name) {
            showNotification('error', 'Please confirm the user\'s full name before registering.');
            nameInput.focus();
            return false;
        }

        if (!phone) {
            showNotification('error', 'Please confirm or enter the mobile number before registering.');
            phoneInput.focus();
            return false;
        }

        state.userDraft = {
            ...(state.userDraft || {}),
            name,
            phone,
            department,
            email: confirmedEmail.value.trim() || (state.userDraft ? state.userDraft.email : '')
        };
        return true;
    }

    if (step === 3) {
        const accountTypeRadio = document.querySelector('input[name="userAccountType"]:checked');
        const roleSelect = document.getElementById('userRole');
        const permissionsSummary = document.getElementById('userPermissionsSummary');

        if (!accountTypeRadio) {
            showNotification('error', 'Please select an account type before adding the user.');
            return false;
        }

        const accountType = accountTypeRadio.value;
        let role = 'System Administrator';

        if (accountType === 'platform-administrator') {
            if (!roleSelect || !roleSelect.value) {
                showNotification('error', 'Select a registered role for platform administrators.');
                if (roleSelect) {
                    roleSelect.focus();
                }
                return false;
            }
            role = roleSelect.value;
        }

        state.userDraft = {
            ...(state.userDraft || {}),
            accountType,
            role,
            status: (state.userDraft && state.userDraft.status) || 'Active',
            permissionSummary: permissionsSummary ? permissionsSummary.textContent.trim() : ''
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

function handleUserFormBackStep() {
    if (state.userFormStep <= 1) {
        return;
    }
    const previousStep = state.userFormStep - 1;
    setUserFormStep(previousStep);
    focusUserFormStep(previousStep);
}

function showUserForm(mode, userId = null) {
    const formPage = document.getElementById('userFormPage');
    const listView = document.getElementById('usersListView');
    const titleEl = document.getElementById('userFormTitle');
    const subtitleEl = document.getElementById('userFormSubtitle');
    const form = document.getElementById('userForm');
    const emailInput = document.getElementById('userEmail');
    const emailConfirmedInput = document.getElementById('userEmailConfirmed');
    const nameInput = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    const departmentInput = document.getElementById('userDepartment');
    const roleSelect = document.getElementById('userRole');
    const submitBtn = document.getElementById('userFormSubmitBtn');
    const verifyBtn = document.getElementById('userVerifyBtn');
    const accountTypeSelector = document.getElementById('userAccountTypeSelector');

    if (
        !formPage ||
        !listView ||
        !form ||
        !emailInput ||
        !emailConfirmedInput ||
        !nameInput ||
        !phoneInput ||
        !departmentInput ||
        !roleSelect ||
        !submitBtn ||
        !titleEl ||
        !subtitleEl ||
        !verifyBtn ||
        !accountTypeSelector
    ) {
        return;
    }

    roleSelect.innerHTML = '<option value="">Select a role</option>';
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.name;
        option.textContent = role.name;
        roleSelect.appendChild(option);
    });

    const accountTypeRadios = accountTypeSelector.querySelectorAll('input[name="userAccountType"]');
    accountTypeRadios.forEach(radio => {
        radio.checked = false;
    });

    const defaultDraft = {
        name: '',
        email: '',
        phone: '',
        department: '',
        accountType: null,
        role: '',
        status: 'Active',
        permissionSummary: ''
    };

    state.editingUserId = null;
    state.userDraft = { ...defaultDraft };

    form.reset();
    resetUserVerification(true);
    emailInput.readOnly = false;
    emailConfirmedInput.value = '';
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check';

    if (mode === 'edit' && userId) {
        const user = users.find(u => u.id === userId);
        if (!user) {
            return;
        }

        state.editingUserId = userId;

        const fallbackPhone = user.phone || `+96650${user.id.toString().padStart(6, '0')}`;
        const inferredAccountType = user.accountType
            ? user.accountType
            : (user.role === 'System Administrator' ? 'system-administrator' : 'platform-administrator');

        const draft = {
            name: user.name || '',
            email: user.email || '',
            phone: fallbackPhone,
            department: user.department || '',
            accountType: inferredAccountType,
            role: inferredAccountType === 'system-administrator' ? 'System Administrator' : (user.role || ''),
            status: user.status || 'Active'
        };

        state.userDraft = { ...defaultDraft, ...draft };

        emailInput.value = draft.email;
        emailInput.readOnly = true;
        emailConfirmedInput.value = draft.email;
        nameInput.value = draft.name;
        phoneInput.value = draft.phone;
        departmentInput.value = draft.department;

        const hasRoleOption = Array.from(roleSelect.options).some(option => option.value === draft.role);
        if (!hasRoleOption && draft.role && draft.role !== 'System Administrator') {
            const fallbackOption = document.createElement('option');
            fallbackOption.value = draft.role;
            fallbackOption.textContent = draft.role;
            roleSelect.appendChild(fallbackOption);
        }
        roleSelect.value = inferredAccountType === 'platform-administrator' ? draft.role : '';

        accountTypeRadios.forEach(radio => {
            radio.checked = radio.value === inferredAccountType;
        });

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

        titleEl.textContent = 'Edit User Account';
        subtitleEl.textContent = 'Update user details and account settings.';
    } else {
        titleEl.textContent = 'Add New User';
        subtitleEl.textContent = 'Verify the OnRuf platform email to begin registration.';
    }

    listView.classList.add('hidden');
    formPage.classList.remove('hidden');

    state.userFormStep = 1;
    setUserFormStep(1);
    focusUserFormStep(1);
    updateAccountTypeUI();
}

function hideUserForm() {
    const formPage = document.getElementById('userFormPage');
    const listView = document.getElementById('usersListView');
    const form = document.getElementById('userForm');
    const titleEl = document.getElementById('userFormTitle');
    const subtitleEl = document.getElementById('userFormSubtitle');
    const submitBtn = document.getElementById('userFormSubmitBtn');
    const verifyBtn = document.getElementById('userVerifyBtn');
    const emailInput = document.getElementById('userEmail');
    const emailConfirmedInput = document.getElementById('userEmailConfirmed');
    const accountTypeSelector = document.getElementById('userAccountTypeSelector');
    const roleSelect = document.getElementById('userRole');

    if (form) {
        form.reset();
    }

    resetUserVerification(true);
    setVerificationBanner(null, '');

    if (emailInput) {
        emailInput.value = '';
        emailInput.readOnly = false;
    }

    if (emailConfirmedInput) {
        emailConfirmedInput.value = '';
    }

    if (accountTypeSelector) {
        const radios = accountTypeSelector.querySelectorAll('input[name="userAccountType"]');
        radios.forEach(radio => {
            radio.checked = false;
        });
    }

    if (roleSelect) {
        roleSelect.disabled = true;
        roleSelect.value = '';
    }

    if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check';
    }

    if (formPage) {
        formPage.classList.add('hidden');
    }
    if (listView) {
        listView.classList.remove('hidden');
    }
    if (titleEl) {
        titleEl.textContent = 'Add New User';
    }
    if (subtitleEl) {
        subtitleEl.textContent = 'Verify the OnRuf platform email to begin registration.';
    }
    if (submitBtn) {
        submitBtn.textContent = 'Add User';
    }

    state.userDraft = null;
    state.userVerification = null;
    state.editingUserId = null;
    state.userFormStep = 1;
    updateAccountTypeUI();
    updateBreadcrumb();
    updateUserFormProgressState();
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

    const normalizedEmail = normalizeEmail(draft.email);
    const isEditing = Boolean(state.editingUserId);

    if (!isEditing) {
        const existingUser = users.find(user => normalizeEmail(user.email) === normalizedEmail);
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
            created: new Date().toLocaleDateString()
        };
        users.unshift(newUser);
        showNotification('success', 'INF009: User account created and access email sent to the verified address.', 6000);
    }

    saveUsersToStorage();

    updateUsersManagementCount();
    renderStats();

    const searchInput = document.getElementById('userSearch');
    if (isEditing) {
        const activeSearch = searchInput ? searchInput.value : '';
        renderUsersTable(activeSearch, state.currentUserPage);
    } else {
        if (searchInput) {
            searchInput.value = '';
        }
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
        await showRoleAlert('User Role Disabled Successfully');
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
        await showRoleAlert('User Role has been Successfully Enabled');
    }
}

async function toggleUserStatus(userId) {
    const user = users.find(item => item.id === userId);
    if (!user) return;
    const searchInput = document.getElementById('userSearch');
    const activeSearch = searchInput ? searchInput.value : '';

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
        await showUserAlert('User Account Deactivated Successfully');
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
        await showUserAlert('User Account Activated Successfully');
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
    showNotification('success', 'User Role created successfully and appears in User Roles.');
}

function renderUsersTable(searchTerm = '', page = state.currentUserPage) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
        ? users.filter(user => `${user.name} ${user.email} ${user.role} ${user.status} ${user.phone || ''} ${user.department || ''}`.toLowerCase().includes(term))
        : users;

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.usersPerPage));
    state.currentUserPage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (state.currentUserPage - 1) * state.usersPerPage;
    const visibleUsers = filtered.slice(startIndex, startIndex + state.usersPerPage);

    if (!visibleUsers.length) {
        tbody.innerHTML = '<tr><td colspan="7">No users match the current search filter.</td></tr>';
        return;
    }

    let index = startIndex + 1;
    tbody.innerHTML = visibleUsers.map(user => {
        const rawStatus = (user.status || 'Active').toLowerCase();
        const isActive = rawStatus === 'active';
        const displayStatus = isActive ? 'Active' : 'Inactive';
        const accountType = resolveUserAccountType(user);
        const accountTypeLabel = mapAccountTypeLabel(accountType);
        const accountTypeClass = mapAccountTypeClass(accountType);
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
    renderUsersPagination(totalPages, filtered.length);
}

function exportUsers() {
    const rows = [
        ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created'],
        ...users.map(user => [user.name, user.email, user.role, user.status, user.lastLogin, user.created])
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

