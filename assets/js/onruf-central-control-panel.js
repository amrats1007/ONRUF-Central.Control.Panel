// --- Category Modal Logic ---
function getMainCategories(categories) {
    // Main categories have no parent or parent is empty/null
    return categories.filter(cat => !cat.parent || cat.parent === '' || cat.parent === null);
}

function getSubcategories(categories, parentName) {
    return categories.filter(cat => cat.parent === parentName);
}

function renderCategoryModalList(categories, parentName, onSelect) {
    // legacy list drilldown kept for fallback, not used by default
    const listDiv = document.getElementById('categoryModalList');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    let cats = parentName ? getSubcategories(categories, parentName) : getMainCategories(categories);
    if (!parentName && cats.length === 0) {
        cats = categories;
    }
    if (!cats.length) {
        listDiv.innerHTML = '<div style="color:#888;">No subcategories.</div>';
        return;
    }
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = cat.nameEnglish || cat.nameArabic || cat.id;
        btn.className = 'btn btn-outline';
        btn.style = 'display:block;width:100%;margin-bottom:8px;text-align:left;';
        btn.onclick = () => onSelect(cat);
        listDiv.appendChild(btn);
    });
}

// --- Modal Tree Rendering ---
function normalizeCategoryModalKey(entry) {
    return (entry && (entry.nameEnglish || entry.nameArabic || entry.id) || '').trim();
}

function buildCategoryDisplayPath(entry, categories) {
    if (!entry) return '';
    const registry = Array.isArray(categories) ? categories : []; 
    const lookup = new Map();
    const canonicalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

    registry.forEach(item => {
        const key = normalizeCategoryModalKey(item);
        if (key) {
            lookup.set(canonicalize(key), item);
        }
        if (item.id) {
            lookup.set(canonicalize(item.id), item);
        }
        if (typeof item.nameEnglish === 'string') {
            lookup.set(canonicalize(item.nameEnglish), item);
        }
        if (typeof item.nameArabic === 'string') {
            lookup.set(canonicalize(item.nameArabic), item);
        }
    });

    const path = [];
    let current = entry;
    const guard = new Set();
    while (current && !guard.has(current)) {
        guard.add(current);
        const label = current.nameEnglish || current.nameArabic || current.id;
        if (label) {
            path.unshift(label);
        }
        const parentRef = typeof current.parentCategoryId === 'string' && current.parentCategoryId.trim()
            ? current.parentCategoryId.trim()
            : typeof current.parent === 'string'
                ? current.parent.trim()
                : '';
        if (!parentRef) {
            break;
        }
        current = lookup.get(canonicalize(parentRef)) || null;
    }
    return path.join(' / ');
}

function buildCategoryModalHierarchy(items) {
    const nodes = new Map();
    const aliasLookup = new Map();

    // Keep a loose alias index so IDs, English labels, and legacy strings resolve to the same node.
    const canonicalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

    const registerAliases = (node, ...aliases) => {
        aliases.forEach(alias => {
            const canonicalAlias = canonicalize(alias);
            if (!canonicalAlias) return;
            const existing = aliasLookup.get(canonicalAlias);
            if (!existing || existing === node || (existing.synthetic && !node.synthetic)) {
                aliasLookup.set(canonicalAlias, node);
            }
        });
    };

    const createNode = (key, entry, synthetic) => {
        const node = {
            key,
            entry,
            synthetic,
            children: [],
            parentKey: null
        };
        nodes.set(key, node);
        const entryId = entry && typeof entry.id === 'string' ? entry.id : null;
        const entryNameEn = entry && typeof entry.nameEnglish === 'string' ? entry.nameEnglish : null;
        const entryNameAr = entry && typeof entry.nameArabic === 'string' ? entry.nameArabic : null;
        registerAliases(node, key, entryId, entryNameEn, entryNameAr);
        return node;
    };

    const ensureNodeForEntry = entry => {
        const primaryKey = normalizeCategoryModalKey(entry);
        if (!primaryKey) {
            return null;
        }

        const candidates = [primaryKey, entry.id, entry.nameEnglish, entry.nameArabic];
        let node = null;
        for (const candidate of candidates) {
            const match = aliasLookup.get(canonicalize(candidate));
            if (match) {
                node = match;
                break;
            }
        }

        if (!node) {
            node = createNode(primaryKey, entry, false);
        } else {
            const previousKey = node.key;
            node.entry = entry;
            node.synthetic = false;
            if (previousKey !== primaryKey) {
                nodes.delete(previousKey);
                node.key = primaryKey;
                nodes.set(primaryKey, node);
                nodes.forEach(candidate => {
                    if (candidate.parentKey === previousKey) {
                        candidate.parentKey = primaryKey;
                    }
                });
                registerAliases(node, previousKey);
            } else if (!nodes.has(node.key)) {
                nodes.set(node.key, node);
            }
        }

        registerAliases(node, entry.id, entry.nameEnglish, entry.nameArabic, primaryKey);
        return node;
    };

    const ensureNodeForLabel = (label, sourceEntry) => {
        const trimmed = typeof label === 'string' ? label.trim() : '';
        if (!trimmed) {
            return null;
        }

        const existing = aliasLookup.get(canonicalize(trimmed));
        if (existing) {
            return existing;
        }

        const syntheticEntry = {
            id: trimmed,
            nameEnglish: trimmed,
            nameArabic: sourceEntry && typeof sourceEntry.parentArabic === 'string' ? sourceEntry.parentArabic.trim() : '',
            synthetic: true
        };
        return createNode(trimmed, syntheticEntry, true);
    };

    const list = Array.isArray(items) ? items : [];
    list.forEach(entry => {
        const node = ensureNodeForEntry(entry);
        if (!node) return;

        const parentLabel = typeof entry.parent === 'string' ? entry.parent.trim() : '';
        if (parentLabel) {
            const parentNode = ensureNodeForLabel(parentLabel, entry);
            if (parentNode) {
                node.parentKey = parentNode.key;
                if (!parentNode.children.includes(node)) {
                    parentNode.children.push(node);
                }
            }
        } else {
            node.parentKey = null;
        }
    });

    const roots = [];
    nodes.forEach(node => {
        if (!node.parentKey || !nodes.has(node.parentKey)) {
            roots.push(node);
        }
    });

    const byPositionThenName = (a, b) => {
        const ap = Number.isFinite(a.entry.position) ? a.entry.position : Number.POSITIVE_INFINITY;
        const bp = Number.isFinite(b.entry.position) ? b.entry.position : Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        const an = (a.entry.nameEnglish || a.entry.nameArabic || a.entry.id || '').toLowerCase();
        const bn = (b.entry.nameEnglish || b.entry.nameArabic || b.entry.id || '').toLowerCase();
        return an.localeCompare(bn);
    };
    const sortTree = node => {
        node.children.sort(byPositionThenName).forEach(sortTree);
    };
    roots.sort(byPositionThenName).forEach(sortTree);
    return roots;
}

function renderCategoryModalTree(items, onSelect, options = {}) {
    const container = document.getElementById('categoryModalList');
    if (!container) return;
    container.innerHTML = '';

    const roots = buildCategoryModalHierarchy(items);
    if (!roots.length) {
        container.innerHTML = '<div style="color:#888;text-align:center;padding:16px;">There is no Data Available</div>';
        return;
    }

    const expandedSet = options.expandedKeys instanceof Set ? options.expandedKeys : new Set();
    const selectedKey = options.selectedKey || null;

    const ul = document.createElement('ul');
    ul.className = 'tree-root';

    const renderNode = node => {
        const li = document.createElement('li');
        li.className = 'tree-node';
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const label = node.entry.nameEnglish || node.entry.nameArabic || node.entry.id || '';

        const row = document.createElement('div');
        row.className = 'tree-row';
        if (selectedKey && node.key === selectedKey) {
            row.classList.add('selected');
        }

        let toggleButton = null;
        if (hasChildren) {
            toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'tree-toggle';
            toggleButton.setAttribute('aria-label', 'Expand');
            toggleButton.textContent = '▸';
            row.appendChild(toggleButton);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'tree-spacer';
            spacer.textContent = '•';
            row.appendChild(spacer);
        }

        const labelBtn = document.createElement('button');
        labelBtn.type = 'button';
        labelBtn.className = 'tree-label';
        if (hasChildren) {
            labelBtn.classList.add('has-children');
        }
        labelBtn.textContent = label;
        labelBtn.setAttribute('aria-haspopup', hasChildren ? 'true' : 'false');
        if (!hasChildren) {
            labelBtn.setAttribute('aria-expanded', 'false');
        }
        row.appendChild(labelBtn);

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'btn btn-primary tree-select';
        selectBtn.textContent = 'Select';
    selectBtn.setAttribute('aria-label', `Select ${label}`.trim());
        row.appendChild(selectBtn);

        li.appendChild(row);

        const childList = document.createElement('ul');
        childList.className = 'tree-children';
        li.appendChild(childList);

        let expanded = hasChildren ? expandedSet.has(node.key) : false;
        const applyExpandedState = nextState => {
            if (!hasChildren) {
                return;
            }
            expanded = nextState;
            if (expanded) {
                expandedSet.add(node.key);
                li.classList.add('expanded');
                childList.style.display = '';
                toggleButton.textContent = '▾';
                toggleButton.setAttribute('aria-label', 'Collapse');
                toggleButton.classList.add('expanded');
            } else {
                expandedSet.delete(node.key);
                li.classList.remove('expanded');
                childList.style.display = 'none';
                toggleButton.textContent = '▸';
                toggleButton.setAttribute('aria-label', 'Expand');
                toggleButton.classList.remove('expanded');
            }
            toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            labelBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };

        if (hasChildren) {
            applyExpandedState(expanded);
            toggleButton.addEventListener('click', event => {
                event.stopPropagation();
                applyExpandedState(!expanded);
            });
        } else {
            childList.style.display = 'none';
        }

        labelBtn.addEventListener('click', event => {
            event.stopPropagation();
            if (hasChildren) {
                if (event.detail > 1) {
                    return;
                }
                applyExpandedState(!expanded);
            } else {
                onSelect(node.entry);
            }
        });

        labelBtn.addEventListener('dblclick', event => {
            event.stopPropagation();
            onSelect(node.entry);
        });

        selectBtn.addEventListener('click', event => {
            event.stopPropagation();
            onSelect(node.entry);
        });

        node.children.forEach(child => {
            childList.appendChild(renderNode(child));
        });

        return li;
    };

    roots.forEach(node => ul.appendChild(renderNode(node)));
    container.appendChild(ul);
}

let categoryModalSelectedKey = null;

function setupCategoryModal() {
    const openBtn = document.getElementById('openCategoryModalBtn');
    const modal = document.getElementById('categoryModal');
    const closeBtn = document.getElementById('closeCategoryModalBtn');
    const input = document.getElementById('categoryParentInput');
    if (!openBtn || !modal || !closeBtn || !input) return;

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    };

    const selectCategory = entry => {
        if (!entry) {
            closeModal();
            return;
        }
        const label = entry.nameEnglish || entry.nameArabic || entry.id || '';
        const pathLabel = buildCategoryDisplayPath(entry, categories) || label;
        input.value = pathLabel;
        if (entry.id) {
            input.dataset.parentCategoryId = entry.id;
            input.dataset.parentCategoryLabel = label;
        } else {
            delete input.dataset.parentCategoryId;
            delete input.dataset.parentCategoryLabel;
        }
        categoryModalSelectedKey = normalizeCategoryModalKey(entry);
        closeModal();
    };

    const findCategoryForValue = value => {
        const target = (value || '').trim().toLowerCase();
        if (!target || !Array.isArray(categories)) {
            return null;
        }
        return categories.find(cat => {
            const english = typeof cat.nameEnglish === 'string' ? cat.nameEnglish.trim().toLowerCase() : '';
            const arabic = typeof cat.nameArabic === 'string' ? cat.nameArabic.trim().toLowerCase() : '';
            const identifier = typeof cat.id === 'string' ? cat.id.trim().toLowerCase() : '';
            return english === target || arabic === target || identifier === target;
        }) || null;
    };

    const openModal = () => {
        if (!modal.classList.contains('hidden')) {
            return;
        }
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        const expandedKeys = new Set();

        if (!categoryModalSelectedKey && input.value) {
            const matchedCategory = findCategoryForValue(input.value);
            if (matchedCategory) {
                categoryModalSelectedKey = normalizeCategoryModalKey(matchedCategory);
            }
        }

        const ensureSelectionPathVisible = () => {
            if (!categoryModalSelectedKey || !Array.isArray(categories)) {
                return;
            }
            const selectedKeyValue = String(categoryModalSelectedKey).trim();
            if (!selectedKeyValue) {
                return;
            }
            const registry = new Map();
            const addKey = (key, entry) => {
                const trimmed = typeof key === 'string' ? key.trim() : '';
                if (trimmed) {
                    registry.set(trimmed, entry);
                    registry.set(trimmed.toLowerCase(), entry);
                }
            };
            categories.forEach(cat => {
                addKey(normalizeCategoryModalKey(cat), cat);
                addKey(cat.id, cat);
                addKey(cat.nameEnglish, cat);
                addKey(cat.nameArabic, cat);
            });
            let current = registry.get(selectedKeyValue) || registry.get(selectedKeyValue.toLowerCase()) || null;
            const visited = new Set();
            while (current && typeof current.parent === 'string' && current.parent.trim()) {
                const parentKey = current.parent.trim();
                expandedKeys.add(parentKey);
                if (visited.has(parentKey)) {
                    break;
                }
                visited.add(parentKey);
                current = registry.get(parentKey) || registry.get(parentKey.toLowerCase()) || null;
            }
        };

        ensureSelectionPathVisible();

        renderCategoryModalTree(Array.isArray(categories) ? categories : [], cat => {
            selectCategory(cat);
        }, { expandedKeys, selectedKey: categoryModalSelectedKey });
    };

    openBtn.addEventListener('click', openModal);
    input.addEventListener('click', openModal);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openModal();
        }
    });
    closeBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal();
        }
    });
    // Close with ESC
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', setupCategoryModal);

const AUCTION_PERIOD_UNIT_OPTIONS = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' }
];

const AUCTION_PERIOD_UNIT_LABELS = new Map(AUCTION_PERIOD_UNIT_OPTIONS.map(option => [option.value, option.label]));

let auctionPeriodsWorkingCopy = [];
let auctionPeriodsPendingFocusIndex = null;

function sanitizeAuctionPeriodEntry(entry) {
    if (!entry) return null;
    const unitRaw = typeof entry.unit === 'string' ? entry.unit.trim().toLowerCase() : '';
    if (!AUCTION_PERIOD_UNIT_LABELS.has(unitRaw)) {
        return null;
    }
    const parsedValue = Number.parseInt(entry.value, 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }
    return { unit: unitRaw, value: parsedValue };
}

function sanitizeAuctionPeriodList(entries) {
    if (!Array.isArray(entries)) return [];
    return entries
        .map(sanitizeAuctionPeriodEntry)
        .filter(item => item !== null);
}

function parseAuctionPeriods(value, fallbackUnit = 'day') {
    const normalizedFallback = AUCTION_PERIOD_UNIT_LABELS.has(fallbackUnit) ? fallbackUnit : 'day';
    if (Array.isArray(value)) {
        return sanitizeAuctionPeriodList(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return sanitizeAuctionPeriodList(parsed);
            }
        } catch (error) {
            // not a JSON payload, fallback to legacy comma-separated interpretation
        }
        const tokens = trimmed.split(/[|,;\s]+/).filter(Boolean);
        if (!tokens.length) {
            return [];
        }
        const entries = tokens.map(token => ({ unit: normalizedFallback, value: token }));
        return sanitizeAuctionPeriodList(entries);
    }
    return [];
}

function formatAuctionPeriodsSummary(entries) {
    const sanitized = sanitizeAuctionPeriodList(entries);
    if (!sanitized.length) {
        return '';
    }
    return sanitized
        .map(entry => {
            const label = AUCTION_PERIOD_UNIT_LABELS.get(entry.unit) || entry.unit;
            const suffix = entry.value === 1 ? '' : 's';
            return `${entry.value} ${label}${suffix}`;
        })
        .join(', ');
}

function getAuctionPeriodsInputElement() {
    return document.getElementById('categoryAuctionPeriodsInput');
}

function setAuctionPeriodsInput(entries) {
    const input = getAuctionPeriodsInputElement();
    if (!input) {
        return;
    }
    const sanitized = sanitizeAuctionPeriodList(entries);
    if (!sanitized.length) {
        input.value = '';
        if (input.dataset) {
            delete input.dataset.periods;
        }
        return;
    }
    input.value = formatAuctionPeriodsSummary(sanitized);
    if (input.dataset) {
        input.dataset.periods = JSON.stringify(sanitized);
    }
}

function getAuctionPeriodsFromInput() {
    const input = getAuctionPeriodsInputElement();
    if (!input || !input.dataset || !input.dataset.periods) {
        return [];
    }
    try {
        const parsed = JSON.parse(input.dataset.periods);
        return sanitizeAuctionPeriodList(parsed);
    } catch (error) {
        console.warn('Unable to parse stored auction periods dataset:', error);
        return [];
    }
}

function closeAuctionPeriodsModal() {
    const modal = document.getElementById('auctionPeriodsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    auctionPeriodsWorkingCopy = [];
}

function handleAuctionPeriodUnitChange(index, nextUnit) {
    if (!Array.isArray(auctionPeriodsWorkingCopy) || !auctionPeriodsWorkingCopy[index]) {
        return;
    }
    const normalized = typeof nextUnit === 'string' ? nextUnit.trim().toLowerCase() : '';
    if (!AUCTION_PERIOD_UNIT_LABELS.has(normalized)) {
        return;
    }
    auctionPeriodsWorkingCopy[index].unit = normalized;
}

function handleAuctionPeriodValueChange(index, nextValue) {
    if (!Array.isArray(auctionPeriodsWorkingCopy) || !auctionPeriodsWorkingCopy[index]) {
        return;
    }
    const parsedValue = Number.parseInt(nextValue, 10);
    auctionPeriodsWorkingCopy[index].value = Number.isFinite(parsedValue) ? parsedValue : null;
}

function removeAuctionPeriodRow(index) {
    if (!Array.isArray(auctionPeriodsWorkingCopy)) {
        auctionPeriodsWorkingCopy = [];
    }
    auctionPeriodsWorkingCopy.splice(index, 1);
    const nextFocusIndex = Math.min(index, auctionPeriodsWorkingCopy.length - 1);
    auctionPeriodsPendingFocusIndex = Number.isFinite(nextFocusIndex) && nextFocusIndex >= 0 ? nextFocusIndex : null;
    renderAuctionPeriodsRows();
}

function addAuctionPeriodRow(afterIndex) {
    if (!Array.isArray(auctionPeriodsWorkingCopy)) {
        auctionPeriodsWorkingCopy = [];
    }
    const newEntry = { unit: 'day', value: 1 };
    if (Number.isInteger(afterIndex) && afterIndex >= -1 && afterIndex < auctionPeriodsWorkingCopy.length) {
        auctionPeriodsWorkingCopy.splice(afterIndex + 1, 0, newEntry);
        auctionPeriodsPendingFocusIndex = afterIndex + 1;
    } else {
        auctionPeriodsWorkingCopy.push(newEntry);
        auctionPeriodsPendingFocusIndex = auctionPeriodsWorkingCopy.length - 1;
    }
    renderAuctionPeriodsRows();
}

function renderAuctionPeriodsRows() {
    const container = document.getElementById('auctionPeriodsRows');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(auctionPeriodsWorkingCopy) || !auctionPeriodsWorkingCopy.length) {
        const emptyState = document.createElement('div');
        emptyState.style = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px dashed #d1d5db;border-radius:8px;color:#6b7280;font-size:14px;';
        const message = document.createElement('span');
        message.textContent = 'No periods configured yet.';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-outline';
        addBtn.style = 'padding:6px 10px;';
        addBtn.textContent = '+';
        addBtn.setAttribute('aria-label', 'Add period');
        addBtn.addEventListener('click', () => {
            addAuctionPeriodRow(-1);
        });
        emptyState.appendChild(message);
        emptyState.appendChild(addBtn);
        container.appendChild(emptyState);
        return;
    }

    const focusIndex = Number.isInteger(auctionPeriodsPendingFocusIndex) ? auctionPeriodsPendingFocusIndex : null;
    auctionPeriodsPendingFocusIndex = null;

    auctionPeriodsWorkingCopy.forEach((entry, index) => {
        const row = document.createElement('div');
        row.className = 'auction-period-row';
        row.style = 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;';

        const unitWrapper = document.createElement('div');
        unitWrapper.style = 'flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;';
        const unitLabel = document.createElement('label');
        unitLabel.className = 'form-label';
        unitLabel.textContent = 'Unit';
        unitLabel.setAttribute('for', `auctionPeriodUnit-${index}`);
        const unitSelect = document.createElement('select');
        unitSelect.className = 'form-select';
        unitSelect.id = `auctionPeriodUnit-${index}`;
        AUCTION_PERIOD_UNIT_OPTIONS.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            unitSelect.appendChild(opt);
        });
        unitSelect.value = AUCTION_PERIOD_UNIT_LABELS.has(entry.unit) ? entry.unit : 'day';
        unitSelect.addEventListener('change', event => {
            handleAuctionPeriodUnitChange(index, event.target.value);
        });
        unitWrapper.appendChild(unitLabel);
        unitWrapper.appendChild(unitSelect);

        const valueWrapper = document.createElement('div');
        valueWrapper.style = 'flex:1;min-width:140px;display:flex;flex-direction:column;gap:6px;';
        const valueLabel = document.createElement('label');
        valueLabel.className = 'form-label';
        valueLabel.textContent = 'Number';
        valueLabel.setAttribute('for', `auctionPeriodValue-${index}`);
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.min = '1';
        valueInput.step = '1';
        valueInput.required = true;
        valueInput.className = 'form-input';
        valueInput.id = `auctionPeriodValue-${index}`;
        valueInput.name = 'auction-period-value';
        valueInput.value = Number.isFinite(entry.value) && entry.value > 0 ? entry.value : '';
        valueInput.addEventListener('input', event => {
            handleAuctionPeriodValueChange(index, event.target.value);
        });
        valueWrapper.appendChild(valueLabel);
        valueWrapper.appendChild(valueInput);

        const actionsWrapper = document.createElement('div');
        actionsWrapper.style = 'display:flex;align-items:center;gap:8px;min-width:88px;padding-bottom:4px;';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-outline';
        removeBtn.style = 'padding:6px 10px;';
        removeBtn.textContent = '-';
        removeBtn.setAttribute('aria-label', 'Remove period');
        removeBtn.addEventListener('click', () => {
            removeAuctionPeriodRow(index);
        });
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-outline';
        addBtn.style = 'padding:6px 10px;';
        addBtn.textContent = '+';
        addBtn.setAttribute('aria-label', 'Add period');
        addBtn.addEventListener('click', () => {
            addAuctionPeriodRow(index);
        });
        actionsWrapper.appendChild(removeBtn);
        actionsWrapper.appendChild(addBtn);

        row.appendChild(unitWrapper);
        row.appendChild(valueWrapper);
        row.appendChild(actionsWrapper);

        container.appendChild(row);
    });

    if (focusIndex !== null) {
        const inputToFocus = container.querySelector(`#auctionPeriodValue-${focusIndex}`);
        if (inputToFocus) {
            setTimeout(() => inputToFocus.focus(), 30);
        }
    }
}

function openAuctionPeriodsModal() {
    const modal = document.getElementById('auctionPeriodsModal');
    if (!modal) return;
    const existingEntries = getAuctionPeriodsFromInput();
    auctionPeriodsWorkingCopy = existingEntries.length
        ? existingEntries.map(entry => ({ ...entry }))
        : [];
    renderAuctionPeriodsRows();
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => {
        const firstInput = modal.querySelector('input[name="auction-period-value"]');
        if (firstInput) {
            firstInput.focus();
        }
    }, 30);
}

function applyAuctionPeriodsSelection() {
    const modal = document.getElementById('auctionPeriodsModal');
    if (!modal) return;
    const inputs = modal.querySelectorAll('input[name="auction-period-value"]');
    for (const field of inputs) {
        if (!field.checkValidity()) {
            field.reportValidity();
            return;
        }
    }
    const sanitized = sanitizeAuctionPeriodList(auctionPeriodsWorkingCopy);
    setAuctionPeriodsInput(sanitized);
    closeAuctionPeriodsModal();
}

function initializeAuctionPeriodsPicker() {
    const modal = document.getElementById('auctionPeriodsModal');
    if (!modal || modal.dataset.initialized === 'true') {
        return;
    }

    const openBtn = document.getElementById('openAuctionPeriodsModalBtn');
    const input = document.getElementById('categoryAuctionPeriodsInput');
    const applyBtn = document.getElementById('applyAuctionPeriodsBtn');
    const cancelBtn = document.getElementById('cancelAuctionPeriodsBtn');

    const openHandler = event => {
        event?.preventDefault();
        openAuctionPeriodsModal();
    };

    if (openBtn) {
        openBtn.addEventListener('click', openHandler);
    }
    if (input) {
        input.addEventListener('click', openHandler);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openAuctionPeriodsModal();
            }
        });
    }
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyAuctionPeriodsSelection();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            closeAuctionPeriodsModal();
        });
    }

    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeAuctionPeriodsModal();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeAuctionPeriodsModal();
        }
    });

    modal.dataset.initialized = 'true';
}

const CATEGORY_TOGGLE_SECTIONS = [
    { toggleId: 'categoryEnableFixedToggle', sectionIds: ['categoryFixedSaleFeeGroup'] },
    { toggleId: 'categoryEnableNegotiationToggle', sectionIds: ['categoryNegotiationFeeGroup'] },
    {
        toggleId: 'categoryEnableAuctionToggle',
        sectionIds: [
            'categoryAuctionFeeGroup',
            'categoryMinimumBidGroup',
            'categoryAuctionPeriodsGroup',
            'categoryAuctionTimeFeeGroup'
        ]
    }
];

function applyCategoryPricingToggleStates() {
    CATEGORY_TOGGLE_SECTIONS.forEach(config => {
        const toggle = document.getElementById(config.toggleId);
        const isActive = !!(toggle && toggle.checked);
        config.sectionIds.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (!section) return;
            section.classList.toggle('hidden', !isActive);
            section.querySelectorAll('input, select, textarea').forEach(control => {
                control.disabled = !isActive;
            });
        });
    });
}

function initializeCategoryFormToggles() {
    CATEGORY_TOGGLE_SECTIONS.forEach(config => {
        const toggle = document.getElementById(config.toggleId);
        if (!toggle) return;
        if (!toggle.dataset.toggleInitialized) {
            toggle.addEventListener('change', () => {
                applyCategoryPricingToggleStates();
            });
            toggle.dataset.toggleInitialized = 'true';
        }
    });
    applyCategoryPricingToggleStates();
}

function enforceAdPublishingFeeTypeConstraints() {
    const dueSelect = document.getElementById('categoryFeeDueTimeInput');
    const typeSelect = document.getElementById('categoryPriceTypeInput');
    if (!dueSelect || !typeSelect) {
        return;
    }

    const dueValue = (dueSelect.value || '').trim().toLowerCase();
    const lockToFixed = dueValue === 'on-publish';

    Array.from(typeSelect.options || []).forEach(option => {
        if (!option || typeof option.value !== 'string') {
            return;
        }
        if (option.value === 'fixed') {
            option.disabled = false;
        } else {
            option.disabled = lockToFixed;
        }
    });

    if (lockToFixed) {
        typeSelect.value = 'fixed';
    }
}
const state = {
    currentSection: 'dashboard',
    currentRolePage: 1,
    rolesPerPage: 10,
    currentUserPage: 1,
    usersPerPage: 10,
    currentCategoryPage: 1,
    categoriesPerPage: 10,
    currentPeriod: 'monthly',
    roleSearchTerm: '',
    userSearchTerm: '',
    roleBuilderMode: 'create',
    editingRoleId: null,
    editingUserId: null,
    userFormStep: 1,
    userDraft: null,
    activeRoleDetailId: null,
    activeCategoryDetailId: null,
    permissionCatalog: [],
    categorySearchTerm: '',
    categoryBuilderMode: 'create',
    editingCategoryId: null,
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

const CATEGORY_TREE_ROOT_ID = 'root';
const CATEGORY_MAX_DEPTH = 7;
const CATEGORY_REVIEW_STATUSES = new Set(['draft', 'in-review']);
const CATEGORY_DEFAULT_VISIBLE_COLUMNS = ['index', 'code', 'name', 'description', 'parent', 'status', 'created'];
const CATEGORY_COLUMN_DEFINITIONS = [
    { id: 'index', label: '#', locked: true, exportable: true },
    { id: 'code', label: 'Code', exportable: true },
    { id: 'name', label: 'Name', exportable: true },
    { id: 'description', label: 'Description', exportable: true },
    { id: 'parent', label: 'Parent', exportable: true },
    { id: 'status', label: 'Status', exportable: true },
    { id: 'created', label: 'Created', exportable: true }
];

const CATEGORY_AD_FEE_DUE_LABELS = new Map([
    ['on-publish', 'On Publish'],
    ['after-sales', 'After Sales']
]);

const CATEGORY_AD_FEE_TYPE_LABELS = new Map([
    ['fixed', 'Fixed Price'],
    ['percentage', 'Percentage of Sales']
]);

const CATEGORY_EXPORT_COLUMNS = [
    { id: 'index', label: '#', value: (_, index) => String(index + 1) },
    { id: 'categoryCode', label: 'Category Code', value: category => category.categoryCode || category.id || '' },
    { id: 'categoryNameArabic', label: 'Category Name (Arabic)', value: category => category.nameArabic || category.arabicName || '' },
    { id: 'descriptionArabic', label: 'Description (Arabic)', value: category => category.arabicDescription || category.descriptionArabic || '' },
    { id: 'categoryNameEnglish', label: 'Category Name (English)', value: category => category.nameEnglish || category.englishName || '' },
    { id: 'descriptionEnglish', label: 'Description (English)', value: category => category.englishDescription || category.description || '' },
    { id: 'parentCategory', label: 'Parent Category', value: category => resolveCategoryParentLabel(category) },
    { id: 'categoryStatus', label: 'Category Status', value: category => getCategoryStatusLabel(category.status) },
    { id: 'creationDate', label: 'Creation Date', value: category => formatDateForDisplay(category.createdAt) || '' },
    { id: 'createdBy', label: 'Created By', value: category => category.createdBy || category.owner || '' },
    { id: 'adPublishingFeeDue', label: 'Ad Publishing Fees Due Date', value: category => formatCategoryFeeDueLabel(category.adPublishingFeeDue) },
    { id: 'adPublishingFeeType', label: 'Ad Publishing Fees Type', value: category => formatCategoryFeeTypeLabel(category.adPublishingFeeType) },
    { id: 'adPublishingFeeAmount', label: 'Ad Publishing Fees', value: category => formatCategoryNumericValue(category.adPublishingFeeAmount) },
    { id: 'freeImagesPerAd', label: 'Free Images Count per Ad', value: category => formatCategoryNumericValue(category.freeProductImagesCount) },
    { id: 'extraImageFee', label: 'Additional Image Fees', value: category => formatCategoryNumericValue(category.extraProductImageFee) },
    { id: 'freeVideosPerAd', label: 'Free Video Links Count per Ad', value: category => formatCategoryNumericValue(category.freeProductVideosCount) },
    { id: 'extraVideoFee', label: 'Additional Video Link Fees', value: category => formatCategoryNumericValue(category.extraProductVideoFee) },
    { id: 'subtitleFee', label: 'Subtitle Fees', value: category => formatCategoryNumericValue(category.subtitleFee) },
    { id: 'supportsFixedPrice', label: 'Enable Fixed Sale Price Option', value: category => formatCategoryBooleanLabel(category.supportsFixedPrice) },
    { id: 'fixedPriceSaleFee', label: 'Enable Fixed Sale Price Option Fees', value: category => formatCategoryNumericValue(category.fixedPriceSaleFee) },
    { id: 'supportsNegotiation', label: 'Enable Negotiable Price Option', value: category => formatCategoryBooleanLabel(category.supportsNegotiation) },
    { id: 'negotiationFee', label: 'Enable Negotiable Price Option Fees', value: category => formatCategoryNumericValue(category.negotiationFee) },
    { id: 'supportsAuction', label: 'Enable Public Auction Option', value: category => formatCategoryBooleanLabel(category.supportsAuction) },
    { id: 'auctionFee', label: 'Enable Public Auction Option Fees', value: category => formatCategoryNumericValue(category.auctionFee) },
    { id: 'auctionClosingTimeFee', label: 'Auction Closing Time Option Fees', value: category => formatCategoryNumericValue(category.auctionClosingTimeFee) },
    { id: 'auctionClosingPeriods', label: 'Default Auction Closing Periods', value: category => formatCategoryAuctionPeriods(category.auctionClosingPeriods) },
    { id: 'minimumBid', label: 'Minimum Bid (Value, Seller Can Modify?)', value: category => formatCategoryMinimumBid(category.minimumBidValue, category.minimumBidSellerCanModify) },
    { id: 'showAtHome', label: 'Show on Home Page?', value: category => formatCategoryBooleanLabel(category.showAtHome) },
    { id: 'isRealEstate', label: 'Is Real Estate?', value: category => formatCategoryBooleanLabel(category.isRealEstate) }
];

function formatCategoryTokenLabel(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const token = String(value).trim();
    if (!token) {
        return '';
    }
    return token
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatCategoryFeeDueLabel(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const normalized = String(value).trim().toLowerCase();
    if (CATEGORY_AD_FEE_DUE_LABELS.has(normalized)) {
        return CATEGORY_AD_FEE_DUE_LABELS.get(normalized);
    }
    return formatCategoryTokenLabel(value);
}

function formatCategoryFeeTypeLabel(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const normalized = String(value).trim().toLowerCase();
    if (CATEGORY_AD_FEE_TYPE_LABELS.has(normalized)) {
        return CATEGORY_AD_FEE_TYPE_LABELS.get(normalized);
    }
    return formatCategoryTokenLabel(value);
}

function formatCategoryNumericValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toString() : '';
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
        return '';
    }
    const parsed = Number.parseFloat(trimmed);
    if (Number.isFinite(parsed)) {
        return parsed.toString();
    }
    return trimmed;
}

function formatCategoryBooleanLabel(value) {
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
        return value !== 0 ? 'Yes' : 'No';
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            return 'No';
        }
        return ['true', '1', 'yes', 'y', 'on'].includes(normalized) ? 'Yes' : 'No';
    }
    return 'No';
}

function formatCategoryAuctionPeriods(entries) {
    const summary = formatAuctionPeriodsSummary(entries);
    return summary || '';
}

function formatCategoryMinimumBid(value, sellerCanModify) {
    const valueLabel = formatCategoryNumericValue(value);
    const sellerLabel = formatCategoryBooleanLabel(sellerCanModify);
    if (!valueLabel && !sellerLabel) {
        return '';
    }
    if (!valueLabel) {
        return sellerLabel;
    }
    return `${valueLabel} (${sellerLabel || 'No'})`;
}

// TODO: Point to the API route that accepts category import uploads.
const CATEGORY_IMPORT_ENDPOINT = '';

const CATEGORY_IMPORT_CONFIG = {
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedExtensions: new Set(['csv', 'xls', 'xlsx']),
    requiredColumns: ['category name (arabic)', 'category name (english)'],
    previewRowLimit: 12
};

const CATEGORY_IMPORT_COLUMN_ALIASES = new Map([
    ['category code', ['category code', 'code']],
    ['parent category', ['parent category', 'parent code', 'parent']],
    ['category name (arabic)', ['category name (arabic)', 'name (arabic)', 'arabic name']],
    ['category name (english)', ['category name (english)', 'name (english)', 'name']],
    ['status', ['status']]
]);

function normalizeCategoryHeaderLabel(label) {
    if (label == null) {
        return '';
    }
    return String(label)
        .replace(/[\u2000-\u200F\u202A-\u202E\u2066-\u206F\uFEFF\u00AD\u2028\u2029]/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function formatCategoryImportColumnLabel(column) {
    if (!column) {
        return '';
    }
    return column.replace(/\b\w/g, char => char.toUpperCase());
}

function getMissingCategoryImportColumns(header) {
    const lookup = new Set(header.map(normalizeCategoryHeaderLabel).filter(Boolean));
    const missing = CATEGORY_IMPORT_CONFIG.requiredColumns.filter(column => {
        const aliases = CATEGORY_IMPORT_COLUMN_ALIASES.get(column) || [column];
        return !aliases.some(alias => lookup.has(normalizeCategoryHeaderLabel(alias)));
    });
    return missing.map(formatCategoryImportColumnLabel);
}

function buildCategoryImportColumnIndex(header) {
    const normalizedHeader = header.map(normalizeCategoryHeaderLabel);
    const columnIndex = new Map();

    normalizedHeader.forEach((name, index) => {
        if (name) {
            columnIndex.set(name, index);
        }
    });

    CATEGORY_IMPORT_COLUMN_ALIASES.forEach((aliases, canonical) => {
        const canonicalKey = normalizeCategoryHeaderLabel(canonical);
        aliases.forEach(alias => {
            const normalizedAlias = normalizeCategoryHeaderLabel(alias);
            const aliasIndex = normalizedHeader.indexOf(normalizedAlias);
            if (aliasIndex !== -1 && canonicalKey) {
                columnIndex.set(canonicalKey, aliasIndex);
            }
        });
    });

    const getIndex = name => columnIndex.get(normalizeCategoryHeaderLabel(name));
    return { columnIndex, normalizedHeader, getIndex };
}

const CATEGORY_IMPORT_ALLOWED_STATUSES = new Set(['active', 'inactive']);

const categoryImportState = {
    file: null,
    format: 'csv',
    header: [],
    rows: [],
    warnings: [],
    errors: [],
    rowMetadata: [],
    totalRows: 0,
    truncated: false,
    isSubmitting: false
};

const categoryImportElements = {
    overlay: null,
    dropzone: null,
    fileInput: null,
    browseBtn: null,
    templateBtn: null,
    status: null,
    preview: null,
    previewTable: null,
    fileName: null,
    chip: null,
    submitBtn: null,
    submitLabel: null,
    cancelBtn: null
};

let categoryImportXlsxLoader = null;
let categoryImportFileDialogOpen = false;
let categoryImportFileDialogFocusHandler = null;

function releaseCategoryImportFileDialogGuard() {
    categoryImportFileDialogOpen = false;
    if (categoryImportFileDialogFocusHandler) {
        window.removeEventListener('focus', categoryImportFileDialogFocusHandler, true);
        categoryImportFileDialogFocusHandler = null;
    }
}

function ensureCategoryImportXlsxParser() {
    if (typeof window !== 'undefined' && window.XLSX) {
        return Promise.resolve(window.XLSX);
    }
    if (categoryImportXlsxLoader) {
        return categoryImportXlsxLoader;
    }
    if (typeof document === 'undefined') {
        return Promise.reject(new Error('Document context is unavailable.'));
    }

    categoryImportXlsxLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.async = true;
        script.onload = () => {
            if (typeof window !== 'undefined' && window.XLSX) {
                resolve(window.XLSX);
            } else {
                categoryImportXlsxLoader = null;
                reject(new Error('Excel parser failed to initialize.'));
            }
        };
        script.onerror = () => {
            categoryImportXlsxLoader = null;
            reject(new Error('Failed to load Excel parser script.'));
        };
        document.head.appendChild(script);
    });

    return categoryImportXlsxLoader;
}

let categoryLookupById = new Map();
let categoryLookupByCode = new Map();
let categoryChildrenLookup = new Map();
let categoryDepthLookup = new Map();
let categoryDescendantCache = new Map();
let categoryParentLookup = new Map();
let categoryColumnChooserDismissHandler = null;
let categoryColumnChooserKeyHandler = null;
let categoryGlobalDeselectHandlerBound = false;
let categoryDrawerResizeBound = false;
let categoryDrawerSyncFrame = null;

state.categoryExplorerExpanded = new Set();
state.categorySelectedIds = new Set();
state.categoryVisibleColumns = [...CATEGORY_DEFAULT_VISIBLE_COLUMNS];
state.categoryTreeSearchTerm = '';
state.categoryViewBranchId = CATEGORY_TREE_ROOT_ID;
state.categoryDetailSearchTerm = '';
state.categoryStatusFilter = 'all';
state.categoryDepthFilter = 'all';
state.categoryExplorerCollapsed = true;
state.categoryCompareMode = false;
state.categoryCompareSelection = [];
state.categoryFilteredList = [];

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
        id: 'categories',
        label: 'Categories',
        description: 'Catalog hierarchies, ownership playbooks, and specification governance.',
        apps: [
            {
                id: 'categories-management',
                label: 'Category Management',
                description: 'Structure category trees, assign stewards, and publish updates.',
                defaultAction: 'modify'
            },
            {
                id: 'categories-specifications',
                label: 'Specifications Management',
                description: 'Craft inspection blueprints and coordinate data collection standards.',
                defaultAction: 'modify'
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
        id: 'diagrams',
        label: 'Diagrams',
        description: 'Architecture references, interaction models, and communication blueprints.',
        apps: [
            {
                id: 'diagrams-component',
                label: 'Component Diagrams',
                description: 'Service inventory, dependencies, and deployment scope.',
                defaultAction: 'view'
            },
            {
                id: 'diagrams-package',
                label: 'Package Diagrams',
                description: 'Capability bundles mapped to delivery offerings.',
                defaultAction: 'modify'
            },
            {
                id: 'diagrams-usecase',
                label: 'Use Case Diagrams',
                description: 'Stakeholder journeys and value exchanges.',
                defaultAction: 'view'
            },
            {
                id: 'diagrams-activity',
                label: 'Activity Diagrams',
                description: 'Process choreography and automation triggers.',
                defaultAction: 'view'
            },
            {
                id: 'diagrams-interaction',
                label: 'Interaction Overview',
                description: 'Cross-team plays and escalation pathways.',
                defaultAction: 'view'
            },
            {
                id: 'diagrams-communication',
                label: 'Communication Diagrams',
                description: 'Message flows, latency targets, and reliability patterns.',
                defaultAction: 'view'
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

const defaultCategories = [];

let categories = [];
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
const CATEGORIES_STORAGE_KEY = 'onruf_categories_v1';
const SESSION_STORAGE_KEY = 'onruf_active_session_v1';
const DATA_RESET_VERSION = '20241005-super-admin-seed';
const DATA_RESET_KEY = 'onruf_data_reset_version';
const CATEGORY_RESET_VERSION = '20251019-delete-all-categories';
const CATEGORY_RESET_KEY = 'onruf_category_reset_version';
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

    const revokedTokens = Array.isArray(normalized.revokedTokens)
        ? normalized.revokedTokens
            .map(entry => {
                if (!entry) {
                    return null;
                }
                if (typeof entry === 'string') {
                    const trimmed = entry.trim();
                    return trimmed ? { token: trimmed, revokedAt: null } : null;
                }
                const value = typeof entry.token === 'string' ? entry.token.trim() : '';
                if (!value) {
                    return null;
                }
                let revokedAt = null;
                if (entry.revokedAt) {
                    const parsed = Date.parse(entry.revokedAt);
                    if (Number.isFinite(parsed)) {
                        revokedAt = new Date(parsed).toISOString();
                    }
                }
                return { token: value, revokedAt };
            })
            .filter(Boolean)
            .slice(0, 10)
        : [];

    return {
        otp,
        token,
        sentAt,
        expiresAt,
        completedAt: normalized.completedAt || null,
        verifiedAt: normalized.verifiedAt || null,
        lastOtpSentAt: normalized.lastOtpSentAt || null,
        revokedTokens
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
    const photoDataUrl = typeof user.photoDataUrl === 'string' ? user.photoDataUrl.trim() : '';
    const photoFileName = typeof user.photoFileName === 'string' ? user.photoFileName.trim() : '';
    const photoUrl = typeof user.photoUrl === 'string' ? user.photoUrl.trim() : '';

    let createdBy = null;
    if (typeof user.createdBy === 'number' && Number.isFinite(user.createdBy)) {
        createdBy = Math.trunc(user.createdBy);
    } else if (typeof user.createdBy === 'string' && user.createdBy.trim()) {
        const parsedCreator = Number.parseInt(user.createdBy.trim(), 10);
        if (Number.isFinite(parsedCreator)) {
            createdBy = parsedCreator;
        }
    }

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
        photoDataUrl,
        photoFileName,
        photoUrl,
        invitation,
        auth,
        createdBy
    };
}

// --- Category Code Helpers ---
function ensureCategoryCodeTrailingDot(code) {
    const trimmed = typeof code === 'string' ? code.trim() : '';
    if (!trimmed) {
        return '';
    }
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function normalizeCategoryCodeCandidate(code) {
    const trimmed = typeof code === 'string' ? code.trim() : '';
    if (!trimmed) {
        return '';
    }
    const segments = parseNumericCategoryCodeSegments(trimmed);
    if (segments && segments.length) {
        return formatCategoryCodeFromSegments(segments).toLowerCase();
    }
    return trimmed.toLowerCase();
}

function parseNumericCategoryCodeSegments(code) {
    const normalized = ensureCategoryCodeTrailingDot(code);
    if (!normalized) {
        return null;
    }
    const withoutTrailingDot = normalized.slice(0, -1);
    if (!withoutTrailingDot) {
        return [];
    }
    const parts = withoutTrailingDot
        .split('.')
        .map(part => part.trim())
        .filter(Boolean);
    if (!parts.length) {
        return [];
    }
    const segments = [];
    for (const part of parts) {
        const numeric = Number.parseInt(part, 10);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return null;
        }
        segments.push(numeric);
    }
    return segments;
}

function formatCategoryCodeFromSegments(segments) {
    if (!Array.isArray(segments) || !segments.length) {
        return '';
    }
    return `${segments.join('.')}.`;
}

function resolveCategoryReference(parentCategoryId, parentLabel, registry) {
    const list = Array.isArray(registry) ? registry.filter(Boolean) : [];
    const idCandidate = typeof parentCategoryId === 'string' ? parentCategoryId.trim() : '';
    if (idCandidate) {
        const idLower = idCandidate.toLowerCase();
        const byId = list.find(item => typeof item.id === 'string' && item.id.trim().toLowerCase() === idLower);
        if (byId) {
            return byId;
        }
    }

    const labelCandidate = typeof parentLabel === 'string' ? parentLabel.trim() : '';
    if (!labelCandidate) {
        return null;
    }
    const labelLower = labelCandidate.toLowerCase();
    return list.find(item => {
        const english = typeof item.nameEnglish === 'string' ? item.nameEnglish.trim().toLowerCase() : '';
        const arabic = typeof item.nameArabic === 'string' ? item.nameArabic.trim().toLowerCase() : '';
        const identifier = typeof item.id === 'string' ? item.id.trim().toLowerCase() : '';
        return english === labelLower || arabic === labelLower || identifier === labelLower;
    }) || null;
}

function generateTopLevelCategoryCode(registry) {
    const list = Array.isArray(registry) ? registry.filter(Boolean) : [];
    let maxValue = 0;
    list.forEach(item => {
        const parentLabel = typeof item.parent === 'string' ? item.parent.trim() : '';
        const parentId = typeof item.parentCategoryId === 'string' ? item.parentCategoryId.trim() : '';
        if (parentLabel || parentId) {
            return;
        }
        const normalizedCode = ensureCategoryCodeTrailingDot(item.categoryCode);
        if (!normalizedCode) {
            return;
        }
        const directMatch = normalizedCode.match(/^(\d+)\.$/);
        if (directMatch) {
            const numeric = Number.parseInt(directMatch[1], 10);
            if (Number.isFinite(numeric) && numeric > 0) {
                maxValue = Math.max(maxValue, numeric);
            }
            return;
        }
        const segments = parseNumericCategoryCodeSegments(normalizedCode);
        if (segments && segments.length) {
            const numeric = segments[0];
            if (Number.isFinite(numeric) && numeric > 0) {
                maxValue = Math.max(maxValue, numeric);
            }
        }
    });
    const nextValue = maxValue + 1 || 1;
    return `${nextValue}.`;
}

function generateChildCategoryCode(parentCode, registry) {
    const list = Array.isArray(registry) ? registry.filter(Boolean) : [];
    const parentSegments = parseNumericCategoryCodeSegments(parentCode);
    if (parentSegments && parentSegments.length) {
        let maxSiblingValue = 0;
        list.forEach(item => {
            const segments = parseNumericCategoryCodeSegments(item.categoryCode);
            if (!segments || segments.length !== parentSegments.length + 1) {
                return;
            }
            for (let index = 0; index < parentSegments.length; index += 1) {
                if (segments[index] !== parentSegments[index]) {
                    return;
                }
            }
            const lastSegment = segments[segments.length - 1];
            if (Number.isFinite(lastSegment) && lastSegment > 0) {
                maxSiblingValue = Math.max(maxSiblingValue, lastSegment);
            }
        });
        const nextValue = maxSiblingValue + 1 || 1;
        return formatCategoryCodeFromSegments(parentSegments.concat(nextValue));
    }

    const prefix = ensureCategoryCodeTrailingDot(parentCode);
    if (!prefix) {
        return '';
    }
    let maxFallbackValue = 0;
    list.forEach(item => {
        const code = ensureCategoryCodeTrailingDot(item.categoryCode);
        if (!code.startsWith(prefix)) {
            return;
        }
        const remainder = code.slice(prefix.length);
        const match = remainder.match(/^(\d+)\.$/);
        if (!match || remainder.length !== match[0].length) {
            return;
        }
        const numeric = Number.parseInt(match[1], 10);
        if (Number.isFinite(numeric) && numeric > 0) {
            maxFallbackValue = Math.max(maxFallbackValue, numeric);
        }
    });
    const nextValue = maxFallbackValue + 1 || 1;
    return `${prefix}${nextValue}.`;
}

function generateSequentialCategoryCode(parentCategoryId, parentLabel, registry) {
    const list = Array.isArray(registry) ? registry.filter(Boolean) : [];
    const parent = resolveCategoryReference(parentCategoryId, parentLabel, list);
    if (!parent) {
        return generateTopLevelCategoryCode(list);
    }
    const nextCode = generateChildCategoryCode(parent.categoryCode, list);
    if (nextCode) {
        return nextCode;
    }
    return generateTopLevelCategoryCode(list);
}

function normalizeCategoryPayload(category, index = 0) {
    if (!category || typeof category !== 'object') return null;

    const fallbackIndex = Number.isInteger(index) && index >= 0 ? index : 0;
    const rawId = typeof category.id === 'string' ? category.id.trim().toUpperCase() : '';
    const id = /^CAT-\d{3,}$/i.test(rawId) ? rawId : `CAT-${String(fallbackIndex + 1).padStart(3, '0')}`;

    const categoryCodeRaw = typeof category.categoryCode === 'string' ? category.categoryCode.trim() : '';
    const categoryCode = categoryCodeRaw || id;

    const nameArabic = typeof category.nameArabic === 'string' ? category.nameArabic.trim() : '';
    const nameEnglish = typeof category.nameEnglish === 'string' ? category.nameEnglish.trim() : '';
    const owner = typeof category.owner === 'string' ? category.owner.trim() : '';
    const parent = typeof category.parent === 'string' ? category.parent.trim() : '';
    const parentCategoryId = typeof category.parentCategoryId === 'string' ? category.parentCategoryId.trim() : '';
    const englishDescriptionRaw = typeof category.englishDescription === 'string' ? category.englishDescription.trim() : '';
    const arabicDescription = typeof category.arabicDescription === 'string' ? category.arabicDescription.trim() : '';
    const legacyDescription = typeof category.description === 'string' ? category.description.trim() : '';
    const englishDescription = englishDescriptionRaw || legacyDescription;
    const description = englishDescription || '';

    const allowedStatuses = new Set(['draft', 'in-review', 'published', 'archived', 'active', 'inactive']);
    let status = typeof category.status === 'string' ? category.status.trim().toLowerCase() : 'draft';
    if (!allowedStatuses.has(status)) {
        status = 'draft';
    }

    const parseInteger = value => {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };

    const parseNumber = value => {
        if (value === '' || value === null || value === undefined) {
            return 0;
        }
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const toBoolean = value => {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        return false;
    };

    const specificationCount = parseInteger(category.specificationCount);
    const rawProductPriceType = typeof category.productPriceType === 'string' && category.productPriceType.trim()
        ? category.productPriceType.trim().toLowerCase()
        : '';
    const rawAdPublishingFeeType = typeof category.adPublishingFeeType === 'string' && category.adPublishingFeeType.trim()
        ? category.adPublishingFeeType.trim().toLowerCase()
        : '';
    const productPriceType = rawAdPublishingFeeType || rawProductPriceType || 'fixed';
    const adPublishingFeeType = productPriceType;
    const adPublishingFeeAmount = parseNumber(Object.prototype.hasOwnProperty.call(category, 'adPublishingFeeAmount')
        ? category.adPublishingFeeAmount
        : category.productPublishPrice);
    const productPublishPrice = adPublishingFeeAmount;
    const freeProductImagesCount = parseInteger(category.freeProductImagesCount);
    const freeProductVideosCount = parseInteger(category.freeProductVideosCount);
    const extraProductImageFee = parseNumber(category.extraProductImageFee);
    const extraProductVideoFee = parseNumber(category.extraProductVideoFee);
    let minimumBidValue = parseNumber(category.minimumBidValue);
    let minimumBidSellerCanModify = toBoolean(category.minimumBidSellerCanModify);
    const subtitleFee = parseNumber(category.subtitleFee);
    let auctionClosingPeriods = parseAuctionPeriods(category.auctionClosingPeriods, category.auctionClosingPeriodsUnit);
    let auctionClosingTimeFee = parseNumber(category.auctionClosingTimeFee);
    let fixedPriceSaleFee = parseNumber(category.fixedPriceSaleFee);
    let auctionFee = parseNumber(category.auctionFee);
    let negotiationFee = parseNumber(category.negotiationFee);
    let auctionClosingPeriodsUnit = '';
    if (auctionClosingPeriods.length) {
        const uniqueUnits = [...new Set(auctionClosingPeriods.map(entry => entry.unit))];
        auctionClosingPeriodsUnit = uniqueUnits.length === 1 ? uniqueUnits[0] : '';
    }
    const rawProductFeeDueTime = typeof category.productFeeDueTime === 'string' && category.productFeeDueTime.trim()
        ? category.productFeeDueTime.trim().toLowerCase()
        : '';
    const rawAdPublishingFeeDue = typeof category.adPublishingFeeDue === 'string' && category.adPublishingFeeDue.trim()
        ? category.adPublishingFeeDue.trim().toLowerCase()
        : '';
    const productFeeDueTime = rawAdPublishingFeeDue || rawProductFeeDueTime || 'now';
    const adPublishingFeeDue = productFeeDueTime;
    const baseCategory = typeof category.baseCategory === 'string' ? category.baseCategory.trim() : '';
    const createdBy = typeof category.createdBy === 'string' && category.createdBy.trim()
        ? category.createdBy.trim()
        : typeof category.owner === 'string' && category.owner.trim()
            ? category.owner.trim()
            : '';

    const supportsFixedPrice = toBoolean(category.supportsFixedPrice);
    const supportsAuction = toBoolean(category.supportsAuction);
    const supportsNegotiation = toBoolean(category.supportsNegotiation);
    const showAtHome = toBoolean(category.showAtHome);
    const isRealEstate = toBoolean(category.isRealEstate);

    if (!supportsFixedPrice) {
        fixedPriceSaleFee = 0;
    }
    if (!supportsNegotiation) {
        negotiationFee = 0;
    }
    if (!supportsAuction) {
        auctionFee = 0;
        minimumBidValue = 0;
        minimumBidSellerCanModify = false;
        auctionClosingPeriods = [];
        auctionClosingTimeFee = 0;
        auctionClosingPeriodsUnit = '';
    }

    const notifyOnStatusChange = typeof category.notifyOnStatusChange === 'boolean'
        ? category.notifyOnStatusChange
        : !!category.alertSubscribers || !!category.notify;
    const syncAutomation = typeof category.syncAutomation === 'boolean'
        ? category.syncAutomation
        : !!category.syncWithOwner;

    const imageName = typeof category.imageName === 'string' ? category.imageName.trim() : '';
    const imageDataUrl = typeof category.imageDataUrl === 'string' ? category.imageDataUrl.trim() : '';

    let createdAt = null;
    if (category.createdAt) {
        const parsed = Date.parse(category.createdAt);
        if (Number.isFinite(parsed)) {
            createdAt = new Date(parsed).toISOString();
        }
    }
    if (!createdAt) {
        createdAt = new Date().toISOString();
    }

    return {
        id,
        categoryCode,
        nameArabic,
        nameEnglish: nameEnglish || nameArabic || `Category ${fallbackIndex + 1}`,
        description,
        englishDescription,
        arabicDescription,
        parent,
        parentCategoryId,
        owner,
        status,
        specificationCount,
        notifyOnStatusChange,
        syncAutomation,
        createdAt,
        productPriceType,
        productPublishPrice,
        adPublishingFeeType,
        adPublishingFeeAmount,
        adPublishingFeeDue,
        freeProductImagesCount,
        freeProductVideosCount,
        extraProductImageFee,
        extraProductVideoFee,
        minimumBidValue,
        minimumBidSellerCanModify,
        subtitleFee,
        auctionClosingPeriods,
        auctionClosingTimeFee,
        fixedPriceSaleFee,
        auctionFee,
        negotiationFee,
        auctionClosingPeriodsUnit,
        productFeeDueTime,
        baseCategory,
    createdBy,
        supportsFixedPrice,
        supportsAuction,
        supportsNegotiation,
        showAtHome,
        isRealEstate,
        imageName,
        imageDataUrl
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
        if (!Array.isArray(roles)) {
            return;
        }
        const serialized = JSON.stringify(roles);
        localStorage.setItem(ROLES_STORAGE_KEY, serialized);
    } catch (error) {
        console.warn('Unable to save roles to storage:', error);
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

function saveUsersToStorage() {
    try {
        if (!Array.isArray(users)) {
            return;
        }
        const serialized = JSON.stringify(users);
        localStorage.setItem(USERS_STORAGE_KEY, serialized);
    } catch (error) {
        console.warn('Unable to save users to storage:', error);
    }
}

function loadCategoriesFromStorage() {
    try {
        const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return null;
        const normalized = parsed
            .map((category, index) => normalizeCategoryPayload(category, index))
            .filter(Boolean);
        return normalized.length ? normalized : null;
    } catch (error) {
        console.warn('Unable to load categories from storage:', error);
        return null;
    }
}

function saveCategoriesToStorage() {
    try {
        if (!Array.isArray(categories)) {
            return;
        }
        const serialized = JSON.stringify(categories);
        localStorage.setItem(CATEGORIES_STORAGE_KEY, serialized);
    } catch (error) {
        console.warn('Unable to save categories to storage:', error);
    }
}

function backfillMissingUserCreators(defaultCreatorId) {
    if (!Number.isInteger(defaultCreatorId)) {
        return;
    }

    let updated = false;
    users.forEach(user => {
        if (!user) {
            return;
        }
        const hasCreator = typeof user.createdBy === 'number' && Number.isFinite(user.createdBy);
        if (hasCreator) {
            return;
        }
        if (user.id === defaultCreatorId) {
            return;
        }
        user.createdBy = defaultCreatorId;
        updated = true;
    });

    if (updated) {
        saveUsersToStorage();
    }
}

async function regenerateUserInvitation(user, options = {}) {
    if (!user) {
        return {
            emailResult: { status: 'error', message: 'User record missing.' }
        };
    }

    const {
        updateRegistrationFlow = true,
        invitedBy: invitedByOverride = null
    } = options;

    ensureUserInvitationRecord(user);

    const now = new Date();
    const sentAtIso = now.toISOString();
    const newToken = generateRegistrationToken();
    const newExpiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MS).toISOString();
    const newOtp = generateRegistrationOtp();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;
    const previousToken = user.invitation.token || null;

    if (!Array.isArray(user.invitation.revokedTokens)) {
        user.invitation.revokedTokens = [];
    }

    if (previousToken) {
        user.invitation.revokedTokens.unshift({ token: previousToken, revokedAt: sentAtIso });
        if (user.invitation.revokedTokens.length > 10) {
            user.invitation.revokedTokens = user.invitation.revokedTokens.slice(0, 10);
        }
    }

    user.invitation.token = newToken;
    user.invitation.sentAt = sentAtIso;
    user.invitation.expiresAt = newExpiresAt;
    user.invitation.otp = newOtp;
    user.invitation.lastOtpSentAt = sentAtIso;
    user.invitation.completedAt = null;
    user.invitation.verifiedAt = null;

    if (updateRegistrationFlow && state.registrationFlow.userId === user.id) {
        state.registrationFlow.otp = newOtp;
        state.registrationFlow.expiresAt = otpExpiresAt;
        state.registrationFlow.token = newToken;
        state.registrationFlow.linkExpiresAt = newExpiresAt;
        state.registrationFlow.link = buildAbsoluteInvitationLink(newToken);
        updateRegistrationLinkDisplay(newToken);
    }

    const invitedBy = invitedByOverride || resolveInvitationSenderLabel();
    const emailResult = await deliverInvitationEmail(user, {
        otp: newOtp,
        token: newToken,
        expiresAt: otpExpiresAt,
        linkExpiresAt: newExpiresAt,
        invitedBy
    });

    return {
        emailResult,
        token: newToken,
        linkExpiresAt: newExpiresAt,
        otpExpiresAt,
        sentAt: sentAtIso
    };
}

async function resendUserInvitation(userId, options = {}) {
    const { silent = false, skipRender = false } = options;
    const user = Number.isInteger(userId) ? users.find(item => item.id === userId) : null;
    if (!user) {
        if (!silent) {
            showNotification('error', 'Unable to locate the user for invitation resend.');
        }
        return { status: 'error', message: 'User not found.' };
    }

    ensureUserInvitationRecord(user);

    const status = (user.status || '').toLowerCase();
    if (status !== 'pending') {
        if (!silent) {
            showNotification('info', 'Invitation emails can only be resent for users who are still pending activation.');
        }
        return { status: 'skipped', message: 'User not pending.' };
    }

    const result = await regenerateUserInvitation(user, {
        updateRegistrationFlow: true
    });

    saveUsersToStorage();

    if (!silent) {
        if (result.emailResult.status === 'sent') {
            showNotification('success', `A new invitation email was sent to ${user.email}.`, 6000);
        } else if (result.emailResult.status === 'skipped') {
            showNotification('info', `Invitation refreshed for ${user.email}. Share the updated link manually.`, 7000);
        } else {
            showNotification('warning', `Failed to deliver the invitation to ${user.email}: ${result.emailResult.message}.`, 8000);
        }
    }

    if (!skipRender) {
        renderUsersTable(state.userSearchTerm, state.currentUserPage);
    }

    return result.emailResult;
}

function setupPermissionMatrixInteractions(root) {
    if (!root) return;

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

    const appCheckboxes = root.querySelectorAll('.permission-app-checkbox');
    appCheckboxes.forEach(appCheckbox => {
        appCheckbox.addEventListener('change', event => {
            const checkbox = event.target;
            syncAppPermissionRow(checkbox);
            const sectionCard = checkbox.closest('.permission-section');
            if (sectionCard) {
                refreshSectionCheckboxState(sectionCard);
            }
            setRolePermissionsError('');
        });
        syncAppPermissionRow(appCheckbox);
    });

    const actionSelects = root.querySelectorAll('.permission-action-ddl');
    actionSelects.forEach(select => {
        select.addEventListener('change', () => {
            setRolePermissionsError('');
        });
    });

    root.querySelectorAll('.permission-section').forEach(sectionCard => {
        refreshSectionCheckboxState(sectionCard);
    });
}

function syncAppPermissionRow(appCheckbox) {
    if (!appCheckbox) return;
    const row = appCheckbox.closest('.permission-app-row');
    if (!row) return;

    const actionSelect = row.querySelector('.permission-action-ddl');
    if (!actionSelect) return;

    const isChecked = Boolean(appCheckbox.checked);
    actionSelect.disabled = !isChecked;

    if (!isChecked) {
        actionSelect.selectedIndex = 0;
    } else if (!actionSelect.value && actionSelect.options.length) {
        actionSelect.selectedIndex = 0;
    }
}

function refreshSectionCheckboxState(sectionCard) {
    if (!sectionCard) return;
    const sectionCheckbox = sectionCard.querySelector('.permission-section-checkbox');
    if (!sectionCheckbox) return;

    const appCheckboxes = Array.from(sectionCard.querySelectorAll('.permission-app-checkbox'));
    if (!appCheckboxes.length) {
        sectionCheckbox.checked = false;
        sectionCheckbox.indeterminate = false;
        return;
    }

    const checkedCount = appCheckboxes.filter(checkbox => checkbox.checked).length;
    if (checkedCount === 0) {
        sectionCheckbox.checked = false;
        sectionCheckbox.indeterminate = false;
    } else if (checkedCount === appCheckboxes.length) {
        sectionCheckbox.checked = true;
        sectionCheckbox.indeterminate = false;
    } else {
        sectionCheckbox.checked = false;
        sectionCheckbox.indeterminate = true;
    }
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

    const submitIconEl = document.getElementById('roleFormSubmitIcon');
    const submitLabelEl = document.getElementById('roleFormSubmitLabel');

    if (mode === 'edit' && role) {
        if (submitIconEl) {
            submitIconEl.className = 'fas fa-save';
        }
        if (submitLabelEl) {
            submitLabelEl.textContent = 'Save';
        }
    } else {
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
    const idInput = document.getElementById('roleIdInput');
    const arabicInput = document.getElementById('roleNameArabicInput');
    const englishInput = document.getElementById('roleNameEnglishInput');
    const descriptionInput = document.getElementById('roleDescriptionInput');

    if (idInput) {
        idInput.value = role.id || '';
        idInput.readOnly = true; // Prevent editing ID on edit
    }
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

function setRoleModuleTitle(title) {
    const titleEl = document.getElementById('roleModuleTitle');
    if (!titleEl) {
        return;
    }
    const text = typeof title === 'string' && title.trim() ? title.trim() : 'User Roles';
    titleEl.textContent = text;
}

function setCategoryModuleTitle(title) {
    const titleEl = document.getElementById('categoryModuleTitle');
    if (!titleEl) {
        return;
    }
    const text = typeof title === 'string' && title.trim() ? title.trim() : 'Categories';
    titleEl.textContent = text;
}

function setUsersModuleTitle(title) {
    const titleEl = document.getElementById('usersModuleTitle');
    if (!titleEl) {
        return;
    }
    const text = typeof title === 'string' && title.trim() ? title.trim() : 'User Accounts';
    titleEl.textContent = text;
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
        setRoleModuleTitle('Edit User Role');
    } else {
        focusArabicInput();
        setRoleModuleTitle('Add New User Role');
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
    setRoleModuleTitle('User Roles');
    updateBreadcrumb('users');
}

function ensureSeedDataReset() {
    try {
        const recordedVersion = localStorage.getItem(DATA_RESET_KEY);
        if (recordedVersion !== DATA_RESET_VERSION) {
            localStorage.removeItem(ROLES_STORAGE_KEY);
            localStorage.removeItem(USERS_STORAGE_KEY);
            localStorage.removeItem(CATEGORIES_STORAGE_KEY);
            localStorage.setItem(DATA_RESET_KEY, DATA_RESET_VERSION);
        }
    } catch (error) {
        console.warn('Unable to reset stored datasets:', error);
    }
}

function ensureCategoryDatasetCleared() {
    try {
        const recordedVersion = localStorage.getItem(CATEGORY_RESET_KEY);
        if (recordedVersion !== CATEGORY_RESET_VERSION) {
            localStorage.removeItem(CATEGORIES_STORAGE_KEY);
            localStorage.setItem(CATEGORY_RESET_KEY, CATEGORY_RESET_VERSION);
        }
    } catch (error) {
        console.warn('Unable to clear category dataset:', error);
    }
}

function initializeApp() {
    if (!enforceActiveSession()) {
        return;
    }

    ensureSeedDataReset();
    ensureCategoryDatasetCleared();
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

    const storedCategories = loadCategoriesFromStorage();
    if (storedCategories && storedCategories.length) {
        categories = storedCategories;
    } else {
        categories = defaultCategories.map((category, index) => normalizeCategoryPayload(category, index)).filter(Boolean);
        saveCategoriesToStorage();
    }

    if (!ensureSessionUserIsActive()) {
        return;
    }
    updateActiveUserChip(state.activeSession.user);

    const sessionCreatorId = getActiveSessionUserId();
    backfillMissingUserCreators(sessionCreatorId);

    syncRoleUserCounts();
    saveRolesToStorage();

    setupEventListeners();
    updateRegistrationLinkDisplay(null);
    renderStats();
    renderChart();
    renderActivity();
    renderRolesTable();
    renderUsersTable();
    renderCategoriesTable();
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

    const categorySearchInput = document.getElementById('categorySearchInput');
    if (categorySearchInput) {
        categorySearchInput.value = state.categorySearchTerm || '';
    }

    setupCategoryConfirmOverlay();
    setupRoleConfirmOverlay();
    setupRolePromptOverlay();
    setupUserConfirmOverlay();
    setupUserPromptOverlay();
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
            // Ensure default landing views for Categories & Specifications apps
            if (sectionId === 'categories') {
                if (targetId === 'categories-app1') {
                    // Category Management → always show Categories by default
                    try {
                        hideCategoryBuilder();
                        if (typeof setCategoryModuleTitle === 'function') {
                            setCategoryModuleTitle('Categories');
                        }
                    } catch (e) {
                        // no-op
                    }
                } else if (targetId === 'categories-app2') {
                    // Specifications Management → ensure Specification Library list is visible
                    const specList = document.querySelector('#categories-app2 #specificationsListView');
                    if (specList) {
                        specList.classList.remove('hidden');
                    }
                }
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

    const addCategoryBtn = document.getElementById('newCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            startCreateCategory();
        });
    }

    const cancelCategoryFormBtn = document.getElementById('cancelCategoryFormBtn');
    if (cancelCategoryFormBtn) {
        cancelCategoryFormBtn.addEventListener('click', () => {
            hideCategoryBuilder();
        });
    }

    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    }

    initializeCategoryFormToggles();
    initializeAuctionPeriodsPicker();

    const categoryImageInput = document.getElementById('categoryImageInput');
    if (categoryImageInput) {
        categoryImageInput.addEventListener('change', async event => {
            const file = event.target && event.target.files ? event.target.files[0] : null;
            if (!file) {
                const storedDataUrl = categoryImageInput.dataset ? categoryImageInput.dataset.storedDataUrl : '';
                const storedImageName = categoryImageInput.dataset ? categoryImageInput.dataset.storedImageName : '';
                updateCategoryImagePreview(storedDataUrl || '', storedImageName || '');
                return;
            }
            try {
                const dataUrl = await readFileAsDataUrl(file);
                if (categoryImageInput.dataset) {
                    categoryImageInput.dataset.storedDataUrl = dataUrl || '';
                    categoryImageInput.dataset.storedImageName = file.name || 'category-image';
                }
                if (dataUrl) {
                    updateCategoryImagePreview(dataUrl, file.name || '');
                } else {
                    updateCategoryImagePreview(null);
                }
            } catch (error) {
                console.warn('Unable to render category image preview:', error);
                updateCategoryImagePreview(null);
                showNotification('warning', 'Unable to preview selected image.', 3000, 'categoryNotificationArea');
            }
        });
    }

    const categoryImagePreviewEl = document.getElementById('categoryImagePreview');
    if (categoryImagePreviewEl && categoryImagePreviewEl.dataset.previewBound !== 'true') {
        const triggerModal = () => {
            const source = categoryImagePreviewEl.dataset.fullImage || '';
            if (!source) {
                return;
            }
            openCategoryImageModal(source, categoryImagePreviewEl.dataset.imageName || '');
        };

        categoryImagePreviewEl.addEventListener('click', triggerModal);
        categoryImagePreviewEl.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                triggerModal();
            }
        });
        categoryImagePreviewEl.dataset.previewBound = 'true';
    }

    const categoryImageModal = document.getElementById('categoryImageModal');
    if (categoryImageModal && categoryImageModal.dataset.bound !== 'true') {
        categoryImageModal.addEventListener('click', event => {
            if (event.target === categoryImageModal) {
                closeCategoryImageModal();
            }
        });
        categoryImageModal.dataset.bound = 'true';
    }

    const closeCategoryImageModalBtn = document.getElementById('closeCategoryImageModalBtn');
    if (closeCategoryImageModalBtn && closeCategoryImageModalBtn.dataset.bound !== 'true') {
        closeCategoryImageModalBtn.addEventListener('click', () => closeCategoryImageModal());
        closeCategoryImageModalBtn.dataset.bound = 'true';
    }

    const categorySearchInput = document.getElementById('categorySearchInput');
    if (categorySearchInput) {
        const triggerSearch = () => handleCategorySearch();
        categorySearchInput.addEventListener('input', triggerSearch);
        categorySearchInput.addEventListener('search', triggerSearch);
        categorySearchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleCategorySearch();
            }
        });
    }

    const categoryFeeDueSelect = document.getElementById('categoryFeeDueTimeInput');
    if (categoryFeeDueSelect && !categoryFeeDueSelect.dataset.constraintInitialized) {
        categoryFeeDueSelect.addEventListener('change', enforceAdPublishingFeeTypeConstraints);
        categoryFeeDueSelect.dataset.constraintInitialized = 'true';
    }

    const categoryPriceTypeSelect = document.getElementById('categoryPriceTypeInput');
    if (categoryPriceTypeSelect && !categoryPriceTypeSelect.dataset.constraintInitialized) {
        categoryPriceTypeSelect.addEventListener('change', enforceAdPublishingFeeTypeConstraints);
        categoryPriceTypeSelect.dataset.constraintInitialized = 'true';
    }

    enforceAdPublishingFeeTypeConstraints();

    const categoryDirectory = document.getElementById('categoryDirectoryView');
    if (categoryDirectory && !categoryDirectory.dataset.actionsInitialized) {
        categoryDirectory.addEventListener('click', handleCategoryGridClick);
        categoryDirectory.dataset.actionsInitialized = 'true';
    }

    const categoryGridBody = document.getElementById('categoryGridBody');
    if (categoryGridBody && categoryGridBody.dataset.scrollSync !== 'true') {
        categoryGridBody.addEventListener('scroll', handleCategoryGridBodyScroll, { passive: true });
        categoryGridBody.dataset.scrollSync = 'true';
    }

    if (!categoryDrawerResizeBound && typeof window !== 'undefined') {
        const resizeHandler = () => syncCategoryDetailDrawerPosition();
        window.addEventListener('resize', resizeHandler);
        categoryDrawerResizeBound = true;
    }

    const categoryTreeSearchInput = document.getElementById('categoryTreeSearchInput');
    if (categoryTreeSearchInput) {
        categoryTreeSearchInput.addEventListener('input', event => handleCategoryTreeSearchInput(event.target.value));
        categoryTreeSearchInput.addEventListener('search', event => handleCategoryTreeSearchInput(event.target.value));
    }

    const expandAllBtn = document.getElementById('categoryExpandAllBtn');
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => handleCategoryExpandCollapse('expand'));
    }

    const collapseAllBtn = document.getElementById('categoryCollapseAllBtn');
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', () => handleCategoryExpandCollapse('collapse'));
    }

    const explorerToggleBtn = document.getElementById('categoryExplorerToggleBtn');
    if (explorerToggleBtn && explorerToggleBtn.dataset.toggleInitialized !== 'true') {
        explorerToggleBtn.addEventListener('click', () => {
            setCategoryExplorerCollapsed(!state.categoryExplorerCollapsed);
        });
        explorerToggleBtn.dataset.toggleInitialized = 'true';
    }

    const detailSearchInput = document.getElementById('categoryDetailSearchInput');
    if (detailSearchInput) {
        const handler = event => handleCategoryDetailSearchInput(event.target.value);
        detailSearchInput.addEventListener('input', handler);
        detailSearchInput.addEventListener('search', handler);
    }

    const statusFilter = document.getElementById('categoryStatusFilter');
    if (statusFilter) {
        const currentStatusFilter = ['all', 'active', 'inactive'].includes(state.categoryStatusFilter)
            ? state.categoryStatusFilter
            : 'all';
        statusFilter.value = currentStatusFilter;
        state.categoryStatusFilter = currentStatusFilter;
        statusFilter.addEventListener('change', event => handleCategoryStatusFilterChange(event.target.value));
    }

    const depthFilter = document.getElementById('categoryDepthFilter');
    if (depthFilter) {
        depthFilter.addEventListener('change', event => handleCategoryDepthFilterChange(event.target.value));
    }

    updateCategoryDepthFilterOptions();

    const columnToggleBtn = document.getElementById('categoryColumnToggleBtn');
    if (columnToggleBtn) {
        columnToggleBtn.addEventListener('click', toggleCategoryColumnChooser);
    }

    const compareToggleBtn = document.getElementById('categoryCompareToggleBtn');
    if (compareToggleBtn) {
        compareToggleBtn.addEventListener('click', () => toggleCategoryCompareMode());
    }

    const exportBtn = document.getElementById('categoryExportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportCategoryView());
    }

    initializeCategoryImportWorkflow();

    const importBtn = document.getElementById('categoryImportBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => openCategoryImportOverlay());
    }

    const bulkActivateBtn = document.getElementById('categoryBulkActivateBtn');
    if (bulkActivateBtn) {
        bulkActivateBtn.addEventListener('click', () => handleCategoryBulkAction('activate'));
    }

    const bulkArchiveBtn = document.getElementById('categoryBulkArchiveBtn');
    if (bulkArchiveBtn) {
        bulkArchiveBtn.addEventListener('click', () => handleCategoryBulkAction('archive'));
    }

    const bulkModifyBtn = document.getElementById('categoryBulkModifyBtn');
    if (bulkModifyBtn) {
        bulkModifyBtn.addEventListener('click', () => handleCategoryBulkAction('modify'));
    }

    const deleteAllBtn = document.getElementById('categoryDeleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', handleCategoryDeleteAllRequest);
    }

    if (!categoryGlobalDeselectHandlerBound) {
        document.addEventListener('click', handleGlobalCategoryDeselect);
        categoryGlobalDeselectHandlerBound = true;
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
        applyAccountExpirationConstraints(userAccountExpiration);
        userAccountExpiration.addEventListener('focus', () => applyAccountExpirationConstraints(userAccountExpiration));
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
    const userPhotoInput = document.getElementById('userPhotoInput');

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
    if (userPhotoInput) {
        userPhotoInput.addEventListener('change', handleAdminPhotoUpload);
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
                if (state.userFormStep === 1) {
                    return;
                }
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

    setCategoryExplorerCollapsed(state.categoryExplorerCollapsed);

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
        categories: 'Categories',
        settings: 'Settings',
        reports: 'Reports',
        diagrams: 'Diagrams',
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

    if (sectionId === 'categories') {
        const builder = document.getElementById('categoryBuilderView');
        if (builder && !builder.classList.contains('hidden')) {
            appLabel = state.categoryBuilderMode === 'edit' ? 'Edit Category' : 'Add New Category';
        }
    }

    breadcrumb.textContent = `Control Panel / ${sectionLabel} / ${appLabel}`;
}

function generateCategoryId() {
    const pool = Array.isArray(categories) ? categories : [];
    const numericValues = pool
        .map(entry => {
            if (!entry || typeof entry.id !== 'string') {
                return NaN;
            }
            const match = entry.id.match(/CAT-(\d+)/i);
            return match ? Number.parseInt(match[1], 10) : NaN;
        })
        .filter(Number.isFinite);

    const nextValue = numericValues.length ? Math.max(...numericValues) + 1 : 1;
    return `CAT-${String(nextValue).padStart(3, '0')}`;
}

function getCategoryStatusLabel(status) {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    if (['active', 'published', 'enabled', 'live'].includes(normalized)) return 'Active';
    if (['inactive', 'archived', 'retired', 'disabled', 'suspended'].includes(normalized)) return 'Inactive';
    if (normalized === 'in-review') return 'In Review';
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'draft') return 'Draft';
    if (!normalized) return 'Draft';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getCategoryStatusClass(status) {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    if (['active', 'published', 'enabled', 'live'].includes(normalized)) return 'status-badge status-active';
    if (['inactive', 'archived', 'retired', 'disabled', 'suspended'].includes(normalized)) return 'status-badge status-inactive';
    if (normalized === 'draft' || normalized === 'pending') return 'status-badge status-pending';
    if (normalized === 'in-review') return 'status-badge status-pending';
    return 'status-badge status-pending';
}

function getCategoryStatusFilterGroup(status) {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    if (!normalized) return 'active';
    if (['inactive', 'archived', 'retired', 'disabled', 'suspended', 'removed', 'deleted', 'pending'].includes(normalized)) {
        return 'inactive';
    }
    if (normalized === 'draft') {
        return 'inactive';
    }
    return 'active';
}

function updateCategoryBadges() {
    const totalCategories = Array.isArray(categories) ? categories.length : 0;
    const totalSpecifications = Array.isArray(categories)
        ? categories.reduce((sum, entry) => sum + (Number.isFinite(entry.specificationCount) ? entry.specificationCount : 0), 0)
        : 0;

    const deleteAllBtn = document.getElementById('categoryDeleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.disabled = totalCategories === 0;
    }

    const categoryBadge = document.getElementById('categoryCountLabel');
    if (categoryBadge) {
        const label = totalCategories === 1 ? 'Category' : 'Categories';
        categoryBadge.textContent = `#${totalCategories} ${label}`;
    }

    const specificationBadge = document.getElementById('specificationCountLabel');
    if (specificationBadge) {
        const label = totalSpecifications === 1 ? 'Specification' : 'Specifications';
        specificationBadge.textContent = `#${totalSpecifications} ${label}`;
    }
}

function deleteAllCategories({ refresh = true } = {}) {
    categories = [];
    try {
        localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to clear stored categories dataset:', error);
    }
    saveCategoriesToStorage();
    state.categorySelectedIds.clear();
    state.categoryCompareSelection = [];
    state.categoryCompareMode = false;
    state.categoryFilteredList = [];
    rebuildCategoryCaches();
    updateCategorySelectionSummary();
    if (refresh) {
        refreshCategoryDirectoryView({ rebuildCaches: true, resetScroll: true });
    } else {
        updateCategoryBadges();
    }
}

function renderCategoriesTable() {
    refreshCategoryDirectoryView({ rebuildCaches: true, resetScroll: true });
}

function resolveCategoryByIdentifier(identifier) {
    if (!identifier || !Array.isArray(categories)) {
        return null;
    }
    const normalized = String(identifier).trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    if (categoryLookupByCode instanceof Map && categoryLookupByCode.size) {
        const normalizedCode = normalizeCategoryCodeCandidate(identifier);
        if (normalizedCode && categoryLookupByCode.has(normalizedCode)) {
            return categoryLookupByCode.get(normalizedCode);
        }
        if (categoryLookupByCode.has(normalized)) {
            return categoryLookupByCode.get(normalized);
        }
    }
    return categories.find(entry => {
        if (!entry) return false;
        const idMatches = entry.id && String(entry.id).trim().toLowerCase() === normalized;
        const codeMatches = entry.categoryCode && String(entry.categoryCode).trim().toLowerCase() === normalized;
        return idMatches || codeMatches;
    }) || null;
}

function handleCategorySearch() {
    const input = document.getElementById('categorySearchInput');
    if (!input) return;
    const trimmed = input.value.trim();
    state.categoryDetailSearchTerm = trimmed;
    const detailInput = document.getElementById('categoryDetailSearchInput');
    if (detailInput && detailInput.value !== trimmed) {
        detailInput.value = trimmed;
    }
    refreshCategoryDirectoryView({ keepScroll: false });
}

function compareCategoriesForTree(a, b) {
    const codeA = typeof a.categoryCode === 'string' ? a.categoryCode.trim().toLowerCase() : '';
    const codeB = typeof b.categoryCode === 'string' ? b.categoryCode.trim().toLowerCase() : '';
    if (codeA !== codeB) {
        if (!codeA) return 1;
        if (!codeB) return -1;
        return codeA.localeCompare(codeB);
    }
    const nameA = (a.nameEnglish || a.nameArabic || '').trim().toLowerCase();
    const nameB = (b.nameEnglish || b.nameArabic || '').trim().toLowerCase();
    if (nameA && nameB && nameA !== nameB) {
        return nameA.localeCompare(nameB);
    }
    if (!nameA && nameB) return 1;
    if (!nameB && nameA) return -1;
    return (a.id || '').localeCompare(b.id || '');
}

function rebuildCategoryCaches() {
    categoryLookupById = new Map();
    categoryLookupByCode = new Map();
    categoryChildrenLookup = new Map();
    categoryDepthLookup = new Map();
    categoryParentLookup = new Map();
    categoryDescendantCache = new Map();

    categoryDepthLookup.set(CATEGORY_TREE_ROOT_ID, 0);
    categoryChildrenLookup.set(CATEGORY_TREE_ROOT_ID, []);

    if (!Array.isArray(categories)) {
        return;
    }

    categories.forEach(category => {
        if (!category || typeof category.id !== 'string') {
            return;
        }
        const id = category.id.trim();
        if (!id) return;
        categoryLookupById.set(id, category);
        const normalizedCode = normalizeCategoryCodeCandidate(category.categoryCode || id);
        if (normalizedCode) {
            categoryLookupByCode.set(normalizedCode, category);
            if (normalizedCode.endsWith('.')) {
                const withoutDot = normalizedCode.slice(0, -1);
                if (withoutDot && !categoryLookupByCode.has(withoutDot)) {
                    categoryLookupByCode.set(withoutDot, category);
                }
            }
        }
        const normalizedId = id.toLowerCase();
        if (normalizedId && !categoryLookupByCode.has(normalizedId)) {
            categoryLookupByCode.set(normalizedId, category);
        }
        const parentId = getCategoryParentId(category);
        categoryParentLookup.set(id, parentId);
        if (!categoryChildrenLookup.has(parentId)) {
            categoryChildrenLookup.set(parentId, []);
        }
        categoryChildrenLookup.get(parentId).push(category);
        if (!categoryChildrenLookup.has(id)) {
            categoryChildrenLookup.set(id, []);
        }
    });

    categoryChildrenLookup.forEach(list => {
        if (Array.isArray(list) && list.length > 1) {
            list.sort(compareCategoriesForTree);
        }
    });

    const traverse = (parentId, depth) => {
        const children = categoryChildrenLookup.get(parentId) || [];
        children.forEach(child => {
            const childId = child.id;
            categoryDepthLookup.set(childId, depth + 1);
            traverse(childId, depth + 1);
        });
    };

    traverse(CATEGORY_TREE_ROOT_ID, 0);

    updateCategoryDepthFilterOptions();
}

function getCategoryParentId(category) {
    if (!category) return CATEGORY_TREE_ROOT_ID;
    const explicit = typeof category.parentCategoryId === 'string' ? category.parentCategoryId.trim() : '';
    if (explicit) return explicit;
    return CATEGORY_TREE_ROOT_ID;
}

function updateChildCategoryParentLabels(parentId, parentLabel) {
    if (!parentId || !Array.isArray(categories)) {
        return;
    }
    const normalizedLabel = typeof parentLabel === 'string' ? parentLabel.trim() : '';
    categories.forEach(entry => {
        if (!entry || entry.id === parentId) {
            return;
        }
        const entryParentId = getCategoryParentId(entry);
        if (entryParentId === parentId) {
            entry.parent = normalizedLabel;
        }
    });
}

function updateCategoryDepthFilterOptions() {
    if (typeof document === 'undefined') return;
    const depthSelect = document.getElementById('categoryDepthFilter');
    if (!depthSelect) return;

    const depthValues = Array.from(categoryDepthLookup.values());
    const maxRecordedDepth = depthValues.length ? Math.max(...depthValues) : 0;
    const maxDepth = Math.max(1, maxRecordedDepth);
    const desiredValue = typeof state.categoryDepthFilter === 'string' ? state.categoryDepthFilter : 'all';

    const doc = depthSelect.ownerDocument || document;
    const fragment = doc.createDocumentFragment();

    const appendOption = (value, label) => {
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = label;
        fragment.appendChild(option);
    };

    appendOption('all', 'All Levels');
    appendOption('0', 'Selected Level');
    for (let level = 1; level <= maxDepth; level += 1) {
        appendOption(String(level), `+${level} Level${level === 1 ? '' : 's'}`);
    }

    depthSelect.innerHTML = '';
    depthSelect.appendChild(fragment);

    const availableValues = new Set(Array.from(depthSelect.options).map(option => option.value));
    const nextValue = availableValues.has(desiredValue) ? desiredValue : 'all';
    depthSelect.value = nextValue;
    state.categoryDepthFilter = nextValue;
}

function collectCategoryAncestorIds(categoryId) {
    const ancestors = [];
    let currentId = categoryId;
    const guard = new Set();
    while (currentId && currentId !== CATEGORY_TREE_ROOT_ID && !guard.has(currentId)) {
        guard.add(currentId);
        const parentId = categoryParentLookup.get(currentId) || CATEGORY_TREE_ROOT_ID;
        if (parentId && parentId !== CATEGORY_TREE_ROOT_ID) {
            ancestors.push(parentId);
        }
        currentId = parentId;
    }
    if (!ancestors.includes(CATEGORY_TREE_ROOT_ID)) {
        ancestors.push(CATEGORY_TREE_ROOT_ID);
    }
    return ancestors;
}

function collectCategoryDescendants(categoryId) {
    if (!categoryId || !(categoryChildrenLookup instanceof Map)) {
        return [];
    }
    if (categoryDescendantCache.has(categoryId)) {
        const cached = categoryDescendantCache.get(categoryId);
        return Array.isArray(cached) ? cached.slice() : [];
    }

    const descendants = [];
    const visited = new Set();
    const stack = [...(categoryChildrenLookup.get(categoryId) || [])];

    while (stack.length) {
        const current = stack.pop();
        if (!current || typeof current.id !== 'string') {
            continue;
        }
        const normalizedId = current.id.trim();
        if (!normalizedId || visited.has(normalizedId)) {
            continue;
        }
        visited.add(normalizedId);
        descendants.push(current);
        const children = categoryChildrenLookup.get(normalizedId) || [];
        for (let index = children.length - 1; index >= 0; index -= 1) {
            stack.push(children[index]);
        }
    }

    categoryDescendantCache.set(categoryId, descendants);
    return descendants.slice();
}

function ensureCategoryExplorerExpanded(nodeId) {
    if (!nodeId) return;
    state.categoryExplorerExpanded.add(nodeId);
    collectCategoryAncestorIds(nodeId).forEach(id => state.categoryExplorerExpanded.add(id));
}

function collapseCategoryExplorerBranch(nodeId) {
    if (!nodeId) return;
    const visited = new Set();
    const stack = [nodeId];
    while (stack.length) {
        const current = stack.pop();
        if (!current || visited.has(current)) {
            continue;
        }
        visited.add(current);
        if (current !== CATEGORY_TREE_ROOT_ID) {
            state.categoryExplorerExpanded.delete(current);
        }
        const children = categoryChildrenLookup.get(current) || [];
        children.forEach(child => {
            if (child && child.id) {
                stack.push(child.id);
            }
        });
    }
    if (!state.categoryExplorerExpanded.has(CATEGORY_TREE_ROOT_ID)) {
        state.categoryExplorerExpanded.add(CATEGORY_TREE_ROOT_ID);
    }
}

function collapseCategoryExplorer() {
    state.categoryExplorerExpanded.clear();
    state.categoryExplorerExpanded.add(CATEGORY_TREE_ROOT_ID);
}

function resolveDepthLimitFilter(depthValue, _branchId) {
    if (depthValue === 'all') return Infinity;
    const numeric = Number.parseInt(depthValue, 10);
    if (!Number.isFinite(numeric)) {
        return Infinity;
    }
    if (numeric <= 0) {
        return 0;
    }
    return numeric;
}

function collectBranchCategories(branchId, depthFilter) {
    if (!categoryLookupById.size) {
        rebuildCategoryCaches();
    }

    const depthLimit = resolveDepthLimitFilter(depthFilter, branchId);
    const result = [];
    const visited = new Set();
    const baseDepth = branchId === CATEGORY_TREE_ROOT_ID
        ? 0
        : (categoryDepthLookup.get(branchId) || 0);

    if (branchId !== CATEGORY_TREE_ROOT_ID) {
        const anchor = categoryLookupById.get(branchId);
        if (anchor) {
            result.push(anchor);
        }
    }

    const walk = parentId => {
        const children = categoryChildrenLookup.get(parentId) || [];
        children.forEach(child => {
            if (!child || visited.has(child.id)) {
                return;
            }
            visited.add(child.id);
            const childDepth = categoryDepthLookup.get(child.id) || (baseDepth + 1);
            const relativeDepth = branchId === CATEGORY_TREE_ROOT_ID
                ? childDepth
                : (childDepth - baseDepth);
            if (depthLimit === Infinity || relativeDepth <= depthLimit) {
                result.push(child);
            }
            if (depthLimit === Infinity || relativeDepth < depthLimit) {
                walk(child.id);
            }
        });
    };

    walk(branchId);
    return result;
}

function isCategoryRecent(category, days = 30) {
    const reference = category.updatedAt || category.createdAt;
    if (!reference) return false;
    const timestamp = Date.parse(reference);
    if (!Number.isFinite(timestamp)) return false;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return timestamp >= cutoff;
}

function computeFilteredCategoryList() {
    const branchId = state.categoryViewBranchId || CATEGORY_TREE_ROOT_ID;
    const depthFilter = state.categoryDepthFilter || 'all';
    const statusFilter = (state.categoryStatusFilter || 'all').toLowerCase();
    const searchTerm = (state.categoryDetailSearchTerm || '').trim().toLowerCase();

    const baseList = collectBranchCategories(branchId, depthFilter);

    let working = baseList.filter(category => {
        if (!category) return false;
        if (statusFilter !== 'all') {
            const statusGroup = getCategoryStatusFilterGroup(category.status);
            if (statusGroup !== statusFilter) {
                return false;
            }
        }
        if (searchTerm) {
            const haystack = [
                category.categoryCode,
                category.nameEnglish,
                category.nameArabic,
                category.description,
                category.englishDescription,
                category.parent,
                category.owner
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(searchTerm)) {
                return false;
            }
        }
        return true;
    });

    state.categoryFilteredList = working;
}


function renderCategoryBreadcrumbTrail() {
    const nav = document.getElementById('categoryBreadcrumbTrail');
    if (!nav) return;

    const branchId = state.categoryViewBranchId || CATEGORY_TREE_ROOT_ID;
    if (branchId === CATEGORY_TREE_ROOT_ID) {
        nav.innerHTML = '<button type="button" class="breadcrumb-segment active" data-breadcrumb-node="root">All Categories</button>';
        return;
    }

    const path = [];
    let currentId = branchId;
    const guard = new Set();
    while (currentId && !guard.has(currentId) && currentId !== CATEGORY_TREE_ROOT_ID) {
        guard.add(currentId);
        const category = categoryLookupById.get(currentId);
        if (category) {
            path.unshift({ id: category.id, label: getCategoryDisplayName(category) });
        }
        currentId = categoryParentLookup.get(currentId) || CATEGORY_TREE_ROOT_ID;
    }

    const breadcrumbHtml = [
        '<button type="button" class="breadcrumb-segment" data-breadcrumb-node="root">All Categories</button>',
        ...path.map((segment, index) => {
            const isLast = index === path.length - 1;
            const classes = ['breadcrumb-segment'];
            if (isLast) classes.push('active');
            return `<button type="button" class="${classes.join(' ')}" data-breadcrumb-node="${escapeAttribute(segment.id)}">${escapeHtml(segment.label)}</button>`;
        })
    ].join('<span class="breadcrumb-divider">&rsaquo;</span>');

    nav.innerHTML = breadcrumbHtml;
}

function resetCategoryDirectoryFilters({ refresh = true } = {}) {
    state.categoryViewBranchId = CATEGORY_TREE_ROOT_ID;
    state.currentCategoryPage = 1;
    state.categoryStatusFilter = 'all';
    state.categoryDepthFilter = 'all';
    state.categoryDetailSearchTerm = '';
    state.categorySearchTerm = '';
    state.categoryTreeSearchTerm = '';
    state.categorySelectedIds.clear();
    state.categoryCompareMode = false;
    state.categoryCompareSelection = [];

    const compareToggleBtn = document.getElementById('categoryCompareToggleBtn');
    if (compareToggleBtn) {
        compareToggleBtn.classList.remove('active');
    }

    updateCategoryCompareDrawer();

    state.categoryExplorerExpanded = new Set([CATEGORY_TREE_ROOT_ID]);

    const headerSearch = document.getElementById('categorySearchInput');
    if (headerSearch) {
        headerSearch.value = '';
    }

    const detailSearch = document.getElementById('categoryDetailSearchInput');
    if (detailSearch) {
        detailSearch.value = '';
    }

    const treeSearch = document.getElementById('categoryTreeSearchInput');
    if (treeSearch) {
        treeSearch.value = '';
    }

    const statusFilter = document.getElementById('categoryStatusFilter');
    if (statusFilter) {
        statusFilter.value = 'all';
    }

    const depthFilter = document.getElementById('categoryDepthFilter');
    if (depthFilter) {
        depthFilter.value = 'all';
    }

    renderCategoryRelatedDrawer(null);
    updateCategorySelectionSummary();

    if (refresh) {
        refreshCategoryDirectoryView({ rebuildCaches: true, resetScroll: true });
    }
}

function highlightSearchMatch(label, term) {
    if (!term) return escapeHtml(label);
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return escapeHtml(label).replace(regex, '<mark>$1</mark>');
}

function renderCategoryTree() {
    const container = document.getElementById('categoryTreeContainer');
    if (!container) return;

    if (!categoryLookupById.size) {
        rebuildCategoryCaches();
    }

    const searchTerm = (state.categoryTreeSearchTerm || '').trim().toLowerCase();
    const matchedIds = new Set();

    if (searchTerm) {
        categories.forEach(category => {
            if (!category) return;
            const haystack = [
                category.categoryCode,
                category.nameEnglish,
                category.nameArabic
            ].filter(Boolean).join(' ').toLowerCase();
            if (haystack.includes(searchTerm)) {
                matchedIds.add(category.id);
                collectCategoryAncestorIds(category.id).forEach(id => matchedIds.add(id));
            }
        });
    }

    if (!state.categoryExplorerExpanded.size) {
        state.categoryExplorerExpanded.add(CATEGORY_TREE_ROOT_ID);
    }

    matchedIds.forEach(id => ensureCategoryExplorerExpanded(id));

    const buildMarkup = (parentId, depth) => {
        const children = categoryChildrenLookup.get(parentId) || [];
        if (!children.length) {
            return '';
        }
        return children.map(child => {
            const nodeId = child.id;
            const hasChildren = (categoryChildrenLookup.get(nodeId) || []).length > 0;
            const isExpanded = hasChildren && state.categoryExplorerExpanded.has(nodeId);
            const isSelected = state.categoryViewBranchId === nodeId;
            const relativeDepth = depth + 1;
            const descriptor = `${child.categoryCode ? `${child.categoryCode} · ` : ''}${child.nameEnglish || child.nameArabic || 'Untitled'}`;
            const labelHtml = highlightSearchMatch(descriptor, searchTerm);
            const childMarkup = isExpanded ? `<div class="tree-node-children" role="group">${buildMarkup(nodeId, relativeDepth)}</div>` : '';
            const badge = (categoryChildrenLookup.get(nodeId) || []).length;
            const badgeHtml = badge ? `<span class="tree-node-badge">${badge}</span>` : '';
            const depthStyle = `style="--depth:${relativeDepth};"`;
            return `
                <div class="tree-node" role="treeitem" aria-level="${relativeDepth}" aria-expanded="${hasChildren ? String(isExpanded) : 'false'}" data-category-node="${escapeAttribute(nodeId)}">
                    <div class="tree-node-row${isSelected ? ' is-selected' : ''}" data-category-select-node="${escapeAttribute(nodeId)}" ${depthStyle}>
                        <button type="button" class="tree-node-toggle${hasChildren ? '' : ' is-leaf'}" data-tree-toggle="${escapeAttribute(nodeId)}" aria-label="${hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'Leaf node'}">
                            <i class="fas ${hasChildren ? (isExpanded ? 'fa-chevron-down' : 'fa-chevron-right') : 'fa-circle'}"></i>
                        </button>
                        <span class="tree-node-label">${labelHtml}</span>
                        ${badgeHtml}
                    </div>
                    ${childMarkup}
                </div>
            `;
        }).join('');
    };

    const markup = buildMarkup(CATEGORY_TREE_ROOT_ID, 0);
    container.innerHTML = markup || '<div class="tree-empty">There is no Data Available</div>';
}

function setCategoryExplorerCollapsed(collapsed) {
    state.categoryExplorerCollapsed = !!collapsed;
    const directory = document.getElementById('categoryDirectoryView');
    if (directory) {
        directory.classList.toggle('explorer-collapsed', state.categoryExplorerCollapsed);
    }
    const toggleBtn = document.getElementById('categoryExplorerToggleBtn');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(!state.categoryExplorerCollapsed));
        toggleBtn.setAttribute('aria-label', state.categoryExplorerCollapsed ? 'Show category explorer' : 'Hide category explorer');
        const label = toggleBtn.querySelector('.label');
        if (label) {
            label.textContent = state.categoryExplorerCollapsed ? 'Show Explorer' : 'Hide Explorer';
        }
    }
}

function getCategoryDisplayName(category) {
    if (!category) return 'Category';
    return category.nameEnglish || category.nameArabic || category.categoryCode || 'Category';
}

function resolveCategoryParentLabel(category) {
    if (!category) {
        return 'Top-level';
    }
    const parentId = getCategoryParentId(category);
    if (!parentId || parentId === CATEGORY_TREE_ROOT_ID) {
        return 'Top-level';
    }
    if (!categoryLookupById.size) {
        rebuildCategoryCaches();
    }
    const parentCategory = categoryLookupById.get(parentId);
    if (parentCategory) {
        return getCategoryDisplayName(parentCategory);
    }
    const fallbackLabel = typeof category.parent === 'string' ? category.parent.trim() : '';
    if (fallbackLabel) {
        return fallbackLabel;
    }
    return parentId;
}

function renderCategoryGrid({ resetPage = false } = {}) {
    const body = document.getElementById('categoryGridBody');
    if (!body) return;

    const total = state.categoryFilteredList.length;
    const perPage = state.categoriesPerPage || 10;

    if (resetPage || !Number.isFinite(state.currentCategoryPage) || state.currentCategoryPage < 1) {
        state.currentCategoryPage = 1;
    }

    if (!total) {
    body.innerHTML = '<div class="category-grid-empty">There is no Data Available</div>';
        updateCategorySelectionSummary();
        renderCategoryRelatedDrawer(null);
        renderCategoryPagination(0, 0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (state.currentCategoryPage > totalPages) {
        state.currentCategoryPage = totalPages;
    }

    const startIndex = (state.currentCategoryPage - 1) * perPage;
    const endIndex = Math.min(total, startIndex + perPage);
    const branchDepth = state.categoryViewBranchId === CATEGORY_TREE_ROOT_ID ? 0 : (categoryDepthLookup.get(state.categoryViewBranchId) || 0);

    const rowsHtml = state.categoryFilteredList.slice(startIndex, endIndex).map((category, index) => {
        const displayIndex = startIndex + index + 1;
        const categoryDepth = categoryDepthLookup.get(category.id) || 0;
        const relativeDepth = Math.max(0, categoryDepth - branchDepth);
        return buildCategoryGridRow(category, displayIndex, relativeDepth);
    }).join('');

    body.innerHTML = rowsHtml;

    updateCategorySelectionSummary();
    renderCategoryPagination(totalPages, total);
    syncCategoryGridHeader();
    syncCategoryDetailDrawerPosition();
}

function syncCategorySelectionStyles() {
    document.querySelectorAll('.category-grid-row').forEach(row => {
        const categoryId = row.dataset.categoryRow;
        row.classList.toggle('is-selected', state.categorySelectedIds.has(categoryId));
    });
}

function clearCategorySelection() {
    if (!state.categorySelectedIds || state.categorySelectedIds.size === 0) {
        return;
    }
    state.categorySelectedIds.clear();
    updateCategorySelectionSummary();
    syncCategorySelectionStyles();
    if (typeof renderCategoryRelatedDrawer === 'function') {
        renderCategoryRelatedDrawer(null);
    }
    if (typeof updateCategoryCompareDrawer === 'function') {
        updateCategoryCompareDrawer();
    }
}

function handleGlobalCategoryDeselect(event) {
    if (!state.categorySelectedIds || state.categorySelectedIds.size === 0) {
        return;
    }
    if (state.currentSection !== 'categories') {
        return;
    }
    const target = event.target;
    if (!target || typeof target.closest !== 'function') {
        return;
    }
    if (target.closest('.category-grid-row')) {
        return;
    }
    if (target.closest('#categoryRelatedDrawer')) {
        return;
    }
    clearCategorySelection();
}

function renderCategoryPagination(totalPages, totalItems) {
    const container = document.getElementById('categoryPagination');
    if (!container) return;

    container.innerHTML = '';

    if (!totalItems || totalPages <= 1 || totalItems <= (state.categoriesPerPage || 10)) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const createButton = (label, page, disabled = false, active = false) => {
        const button = document.createElement('button');
        button.textContent = label;
        if (disabled) {
            button.disabled = true;
        }
        if (active) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            if (page < 1 || page > totalPages || page === state.currentCategoryPage) {
                return;
            }
            state.currentCategoryPage = page;
            renderCategoryGrid();
        });
        return button;
    };

    container.appendChild(createButton('Prev', state.currentCategoryPage - 1, state.currentCategoryPage === 1));

    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
        container.appendChild(createButton(String(pageIndex), pageIndex, false, pageIndex === state.currentCategoryPage));
    }

    container.appendChild(createButton('Next', state.currentCategoryPage + 1, state.currentCategoryPage === totalPages));
}

function syncCategoryGridHeader() {
    const body = document.getElementById('categoryGridBody');
    const header = document.querySelector('.category-grid-header');
    if (!body || !header) {
        return;
    }
    const offset = body.scrollLeft || 0;
    header.style.transform = `translateX(${offset ? -offset : 0}px)`;
}

function handleCategoryGridBodyScroll() {
    syncCategoryGridHeader();
    syncCategoryDetailDrawerPosition();
}

function formatCategoryCreatedMeta(category) {
    const createdLabel = category.createdAt ? formatDateForDisplay(category.createdAt) : '—';
    const createdBy = category.createdBy ? `<div class="user-meta">${escapeHtml(category.createdBy)}</div>` : '';
    return `<div class="created-cell"><div class="created-date">${escapeHtml(createdLabel)}</div>${createdBy}</div>`;
}

function buildCategoryGridRow(category, displayIndex, relativeDepth) {
    const statusClass = getCategoryStatusClass(category.status);
    const statusLabel = getCategoryStatusLabel(category.status);
    const isSelected = state.categorySelectedIds.has(category.id);
    const parentIdForRow = (categoryParentLookup && categoryParentLookup.get(category.id)) || getCategoryParentId(category);
    const parentDisplay = !parentIdForRow || parentIdForRow === CATEGORY_TREE_ROOT_ID
        ? '–'
        : resolveCategoryParentLabel(category);
    return `
        <div class="category-grid-row${isSelected ? ' is-selected' : ''}" role="row" data-category-row="${escapeAttribute(category.id)}" style="--depth:${relativeDepth}">
            <div class="grid-cell index" data-column="index">
                <span class="row-index">${escapeHtml(String(displayIndex))}</span>
            </div>
            <div class="grid-cell code" data-column="code">
                <span class="cell-primary">${escapeHtml(category.categoryCode || category.id)}</span>
            </div>
            <div class="grid-cell name" data-column="name">
                <span class="cell-primary">${escapeHtml(category.nameEnglish || '—')}</span>
            </div>
            <div class="grid-cell description" data-column="description">
                <span class="cell-secondary" title="${escapeAttribute(category.englishDescription || category.description || '—')}">${escapeHtml(category.englishDescription || category.description || '—')}</span>
            </div>
            <div class="grid-cell parent" data-column="parent">
                <span>${escapeHtml(parentDisplay)}</span>
            </div>
            <div class="grid-cell status" data-column="status">
                <span class="${statusClass}">${statusLabel}</span>
            </div>
            <div class="grid-cell created" data-column="created">
                ${formatCategoryCreatedMeta(category)}
            </div>
        </div>
    `;
}

function exportCategoryView() {
    const records = state.categoryFilteredList || [];
    if (!records.length) {
        showNotification('info', 'No categories available to export.', 3200, 'categoryNotificationArea');
        return;
    }

    const headerRowHtml = CATEGORY_EXPORT_COLUMNS
        .map(column => `<th>${escapeHtml(column.label)}</th>`)
        .join('');

    const bodyRowsHtml = records.map((category, index) => {
        const cellsHtml = CATEGORY_EXPORT_COLUMNS.map(column => {
            let value = '';
            try {
                value = typeof column.value === 'function' ? column.value(category, index) : '';
            } catch (error) {
                console.warn(`Unable to derive export value for column "${column.id}"`, error);
                value = '';
            }
            const text = value == null ? '' : String(value);
            return `<td>${escapeHtml(text)}</td>`;
        }).join('');
        return `<tr>${cellsHtml}</tr>`;
    }).join('');

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Categories Export</title><style>table{border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;}th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;}th{background:#f1f5f9;font-weight:600;}</style></head><body><table><thead><tr>${headerRowHtml}</tr></thead><tbody>${bodyRowsHtml}</tbody></table></body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const exportTimestamp = new Date();
    const exportDate = `${String(exportTimestamp.getDate()).padStart(2, '0')}-${String(exportTimestamp.getMonth() + 1).padStart(2, '0')}-${exportTimestamp.getFullYear()}`;
    link.download = `Categories_Export_${exportDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', 'Export ready. Check your downloads.', 3200, 'categoryNotificationArea');
}

function initializeCategoryImportWorkflow() {
    const overlay = document.getElementById('categoryImportOverlay');
    if (!overlay || overlay.dataset.initialized === 'true') {
        return;
    }

    overlay.dataset.initialized = 'true';

    categoryImportElements.overlay = overlay;
    categoryImportElements.dropzone = overlay.querySelector('#categoryImportDropzone');
    categoryImportElements.fileInput = overlay.querySelector('#categoryImportFileInput');
    categoryImportElements.browseBtn = overlay.querySelector('#categoryImportBrowseBtn');
    categoryImportElements.templateBtn = overlay.querySelector('#categoryImportTemplateBtn');
    categoryImportElements.status = overlay.querySelector('#categoryImportStatus');
    categoryImportElements.preview = overlay.querySelector('#categoryImportPreview');
    categoryImportElements.previewTable = overlay.querySelector('#categoryImportPreviewTable');
    categoryImportElements.fileName = overlay.querySelector('#categoryImportFileName');
    categoryImportElements.chip = overlay.querySelector('#categoryImportChip');
    categoryImportElements.submitBtn = overlay.querySelector('#categoryImportSubmitBtn');
    categoryImportElements.submitLabel = overlay.querySelector('#categoryImportSubmitLabel');
    categoryImportElements.cancelBtn = overlay.querySelector('#categoryImportCancelBtn');

    const closeBtn = overlay.querySelector('#categoryImportCloseBtn');

    if (categoryImportElements.dropzone) {
        const { dropzone } = categoryImportElements;
        dropzone.addEventListener('click', () => triggerCategoryImportFilePicker());
        dropzone.addEventListener('keydown', event => handleCategoryImportDropzoneKeydown(event));
        dropzone.addEventListener('dragover', event => handleCategoryImportDragOver(event));
        dropzone.addEventListener('dragleave', event => {
            if (!event.relatedTarget || !dropzone.contains(event.relatedTarget)) {
                dropzone.classList.remove('is-dragover');
            }
        });
        dropzone.addEventListener('drop', event => handleCategoryImportDrop(event));
    }

    if (categoryImportElements.browseBtn) {
        categoryImportElements.browseBtn.addEventListener('click', () => triggerCategoryImportFilePicker());
    }

    if (categoryImportElements.fileInput) {
        categoryImportElements.fileInput.addEventListener('change', event => {
            const file = event.target && event.target.files ? event.target.files[0] : null;
            handleCategoryImportFile(file);
        });
    }

    if (categoryImportElements.templateBtn) {
        categoryImportElements.templateBtn.addEventListener('click', () => downloadCategoryImportTemplate());
    }

    if (categoryImportElements.cancelBtn) {
        categoryImportElements.cancelBtn.addEventListener('click', () => closeCategoryImportOverlay());
    }

    if (categoryImportElements.submitBtn) {
        categoryImportElements.submitBtn.addEventListener('click', () => submitCategoryImport());
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeCategoryImportOverlay());
    }

    overlay.addEventListener('click', event => {
        if (event.target === overlay && !categoryImportState.isSubmitting) {
            closeCategoryImportOverlay();
        }
    });

    resetCategoryImportState();
    refreshCategoryImportControls();
}

function triggerCategoryImportFilePicker() {
    if (categoryImportState.isSubmitting || categoryImportFileDialogOpen) {
        return;
    }
    if (categoryImportElements.fileInput) {
        categoryImportFileDialogOpen = true;
        if (!categoryImportFileDialogFocusHandler) {
            categoryImportFileDialogFocusHandler = () => {
                // When the file dialog closes (regardless of selection), release the guard on the next frame.
                setTimeout(() => {
                    releaseCategoryImportFileDialogGuard();
                }, 0);
            };
            window.addEventListener('focus', categoryImportFileDialogFocusHandler, true);
        }
        categoryImportElements.fileInput.click();
    }
}

function openCategoryImportOverlay() {
    initializeCategoryImportWorkflow();
    if (!categoryImportElements.overlay) {
        return;
    }
    resetCategoryImportState();
    setCategoryImportStatus('Choose an Excel (.xls or .xlsx) or CSV (.csv) file to get started.', 'info');
    categoryImportElements.overlay.classList.remove('hidden');
    categoryImportElements.overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body-locked');
    document.addEventListener('keydown', handleCategoryImportKeydown);
    requestAnimationFrame(() => {
        if (categoryImportElements.dropzone) {
            categoryImportElements.dropzone.focus();
        }
    });
}

function closeCategoryImportOverlay() {
    if (!categoryImportElements.overlay) {
        return;
    }
    categoryImportElements.overlay.classList.add('hidden');
    categoryImportElements.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-locked');
    document.removeEventListener('keydown', handleCategoryImportKeydown);
    releaseCategoryImportFileDialogGuard();
    resetCategoryImportState();
}

function handleCategoryImportKeydown(event) {
    if (event.key === 'Escape' && !categoryImportState.isSubmitting) {
        closeCategoryImportOverlay();
    }
}

function handleCategoryImportDropzoneKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerCategoryImportFilePicker();
    }
}

function handleCategoryImportDragOver(event) {
    event.preventDefault();
    if (categoryImportState.isSubmitting) {
        return;
    }
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
    }
    if (categoryImportElements.dropzone) {
        categoryImportElements.dropzone.classList.add('is-dragover');
    }
}

function handleCategoryImportDrop(event) {
    event.preventDefault();
    if (categoryImportState.isSubmitting) {
        return;
    }
    if (categoryImportElements.dropzone) {
        categoryImportElements.dropzone.classList.remove('is-dragover');
    }
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    handleCategoryImportFile(file);
}

function resetCategoryImportState() {
    releaseCategoryImportFileDialogGuard();
    categoryImportState.file = null;
    categoryImportState.format = 'csv';
    categoryImportState.header = [];
    categoryImportState.rows = [];
    categoryImportState.warnings = [];
    categoryImportState.errors = [];
    categoryImportState.rowMetadata = [];
    categoryImportState.totalRows = 0;
    categoryImportState.truncated = false;
    categoryImportState.isSubmitting = false;

    if (categoryImportElements.fileInput) {
        categoryImportElements.fileInput.value = '';
    }
    if (categoryImportElements.status) {
        categoryImportElements.status.textContent = '';
        categoryImportElements.status.className = 'import-status';
    }
    if (categoryImportElements.preview) {
        categoryImportElements.preview.classList.add('hidden');
    }
    if (categoryImportElements.previewTable) {
        categoryImportElements.previewTable.innerHTML = '';
    }
    if (categoryImportElements.fileName) {
        categoryImportElements.fileName.textContent = '';
    }
    if (categoryImportElements.chip) {
        categoryImportElements.chip.textContent = '';
        categoryImportElements.chip.className = 'import-chip';
    }
    refreshCategoryImportControls();
}

function setCategoryImportStatus(message, tone = 'info') {
    if (!categoryImportElements.status) {
        return;
    }
    const allowed = new Set(['info', 'success', 'error']);
    const appliedTone = allowed.has(tone) ? tone : 'info';
    categoryImportElements.status.className = `import-status ${appliedTone}`;
    categoryImportElements.status.textContent = message || '';
}

function setCategoryImportSubmitting(isSubmitting) {
    categoryImportState.isSubmitting = Boolean(isSubmitting);
    refreshCategoryImportControls();
}

function refreshCategoryImportControls() {
    const isSubmitting = categoryImportState.isSubmitting;
    const hasRows = categoryImportState.rows.length > 0;
    const hasBlockingErrors = categoryImportState.errors.length > 0
        || categoryImportState.rowMetadata.some(meta => meta && meta.severity === 'error');

    if (categoryImportElements.submitBtn) {
        categoryImportElements.submitBtn.disabled = isSubmitting || !hasRows || hasBlockingErrors;
    }
    if (categoryImportElements.submitLabel) {
        categoryImportElements.submitLabel.textContent = isSubmitting ? 'Uploading...' : 'Import';
    }
    if (categoryImportElements.cancelBtn) {
        categoryImportElements.cancelBtn.disabled = isSubmitting;
    }
    if (categoryImportElements.templateBtn) {
        categoryImportElements.templateBtn.disabled = isSubmitting;
    }
    if (categoryImportElements.browseBtn) {
        categoryImportElements.browseBtn.disabled = isSubmitting;
    }
    if (categoryImportElements.dropzone) {
        categoryImportElements.dropzone.classList.toggle('is-disabled', isSubmitting);
        categoryImportElements.dropzone.setAttribute('aria-disabled', isSubmitting ? 'true' : 'false');
        if (isSubmitting) {
            categoryImportElements.dropzone.classList.remove('is-dragover');
        }
    }
}

function handleCategoryImportFile(file) {
    if (categoryImportState.isSubmitting) {
        return;
    }
    releaseCategoryImportFileDialogGuard();
    if (!file) {
        resetCategoryImportState();
        setCategoryImportStatus('No file selected yet.', 'info');
        return;
    }

    const extension = (file.name || '').split('.').pop();
    const normalizedExtension = extension ? extension.trim().toLowerCase() : '';
    const isAllowedExtension = CATEGORY_IMPORT_CONFIG.allowedExtensions.has(normalizedExtension);

    if (!isAllowedExtension) {
        resetCategoryImportState();
        setCategoryImportStatus('Please upload an Excel (.xls or .xlsx) or CSV (.csv) file.', 'error');
        return;
    }

    if (file.size > CATEGORY_IMPORT_CONFIG.maxFileSizeBytes) {
        resetCategoryImportState();
        setCategoryImportStatus('File is too large. Limit is 5 MB.', 'error');
        return;
    }

    categoryImportState.file = file;
    if (normalizedExtension === 'xls') {
        categoryImportState.format = 'xls';
    } else if (normalizedExtension === 'xlsx') {
        categoryImportState.format = 'xlsx';
    } else {
        categoryImportState.format = 'csv';
    }

    if (categoryImportState.format === 'xlsx') {
    setCategoryImportStatus('Loading Excel parser...', 'info');
        ensureCategoryImportXlsxParser()
            .then(() => {
                setCategoryImportStatus('Analyzing file...', 'info');
                const reader = new FileReader();
                reader.onload = event => {
                    const result = event.target?.result;
                    renderCategoryImportAnalysisFromXlsx(result);
                };
                reader.onerror = () => {
                    resetCategoryImportState();
                    setCategoryImportStatus('Unable to read the file. Please try again.', 'error');
                };
                reader.readAsArrayBuffer(file);
            })
            .catch(error => {
                console.error('Failed to prepare XLSX parser:', error);
                resetCategoryImportState();
                setCategoryImportStatus('Unable to process Excel (.xlsx) files right now. Try again or upload a CSV.', 'error');
            });
        return;
    }

    setCategoryImportStatus('Analyzing file...', 'info');

    const reader = new FileReader();
    reader.onload = event => {
        const text = typeof event.target?.result === 'string' ? event.target.result : '';
        renderCategoryImportAnalysisFromText(text);
    };
    reader.onerror = () => {
        resetCategoryImportState();
        setCategoryImportStatus('Unable to read the file. Please try again.', 'error');
    };
    reader.readAsText(file);
}

function renderCategoryImportAnalysisFromText(rawText) {
    if (!rawText) {
        resetCategoryImportState();
        setCategoryImportStatus('The selected file appears to be empty.', 'error');
        return;
    }

    const format = categoryImportState.format || 'csv';
    const parsed = parseCategoryWorkbookPreview(rawText, format, CATEGORY_IMPORT_CONFIG.previewRowLimit);
    applyParsedCategoryImportResult(parsed);
}

function renderCategoryImportAnalysisFromXlsx(rawBuffer) {
    let buffer = null;
    if (rawBuffer instanceof ArrayBuffer) {
        buffer = rawBuffer;
    } else if (ArrayBuffer.isView(rawBuffer) && rawBuffer.buffer instanceof ArrayBuffer) {
        const view = rawBuffer;
        buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    }

    if (!buffer) {
        resetCategoryImportState();
        setCategoryImportStatus('Uploaded Excel file could not be read.', 'error');
        return;
    }

    const parsed = parseCategoryXlsxPreview(buffer, CATEGORY_IMPORT_CONFIG.previewRowLimit);
    applyParsedCategoryImportResult(parsed);
}

function applyParsedCategoryImportResult(parsed) {
    if (!parsed || !Array.isArray(parsed.header) || !Array.isArray(parsed.rows)) {
        resetCategoryImportState();
        setCategoryImportStatus('Unable to analyze the file. Please verify the format and try again.', 'error');
        return;
    }

    categoryImportState.header = parsed.header;
    categoryImportState.rows = parsed.rows;
    const validation = validateCategoryImportRows(parsed.header, parsed.rows);
    categoryImportState.rowMetadata = validation.rowMetadata;
    const combinedWarnings = [...parsed.warnings, ...validation.warnings];
    const combinedErrors = [...parsed.errors, ...validation.errors];
    categoryImportState.warnings = combinedWarnings;
    categoryImportState.errors = combinedErrors;
    categoryImportState.totalRows = Number.isFinite(parsed.totalRows) ? parsed.totalRows : parsed.rows.length;
    categoryImportState.truncated = Boolean(parsed.truncated);

    if (!parsed.header.length) {
        const format = (categoryImportState.format || '').toLowerCase();
        const headerMessage = format === 'xlsx'
            ? 'No header row detected. Confirm your Excel file includes column titles.'
            : format === 'xls'
                ? 'No header row detected. Confirm your Excel file includes column titles.'
                : 'No header row detected. Confirm your CSV includes column titles.';
        const leadingError = combinedErrors.length ? combinedErrors[0] : headerMessage;
        resetCategoryImportState();
        setCategoryImportStatus(leadingError, 'error');
        return;
    }

    if (!categoryImportElements.preview || !categoryImportElements.previewTable || !categoryImportElements.fileName || !categoryImportElements.chip) {
        return;
    }

    categoryImportElements.preview.classList.remove('hidden');
    categoryImportElements.fileName.textContent = categoryImportState.file ? categoryImportState.file.name : 'Selected file';

    const hasRowErrors = categoryImportState.rowMetadata.some(meta => meta && meta.severity === 'error');
    const hasRowWarnings = categoryImportState.rowMetadata.some(meta => meta && meta.severity === 'warning');
    const chipTone = categoryImportState.errors.length || hasRowErrors
        ? 'error'
        : (categoryImportState.warnings.length || hasRowWarnings)
            ? 'warning'
            : '';
    const previewCount = categoryImportState.rows.length;
    const totalCount = categoryImportState.totalRows || previewCount;
    const isTruncatedPreview = categoryImportState.truncated && totalCount > previewCount;
    const chipLabel = isTruncatedPreview
        ? `Previewing ${previewCount} of ${totalCount} rows`
        : `${totalCount} row${totalCount === 1 ? '' : 's'}`;
    categoryImportElements.chip.textContent = chipLabel;
    categoryImportElements.chip.className = `import-chip${chipTone ? ` ${chipTone}` : ''}`;

    categoryImportElements.previewTable.innerHTML = buildCategoryImportPreviewTable(parsed.header, parsed.rows, categoryImportState.rowMetadata);

    let statusTone = 'success';
    let statusMessage = 'Looks good! Review the preview below and press Import when ready.';

    if (categoryImportState.errors.length) {
        statusTone = 'error';
        statusMessage = categoryImportState.errors[0];
    } else if (categoryImportState.warnings.length) {
        statusTone = 'info';
        statusMessage = categoryImportState.warnings[0];
    }

    setCategoryImportStatus(statusMessage, statusTone);
    refreshCategoryImportControls();
}

function parseCategoryWorkbookPreview(text, format, rowLimit) {
    if ((format || '').toLowerCase() === 'xls') {
        const htmlResult = parseCategoryHtmlPreview(text, rowLimit);
        if (htmlResult && Array.isArray(htmlResult.header) && htmlResult.header.length) {
            return htmlResult;
        }
        // Fall back to CSV parsing if HTML parsing fails.
    }
    return parseCategoryCsvPreview(text, rowLimit);
}

function parseCategoryXlsxPreview(arrayBuffer, rowLimit) {
    const warnings = [];
    const errors = [];
    const limit = Number.isFinite(rowLimit) && rowLimit > 0 ? rowLimit : 12;

    if (typeof window === 'undefined' || !window.XLSX) {
        errors.push('Excel parser is unavailable. Upload a CSV instead.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    let workbook;
    try {
        workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
    } catch (error) {
        console.warn('Unable to parse XLSX workbook:', error);
        errors.push('Uploaded Excel file is not readable. Please verify the template format.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const sheetName = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames[0] : null;
    if (!sheetName) {
        errors.push('The Excel file has no worksheets. Please use the provided template.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        errors.push('Unable to locate the first worksheet in the Excel file.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const rowsRaw = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!Array.isArray(rowsRaw) || !rowsRaw.length) {
        errors.push('The Excel file appears to be empty.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const normalizeCell = value => {
        if (value == null) {
            return '';
        }
        return typeof value === 'string' ? value : String(value);
    };

    const headerCells = Array.isArray(rowsRaw[0]) ? rowsRaw[0] : [];
    const header = headerCells.map(cell => normalizeCell(cell).trim());

    if (!header.length) {
        errors.push('The Excel file is missing a header row.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const dataRowsRaw = rowsRaw.slice(1);
    const totalRows = dataRowsRaw.length;
    const truncated = totalRows > limit;
    const previewSource = truncated ? dataRowsRaw.slice(0, limit) : dataRowsRaw;

    if (truncated) {
        warnings.push(`Showing first ${limit} rows. Additional rows will be processed on import.`);
    }

    const rows = previewSource.map(row => header.map((_, index) => normalizeCell(Array.isArray(row) ? row[index] : '')));

    const missingRequired = getMissingCategoryImportColumns(header);
    if (missingRequired.length) {
        errors.push(`Missing required column${missingRequired.length > 1 ? 's' : ''}: ${missingRequired.join(', ')}`);
    }

    return {
        header,
        rows,
        warnings,
        errors,
        totalRows,
        truncated
    };
}

function parseCategoryHtmlPreview(htmlText, rowLimit) {
    const warnings = [];
    const errors = [];
    const limit = Number.isFinite(rowLimit) && rowLimit > 0 ? rowLimit : 12;

    if (typeof DOMParser === 'undefined') {
        errors.push('Unable to read Excel file in this browser. Try uploading the CSV template instead.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    let doc;
    try {
        const parser = new DOMParser();
        doc = parser.parseFromString(htmlText, 'text/html');
    } catch (error) {
        console.warn('Unable to parse Excel HTML workbook:', error);
        errors.push('Uploaded Excel file is not readable. Please verify the template format.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const table = doc?.querySelector('table');
    if (!table) {
        errors.push('No table detected in the uploaded Excel file. Please use the provided template.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) {
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const extractCells = tr => Array.from(tr.cells || []).map(cell => cell.textContent.trim());
    const headerCells = extractCells(rows[0]);
    if (!headerCells.length) {
        errors.push('The Excel file is missing a header row.');
        return { header: [], rows: [], warnings, errors, totalRows: 0, truncated: false };
    }

    const dataRowsRaw = rows.slice(1).map(extractCells);
    const totalRows = dataRowsRaw.length;
    const truncated = totalRows > limit;
    const previewRows = truncated ? dataRowsRaw.slice(0, limit) : dataRowsRaw;

    if (truncated) {
        warnings.push(`Showing first ${limit} rows. Additional rows will be processed on import.`);
    }

    const header = headerCells.map(cell => cell.trim());

    // Ensure required columns exist.
    const missingRequired = getMissingCategoryImportColumns(header);
    if (missingRequired.length) {
        errors.push(`Missing required column${missingRequired.length > 1 ? 's' : ''}: ${missingRequired.join(', ')}`);
    }

    return {
        header,
        rows: previewRows,
        warnings,
        errors,
        totalRows,
        truncated
    };
}

function parseCategoryCsvPreview(text, rowLimit) {
    const collectedRows = [];
    const warnings = [];
    const errors = [];
    const limit = Number.isFinite(rowLimit) && rowLimit > 0 ? rowLimit : 12;
    let encounteredRows = 0;
    let truncated = false;

    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let current = [];
    let value = '';
    let insideQuotes = false;

    const pushValue = () => {
        current.push(value);
        value = '';
    };

    const pushRow = () => {
        if (current.length || value) {
            pushValue();
        }
        if (current.length) {
            collectedRows.push(current);
            encounteredRows += 1;
        }
        current = [];
    };

    for (let index = 0; index < normalizedText.length; index += 1) {
        const char = normalizedText[index];
        const nextChar = normalizedText[index + 1];
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                value += '"';
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            pushValue();
        } else if (char === '\n' && !insideQuotes) {
            pushValue();
            pushRow();
            if (collectedRows.length >= limit + 1) {
                truncated = true;
                break;
            }
        } else {
            value += char;
        }
    }

    if (value || current.length) {
        pushValue();
        pushRow();
    }

    if (!collectedRows.length) {
        return { header: [], rows: [], warnings, errors };
    }

    const headerRaw = collectedRows[0];
    const header = headerRaw.map(cell => cell.trim());
    const missingRequired = getMissingCategoryImportColumns(header);
    if (missingRequired.length) {
        errors.push(`Missing required column${missingRequired.length > 1 ? 's' : ''}: ${missingRequired.join(', ')}`);
    }

    const dataRows = collectedRows.slice(1);
    const totalDataRows = Math.max(0, encounteredRows - 1);
    let previewRows = dataRows.slice(0, limit);

    if (dataRows.length > limit) {
        truncated = true;
        previewRows = dataRows.slice(0, limit);
    }

    if (truncated) {
        warnings.push(`Showing first ${limit} rows. Additional rows will be processed on import.`);
    }

    return {
        header,
        rows: previewRows,
        warnings,
        errors,
        totalRows: totalDataRows,
        truncated
    };
}

function validateCategoryImportRows(header, rows) {
    if (!Array.isArray(header) || !header.length || !Array.isArray(rows)) {
        return { rowMetadata: [], errors: [], warnings: [] };
    }

    const { getIndex } = buildCategoryImportColumnIndex(header);
    const rowMetadata = rows.map(() => ({ issues: [], severity: 'ok' }));
    const errors = [];
    const warnings = [];

    const formatColumnLabel = formatCategoryImportColumnLabel;
    const addIssue = (meta, message, severity = 'error') => {
        if (!message) {
            return;
        }
        meta.issues.push(message);
        if (severity === 'error') {
            meta.severity = 'error';
        } else if (severity === 'warning' && meta.severity !== 'error') {
            meta.severity = 'warning';
        }
    };

    if (!(categoryLookupById instanceof Map) || !categoryLookupById.size) {
        rebuildCategoryCaches();
    }

    const statusIndex = getIndex('status');
    const codeIndex = getIndex('category code');
    const parentIndex = getIndex('parent category');
    const seenCodes = new Set();
    let errorCount = 0;
    let warningCount = 0;

    rows.forEach((cells, rowIndex) => {
        const meta = rowMetadata[rowIndex];

        CATEGORY_IMPORT_CONFIG.requiredColumns.forEach(column => {
            const requiredIndex = getIndex(column);
            if (requiredIndex === undefined) {
                return;
            }
            const value = (cells[requiredIndex] || '').trim();
            if (!value) {
                addIssue(meta, `${formatColumnLabel(column)} is required`);
            }
        });

        if (statusIndex !== undefined) {
            const rawStatus = (cells[statusIndex] || '').trim();
            if (rawStatus) {
                const normalizedStatus = rawStatus.toLowerCase();
                if (!CATEGORY_IMPORT_ALLOWED_STATUSES.has(normalizedStatus)) {
                    addIssue(meta, 'Status will default to Draft', 'warning');
                }
            }
        }

        const codeValueRaw = codeIndex !== undefined ? String(cells[codeIndex] || '').trim() : '';
        if (codeIndex !== undefined && codeValueRaw) {
            const normalizedDuplicateKey = normalizeCategoryCodeCandidate(codeValueRaw);
            const duplicateKey = normalizedDuplicateKey || codeValueRaw.toLowerCase();
            if (seenCodes.has(duplicateKey)) {
                addIssue(meta, 'Duplicate Code in file', 'warning');
            } else {
                seenCodes.add(duplicateKey);
            }
        }
        const parentValueRaw = parentIndex !== undefined ? String(cells[parentIndex] || '').trim() : '';

        const existingCategory = codeValueRaw ? resolveCategoryByIdentifier(codeValueRaw) : null;

        if (codeValueRaw && !existingCategory) {
            addIssue(meta, 'Category Code does not match any existing category. Leave it blank to add a new category.');
        }

        if (!codeValueRaw && parentValueRaw) {
            const parentCategory = resolveCategoryByIdentifier(parentValueRaw);
            if (!parentCategory) {
                addIssue(meta, 'Parent Category does not match an existing category. Use an existing code when linking to a parent.');
            }
        }

        if (codeValueRaw && existingCategory) {
            if (parentValueRaw) {
                const parentCategory = resolveCategoryByIdentifier(parentValueRaw);
                if (!parentCategory) {
                    addIssue(meta, 'Parent Category does not match an existing category. Use an existing code when linking to a parent.');
                } else {
                    const cachedParentId = categoryParentLookup instanceof Map && categoryParentLookup.size
                        ? categoryParentLookup.get(existingCategory.id)
                        : null;
                    const actualParentId = cachedParentId || getCategoryParentId(existingCategory);
                    if (!actualParentId || actualParentId === CATEGORY_TREE_ROOT_ID) {
                        addIssue(meta, 'This category is currently top-level. Remove the Parent Category value to continue.');
                    } else if (parentCategory.id !== actualParentId) {
                        const actualParent = categoryLookupById instanceof Map ? categoryLookupById.get(actualParentId) : null;
                        const expectedParentLabel = actualParent
                            ? (actualParent.categoryCode || actualParent.id || getCategoryDisplayName(actualParent) || 'the current parent')
                            : 'the current parent';
                        addIssue(meta, `Parent Category mismatch. Use ${expectedParentLabel} or leave the Parent Category blank.`);
                    }
                }
            }
        }

        if (meta.severity === 'error') {
            errorCount += 1;
        } else if (meta.severity === 'warning') {
            warningCount += 1;
        }
    });

    if (errorCount) {
        errors.push(`${errorCount} row${errorCount === 1 ? '' : 's'} contain blocking issues. Fix highlighted rows before importing.`);
    }
    if (warningCount) {
        warnings.push(`${warningCount} row${warningCount === 1 ? '' : 's'} include warnings. Review highlighted rows before importing.`);
    }

    return { rowMetadata, errors, warnings };
}

function buildCategoryImportPreviewTable(header, rows, rowMetadata = []) {
    const headerRow = `<tr><th>#</th>${header.map(cell => `<th>${escapeHtml(cell || '')}</th>`).join('')}</tr>`;
    const bodyRows = rows.length
        ? rows.map((row, rowIndex) => {
            const meta = rowMetadata[rowIndex] || { issues: [], severity: 'ok' };
            const severityClass = meta && meta.severity && meta.severity !== 'ok' ? ` import-row-${meta.severity}` : '';
            const issues = Array.isArray(meta.issues) ? meta.issues : [];
            const issueTooltip = issues.length ? ` title="${escapeAttribute(issues.join(' • '))}"` : '';
            const issueBadge = issues.length
                ? `<span class="import-issue-badge ${meta.severity === 'error' ? 'error' : 'warning'}">${meta.severity === 'error' ? 'Error' : 'Warning'}</span>`
                : '';
            const cells = header.map((_, cellIndex) => `<td>${escapeHtml(row[cellIndex] || '')}</td>`).join('');
            return `<tr class="import-preview-row${severityClass}"${issueTooltip}><td><span class="import-row-index">${rowIndex + 1}</span>${issueBadge}</td>${cells}</tr>`;
        }).join('')
        : `<tr><td colspan="${(header.length || 1) + 1}">No data rows detected</td></tr>`;
    return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
}

function downloadCategoryImportTemplate() {
    const header = [
        'Category Code',
        'Category Name (Arabic)',
        'Description (Arabic)',
        'Category Name (English)',
        'Description (English)',
        'Parent Category',
        'Ad Publishing Fees Due Date',
        'Ad Publishing Fees Type',
        'Ad Publishing Fees',
        'Free Images Count per Ad',
        'Additional Image Fees',
        'Free Video Links Count per Ad',
        'Additional Video Link Fees',
        'Subtitle Fees',
        'Enable Fixed Sale Price Option',
        'Enable Fixed Sale Price Option Fees',
        'Enable Negotiable Price Option',
        'Enable Negotiable Price Option Fees',
        'Enable Public Auction Option',
        'Enable Public Auction Option Fees',
        'Auction Closing Time Option Fees',
        'Default Auction Closing Periods',
        'Minimum Bid (Value, Seller Can Modify?)',
        'Show on Home Page?',
        'Is Real Estate?'
    ];
    const sampleRows = [
        [
            '',
            'سلامة المعدات',
            'فحوصات السلامة الدورية للمعدات',
            'Equipment Safety',
            'Routine safety inspections for field equipment',
            '1.2.',
            'On Publish',
            'Fixed',
            '50',
            '5',
            '10',
            '1',
            '15',
            '5',
            'Yes',
            '25',
            'Yes',
            '10',
            'No',
            '0',
            '0',
            '48h | 72h',
            '1000 (Yes)',
            'Yes',
            'No'
        ],
        [
            '1.5.9.',
            'صيانة المصاعد',
            'خدمات الصيانة الدورية للمصاعد',
            'Elevator Maintenance',
            'Mandatory elevator upkeep and reporting',
            '1.5.',
            'After Sales',
            'Percentage',
            '5%',
            '3',
            '8',
            '0',
            '12',
            '3',
            'No',
            '0',
            'Yes',
            '0',
            'Yes',
            '50',
            '25',
            '24h | 36h',
            '500 (No)',
            'No',
            'Yes'
        ]
    ];
    const headerHtml = header.map(cell => `<th>${escapeHtml(cell)}</th>`).join('');
    const rowsHtml = sampleRows
        .map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('');
    const workbookHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Category Import Template</title><style>table{border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;}th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;}th{background:#f1f5f9;font-weight:600;}</style></head><body><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

    const blob = new Blob([workbookHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Category_Import_Template.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCategoryImportStatus('Template downloaded. Edit it in Excel and re-upload when ready.', 'success');
}

async function submitCategoryImport() {
    if (categoryImportState.isSubmitting) {
        return;
    }

    if (!categoryImportState.file) {
        setCategoryImportStatus('Select a CSV file before importing.', 'error');
        return;
    }

    if (!categoryImportState.rows.length) {
        setCategoryImportStatus('No data rows detected yet. Upload a populated CSV.', 'error');
        return;
    }

    if (categoryImportState.errors.length) {
        setCategoryImportStatus(categoryImportState.errors[0], 'error');
        return;
    }

    const hasRowErrors = categoryImportState.rowMetadata.some(meta => meta && meta.severity === 'error');
    if (hasRowErrors) {
        setCategoryImportStatus('Resolve highlighted row errors before importing.', 'error');
        return;
    }

    const previewCount = categoryImportState.rows.length;
    const totalCount = categoryImportState.totalRows || previewCount;
    const truncatedPreview = categoryImportState.truncated && totalCount > previewCount;
    const displayCount = truncatedPreview ? `${previewCount} of ${totalCount}` : `${totalCount}`;
    const noun = truncatedPreview ? 'categories' : (totalCount === 1 ? 'category' : 'categories');
    const fileName = categoryImportState.file.name || 'your file';

    setCategoryImportSubmitting(true);
    setCategoryImportStatus('Uploading import...', 'info');

    if (!CATEGORY_IMPORT_ENDPOINT) {
        window.setTimeout(() => {
            showNotification('success', `Import preview ready for ${displayCount} ${noun} from ${fileName}. Connect your backend endpoint to complete the sync.`, 4600, 'categoryNotificationArea');
            closeCategoryImportOverlay();
            setCategoryImportSubmitting(false);
        }, 900);
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', categoryImportState.file, categoryImportState.file.name || 'categories.csv');

        const response = await fetch(CATEGORY_IMPORT_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let message = `Server responded with ${response.status}`;
            try {
                const data = await response.json();
                if (data && typeof data.message === 'string') {
                    message = data.message;
                }
            } catch (error) {
                try {
                    const text = await response.text();
                    if (text) {
                        message = text;
                    }
                } catch (innerError) {
                    // no-op
                }
            }
            throw new Error(message);
        }

        let processedCount = totalCount;
        try {
            const result = await response.json();
            if (result && typeof result.processed === 'number') {
                processedCount = result.processed;
            }
        } catch (parseError) {
            // Response may not be JSON; ignore.
        }

        showNotification('success', `Import queued for ${processedCount} categor${processedCount === 1 ? 'y' : 'ies'}.`, 4600, 'categoryNotificationArea');
        closeCategoryImportOverlay();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed.';
        setCategoryImportStatus(`Import failed: ${message}`, 'error');
        showNotification('error', 'Import failed. Review the highlighted rows or try again later.', 4600, 'categoryNotificationArea');
        console.error('Category import failed:', error);
    } finally {
        setCategoryImportSubmitting(false);
    }
}

function updateCategorySelectionSummary() {
    const selectedIds = Array.from(state.categorySelectedIds || []);
    const selectedCategories = selectedIds
        .map(id => (categoryLookupById instanceof Map ? categoryLookupById.get(id) : null))
        .filter(Boolean);
    const selectedCount = selectedCategories.length;
    const hasInactiveCategory = selectedCategories.some(category => getCategoryStatusFilterGroup(category.status) === 'inactive');
    const hasActiveCategory = selectedCategories.some(category => getCategoryStatusFilterGroup(category.status) === 'active');
    const bulkActivateBtn = document.getElementById('categoryBulkActivateBtn');
    if (bulkActivateBtn) {
        bulkActivateBtn.disabled = selectedCount !== 1 || !hasInactiveCategory;
    }
    const bulkArchiveBtn = document.getElementById('categoryBulkArchiveBtn');
    if (bulkArchiveBtn) {
        bulkArchiveBtn.disabled = selectedCount !== 1 || !hasActiveCategory;
    }
    const bulkModifyBtn = document.getElementById('categoryBulkModifyBtn');
    if (bulkModifyBtn) {
        bulkModifyBtn.disabled = selectedCount !== 1;
    }
    if (selectedCount === 0 && !state.categoryCompareMode) {
        renderCategoryRelatedDrawer(null);
    }
}

function renderCategoryRelatedDrawer(categoryId) {
    const drawer = document.getElementById('categoryRelatedDrawer');
    if (!drawer) return;

    if (!categoryId) {
        drawer.innerHTML = '';
        drawer.classList.add('hidden');
        drawer.style.top = '';
        state.activeCategoryDetailId = null;
        if (categoryDrawerSyncFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(categoryDrawerSyncFrame);
        }
        categoryDrawerSyncFrame = null;
        return;
    }

    const category = categoryLookupById.get(categoryId);
    if (!category) {
        drawer.innerHTML = '';
        drawer.classList.add('hidden');
        drawer.style.top = '';
        state.activeCategoryDetailId = null;
        if (categoryDrawerSyncFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(categoryDrawerSyncFrame);
        }
        categoryDrawerSyncFrame = null;
        return;
    }

    state.activeCategoryDetailId = categoryId;

    const parentId = categoryParentLookup.get(categoryId) || CATEGORY_TREE_ROOT_ID;
    const isTopLevelCategory = parentId === CATEGORY_TREE_ROOT_ID;
    const siblings = (categoryChildrenLookup.get(parentId) || []).filter(entry => entry.id !== categoryId);
    const children = categoryChildrenLookup.get(categoryId) || [];

    const siblingMarkup = siblings.length
        ? siblings.map(entry => `<button type="button" class="related-link" data-related-category="${escapeAttribute(entry.id)}">${escapeHtml(getCategoryDisplayName(entry))}</button>`).join('')
        : '<span class="related-empty">–</span>';

    const childMarkup = children.length
        ? children.map(entry => `<button type="button" class="related-link" data-related-category="${escapeAttribute(entry.id)}">${escapeHtml(getCategoryDisplayName(entry))}</button>`).join('')
        : '<span class="related-empty">–</span>';

    const normalizeFlag = value => {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        return false;
    };

    const pathLabelRaw = buildCategoryDisplayPath(category, categories) || getCategoryDisplayName(category);
    const normalizedPathLabel = typeof pathLabelRaw === 'string' && pathLabelRaw.trim()
        ? pathLabelRaw.trim()
        : getCategoryDisplayName(category);
    const pathLabel = isTopLevelCategory ? '–' : normalizedPathLabel;
    const specificationLabel = Number.isFinite(category.specificationCount) ? String(category.specificationCount) : '0';
    const showAtHomeLabel = normalizeFlag(category.showAtHome) ? 'Yes' : 'No';
    const realEstateLabel = normalizeFlag(category.isRealEstate) ? 'Yes' : 'No';
    const salesTypesLabel = buildCategorySalesTypesSummary(category);
    const rawImageSource = typeof category.imageDataUrl === 'string' ? category.imageDataUrl.trim() : '';
    const imageAltLabel = category.imageName || getCategoryDisplayName(category) || 'Category image';
    const imageMarkup = rawImageSource
        ? `
        <div class="related-image">
            <img src="${escapeAttribute(rawImageSource)}" alt="${escapeAttribute(imageAltLabel)}" />
        </div>
    `
        : '';

    drawer.innerHTML = `
        <h4>Category Details</h4>
        ${imageMarkup}
        <div class="related-section">
            <span class="related-label">Category Name</span>
            <span class="related-value">${escapeHtml(getCategoryDisplayName(category))}</span>
        </div>
        <div class="related-section">
            <span class="related-label">Category Path</span>
            <span class="related-value">${escapeHtml(pathLabel)}</span>
        </div>
        <div class="related-section">
            <span class="related-label">Sales Types</span>
            <span class="related-value">${escapeHtml(salesTypesLabel)}</span>
        </div>
        <div class="related-section">
            <span class="related-label">Specifications</span>
            <span class="related-value">${escapeHtml(specificationLabel)}</span>
        </div>
        <div class="related-section">
            <span class="related-label">Show on Home Page?</span>
            <span class="related-value">${escapeHtml(showAtHomeLabel)}</span>
        </div>
        <div class="related-section">
            <span class="related-label">Is Real Estate?</span>
            <span class="related-value">${escapeHtml(realEstateLabel)}</span>
        </div>
        <div class="related-section">
            <span class="related-label">Sibling Categories</span>
            <div class="related-list">${siblingMarkup}</div>
        </div>
        <div class="related-section">
            <span class="related-label">Children Categories</span>
            <div class="related-list">${childMarkup}</div>
        </div>
    `;

    drawer.classList.remove('hidden');
    syncCategoryDetailDrawerPosition(categoryId);
}

function buildCategorySalesTypesSummary(category) {
    if (!category || typeof category !== 'object') {
        return '–';
    }

    const supportsFixed = Boolean(category.supportsFixedPrice);
    const supportsNegotiation = Boolean(category.supportsNegotiation);
    const supportsAuction = Boolean(category.supportsAuction);

    const tokens = [];
    if (supportsFixed) {
        tokens.push('Fixed Sale Price');
    }
    if (supportsNegotiation) {
        tokens.push('Negotiable Price');
    }
    if (supportsAuction) {
        tokens.push('Public Auction');
    }

    if (!tokens.length) {
        return 'None';
    }
    return tokens.join(', ');
}

function syncCategoryDetailDrawerPosition(categoryId) {
    const targetId = categoryId || state.activeCategoryDetailId;
    if (!targetId) {
        return;
    }
    if (categoryDrawerSyncFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(categoryDrawerSyncFrame);
    }
    categoryDrawerSyncFrame = null;
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        positionCategoryRelatedDrawer(targetId);
        return;
    }
    categoryDrawerSyncFrame = window.requestAnimationFrame(() => {
        categoryDrawerSyncFrame = null;
        positionCategoryRelatedDrawer(targetId);
    });
}

function positionCategoryRelatedDrawer(categoryId) {
    const drawer = document.getElementById('categoryRelatedDrawer');
    if (!drawer || drawer.classList.contains('hidden')) {
        return;
    }

    const detailContainer = drawer.closest('.category-detail');
    if (!detailContainer) {
        return;
    }

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) {
        drawer.style.top = '';
        return;
    }

    const targetId = categoryId || state.activeCategoryDetailId;
    if (!targetId) {
        drawer.style.top = '110px';
        return;
    }

    const selectorId = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
        ? CSS.escape(targetId)
        : String(targetId);
    const row = document.querySelector(`.category-grid-row[data-category-row="${selectorId}"]`);
    if (!row) {
        drawer.style.top = '110px';
        return;
    }

    const rowRect = row.getBoundingClientRect();
    const containerRect = detailContainer.getBoundingClientRect();
    if (!rowRect || !containerRect) {
        return;
    }

    const minTop = 110;
    const spacing = 24;
    const containerHeight = detailContainer.clientHeight || detailContainer.offsetHeight || 0;
    const drawerHeight = drawer.offsetHeight || 0;
    const rowMidpoint = rowRect.top - containerRect.top + (rowRect.height / 2);
    const halfDrawer = drawerHeight ? drawerHeight / 2 : 0;
    const desiredOffset = rowMidpoint - halfDrawer;
    let maxTop = containerHeight ? containerHeight - drawerHeight - spacing : minTop;
    if (!Number.isFinite(maxTop) || maxTop < minTop) {
        maxTop = minTop;
    }

    const clamped = Math.max(minTop, Math.min(desiredOffset, maxTop));
    drawer.style.top = `${Math.round(clamped)}px`;
}

function highlightCategoryRow(categoryId) {
    if (!categoryId) return;
    const row = document.querySelector(`.category-grid-row[data-category-row="${CSS.escape(categoryId)}"]`);
    if (!row) return;
    row.classList.add('pulse');
    setTimeout(() => row.classList.remove('pulse'), 1600);
}

function refreshCategoryDirectoryView({ rebuildCaches = false, resetScroll = false, keepScroll = false } = {}) {
    if (rebuildCaches || !categoryLookupById.size) {
        rebuildCategoryCaches();
    }

    renderCategoryTree();
    renderCategoryBreadcrumbTrail();
    computeFilteredCategoryList();
    const resetPage = !keepScroll;
    renderCategoryGrid({ resetPage });
    updateCategoryBadges();
    updateCategoryCompareDrawer();
}

function handleCategoryCompareRequest(categoryId) {
    if (!state.categoryCompareMode) {
        toggleCategoryCompareMode(true);
    }
    if (state.categoryCompareSelection.includes(categoryId)) {
        removeCategoryFromCompare(categoryId);
    } else {
        addCategoryToCompare(categoryId);
    }
    updateCategoryCompareDrawer();
    renderCategoryGrid();
}

function handleCategoryGridClick(event) {
    const target = event.target;
    const relatedLink = target.closest('[data-related-category]');
    if (relatedLink) {
        const categoryId = relatedLink.dataset.relatedCategory;
        state.categoryViewBranchId = categoryId;
        ensureCategoryExplorerExpanded(categoryId);
        refreshCategoryDirectoryView({ rebuildCaches: false, resetScroll: true });
        return;
    }

    const actionBtn = target.closest('[data-category-action]');
    if (actionBtn) {
        const action = (actionBtn.dataset.categoryAction || '').toLowerCase();
        const categoryId = actionBtn.dataset.categoryId;
        if (action === 'compare') {
            handleCategoryCompareRequest(categoryId);
            return;
        }
        if (action === 'edit') {
            const category = resolveCategoryByIdentifier(categoryId);
            if (!category) {
                showNotification('error', 'Selected category could not be found.', 3200, 'categoryNotificationArea');
                return;
            }
            showCategoryBuilder('edit', category);
            highlightCategoryRow(category.id);
            return;
        }
        return;
    }

    const breadcrumbNode = target.closest('[data-breadcrumb-node]');
    if (breadcrumbNode) {
        const nodeId = breadcrumbNode.dataset.breadcrumbNode;
        if (nodeId === 'root') {
            resetCategoryDirectoryFilters();
            return;
        }
        state.categoryViewBranchId = nodeId;
        ensureCategoryExplorerExpanded(state.categoryViewBranchId);
        refreshCategoryDirectoryView({ rebuildCaches: false, resetScroll: true });
        return;
    }

    const treeNode = target.closest('[data-category-select-node]');
    if (treeNode) {
        const nodeId = treeNode.dataset.categorySelectNode;
        const children = categoryChildrenLookup.get(nodeId) || [];
        const hasChildren = children.length > 0;
        const wasExpanded = state.categoryExplorerExpanded.has(nodeId);
        state.categoryViewBranchId = nodeId;
        if (hasChildren && wasExpanded) {
            const ancestors = collectCategoryAncestorIds(nodeId) || [];
            state.categoryExplorerExpanded = new Set([CATEGORY_TREE_ROOT_ID]);
            ancestors.forEach(ancestorId => {
                if (ancestorId && ancestorId !== nodeId) {
                    state.categoryExplorerExpanded.add(ancestorId);
                }
            });
        } else {
            state.categoryExplorerExpanded = new Set([CATEGORY_TREE_ROOT_ID]);
            ensureCategoryExplorerExpanded(nodeId);
        }
        refreshCategoryDirectoryView({ rebuildCaches: false, resetScroll: true });
        return;
    }

    const treeToggle = target.closest('[data-tree-toggle]');
    if (treeToggle) {
        const nodeId = treeToggle.dataset.treeToggle;
        const children = categoryChildrenLookup.get(nodeId) || [];
        const isExpanded = state.categoryExplorerExpanded.has(nodeId);
        if (isExpanded) {
            const ancestors = collectCategoryAncestorIds(nodeId) || [];
            state.categoryExplorerExpanded = new Set([CATEGORY_TREE_ROOT_ID]);
            ancestors.forEach(ancestorId => {
                if (ancestorId && ancestorId !== nodeId) {
                    state.categoryExplorerExpanded.add(ancestorId);
                }
            });
        } else {
            state.categoryExplorerExpanded = new Set([CATEGORY_TREE_ROOT_ID]);
            if (children.length) {
                ensureCategoryExplorerExpanded(nodeId);
            }
        }
        renderCategoryTree();
        return;
    }

    const row = target.closest('.category-grid-row');
    if (row) {
        const categoryId = row.dataset.categoryRow;
        const allowMulti = event.ctrlKey || event.metaKey || event.shiftKey; // support additive selection via modifier keys
        const alreadySelected = state.categorySelectedIds.has(categoryId);

        if (allowMulti) {
            if (alreadySelected) {
                state.categorySelectedIds.delete(categoryId);
            } else {
                state.categorySelectedIds.add(categoryId);
            }
        } else {
            if (alreadySelected && state.categorySelectedIds.size === 1) {
                state.categorySelectedIds.clear();
            } else {
                state.categorySelectedIds.clear();
                state.categorySelectedIds.add(categoryId);
            }
        }

        updateCategorySelectionSummary();
        syncCategorySelectionStyles();

        if (state.categorySelectedIds.has(categoryId)) {
            renderCategoryRelatedDrawer(categoryId);
            highlightCategoryRow(categoryId);
        } else if (!state.categorySelectedIds.size) {
            renderCategoryRelatedDrawer(null);
        }
    }
}

async function handleCategoryBulkAction(action) {
    if (!state.categorySelectedIds.size) {
        showNotification('info', 'Select a category to continue.', 3200, 'categoryNotificationArea');
        return;
    }
    const payload = Array.from(state.categorySelectedIds).map(id => categoryLookupById.get(id)).filter(Boolean);
    if (!payload.length) {
        showNotification('info', 'Selected categories are no longer available.', 3200, 'categoryNotificationArea');
        state.categorySelectedIds.clear();
        updateCategorySelectionSummary();
        return;
    }

    if (action === 'modify') {
        if (payload.length !== 1) {
            showNotification('info', 'Select exactly one category to modify.', 3200, 'categoryNotificationArea');
            return;
        }
        const category = payload[0];
        showCategoryBuilder('edit', category);
        highlightCategoryRow(category.id);
        return;
    }

    if (action === 'delete') {
        if (payload.length !== 1) {
            showNotification('info', 'Select a category to delete.', 3200, 'categoryNotificationArea');
            return;
        }
        const confirmation = await showCategoryConfirm('Are You Sure You Want to Delete the Category?', 'OK', 'Cancel');
        if (!confirmation) return;
        const category = payload[0];
        const index = categories.findIndex(entry => entry && entry.id === category.id);
        if (index >= 0) {
            categories.splice(index, 1);
        }
        saveCategoriesToStorage();
        state.categorySelectedIds.clear();
        updateCategorySelectionSummary();
        refreshCategoryDirectoryView({ rebuildCaches: true, resetScroll: false });
        renderCategoryRelatedDrawer(null);
        showNotification('success', 'Category Deleted Successfully', 3600, 'categoryNotificationArea');
        return;
    }

    if (action === 'activate' || action === 'archive') {
        if (payload.length !== 1) {
            const message = action === 'activate'
                ? 'Select a category to activate.'
                : 'Select a category to deactivate.';
            showNotification('info', message, 3200, 'categoryNotificationArea');
            return;
        }

        const [category] = payload;

        if (action === 'activate') {
            const confirmation = await showCategoryConfirm('Are You Sure You Want to Activate the Category Again?', 'OK', 'Cancel');
            if (!confirmation) {
                return;
            }

            const parentId = categoryParentLookup.get(category.id) || getCategoryParentId(category);
            const hasParent = parentId && parentId !== CATEGORY_TREE_ROOT_ID;
            if (hasParent) {
                const parentCategory = categoryLookupById.get(parentId);
                if (parentCategory && getCategoryStatusFilterGroup(parentCategory.status) !== 'active') {
                    showNotification('warning', 'This Category Cannot be Activated Because the Parent Category is Inactive', 4200, 'categoryNotificationArea');
                    return;
                }
            }

            category.status = 'active';
            category.updatedAt = new Date().toISOString();
            saveCategoriesToStorage();
            refreshCategoryDirectoryView({ rebuildCaches: true, resetScroll: false, keepScroll: true });
            updateCategorySelectionSummary();
            showNotification('success', 'Category Activated Successfully', 3200, 'categoryNotificationArea');
            return;
        }

        const initialConfirmation = await showCategoryConfirm('Are You Sure You Want to Deactivate this Category?', 'OK', 'Cancel');
        if (!initialConfirmation) {
            return;
        }

        const descendants = collectCategoryDescendants(category.id);
        const activeDescendants = descendants.filter(entry => getCategoryStatusFilterGroup(entry.status) === 'active');

        if (activeDescendants.length) {
            const pluralSuffix = activeDescendants.length === 1 ? 'y' : 'ies';
            const warningMessage = `This Category Contains ${activeDescendants.length} Active Subcategor${pluralSuffix}. All of Them Will be Disabled. Do You Want to Continue?`;
            const proceed = await showCategoryConfirm(warningMessage, 'OK', 'Cancel');
            if (!proceed) {
                return;
            }
        }

        const timestamp = new Date().toISOString();
        const categoriesToDeactivate = activeDescendants.length ? [category, ...descendants] : [category];
        categoriesToDeactivate.forEach(entry => {
            if (!entry) {
                return;
            }
            entry.status = 'inactive';
            entry.updatedAt = timestamp;
        });

        saveCategoriesToStorage();
        refreshCategoryDirectoryView({ rebuildCaches: true, resetScroll: false, keepScroll: true });
        updateCategorySelectionSummary();
        showNotification('success', 'Category Deactivated Successfully', 3200, 'categoryNotificationArea');
        return;
    }
}

async function handleCategoryDeleteAllRequest() {
    const totalCategories = Array.isArray(categories) ? categories.length : 0;
    if (!totalCategories) {
        showNotification('info', 'No categories available to delete.', 3200, 'categoryNotificationArea');
        return;
    }

    const confirmation = await showCategoryConfirm(
        `Delete all ${totalCategories} categor${totalCategories === 1 ? 'y' : 'ies'}? This action cannot be undone.`,
        'Delete All',
        'Cancel'
    );

    if (!confirmation) {
        return;
    }

    deleteAllCategories({ refresh: true });
    showNotification('success', 'All categories deleted successfully.', 3600, 'categoryNotificationArea');
}

function toggleCategoryCompareMode(force) {
    const nextState = typeof force === 'boolean' ? force : !state.categoryCompareMode;
    state.categoryCompareMode = nextState;
    if (!nextState) {
        state.categoryCompareSelection = [];
    }
    const button = document.getElementById('categoryCompareToggleBtn');
    if (button) {
        button.classList.toggle('active', nextState);
    }
    updateCategoryCompareDrawer();
    renderCategoryGrid();
}

function updateCategoryCompareDrawer() {
    const drawer = document.getElementById('categoryRelatedDrawer');
    if (!drawer) return;
    if (!state.categoryCompareMode) {
        drawer.classList.remove('compare-mode');
        drawer.innerHTML = '';
        if (state.categorySelectedIds.size) {
            const iterator = state.categorySelectedIds.values();
            const current = iterator.next();
            if (!current.done) {
                renderCategoryRelatedDrawer(current.value);
                return;
            }
        }
        drawer.classList.add('hidden');
        return;
    }
    drawer.classList.add('compare-mode');
    const primary = categoryLookupById.get(state.categoryCompareSelection[0] || '');
    const secondary = categoryLookupById.get(state.categoryCompareSelection[1] || '');

    const renderCard = (category, placeholder) => {
        if (!category) {
            return `<div class="compare-card empty">${escapeHtml(placeholder)}</div>`;
        }
        return `
            <div class="compare-card">
                <header>
                    <h5>${escapeHtml(getCategoryDisplayName(category))}</h5>
                    <span class="status-pill small">${getCategoryStatusLabel(category.status)}</span>
                </header>
                <dl>
                    <div><dt>Code</dt><dd>${escapeHtml(category.categoryCode || category.id)}</dd></div>
                    <div><dt>Parent</dt><dd>${escapeHtml(resolveCategoryParentLabel(category))}</dd></div>
                    <div><dt>Specifications</dt><dd>${escapeHtml(Number.isFinite(category.specificationCount) ? String(category.specificationCount) : '0')}</dd></div>
                    <div><dt>Created</dt><dd>${escapeHtml(formatDateForDisplay(category.createdAt) || '—')}</dd></div>
                </dl>
                <button type="button" class="btn btn-outline" data-category-action="edit" data-category-id="${escapeAttribute(category.id)}">Edit</button>
            </div>
        `;
    };

    drawer.innerHTML = `
        <div class="compare-grid">
            ${renderCard(primary, 'Select first category')}
            ${renderCard(secondary, state.categoryCompareSelection.length ? 'Select one more category' : 'Select second category')}
        </div>
    `;
    drawer.classList.remove('hidden');
}

function addCategoryToCompare(categoryId) {
    if (!categoryId) return;
    const existingIndex = state.categoryCompareSelection.indexOf(categoryId);
    if (existingIndex >= 0) {
        state.categoryCompareSelection.splice(existingIndex, 1);
    }
    if (state.categoryCompareSelection.length === 2) {
        state.categoryCompareSelection.shift();
    }
    state.categoryCompareSelection.push(categoryId);
}

function removeCategoryFromCompare(categoryId) {
    const next = state.categoryCompareSelection.filter(id => id !== categoryId);
    state.categoryCompareSelection = next;
}

function handleCategoryTreeSearchInput(term) {
    state.categoryTreeSearchTerm = term.trim();
    renderCategoryTree();
}

function handleCategoryDetailSearchInput(term) {
    state.categoryDetailSearchTerm = term.trim();
    const headerSearch = document.getElementById('categorySearchInput');
    if (headerSearch && headerSearch.value !== state.categoryDetailSearchTerm) {
        headerSearch.value = state.categoryDetailSearchTerm;
    }
    refreshCategoryDirectoryView({ rebuildCaches: false, resetScroll: false });
}

function handleCategoryStatusFilterChange(value) {
    const normalized = (value || 'all').toLowerCase();
    if (!['all', 'active', 'inactive'].includes(normalized)) {
        state.categoryStatusFilter = 'all';
    } else {
        state.categoryStatusFilter = normalized;
    }
    refreshCategoryDirectoryView({ rebuildCaches: false, resetScroll: false });
}

function handleCategoryDepthFilterChange(value) {
    if (value === 'all') {
        state.categoryDepthFilter = 'all';
    } else {
        const trimmed = String(value || '').trim();
        state.categoryDepthFilter = /^\d+$/.test(trimmed) ? trimmed : 'all';
    }
    refreshCategoryDirectoryView({ rebuildCaches: false, resetScroll: true });
}

function handleCategoryExpandCollapse(action) {
    if (action === 'expand') {
        categoryChildrenLookup.forEach((_, key) => state.categoryExplorerExpanded.add(key));
    } else if (action === 'collapse') {
        collapseCategoryExplorer();
    }
    renderCategoryTree();
}

function updateCategoryFormHeader(category = null, options = {}) {
    const isEdit = !!category && state.categoryBuilderMode === 'edit';
    const submitBtn = document.getElementById('categoryFormSubmitBtn');

    if (!options.skipTitleUpdate) {
        setCategoryModuleTitle(isEdit ? 'Edit Category' : 'Add New Category');
    }
    if (submitBtn) {
        const icon = submitBtn.querySelector('i');
        const iconHtml = icon ? icon.outerHTML : '<i class="fas fa-floppy-disk"></i>';
        submitBtn.innerHTML = `${iconHtml} ${isEdit ? 'Save' : 'Add'}`;
    }
}

function populateCategoryForm(category) {
    if (!category) return;

    const arabicInput = document.getElementById('categoryNameArabicInput');
    const englishInput = document.getElementById('categoryNameEnglishInput');
    const descriptionEnInput = document.getElementById('categoryDescriptionEnInput');
    const descriptionArInput = document.getElementById('categoryDescriptionArInput');
    const parentSelect = document.getElementById('categoryParentInput');
    const ownerInput = document.getElementById('categoryOwnerInput');
    const priceTypeSelect = document.getElementById('categoryPriceTypeInput');
    const publishPriceInput = document.getElementById('categoryPublishPriceInput');
    const freeImagesInput = document.getElementById('categoryFreeImagesInput');
    const freeVideosInput = document.getElementById('categoryFreeVideosInput');
    const extraImageFeeInput = document.getElementById('categoryExtraImageFeeInput');
    const extraVideoFeeInput = document.getElementById('categoryExtraVideoFeeInput');
    const minimumBidValueInput = document.getElementById('categoryMinimumBidValueInput');
    const minimumBidEditableSelect = document.getElementById('categoryMinimumBidEditableSelect');
    const subtitleFeeInput = document.getElementById('categorySubtitleFeeInput');
    const auctionPeriodsInput = document.getElementById('categoryAuctionPeriodsInput');
    const auctionTimeFeeInput = document.getElementById('categoryAuctionTimeFeeInput');
    const fixedSaleFeeInput = document.getElementById('categoryFixedSaleFeeInput');
    const auctionFeeInput = document.getElementById('categoryAuctionFeeInput');
    const negotiationFeeInput = document.getElementById('categoryNegotiationFeeInput');
    const feeDueTimeSelect = document.getElementById('categoryFeeDueTimeInput');
    const statusSelect = document.getElementById('categoryStatusInput');
    const specCountInput = document.getElementById('categorySpecCountInput');
    const syncToggle = document.getElementById('categorySyncToggle');
    const alertToggle = document.getElementById('categoryAlertToggle');
    const enableFixedToggle = document.getElementById('categoryEnableFixedToggle');
    const enableAuctionToggle = document.getElementById('categoryEnableAuctionToggle');
    const enableNegotiationToggle = document.getElementById('categoryEnableNegotiationToggle');
    const showAtHomeToggle = document.getElementById('categoryShowAtHomeToggle');
    const realEstateToggle = document.getElementById('categoryRealEstateToggle');
    const chooseCategorySelect = document.getElementById('categoryChooseCategoryInput');
    const imageInput = document.getElementById('categoryImageInput');

    if (arabicInput) arabicInput.value = category.nameArabic || '';
    if (englishInput) englishInput.value = category.nameEnglish || '';
    if (descriptionEnInput) descriptionEnInput.value = category.englishDescription || '';
    if (descriptionArInput) descriptionArInput.value = category.arabicDescription || '';
    if (parentSelect) {
        if (!categoryLookupById.size) {
            rebuildCategoryCaches();
        }
        const parentId = getCategoryParentId(category);
        const hasParent = parentId && parentId !== CATEGORY_TREE_ROOT_ID;
        const parentCategory = hasParent ? categoryLookupById.get(parentId) : null;
        const parentLabel = hasParent ? resolveCategoryParentLabel(category) : '';
        const parentPath = parentCategory ? buildCategoryDisplayPath(parentCategory, categories) : '';
        parentSelect.value = parentPath || parentLabel || '';
        if (hasParent) {
            parentSelect.dataset.parentCategoryId = parentId;
            parentSelect.dataset.parentCategoryLabel = parentLabel;
        } else {
            delete parentSelect.dataset.parentCategoryId;
            delete parentSelect.dataset.parentCategoryLabel;
        }
    }
    if (ownerInput) ownerInput.value = category.owner || '';
    if (priceTypeSelect) priceTypeSelect.value = category.productPriceType || 'fixed';
    if (publishPriceInput) publishPriceInput.value = Number.isFinite(category.productPublishPrice) ? category.productPublishPrice : '';
    if (freeImagesInput) freeImagesInput.value = Number.isFinite(category.freeProductImagesCount) ? category.freeProductImagesCount : '';
    if (freeVideosInput) freeVideosInput.value = Number.isFinite(category.freeProductVideosCount) ? category.freeProductVideosCount : '';
    if (extraImageFeeInput) extraImageFeeInput.value = Number.isFinite(category.extraProductImageFee) ? category.extraProductImageFee : '';
    if (extraVideoFeeInput) extraVideoFeeInput.value = Number.isFinite(category.extraProductVideoFee) ? category.extraProductVideoFee : '';
    if (minimumBidValueInput) {
        minimumBidValueInput.value = Number.isFinite(category.minimumBidValue) ? category.minimumBidValue : '';
    }
    if (minimumBidEditableSelect) {
        const sellerCanModify = category.minimumBidSellerCanModify === true
            || (typeof category.minimumBidSellerCanModify === 'string'
                && category.minimumBidSellerCanModify.trim().toLowerCase() === 'yes');
        minimumBidEditableSelect.value = sellerCanModify ? 'yes' : 'no';
    }
    if (subtitleFeeInput) subtitleFeeInput.value = Number.isFinite(category.subtitleFee) ? category.subtitleFee : '';
    if (auctionPeriodsInput) {
        const periods = parseAuctionPeriods(category.auctionClosingPeriods, category.auctionClosingPeriodsUnit);
        setAuctionPeriodsInput(periods);
    }
    if (auctionTimeFeeInput) auctionTimeFeeInput.value = Number.isFinite(category.auctionClosingTimeFee) ? category.auctionClosingTimeFee : '';
    if (fixedSaleFeeInput) fixedSaleFeeInput.value = Number.isFinite(category.fixedPriceSaleFee) ? category.fixedPriceSaleFee : '';
    if (auctionFeeInput) auctionFeeInput.value = Number.isFinite(category.auctionFee) ? category.auctionFee : '';
    if (negotiationFeeInput) negotiationFeeInput.value = Number.isFinite(category.negotiationFee) ? category.negotiationFee : '';
    if (feeDueTimeSelect) feeDueTimeSelect.value = category.productFeeDueTime || 'now';
    if (statusSelect) statusSelect.value = category.status || 'published';
    if (specCountInput) specCountInput.value = Number.isFinite(category.specificationCount) ? category.specificationCount : '';
    if (syncToggle) syncToggle.checked = !!category.syncAutomation;
    if (alertToggle) alertToggle.checked = category.notifyOnStatusChange !== false;
    if (enableFixedToggle) enableFixedToggle.checked = !!category.supportsFixedPrice;
    if (enableAuctionToggle) enableAuctionToggle.checked = !!category.supportsAuction;
    if (enableNegotiationToggle) enableNegotiationToggle.checked = !!category.supportsNegotiation;
    if (showAtHomeToggle) showAtHomeToggle.checked = !!category.showAtHome;
    if (realEstateToggle) realEstateToggle.checked = !!category.isRealEstate;
    if (chooseCategorySelect) chooseCategorySelect.value = category.baseCategory || '';
    if (imageInput && imageInput.dataset) {
        if (category.imageDataUrl) {
            imageInput.dataset.storedDataUrl = category.imageDataUrl;
        }
        if (category.imageName) {
            imageInput.dataset.storedImageName = category.imageName;
        }
    }

    updateCategoryImagePreview(category.imageDataUrl || '', category.imageName || category.nameEnglish || '');
    applyCategoryPricingToggleStates();
    enforceAdPublishingFeeTypeConstraints();
}

function showCategoryBuilder(mode = 'create', category = null) {
    const directory = document.getElementById('categoryDirectoryView');
    const builder = document.getElementById('categoryBuilderView');
    const addBtn = document.getElementById('newCategoryBtn');
    const searchContainer = document.getElementById('categorySearchContainer');
    const actionsContainer = document.querySelector('#categories-app1 .roles-actions');
    const form = document.getElementById('categoryForm');
    if (!directory || !builder || !addBtn || !form) return;

    state.categoryBuilderMode = mode === 'edit' ? 'edit' : 'create';
    state.editingCategoryId = mode === 'edit' && category ? category.id : null;

    form.reset();
    setAuctionPeriodsInput([]);

    const syncToggle = document.getElementById('categorySyncToggle');
    const alertToggle = document.getElementById('categoryAlertToggle');
    const imageInput = document.getElementById('categoryImageInput');
    const parentSelect = document.getElementById('categoryParentInput');
    if (syncToggle) {
        syncToggle.checked = category ? !!category.syncAutomation : false;
    }
    if (alertToggle) {
        alertToggle.checked = category ? category.notifyOnStatusChange !== false : true;
    }
    if (imageInput) {
        imageInput.value = '';
        delete imageInput.dataset.storedDataUrl;
        delete imageInput.dataset.storedImageName;
    }
    if (parentSelect) {
        delete parentSelect.dataset.parentCategoryId;
        delete parentSelect.dataset.parentCategoryLabel;
    }

    updateCategoryImagePreview(null);

    updateCategoryFormHeader(category);

    if (mode === 'edit' && category) {
        if (imageInput && category.imageDataUrl) {
            imageInput.dataset.storedDataUrl = category.imageDataUrl;
            imageInput.dataset.storedImageName = category.imageName || category.nameEnglish || '';
        }
        populateCategoryForm(category);
    } else {
        applyCategoryPricingToggleStates();
    }

    builder.classList.remove('hidden');
    directory.classList.add('hidden');
    addBtn.classList.add('hidden');
    searchContainer?.classList.add('hidden');
    actionsContainer?.classList.add('hidden');

    const focusTarget = document.getElementById('categoryNameArabicInput');
    if (focusTarget) {
        setTimeout(() => focusTarget.focus(), 0);
    }

    updateBreadcrumb('categories');
}

function hideCategoryBuilder() {
    const directory = document.getElementById('categoryDirectoryView');
    const builder = document.getElementById('categoryBuilderView');
    const addBtn = document.getElementById('newCategoryBtn');
    const searchContainer = document.getElementById('categorySearchContainer');
    const actionsContainer = document.querySelector('#categories-app1 .roles-actions');
    const form = document.getElementById('categoryForm');
    if (!directory || !builder || !addBtn || !form) return;

    form.reset();
    setAuctionPeriodsInput([]);

    const syncToggle = document.getElementById('categorySyncToggle');
    const alertToggle = document.getElementById('categoryAlertToggle');
    const imageInput = document.getElementById('categoryImageInput');
    if (syncToggle) {
        syncToggle.checked = false;
    }
    if (alertToggle) {
        alertToggle.checked = true;
    }
    if (imageInput) {
        imageInput.value = '';
        delete imageInput.dataset.storedDataUrl;
        delete imageInput.dataset.storedImageName;
    }

    applyCategoryPricingToggleStates();

    updateCategoryImagePreview(null);

    state.categoryBuilderMode = 'create';
    state.editingCategoryId = null;

    builder.classList.add('hidden');
    directory.classList.remove('hidden');
    addBtn.classList.remove('hidden');
    searchContainer?.classList.remove('hidden');
    actionsContainer?.classList.remove('hidden');

    updateCategoryFormHeader(null, { skipTitleUpdate: true });
    setCategoryModuleTitle('Categories');
    updateBreadcrumb('categories');
}

function startCreateCategory() {
    showCategoryBuilder('create');
}

function collectCategoryFormData() {
    const arabicInput = document.getElementById('categoryNameArabicInput');
    const englishInput = document.getElementById('categoryNameEnglishInput');
    const imageInput = document.getElementById('categoryImageInput');
    const descriptionEnInput = document.getElementById('categoryDescriptionEnInput');
    const descriptionArInput = document.getElementById('categoryDescriptionArInput');
    const parentSelect = document.getElementById('categoryParentInput');
    const ownerInput = document.getElementById('categoryOwnerInput');
    const priceTypeSelect = document.getElementById('categoryPriceTypeInput');
    const publishPriceInput = document.getElementById('categoryPublishPriceInput');
    const freeImagesInput = document.getElementById('categoryFreeImagesInput');
    const freeVideosInput = document.getElementById('categoryFreeVideosInput');
    const extraImageFeeInput = document.getElementById('categoryExtraImageFeeInput');
    const extraVideoFeeInput = document.getElementById('categoryExtraVideoFeeInput');
    const minimumBidValueInput = document.getElementById('categoryMinimumBidValueInput');
    const minimumBidEditableSelect = document.getElementById('categoryMinimumBidEditableSelect');
    const subtitleFeeInput = document.getElementById('categorySubtitleFeeInput');
    const auctionTimeFeeInput = document.getElementById('categoryAuctionTimeFeeInput');
    const fixedSaleFeeInput = document.getElementById('categoryFixedSaleFeeInput');
    const auctionFeeInput = document.getElementById('categoryAuctionFeeInput');
    const negotiationFeeInput = document.getElementById('categoryNegotiationFeeInput');
    const feeDueTimeSelect = document.getElementById('categoryFeeDueTimeInput');
    const statusSelect = document.getElementById('categoryStatusInput');
    const specCountInput = document.getElementById('categorySpecCountInput');
    const syncToggle = document.getElementById('categorySyncToggle');
    const alertToggle = document.getElementById('categoryAlertToggle');
    const enableFixedToggle = document.getElementById('categoryEnableFixedToggle');
    const enableAuctionToggle = document.getElementById('categoryEnableAuctionToggle');
    const enableNegotiationToggle = document.getElementById('categoryEnableNegotiationToggle');
    const showAtHomeToggle = document.getElementById('categoryShowAtHomeToggle');
    const realEstateToggle = document.getElementById('categoryRealEstateToggle');
    const chooseCategorySelect = document.getElementById('categoryChooseCategoryInput');

    const parseInteger = value => {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };

    const parseNumber = value => {
        if (value === '' || value === null || value === undefined) {
            return 0;
        }
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const nameArabic = arabicInput ? arabicInput.value.trim() : '';
    const rawEnglish = englishInput ? englishInput.value.trim() : '';
    const nameEnglish = rawEnglish || nameArabic;
    const parentDatasetLabel = parentSelect && parentSelect.dataset && typeof parentSelect.dataset.parentCategoryLabel === 'string'
        ? parentSelect.dataset.parentCategoryLabel.trim()
        : '';
    const parent = parentDatasetLabel
        ? parentDatasetLabel
        : parentSelect
            ? parentSelect.value.trim()
            : '';
    const parentCategoryId = parentSelect && parentSelect.dataset ? (parentSelect.dataset.parentCategoryId || '').trim() : '';
    const owner = ownerInput ? ownerInput.value.trim() : '';
    const englishDescription = descriptionEnInput ? descriptionEnInput.value.trim() : '';
    const arabicDescription = descriptionArInput ? descriptionArInput.value.trim() : '';
    const description = englishDescription;
    const rawStatus = statusSelect ? statusSelect.value.trim().toLowerCase() : 'published';
    const allowedStatuses = new Set(['draft', 'in-review', 'published', 'archived']);
    const status = allowedStatuses.has(rawStatus) ? rawStatus : 'published';

    const specificationCount = parseInteger(specCountInput ? specCountInput.value : 0);

    const adPublishingFeeTypeRaw = priceTypeSelect ? priceTypeSelect.value.trim().toLowerCase() : '';
    const adPublishingFeeType = adPublishingFeeTypeRaw || 'fixed';
    const adPublishingFeeAmount = parseNumber(publishPriceInput ? publishPriceInput.value : 0);
    const adPublishingFeeDueRaw = feeDueTimeSelect ? feeDueTimeSelect.value.trim().toLowerCase() : '';
    const adPublishingFeeDue = adPublishingFeeDueRaw || 'on-publish';

    const freeProductImagesCount = parseInteger(freeImagesInput ? freeImagesInput.value : 0);
    const freeProductVideosCount = parseInteger(freeVideosInput ? freeVideosInput.value : 0);
    const extraProductImageFee = parseNumber(extraImageFeeInput ? extraImageFeeInput.value : 0);
    const extraProductVideoFee = parseNumber(extraVideoFeeInput ? extraVideoFeeInput.value : 0);
    const subtitleFee = parseNumber(subtitleFeeInput ? subtitleFeeInput.value : 0);

    const supportsFixedPrice = enableFixedToggle ? !!enableFixedToggle.checked : false;
    const supportsAuction = enableAuctionToggle ? !!enableAuctionToggle.checked : false;
    const supportsNegotiation = enableNegotiationToggle ? !!enableNegotiationToggle.checked : false;

    const fixedPriceSaleFee = supportsFixedPrice ? parseNumber(fixedSaleFeeInput ? fixedSaleFeeInput.value : 0) : 0;
    const negotiationFee = supportsNegotiation ? parseNumber(negotiationFeeInput ? negotiationFeeInput.value : 0) : 0;
    const auctionFee = supportsAuction ? parseNumber(auctionFeeInput ? auctionFeeInput.value : 0) : 0;
    const minimumBidValue = supportsAuction ? parseNumber(minimumBidValueInput ? minimumBidValueInput.value : 0) : 0;
    const minimumBidSellerCanModify = supportsAuction
        ? !!(minimumBidEditableSelect && minimumBidEditableSelect.value === 'yes')
        : false;
    const auctionClosingPeriodsList = supportsAuction ? getAuctionPeriodsFromInput() : [];
    const auctionClosingTimeFee = supportsAuction ? parseNumber(auctionTimeFeeInput ? auctionTimeFeeInput.value : 0) : 0;
    const auctionClosingPeriodsUnit = auctionClosingPeriodsList.length
        ? auctionClosingPeriodsList.every(entry => entry.unit === auctionClosingPeriodsList[0].unit)
            ? auctionClosingPeriodsList[0].unit
            : ''
        : '';

    const baseCategory = chooseCategorySelect ? chooseCategorySelect.value.trim() : '';

    const imageFile = imageInput && imageInput.files && imageInput.files.length ? imageInput.files[0] : null;

    return {
        nameArabic,
        nameEnglish,
        parent,
        parentCategoryId,
        owner,
        description,
        englishDescription,
        arabicDescription,
        status,
        specificationCount,
        notifyOnStatusChange: alertToggle ? !!alertToggle.checked : true,
        syncAutomation: syncToggle ? !!syncToggle.checked : false,
        hasExplicitEnglish: !!rawEnglish,
        imageFile,
        adPublishingFeeType,
        adPublishingFeeAmount,
        adPublishingFeeDue,
        productPriceType: adPublishingFeeType,
        productPublishPrice: adPublishingFeeAmount,
        productFeeDueTime: adPublishingFeeDue,
        freeProductImagesCount,
        freeProductVideosCount,
        extraProductImageFee,
        extraProductVideoFee,
        minimumBidValue,
        minimumBidSellerCanModify,
        subtitleFee,
    auctionClosingPeriods: auctionClosingPeriodsList,
        auctionClosingTimeFee,
        fixedPriceSaleFee,
        auctionFee,
        negotiationFee,
        auctionClosingPeriodsUnit,
        baseCategory,
        supportsFixedPrice,
        supportsAuction,
        supportsNegotiation,
        showAtHome: showAtHomeToggle ? !!showAtHomeToggle.checked : false,
        isRealEstate: realEstateToggle ? !!realEstateToggle.checked : false
    };
}

async function handleCategoryFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form) return;

    const statusField = document.getElementById('categoryStatusInput');
    const statusFieldPresent = !!statusField;

    const requiredFieldConfigs = [
    { id: 'categoryNameArabicInput', label: 'Category Name (Arabic)' },
    { id: 'categoryNameEnglishInput', label: 'Category Name (English)' }
    ];

    const missingField = requiredFieldConfigs.find(({ id }) => {
        const input = document.getElementById(id);
        if (!input) {
            return false;
        }
        const value = typeof input.value === 'string' ? input.value.trim() : '';
        return value.length === 0;
    });

    if (missingField) {
        const input = document.getElementById(missingField.id);
        if (input && typeof input.focus === 'function') {
            input.focus();
        }
        showNotification('error', `${missingField.label} is Required.`, 4000, 'categoryNotificationArea');
        return;
    }

    const payload = collectCategoryFormData();
    if (!payload) {
        showNotification('error', 'Unable to read category form data.', 4000, 'categoryNotificationArea');
        return;
    }

    if (!payload.hasExplicitEnglish) {
        const englishInput = document.getElementById('categoryNameEnglishInput');
        if (englishInput) {
            englishInput.focus();
        }
        showNotification('error', 'Please provide the English category name before saving.', 4000, 'categoryNotificationArea');
        return;
    }

    const { hasExplicitEnglish, imageFile, ...categoryData } = payload;
    const statusFromForm = statusFieldPresent && typeof categoryData.status === 'string'
        ? categoryData.status.trim()
        : undefined;

    const isEdit = state.categoryBuilderMode === 'edit' && state.editingCategoryId;

    if (isEdit) {
        const existing = categories.find(entry => entry && entry.id === state.editingCategoryId);
        if (!existing) {
            showNotification('error', 'Selected category could not be found.', 4000, 'categoryNotificationArea');
            return;
        }

        const parentInput = document.getElementById('categoryParentInput');
        const resolveParentCandidateId = () => {
            const explicitParentId = typeof categoryData.parentCategoryId === 'string'
                ? categoryData.parentCategoryId.trim()
                : '';
            if (explicitParentId) {
                return explicitParentId;
            }
            const parentLabel = typeof categoryData.parent === 'string' ? categoryData.parent.trim() : '';
            if (!parentLabel) {
                return '';
            }
            const resolvedParent = resolveCategoryByIdentifier(parentLabel);
            return resolvedParent && resolvedParent.id ? resolvedParent.id : '';
        };

        const nextParentId = resolveParentCandidateId();
        if (nextParentId) {
            if (nextParentId === existing.id) {
                if (parentInput && typeof parentInput.focus === 'function') {
                    parentInput.focus();
                }
                showNotification('error', 'A Category Cannot be Set as Its Own Parent.', 4600, 'categoryNotificationArea');
                return;
            }

            if (!(categoryChildrenLookup instanceof Map) || !(categoryParentLookup instanceof Map) || !categoryLookupById.size) {
                rebuildCategoryCaches();
            }

            const descendantList = collectCategoryDescendants(existing.id);
            const descendantIds = new Set(descendantList.map(item => item && item.id ? item.id.trim() : '').filter(Boolean));
            if (descendantIds.has(nextParentId)) {
                if (parentInput && typeof parentInput.focus === 'function') {
                    parentInput.focus();
                }
                showNotification('error', 'A Subcategory Cannot be Set as a Parent Category for the Current Category', 4800, 'categoryNotificationArea');
                return;
            }
        }

        const previousLabel = getCategoryDisplayName(existing);
        const previousStatus = existing.status;
        Object.assign(existing, categoryData);
        if (!statusFieldPresent || !statusFromForm) {
            existing.status = previousStatus;
        }
        existing.updatedAt = new Date().toISOString();
        const updatedLabel = getCategoryDisplayName(existing);
        if (previousLabel !== updatedLabel) {
            updateChildCategoryParentLabels(existing.id, updatedLabel);
        }
        if (imageFile) {
            try {
                const dataUrl = await readFileAsDataUrl(imageFile);
                if (dataUrl) {
                    existing.imageDataUrl = dataUrl;
                    existing.imageName = imageFile.name || 'category-image';
                }
            } catch (error) {
                console.warn('Unable to read category image file:', error);
                showNotification('warning', 'Category saved, but preview image could not be processed.', 4000, 'categoryNotificationArea');
            }
        }
        showNotification('success', 'Category updated successfully.', 3600, 'categoryNotificationArea');
    } else {
        let imageDataUrl = '';
        let imageName = '';
        if (imageFile) {
            try {
                const dataUrl = await readFileAsDataUrl(imageFile);
                if (dataUrl) {
                    imageDataUrl = dataUrl;
                    imageName = imageFile.name || 'category-image';
                }
            } catch (error) {
                console.warn('Unable to process uploaded category image:', error);
                showNotification('warning', 'Category created, but preview image could not be processed.', 4000, 'categoryNotificationArea');
            }
        }
        const generatedCode = generateSequentialCategoryCode(categoryData.parentCategoryId, categoryData.parent, categories);
        const activeUserName = state.activeSession && state.activeSession.user
            ? (state.activeSession.user.name
                || [state.activeSession.user.firstName, state.activeSession.user.lastName].filter(Boolean).join(' ')
                || state.activeSession.user.email
                || 'Central Admin')
            : 'Central Admin';
        const categoryRecord = normalizeCategoryPayload({
            id: generateCategoryId(),
            ...categoryData,
            categoryCode: generatedCode || generateTopLevelCategoryCode(categories),
            createdAt: new Date().toISOString(),
            createdBy: activeUserName,
            imageDataUrl,
            imageName
        }, categories.length);
        categories.unshift(categoryRecord);
        showNotification('success', 'Category Added Successfully.', 3600, 'categoryNotificationArea');
    }

    saveCategoriesToStorage();
    state.currentCategoryPage = 1;
    renderCategoriesTable(1);
    hideCategoryBuilder();
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
                <td>${role.id || ''}</td>
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
    const areaCandidates = ['globalNotificationArea'];
    if (areaId) {
        areaCandidates.push(areaId);
    }
    areaCandidates.push('roleNotificationArea', 'categoryNotificationArea');

    const host = areaCandidates
        .filter(Boolean)
        .map(id => document.getElementById(id))
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

function formatDateForInput(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayAtMidnight() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function applyAccountExpirationConstraints(input) {
    if (!input) {
        return false;
    }

    const today = getTodayAtMidnight();
    input.min = formatDateForInput(today);

    if (!input.value) {
        return true;
    }

    const selected = new Date(input.value);
    if (Number.isNaN(selected.getTime())) {
        input.value = '';
        state.userDraft = {
            ...(state.userDraft || {}),
            expiresOn: ''
        };
        return false;
    }

    selected.setHours(0, 0, 0, 0);
    if (selected <= today) {
        input.value = '';
        state.userDraft = {
            ...(state.userDraft || {}),
            expiresOn: ''
        };
        return false;
    }

    return true;
}

function getActiveSessionUser() {
    return state.activeSession && state.activeSession.user ? state.activeSession.user : null;
}

function getActiveSessionUserId() {
    const user = getActiveSessionUser();
    return user && typeof user.id === 'number' ? user.id : null;
}

function canManageUserAccount(user) {
    return Boolean(getActiveSessionUserId());
}

function ensureUserManagementPermission(user, actionDescription = 'perform this action') {
    if (canManageUserAccount(user)) {
        return true;
    }
    showNotification('warning', 'You need to be signed in to manage user accounts.');
    return false;
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

function resolveUserCreator(user) {
    if (!user || typeof user !== 'object') {
        return { label: '—', email: '' };
    }

    const creatorId = Number.isInteger(user.createdBy) ? user.createdBy : null;
    if (!creatorId) {
        return { label: '—', email: '' };
    }

    const creatorRecord = users.find(candidate => candidate && candidate.id === creatorId) || null;
    if (!creatorRecord) {
        return { label: `User #${creatorId}`, email: '' };
    }

    const creatorName = resolveUserDisplayName(creatorRecord);
    const creatorEmail = typeof creatorRecord.email === 'string' ? creatorRecord.email.trim() : '';
    const activeSessionId = getActiveSessionUserId();
    const suffix = activeSessionId === creatorId ? ' (You)' : '';

    return {
        label: `${creatorName}${suffix}`,
        email: creatorEmail
    };
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

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = event => {
            resolve(event.target && event.target.result ? String(event.target.result) : null);
        };
        reader.onerror = () => {
            reader.abort();
            reject(new Error('File reading failed'));
        };
        reader.readAsDataURL(file);
    });
}

function updateCategoryImagePreview(dataUrl, imageName = '') {
    const preview = document.getElementById('categoryImagePreview');
    if (!preview) return;
    const source = dataUrl || '';
    const label = typeof imageName === 'string' ? imageName.trim() : '';

    preview.dataset.fullImage = source;
    preview.dataset.imageName = label;
    preview.classList.remove('has-image', 'clickable');
    preview.removeAttribute('tabindex');
    preview.setAttribute('aria-haspopup', 'false');

    if (source) {
        const safeSrc = escapeAttribute(source);
        const safeAlt = escapeAttribute(label || 'Category image preview');
        preview.innerHTML = `<img src="${safeSrc}" alt="${safeAlt}">`;
        preview.classList.add('has-image', 'clickable');
        preview.setAttribute('role', 'button');
        preview.setAttribute('tabindex', '0');
        preview.setAttribute('aria-haspopup', 'dialog');
        preview.setAttribute('aria-label', label ? `${label} (open full-size preview)` : 'Category image selected. Open full-size preview');
    } else {
        preview.innerHTML = '<i class="fas fa-image" aria-hidden="true"></i>';
        preview.setAttribute('role', 'img');
        preview.setAttribute('aria-label', 'No category image selected');
    }
}

let categoryImageModalEscHandler = null;
let categoryImageModalPreviousFocus = null;
let categoryImageModalAppliedBodyLock = false;

function openCategoryImageModal(source, imageName = '') {
    if (!source) {
        return;
    }
    const modal = document.getElementById('categoryImageModal');
    const imageElement = document.getElementById('categoryImageModalImg');
    const caption = document.getElementById('categoryImageModalCaption');
    const closeBtn = document.getElementById('closeCategoryImageModalBtn');
    if (!modal || !imageElement) {
        return;
    }

    const label = typeof imageName === 'string' ? imageName.trim() : '';
    imageElement.src = source;
    imageElement.alt = label ? `${label} full-size preview` : 'Category image full-size preview';
    if (caption) {
        caption.textContent = label;
        caption.classList.toggle('hidden', !label);
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    categoryImageModalPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!document.body.classList.contains('modal-open')) {
        document.body.classList.add('modal-open');
        categoryImageModalAppliedBodyLock = true;
    } else {
        categoryImageModalAppliedBodyLock = false;
    }

    if (!categoryImageModalEscHandler) {
        categoryImageModalEscHandler = event => {
            if (event.key === 'Escape') {
                closeCategoryImageModal();
            }
        };
        document.addEventListener('keydown', categoryImageModalEscHandler);
    }

    if (closeBtn) {
        closeBtn.focus();
    } else if (modal) {
        try {
            modal.focus({ preventScroll: true });
        } catch (error) {
            modal.focus();
        }
    }
}

function closeCategoryImageModal() {
    const modal = document.getElementById('categoryImageModal');
    const imageElement = document.getElementById('categoryImageModalImg');
    const caption = document.getElementById('categoryImageModalCaption');
    if (!modal) {
        return;
    }
    if (imageElement) {
        imageElement.src = '';
        imageElement.alt = '';
    }
    if (caption) {
        caption.textContent = '';
        caption.classList.remove('hidden');
    }

    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (categoryImageModalAppliedBodyLock) {
        document.body.classList.remove('modal-open');
    }
    categoryImageModalAppliedBodyLock = false;

    if (categoryImageModalEscHandler) {
        document.removeEventListener('keydown', categoryImageModalEscHandler);
        categoryImageModalEscHandler = null;
    }

    if (categoryImageModalPreviousFocus && typeof categoryImageModalPreviousFocus.focus === 'function') {
        categoryImageModalPreviousFocus.focus();
    }
    categoryImageModalPreviousFocus = null;
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

const DEFAULT_AVATAR_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function getUserAvatarUrl() {
    return DEFAULT_AVATAR_PLACEHOLDER;
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
    const rawPhotoDataUrl = account && typeof account.photoDataUrl === 'string' ? account.photoDataUrl.trim() : '';
    const rawPhotoUrl = account && typeof account.photoUrl === 'string' ? account.photoUrl.trim() : '';
    const avatarSrc = rawPhotoDataUrl || rawPhotoUrl || getUserAvatarUrl();
    const avatarAlt = avatarSrc === DEFAULT_AVATAR_PLACEHOLDER
        ? 'No profile photo available'
        : `${nameValue !== '—' ? nameValue : 'User'} profile photo`;

    if (nameEl) nameEl.textContent = nameValue;
    if (emailEl) emailEl.textContent = emailValue;
    if (phoneEl) phoneEl.textContent = phoneValue;
    if (photoEl) {
        photoEl.src = avatarSrc;
        photoEl.alt = avatarAlt;
    }

    if (editNameEl) editNameEl.textContent = nameValue;
    if (editEmailEl) editEmailEl.textContent = emailValue;
    if (editPhoneEl) editPhoneEl.textContent = phoneValue;
    if (editDepartmentEl) editDepartmentEl.textContent = departmentValue;
    if (editPhotoEl) {
        editPhotoEl.src = avatarSrc;
        editPhotoEl.alt = avatarAlt;
    }
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
        photoUrl: ''
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
    const input = event && event.target ? event.target : null;
    if (!input) {
        return;
    }

    const previousValue = input.value;
    const isValid = applyAccountExpirationConstraints(input);
    const sanitizedValue = input.value;

    if (!isValid && previousValue) {
        showNotification('error', 'Account Expiration must be Set to a Future Date.');
        input.focus();
        return;
    }

    state.userDraft = {
        ...(state.userDraft || {}),
        expiresOn: sanitizedValue || ''
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

let categoryConfirmResolver = null;
let roleConfirmResolver = null;
let userConfirmResolver = null;
let userAlertResolver = null;
let roleAlertResolver = null;
let rolePromptResolver = null;
let rolePromptValidator = null;
let userPromptResolver = null;
let userPromptValidator = null;

function setupCategoryConfirmOverlay() {
    const overlay = document.getElementById('categoryConfirmOverlay');
    const okBtn = document.getElementById('categoryConfirmOk');
    const cancelBtn = document.getElementById('categoryConfirmCancel');
    if (!overlay || !okBtn || !cancelBtn) return;

    const complete = result => {
        if (categoryConfirmResolver) {
            const resolver = categoryConfirmResolver;
            categoryConfirmResolver = null;
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
        if (event.key === 'Escape' && categoryConfirmResolver) {
            complete(false);
        }
    });
}

function showCategoryConfirm(message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
    const overlay = document.getElementById('categoryConfirmOverlay');
    const messageEl = document.getElementById('categoryConfirmMessage');
    const okBtn = document.getElementById('categoryConfirmOk');
    const cancelBtn = document.getElementById('categoryConfirmCancel');
    if (!overlay || !messageEl || !okBtn || !cancelBtn) {
        return Promise.resolve(window.confirm(message));
    }

    if (categoryConfirmResolver) {
        const resolver = categoryConfirmResolver;
        categoryConfirmResolver = null;
        resolver(false);
    }

    messageEl.textContent = message;
    okBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    overlay.classList.remove('hidden');
    okBtn.focus();

    return new Promise(resolve => {
        categoryConfirmResolver = resolve;
    });
}

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

function setupUserPromptOverlay() {
    const overlay = document.getElementById('userPromptOverlay');
    const confirmBtn = document.getElementById('userPromptConfirm');
    const cancelBtn = document.getElementById('userPromptCancel');
    const input = document.getElementById('userPromptInput');
    const errorEl = document.getElementById('userPromptError');
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
        userPromptValidator = null;
    };

    const complete = result => {
        if (!userPromptResolver) {
            return;
        }
        const resolver = userPromptResolver;
        userPromptResolver = null;
        resetPromptState();
        overlay.classList.add('hidden');
        resolver(result);
    };

    const attemptConfirm = () => {
        if (userPromptValidator) {
            const validation = userPromptValidator(input.value);
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
        if (event.key === 'Escape' && userPromptResolver) {
            complete({ confirmed: false, value: '' });
        }
        if (event.key === 'Enter' && userPromptResolver && document.activeElement === input) {
            event.preventDefault();
            attemptConfirm();
        }
    });

    input.addEventListener('input', () => {
        setPromptError('');
    });
}

function showUserPrompt(message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', placeholder = '', options = {}) {
    const overlay = document.getElementById('userPromptOverlay');
    const messageEl = document.getElementById('userPromptMessage');
    const confirmBtn = document.getElementById('userPromptConfirm');
    const cancelBtn = document.getElementById('userPromptCancel');
    const input = document.getElementById('userPromptInput');
    const errorEl = document.getElementById('userPromptError');
    if (!overlay || !messageEl || !confirmBtn || !cancelBtn || !input) {
        return Promise.resolve({ confirmed: false, value: '' });
    }

    const { validate, errorMessage = '' } = options || {};
    const defaultErrorMessage = typeof errorMessage === 'string' ? errorMessage : '';

    messageEl.textContent = message;
    confirmBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;
    input.placeholder = placeholder || '';
    input.value = '';

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }
    input.removeAttribute('aria-invalid');

    if (typeof validate === 'function') {
        const fallbackError = defaultErrorMessage || 'Please enter the correct value.';
        userPromptValidator = value => {
            const validation = validate(value);
            if (typeof validation === 'boolean') {
                return {
                    valid: validation,
                    message: validation ? '' : fallbackError
                };
            }
            if (validation && typeof validation === 'object') {
                const valid = validation.valid !== false;
                const message = valid ? '' : (validation.message || fallbackError);
                return {
                    valid,
                    message
                };
            }
            return { valid: true, message: '' };
        };
    } else {
        userPromptValidator = null;
    }

    overlay.classList.remove('hidden');

    setTimeout(() => {
        input.focus();
        input.select();
    }, 0);

    return new Promise(resolve => {
        userPromptResolver = resolve;
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

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (typeof File !== 'undefined' && !(file instanceof File)) {
            reject(new Error('Invalid file input.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            resolve(typeof reader.result === 'string' ? reader.result : '');
        };
        reader.onerror = () => {
            reject(reader.error || new Error('Unable to read file.'));
        };
        reader.readAsDataURL(file);
    });
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

function hasUserCompletedRegistration(user) {
    if (!user) {
        return false;
    }
    const status = typeof user.status === 'string' ? user.status.trim().toLowerCase() : '';
    if (status === 'active' || status === 'inactive') {
        return true;
    }
    return Boolean(user.invitation && user.invitation.completedAt);
}

function updateCompletedRegistrationPhotoPreview(photoDataUrl, photoFileName, emailFallback) {
    const preview = document.getElementById('userPhotoPreview');
    const filenameEl = document.getElementById('userPhotoFilename');
    const resolvedEmail = typeof emailFallback === 'string' ? emailFallback : '';
    const trimmedPhoto = typeof photoDataUrl === 'string' ? photoDataUrl.trim() : '';
    const resolvedPreview = trimmedPhoto || getUserAvatarUrl();
    const hasPhoto = Boolean(trimmedPhoto);

    if (preview) {
        preview.src = resolvedPreview;
        preview.alt = hasPhoto
            ? `Profile photo preview${resolvedEmail ? ` for ${resolvedEmail}` : ''}`
            : 'No profile photo selected';
    }

    if (filenameEl) {
        filenameEl.textContent = photoFileName
            ? `Current photo: ${photoFileName}`
            : '';
    }
}

function populateCompletedRegistrationSection(options = {}) {
    const {
        visible = false,
        firstName = '',
        lastName = '',
        phone = '',
        photoDataUrl = '',
        photoFileName = '',
        email = '',
        statusLabel = 'These fields appear after the user finishes onboarding.'
    } = options;

    const section = document.getElementById('userCompletedRegistrationSection');
    if (section) {
        section.classList.toggle('hidden', !visible);
        section.dataset.completed = visible ? 'true' : 'false';
    }

    const firstNameInput = document.getElementById('userFirstName');
    if (firstNameInput) {
        firstNameInput.value = visible ? firstName : '';
    }

    const lastNameInput = document.getElementById('userLastName');
    if (lastNameInput) {
        lastNameInput.value = visible ? lastName : '';
    }

    const phoneInput = document.getElementById('userPhone');
    if (phoneInput) {
        phoneInput.value = visible ? phone : '';
    }

    const statusEl = document.getElementById('userCompletedRegistrationStatus');
    if (statusEl) {
        statusEl.textContent = statusLabel;
    }

    updateCompletedRegistrationPhotoPreview(visible ? photoDataUrl : '', visible ? photoFileName : '', email);

    const photoInput = document.getElementById('userPhotoInput');
    if (photoInput && !visible) {
        photoInput.value = '';
    }
}

async function handleAdminPhotoUpload(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!input || !file) {
        return;
    }

    const isImage = file.type ? file.type.startsWith('image/') : false;
    if (!isImage) {
        showNotification('error', 'Please choose a valid image file.');
        input.value = '';
        return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        showNotification('error', 'Profile photo must be 5 MB or smaller.');
        input.value = '';
        return;
    }

    try {
        const dataUrl = await readFileAsDataUrl(file);
        const draft = { ...(state.userDraft || {}) };
        draft.photoDataUrl = dataUrl;
        draft.photoFileName = file.name || 'profile-photo';
        state.userDraft = draft;
        const email = draft.email || '';
        updateCompletedRegistrationPhotoPreview(dataUrl, draft.photoFileName, email);
    } catch (error) {
        console.error('Admin photo upload failed', error);
        showNotification('error', 'We could not read the selected photo. Please try again.');
        input.value = '';
    }
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
        const completedSection = document.getElementById('userCompletedRegistrationSection');
        const firstNameInput = document.getElementById('userFirstName');
        const lastNameInput = document.getElementById('userLastName');
        const phoneInput = document.getElementById('userPhone');
        if (!emailInput || !departmentInput || !employeeIdInput) {
            return false;
        }

        const email = emailInput.value.trim();
        const department = departmentInput.value.trim();
        const employeeId = employeeIdInput.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const requirePersonalDetails = completedSection && completedSection.dataset.completed === 'true';
        const firstNameValue = firstNameInput ? firstNameInput.value.trim() : '';
        const lastNameValue = lastNameInput ? lastNameInput.value.trim() : '';
        const phoneValue = phoneInput ? phoneInput.value.trim() : '';

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
        const employeeIdError = document.getElementById('userEmployeeIdError');
        if (!/^[A-Za-z0-9_-]+$/.test(employeeId)) {
            if (employeeIdError) {
                employeeIdError.textContent = 'ID must contain only letters, numbers, hyphens, or underscores.';
                employeeIdError.classList.remove('hidden');
                employeeIdError.style.color = 'red';
            }
            employeeIdInput.focus();
            return false;
        } else if (employeeIdError) {
            employeeIdError.textContent = '';
            employeeIdError.classList.add('hidden');
            employeeIdError.style.color = '';
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

        if (requirePersonalDetails && !firstNameValue && firstNameInput) {
            showNotification('error', 'First name is required.');
            firstNameInput.focus();
            return false;
        }
        if (requirePersonalDetails && !lastNameValue && lastNameInput) {
            showNotification('error', 'Last name is required.');
            lastNameInput.focus();
            return false;
        }
        if (requirePersonalDetails && !phoneValue && phoneInput) {
            showNotification('error', 'Phone number is required.');
            phoneInput.focus();
            return false;
        }

        draft.email = email;
        draft.department = department;
        draft.employeeId = employeeId;

        if (firstNameInput) {
            draft.firstName = firstNameValue || draft.firstName || '';
        }
        if (lastNameInput) {
            draft.lastName = lastNameValue || draft.lastName || '';
        }
        if (phoneInput) {
            draft.phone = phoneValue || draft.phone || '';
        }

        const emailDisplay = document.getElementById('registrationEmail');
        if (emailDisplay) {
            emailDisplay.value = email;
        }

        const fallbackEmail = draft.email || '';
        updateCompletedRegistrationPhotoPreview(draft.photoDataUrl || '', draft.photoFileName || '', fallbackEmail);

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
            showNotification('error', 'User Role is Required');
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
            expiresDate.setHours(0, 0, 0, 0);
            const today = getTodayAtMidnight();
            if (expiresDate <= today) {
                showNotification('error', 'Account Expiration must be Set to a Future Date.');
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
    const form = document.getElementById('userForm');
    const emailInput = document.getElementById('userEmail');
    const departmentInput = document.getElementById('userDepartment');
    const employeeIdInput = document.getElementById('userEmployeeId');
    const roleSelect = document.getElementById('userRole');
    const superAdminToggle = document.getElementById('userSuperAdminToggle');
    const expirationInput = document.getElementById('userAccountExpiration');
    const submitBtn = document.getElementById('userFormSubmitBtn');
    const permissionsSummary = document.getElementById('userPermissionsSummary');
    const nextBtnLabel = document.getElementById('userInfoNextBtnLabel');
    const usersHeaderSearch = document.querySelector('#users-app2 .users-header .search-box');
    const usersHeaderActions = document.querySelector('#users-app2 .users-header .users-actions');

    if (!formPage || !listView || !form || !emailInput || !departmentInput || !employeeIdInput || !roleSelect || !superAdminToggle || !expirationInput || !submitBtn) {
        return;
    }

    let targetUser = null;
    if (mode === 'edit' && typeof userId === 'number') {
        targetUser = users.find(u => u.id === userId) || null;
        if (!targetUser) {
            showNotification('error', 'We could not locate that user record.');
            return;
        }

        if (!ensureUserManagementPermission(targetUser, 'edit this user')) {
            return;
        }
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
        photoFileName: '',
        photoDataUrl: ''
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

    populateCompletedRegistrationSection({ visible: false, email: '' });

    let initialStep = 1;
    submitBtn.textContent = 'Add';
    emailInput.readOnly = false;
    if (nextBtnLabel) {
        nextBtnLabel.textContent = 'Register';
    }

    populateUserRoleOptions(roleSelect);

    roleSelect.value = '';
    expirationInput.value = '';
    superAdminToggle.checked = false;

    if (mode === 'edit' && typeof userId === 'number') {
        const user = targetUser;
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
        const normalizedStatus = typeof user.status === 'string' ? user.status.trim().toLowerCase() : '';
        const allowEmailEdit = normalizedStatus === 'pending';
        const hasCompleted = hasUserCompletedRegistration(user);

        emailInput.value = user.email || '';
        emailInput.readOnly = !allowEmailEdit;
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
            photoFileName: user.photoFileName || '',
            photoDataUrl: user.photoDataUrl || ''
        };

        submitBtn.textContent = 'Save';
        initialStep = 1;
        if (nextBtnLabel) {
            nextBtnLabel.textContent = 'Continue';
        }

    let statusLabel = hasCompleted
            ? 'Details captured during the registration process.'
            : 'These fields appear after the user finishes onboarding.';
        if (user.invitation && user.invitation.completedAt) {
            statusLabel = `Completed on ${formatDateForDisplay(user.invitation.completedAt)}.`;
        }

        populateCompletedRegistrationSection({
            visible: hasCompleted,
            firstName,
            lastName,
            phone,
            photoDataUrl: user.photoDataUrl || '',
            photoFileName: user.photoFileName || '',
            email: user.email || '',
            statusLabel
        });
    } else {
        emailInput.value = '';
        departmentInput.value = '';
        employeeIdInput.value = '';
        expirationInput.value = '';
        superAdminToggle.checked = false;
        roleSelect.value = '';
        populateCompletedRegistrationSection({
            visible: false,
            email: ''
        });
    }

    applyAccountExpirationConstraints(expirationInput);

    updateAccountTypeUI();

    setUsersModuleTitle(state.editingUserId ? 'Edit User Account' : 'Add New User');
    usersHeaderSearch?.classList.add('hidden');
    usersHeaderActions?.classList.add('hidden');

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
    const photoInput = document.getElementById('userPhotoInput');
    const usersHeaderSearch = document.querySelector('#users-app2 .users-header .search-box');
    const usersHeaderActions = document.querySelector('#users-app2 .users-header .users-actions');

    if (form) {
        form.reset();
    }
    if (photoInput) {
        photoInput.value = '';
    }
    populateCompletedRegistrationSection({ visible: false, email: '' });

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

    usersHeaderSearch?.classList.remove('hidden');
    usersHeaderActions?.classList.remove('hidden');

    setUsersModuleTitle('User Accounts');
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
    const derivedFromEmail = isEditing ? deriveNamePartsFromEmail(draft.email) : { firstName: '', lastName: '', fullName: '' };

    const firstName = rawFirstName || (isEditing ? derivedFromEmail.firstName : '');
    const lastName = rawLastName || (isEditing ? derivedFromEmail.lastName : '');
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const effectiveName = isEditing
        ? (combinedName || derivedFromEmail.fullName || (typeof draft.email === 'string' ? draft.email.trim() : ''))
        : (combinedName || '—');

    draft.firstName = firstName;
    draft.lastName = lastName;

    if (isEditing) {
        const user = users.find(u => u.id === state.editingUserId);
        if (!user) {
            showNotification('error', 'The selected user is no longer available.');
            hideUserForm();
            return;
        }

        if (!ensureUserManagementPermission(user, 'update this user')) {
            return;
        }

        const normalizedStatus = typeof user.status === 'string' ? user.status.trim().toLowerCase() : 'pending';
        const isPendingStatus = normalizedStatus === 'pending';

        if (isPendingStatus) {
            const emailConflict = findExistingUserByEmail(draft.email, user.id);
            if (emailConflict) {
                showNotification('warning', 'This Email Already Exists');
                setUserFormStep(1);
                const emailInput = document.getElementById('userEmail');
                if (emailInput) {
                    emailInput.focus();
                    if (typeof emailInput.select === 'function') {
                        emailInput.select();
                    }
                }
                return;
            }
        } else {
            draft.email = user.email || draft.email || '';
        }

        const updatedName = combinedName || user.name || effectiveName;
        user.name = updatedName || user.name || '';
        user.firstName = firstName || user.firstName || '';
        user.lastName = lastName || user.lastName || '';
        user.phone = draft.phone;
        user.department = draft.department;
        user.employeeId = draft.employeeId;
        if (isPendingStatus) {
            user.email = draft.email;
            state.registrationFlow.userId = user.id;
            state.registrationFlow.email = draft.email;
        }
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
        if (typeof draft.photoFileName === 'string') {
            user.photoFileName = draft.photoFileName;
        }
        if (typeof draft.photoDataUrl !== 'undefined') {
            user.photoDataUrl = draft.photoDataUrl || '';
        }
        if (draft.password) {
            const updatedAt = new Date().toISOString();
            user.auth.passwordHash = hashPasswordValue(draft.password);
            user.auth.lastUpdated = updatedAt;
            user.passwordUpdatedAt = updatedAt;
        }

        let invitationResult = null;
        if (isPendingStatus) {
            invitationResult = await regenerateUserInvitation(user, {
                updateRegistrationFlow: true
            });
        }

        saveUsersToStorage();
        syncRoleUserCounts();
        saveRolesToStorage();
        updateUserRolesCount();
        renderRolesTable(state.currentRolePage);
        renderUsersTable(state.userSearchTerm, state.currentUserPage);
        renderStats();

        if (isPendingStatus) {
            const emailResult = invitationResult ? invitationResult.emailResult : null;
            if (emailResult && emailResult.status === 'sent') {
                showNotification('success', 'User Account Updated and The New Invitation Link has been Sent Successfully.', 7000);
            } else if (emailResult && emailResult.status === 'skipped') {
                showNotification('info', 'User Account Updated. Invitation refreshed but email service is not configured. Share the new link manually.', 7000);
            } else if (emailResult && emailResult.status === 'error') {
                const message = emailResult.message || 'Please try again.';
                showNotification('warning', 'User Account Updated and The New Invitation Link has been Sent Successfully', 8000);
            } else {
                showNotification('info', 'User Account Updated. Invitation status is unavailable.', 6000);
            }
        } else {
            showNotification('success', 'User Account Updated Successfully.', 6000);
        }

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
    const createdById = getActiveSessionUserId();

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
        createdBy: createdById,
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
        photoFileName: draft.photoFileName || '',
        photoDataUrl: draft.photoDataUrl || ''
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
        showNotification('success', 'User account created. The invitation link has been sent successfully.', 6000);
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

    if (!ensureUserManagementPermission(user, 'view or share the invitation link for this user')) {
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

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link)
            .then(() => {
                showNotification('success', 'Invitation link copied to clipboard!');
            })
            .catch(() => {
                showNotification('error', 'Could not copy the invitation link.');
            });
    } else {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            showNotification('success', 'Invitation link copied to clipboard!');
        } catch (err) {
            showNotification('error', 'Could not copy the invitation link.');
        }
        document.body.removeChild(tempInput);
    }
}

async function resendUserInvitation(userId) {
    const user = Number.isInteger(userId) ? users.find(item => item.id === userId) : null;
    if (!user) {
        showNotification('error', 'Unable to locate the user for invitation resend.');
        return;
    }

    if (!ensureUserManagementPermission(user, 'resend the invitation for this user')) {
        return;
    }

    ensureUserInvitationRecord(user);

    const status = (user.status || '').toLowerCase();
    if (status !== 'pending') {
        showNotification('info', 'Invitation emails can only be resent for users who are still pending activation.');
        return;
    }

    const confirmResend = await showUserConfirm(
        'Are You Sure You Want to Resend the Invitation Link? The Invitation Link Sent Previously Will Expire.',
        'OK',
        'Cancel'
    );
    if (!confirmResend) {
        return;
    }

    const now = new Date();
    const sentAtIso = now.toISOString();
    const newToken = generateRegistrationToken();
    const newExpiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MS).toISOString();
    const newOtp = generateRegistrationOtp();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;
    const previousToken = user.invitation.token || null;

    if (!Array.isArray(user.invitation.revokedTokens)) {
        user.invitation.revokedTokens = [];
    }
    if (previousToken) {
        user.invitation.revokedTokens.unshift({ token: previousToken, revokedAt: sentAtIso });
        if (user.invitation.revokedTokens.length > 10) {
            user.invitation.revokedTokens = user.invitation.revokedTokens.slice(0, 10);
        }
    }

    user.invitation.token = newToken;
    user.invitation.sentAt = sentAtIso;
    user.invitation.expiresAt = newExpiresAt;
    user.invitation.otp = newOtp;
    user.invitation.lastOtpSentAt = sentAtIso;
    user.invitation.completedAt = null;
    user.invitation.verifiedAt = null;

    const viewingSameUser = state.registrationFlow.userId === userId;
    if (viewingSameUser) {
        state.registrationFlow.otp = newOtp;
        state.registrationFlow.expiresAt = otpExpiresAt;
        state.registrationFlow.token = newToken;
        state.registrationFlow.linkExpiresAt = newExpiresAt;
        state.registrationFlow.link = buildAbsoluteInvitationLink(newToken);
        updateRegistrationLinkDisplay(newToken);
    }

    saveUsersToStorage();

    const invitedBy = resolveInvitationSenderLabel();
    const emailResult = await deliverInvitationEmail(user, {
        otp: newOtp,
        token: newToken,
        expiresAt: otpExpiresAt,
        linkExpiresAt: newExpiresAt,
        invitedBy
    });

    if (emailResult.status === 'sent') {
        showNotification('success', 'The New Invitation Link has been Sent Successfully.', 6000);
    } else if (emailResult.status === 'skipped') {
        showNotification('info', `Invitation refreshed for ${user.email}. Share the updated link manually.`, 7000);
    } else {
        showNotification('success', 'The New Invitation Link has been Sent Successfully.', 6000);
    }

    renderUsersTable(state.userSearchTerm, state.currentUserPage);
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

    if (!ensureUserManagementPermission(user, 'manage the registration flow for this user')) {
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
    const verificationTimestamp = new Date().toISOString();
    user.invitation.completedAt = verificationTimestamp;
    user.invitation.verifiedAt = verificationTimestamp;
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
                        message: 'Please Enter the User Role Name'
                    };
                }
                return { valid: true };
            }
        }
    );
    if (!promptResult.confirmed) return;

    const provided = normalizeRoleLookupValue(promptResult.value);
    if (!provided || provided !== expected) {
        await showRoleAlert('Role Name Did Not Match. User Role Deletion Cancelled');
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

    if (!ensureUserManagementPermission(user, user.status === 'Active' ? 'deactivate this user' : 'activate this user')) {
        return;
    }
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

function deactivateUserInvitationLink(user) {
    if (!user) {
        return;
    }
    ensureUserInvitationRecord(user);
    const nowIso = new Date().toISOString();
    const currentToken = user.invitation.token || null;

    if (!Array.isArray(user.invitation.revokedTokens)) {
        user.invitation.revokedTokens = [];
    }

    if (currentToken) {
        user.invitation.revokedTokens.unshift({ token: currentToken, revokedAt: nowIso });
        if (user.invitation.revokedTokens.length > 10) {
            user.invitation.revokedTokens = user.invitation.revokedTokens.slice(0, 10);
        }
    }

    user.invitation.token = null;
    user.invitation.otp = null;
    user.invitation.expiresAt = nowIso;
    user.invitation.lastOtpSentAt = null;
}

function finalizeUserRemoval(user, successMessage, options = {}) {
    if (!user) return;
    const { deactivateInvitation = false } = options;
    const userId = user.id;

    if (deactivateInvitation) {
        deactivateUserInvitationLink(user);
    }

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
        state.registrationFlow.userId = null;
        state.registrationFlow.otp = null;
        state.registrationFlow.expiresAt = null;
        state.registrationFlow.token = null;
        state.registrationFlow.linkExpiresAt = null;
        if (Object.prototype.hasOwnProperty.call(state.registrationFlow, 'email')) {
            state.registrationFlow.email = null;
        }
        if (Object.prototype.hasOwnProperty.call(state.registrationFlow, 'link')) {
            state.registrationFlow.link = null;
        }
    }

    updateRegistrationLinkDisplay(null);

    showNotification('success', successMessage);
}

async function handleUserDelete(userId) {
    const user = users.find(item => item.id === userId);
    if (!user) {
        showNotification('error', 'We could not locate that user record.');
        return;
    }

    if (!ensureUserManagementPermission(user, 'delete this user')) {
        return;
    }

    const accountType = resolveUserAccountType(user);
    const isSuperAdminAccount = accountType === 'system-administrator';

    const isCurrentSessionUser = Boolean(state.activeSession && state.activeSession.user && state.activeSession.user.id === userId);
    if (isCurrentSessionUser) {
        await showUserAlert('You cannot delete the account that is currently signed in.');
        return;
    }

    const deletionPromptTitle = isSuperAdminAccount
        ? 'Are You Sure You Want to Delete the Super Admin Account?'
        : 'Are You Sure You Want to Delete the User Account?';

    const initialConfirmation = await showUserConfirm(
        deletionPromptTitle,
        'OK',
        'Cancel'
    );
    if (!initialConfirmation) return;

    const normalizedStatus = typeof user.status === 'string' ? user.status.trim().toLowerCase() : '';

    if (normalizedStatus === 'pending') {
    finalizeUserRemoval(user, 'User Account Deleted Successfully', {
            deactivateInvitation: true
        });
        return;
    }

    const emailToConfirm = (user.email || '').trim();
    const instructionMessage = emailToConfirm
        ? `To Confirm, Type "${emailToConfirm}" in the Box Below`
        : 'To Confirm, Type "The Email Address of the User to be Deleted" in the Box Below';

    const promptResult = await showUserPrompt(
        instructionMessage,
        'Delete',
        'Cancel',
        emailToConfirm || 'Enter email address',
        {
            validate: value => {
                const trimmed = typeof value === 'string' ? value.trim() : '';
                if (!trimmed) {
                    return {
                        valid: false,
                        message: "Please Enter the User's Email Address"
                    };
                }
                return { valid: true };
            }
        }
    );

    if (!promptResult.confirmed) {
        return;
    }

    const providedEmail = typeof promptResult.value === 'string' ? promptResult.value.trim().toLowerCase() : '';
    const expectedEmail = emailToConfirm ? emailToConfirm.toLowerCase() : '';
    if (expectedEmail && providedEmail !== expectedEmail) {
        await showUserAlert('Email Address Did Not Match. User Account Deletion Cancelled');
        return;
    }

    const successMessage = isSuperAdminAccount
        ? 'Super Admin Account Deleted Successfully'
        : 'User Account Deleted Successfully';

    finalizeUserRemoval(user, successMessage);
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

    const idInput = document.getElementById('roleIdInput');
    const nameArabic = document.getElementById('roleNameArabicInput').value.trim();
    const nameEnglish = document.getElementById('roleNameEnglishInput').value.trim();
    const description = document.getElementById('roleDescriptionInput').value.trim();
    const permissions = collectPermissionSelections();
    setRolePermissionsError('');

    // Validate ID
    const idValue = idInput ? idInput.value.trim() : '';
    const idError = document.getElementById('roleIdError');
    if (!idValue) {
    showNotification('warning', 'ID is Required');
        if (idInput) idInput.focus();
        return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(idValue)) {
        if (idError) {
            idError.textContent = 'ID Must be Unique and Contain Only Letters, Numbers, Dashes, or Underscores';
            idError.classList.remove('hidden');
            idError.style.color = 'red';
        }
        if (idInput) idInput.focus();
        return;
    }
    // Uniqueness check (for add only)
    if (state.roleBuilderMode !== 'edit' && roles.some(r => r.id === idValue)) {
    showNotification('warning', 'ID Already Registered');
        if (idInput) idInput.focus();
        return;
    }
    if (idError) {
        idError.textContent = '';
        idError.classList.add('hidden');
        idError.style.color = '';
    }

    if (!nameArabic) {
        showNotification('warning', 'Role Name (Arabic) is Required');
        const arabicInput = document.getElementById('roleNameArabicInput');
        if (arabicInput) {
            arabicInput.focus();
        }
        return;
    }

    if (!nameEnglish) {
        showNotification('warning', 'Role Name (English) is Required');
        const englishInput = document.getElementById('roleNameEnglishInput');
        if (englishInput) {
            englishInput.focus();
        }
        return;
    }

    if (!permissions.length) {
        showNotification('warning', 'Select at Least One App Permission for this Role');
        return;
    }

    if (state.roleBuilderMode === 'edit' && state.editingRoleId) {
        const role = roles.find(item => item.id === state.editingRoleId);
        if (!role) {
            showNotification('warning', 'The role you were editing is no longer available.');
            hideRoleBuilder();
            return;
        }
        // ID is not editable in edit mode
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

    // Add new role with provided ID
    const newRole = {
        id: idValue,
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
            const photoUrl = user.photoDataUrl && user.photoDataUrl.trim() ? user.photoDataUrl.trim() : '';
            const phoneDisplay = (!isPending || registrationCompleted)
                ? (user.phone && String(user.phone).trim() ? String(user.phone).trim() : '—')
                : '—';
            const employeeIdDisplay = user.employeeId && String(user.employeeId).trim() ? String(user.employeeId).trim() : '—';
            const isCurrentSessionUser = Boolean(state.activeSession && state.activeSession.user && state.activeSession.user.id === user.id);
            const deleteTooltip = isCurrentSessionUser
                ? 'You cannot delete the account that is currently signed in.'
                : isSuperAdminAccount
                    ? 'Delete Super Admin account'
                    : 'Delete user';
            const creatorInfo = resolveUserCreator(user);
            const creatorMarkup = creatorInfo.email
                ? `<div class="creator-cell"><div class="creator-name">${escapeHtml(creatorInfo.label)}</div><div class="user-meta">${escapeHtml(creatorInfo.email)}</div></div>`
                : `<div class="creator-cell"><div class="creator-name">${escapeHtml(creatorInfo.label)}</div></div>`;
            const createdDisplay = user.created ? escapeHtml(String(user.created)) : '—';
            const createdDetailsMarkup = `<div class="created-cell"><div class="created-date">${createdDisplay}</div>${creatorMarkup}</div>`;
            const fallbackInitialMatch = typeof displayName === 'string' ? displayName.match(/[A-Za-z0-9]/) : null;
            const fallbackInitial = fallbackInitialMatch ? fallbackInitialMatch[0].toUpperCase() : '';
            const actionButtons = [];

            actionButtons.push(`<button class="action-btn edit" onclick="showUserForm('edit', ${user.id})" title="Edit user"><i class="fas fa-pen"></i></button>`);

            if (isPending) {
                actionButtons.push(`<button class="action-btn invitation-link" onclick="showUserInvitationLink(${user.id})" title="Show invitation link"><i class="fas fa-envelope-open-text"></i></button>`);
                actionButtons.push(`<button class="action-btn resend-invite" onclick="(async () => await resendUserInvitation(${user.id}))()" title="Resend invitation email"><i class="fas fa-paper-plane"></i></button>`);
            } else {
                actionButtons.push(`<button class="action-btn ${isActive ? 'deactivate' : 'activate'}" onclick="(async () => await handleUserToggle(${user.id}))()" title="${isActive ? 'Deactivate user' : 'Activate user'}"><i class="fas ${isActive ? 'fa-power-off' : 'fa-rotate-right'}"></i></button>`);
            }

            const deleteAction = (!isCurrentSessionUser)
                ? `<button class="action-btn delete" onclick="(async () => await handleUserDelete(${user.id}))()" title="${escapeAttribute(deleteTooltip)}"><i class="fas fa-trash"></i></button>`
                : `<button class="action-btn delete disabled" type="button" disabled title="${escapeAttribute(deleteTooltip)}"><i class="fas fa-trash"></i></button>`;

            actionButtons.push(deleteAction);

            return `
                <tr>
                    <td>${index++}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="user-avatar" aria-hidden="true">
                                ${photoUrl
                                    ? `<img src="${escapeAttribute(photoUrl)}" alt="${escapeAttribute(displayName)}" class="user-avatar-img">`
                                    : fallbackInitial
                                        ? `<span class="user-avatar-fallback">${escapeHtml(fallbackInitial)}</span>`
                                        : '<span class="user-avatar-fallback" aria-hidden="true"></span>'}
                            </div>
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
                    <td>${createdDetailsMarkup}</td>
                    <td>${expirationLabel}</td>
                    <td>
                        <div class="action-group">
                            ${actionButtons.join('\n')}
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
        ...users.map(user => {
            const creator = resolveUserCreator(user);
            const creatorLabel = creator && creator.label ? creator.label : '—';
            const creatorEmail = creator && creator.email ? creator.email : '';
            const creatorDisplay = creatorEmail ? `${creatorLabel} <${creatorEmail}>` : creatorLabel;
            const createdDisplay = user.created || '';
            const createdCombined = creatorDisplay && creatorDisplay !== '—'
                ? `${createdDisplay}${createdDisplay ? ' | ' : ''}${creatorDisplay}`
                : createdDisplay || creatorDisplay;
            return [
                resolveUserDisplayName(user),
                user.email,
                user.role,
                user.department || '',
                user.status,
                user.lastLogin,
                createdCombined,
                user.expiresOn || ''
            ];
        })
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

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        const isCollapsed = sidebar.classList.contains('collapsed');
        menuToggle.setAttribute('aria-expanded', String(!isCollapsed));
    }
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

