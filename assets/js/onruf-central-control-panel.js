const state = {
    currentSection: 'dashboard',
    currentRolePage: 1,
    rolesPerPage: 4,
    currentPeriod: 'monthly',
    roleSearchTerm: '',
    roleBuilderMode: 'create',
    editingRoleId: null,
    activeRoleDetailId: null,
    permissionCatalog: []
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
    }
];

let roles = [];

const users = [
    { id: 1, name: 'Ahmed Hassan', email: 'ahmed.hassan@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: '2 hours ago', created: 'Jan 12, 2024' },
    { id: 2, name: 'Sarah Mohammed', email: 'sarah.mohammed@onruf.com', role: 'Platform Admin', status: 'Active', lastLogin: '38 minutes ago', created: 'Feb 01, 2024' },
    { id: 3, name: 'Omar Ali', email: 'omar.ali@onruf.com', role: 'Inspector', status: 'Active', lastLogin: 'Today 07:12', created: 'Mar 08, 2024' },
    { id: 4, name: 'Fatima Khalil', email: 'fatima.khalil@onruf.com', role: 'Inspector', status: 'Inactive', lastLogin: '3 weeks ago', created: 'Dec 22, 2023' },
    { id: 5, name: 'Khalid Ibrahim', email: 'khalid.ibrahim@onruf.com', role: 'Business Manager', status: 'Pending', lastLogin: 'Awaiting activation', created: 'Mar 20, 2024' },
    { id: 6, name: 'Noor Abdel', email: 'noor.abdel@onruf.com', role: 'Business Manager', status: 'Active', lastLogin: 'Yesterday 21:44', created: 'Jan 29, 2024' },
    { id: 7, name: 'Yusuf Nasser', email: 'yusuf.nasser@onruf.com', role: 'Inspector', status: 'Active', lastLogin: '4 hours ago', created: 'Feb 14, 2024' },
    { id: 8, name: 'Layla Mahmoud', email: 'layla.mahmoud@onruf.com', role: 'Reader', status: 'Inactive', lastLogin: '1 month ago', created: 'Nov 30, 2023' },
    { id: 9, name: 'Huda Salem', email: 'huda.salem@onruf.com', role: 'Business Owner', status: 'Active', lastLogin: '5 hours ago', created: 'Mar 02, 2024' },
    { id: 10, name: 'Nasser Al-Qahtani', email: 'nasser.qahtani@onruf.com', role: 'Platform Admin', status: 'Active', lastLogin: 'Yesterday', created: 'Feb 17, 2024' }
];

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

function initializeRoles() {
    const storedRoles = loadRolesFromStorage();
    if (storedRoles && storedRoles.length) {
        roles = storedRoles;
        return;
    }

    roles = defaultRoles.map(role => normalizeRolePayload(role)).filter(Boolean);
}

initializeRoles();

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
    updateBreadcrumb();

    const roleSearchInput = document.getElementById('roleSearchInput');
    if (roleSearchInput) {
        roleSearchInput.value = state.roleSearchTerm;
    }

    setupRoleConfirmOverlay();
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

    const roleSearchBtn = document.getElementById('roleSearchBtn');
    if (roleSearchBtn) {
        roleSearchBtn.addEventListener('click', () => {
            handleRoleSearch();
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
            alert('A guided invitation flow would open here.');
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
    }
    updateBreadcrumb(sectionId);
}

function activateSubApp(sectionId, subAppId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

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

    if (sectionId === 'users' && subAppId !== 'users-app1') {
        hideRoleBuilder();
        hideRoleDetails();
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
            ? '<tr><td colspan="6">No roles match the current search.</td></tr>'
            : '<tr><td colspan="6">No roles found. Use the "Add New Role" button to create one.</td></tr>';
    } else {
        tbody.innerHTML = visibleRoles.map(role => {
            const permissionCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
            const descriptionDisplay = role.description && role.description.trim() ? role.description : '—';
            return `
            <tr>
                <td>
                    <div>
                        <div style="font-weight:600;">${role.name || role.nameEnglish || ''}</div>
                        ${role.nameArabic ? `<div class="role-alt-name">${role.nameArabic}</div>` : ''}
                        <div class="role-meta">${role.lastUpdated}</div>
                    </div>
                </td>
                <td>${descriptionDisplay}</td>
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

function handleRoleSearch() {
    const input = document.getElementById('roleSearchInput');
    if (!input) return;
    state.roleSearchTerm = input.value.trim();
    state.currentRolePage = 1;
    renderRolesTable(1);
}

function showNotification(type, message, timeout = 4000) {
    const area = document.getElementById('roleNotificationArea');
    if (!area) return;

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

    note.querySelector('.notification-close').addEventListener('click', close);
    area.appendChild(note);

    if (timeout > 0) {
        setTimeout(close, timeout);
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
    renderRolesTable(1);
    hideRoleBuilder();
    showNotification('success', 'User Role created successfully and appears in User Roles.');
}

function renderUsersTable(searchTerm = '') {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
        ? users.filter(user => `${user.name} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(term))
        : users;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6">No users match the current search filter.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td>
                <div style="font-weight:600;">${user.name}</div>
                                       <div class="user-meta">${user.email}</div>
            </td>
            <td>${user.role}</td>
            <td><span class="status-badge status-${user.status.toLowerCase()}">${user.status}</span></td>
            <td>${user.lastLogin}</td>
            <td>${user.created}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn view" onclick="alert('Profile view for ${user.name}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" onclick="alert('Edit form for ${user.name}')"><i class="fas fa-pen"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
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

