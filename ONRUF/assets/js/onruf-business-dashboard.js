(function () {
    'use strict';

    const BUSINESS_ACCOUNTS_KEY = 'onruf_business_accounts_v1';

    const state = {
        account: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initializeDashboard);

    function initializeDashboard() {
        cacheElements();
        bindUiEvents();
        hydrateFromQuery();
    }

    function cacheElements() {
        elements.shell = document.getElementById('businessDashboard');
        elements.contentSection = document.getElementById('dashboardContent');
        elements.missingState = document.getElementById('missingAccountState');
        elements.companyHeading = document.getElementById('companyNameHeading');
        elements.statusPill = document.getElementById('accountStatusPill');
        elements.accountMeta = document.getElementById('accountMeta');
        elements.topbarUserName = document.getElementById('topbarUserName');
        elements.topbarUserAvatar = document.getElementById('topbarUserAvatar');
        elements.switchAccountBtn = document.getElementById('switchAccountBtn');
        elements.languageSwitchBtn = document.getElementById('languageSwitchBtn');
        elements.contactSupportBtn = document.getElementById('contactSupportBtn');
        elements.notificationsList = document.getElementById('notificationsList');
        elements.notificationsViewAll = document.getElementById('notificationsViewAll');
        elements.lastOrdersBody = document.getElementById('lastOrdersBody');
        elements.lastOrdersViewAll = document.getElementById('lastOrdersViewAll');
        elements.productsViewAll = document.getElementById('productsViewAll');
        elements.latestClientsInsight = document.getElementById('latestClientsInsight');
        elements.allClientsInsight = document.getElementById('allClientsInsight');
        elements.productsLowStockInsight = document.getElementById('productsLowStockInsight');
        elements.profitValue = document.getElementById('profitValue');
        elements.profitTrend = document.getElementById('profitTrend');
        elements.profitChart = document.getElementById('profitChart');
        elements.toast = document.getElementById('dashboardToast');
        elements.marketingToggle = document.getElementById('marketingToggle');
        elements.marketingSubmenu = document.getElementById('marketingSubmenu');
    }

    function bindUiEvents() {
        if (elements.switchAccountBtn) {
            elements.switchAccountBtn.addEventListener('click', () => {
                window.location.href = 'onruf-platform.html';
            });
        }
        if (elements.contactSupportBtn) {
            elements.contactSupportBtn.addEventListener('click', () => {
                showToast('Support will reach out shortly.');
            });
        }
        if (elements.languageSwitchBtn) {
            elements.languageSwitchBtn.addEventListener('click', () => {
                showToast('Arabic interface is coming soon.');
            });
        }
        if (elements.notificationsViewAll) {
            elements.notificationsViewAll.addEventListener('click', () => {
                showToast('Notifications center will open soon.');
            });
        }
        if (elements.lastOrdersViewAll) {
            elements.lastOrdersViewAll.addEventListener('click', () => {
                showToast('Orders sync is not yet available.');
            });
        }
        if (elements.productsViewAll) {
            elements.productsViewAll.addEventListener('click', () => {
                showToast('Products catalog will open soon.');
            });
        }
        if (elements.marketingToggle && elements.marketingSubmenu) {
            elements.marketingToggle.addEventListener('click', () => {
                const expanded = elements.marketingToggle.getAttribute('aria-expanded') === 'true';
                elements.marketingToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                elements.marketingSubmenu.classList.toggle('is-open', !expanded);
            });
        }
    }

    function hydrateFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const accountId = params.get('businessAccountId');
        if (!accountId) {
            showMissingAccountState();
            return;
        }
        const account = findBusinessAccount(accountId);
        if (!account) {
            showMissingAccountState();
            return;
        }
        state.account = account;
        applyAccountToDashboard(account);
    }

    function findBusinessAccount(accountId) {
        const accounts = loadBusinessAccounts();
        if (!accounts.length) {
            return null;
        }
        return accounts.find(entry => entry && entry.id === accountId) || null;
    }

    function loadBusinessAccounts() {
        try {
            const raw = localStorage.getItem(BUSINESS_ACCOUNTS_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Unable to read business accounts dataset', error);
            return [];
        }
    }

    function showMissingAccountState() {
        if (elements.contentSection) {
            elements.contentSection.hidden = true;
        }
        if (elements.missingState) {
            elements.missingState.hidden = false;
        }
        if (elements.shell) {
            elements.shell.dataset.state = 'missing';
        }
    }

    function applyAccountToDashboard(account) {
        if (elements.missingState) {
            elements.missingState.hidden = true;
        }
        if (elements.contentSection) {
            elements.contentSection.hidden = false;
        }
        updateCompanySummary(account);
        updateTopbar(account);
        renderNotifications(account);
        renderInsights(account);
        renderProfitCard(account);
        if (elements.shell) {
            elements.shell.dataset.state = 'ready';
        }
    }

    function updateCompanySummary(account) {
        if (elements.companyHeading) {
            elements.companyHeading.textContent = account.companyName || account.contactName || 'Business account';
        }
        const status = (account.status || '').toLowerCase();
        if (elements.statusPill) {
            const label = buildStatusLabel(status);
            elements.statusPill.textContent = label;
            elements.statusPill.classList.toggle('is-pending', status === 'pending');
            elements.statusPill.classList.toggle('is-inactive', status !== 'active' && status !== 'approved' && status !== 'pending');
        }
        if (elements.accountMeta) {
            const metaParts = [];
            const city = account.city || account.application?.address?.city;
            const country = account.application?.address?.country;
            const locationLabel = [city, country].filter(Boolean).join(', ');
            if (locationLabel) {
                metaParts.push(locationLabel);
            }
            const submittedLabel = formatDateLabel(account.submittedAt, 'Submitted');
            if (submittedLabel) {
                metaParts.push(submittedLabel);
            }
            if (account.packageId) {
                metaParts.push(`Package ${account.packageId}`);
            }
            elements.accountMeta.textContent = metaParts.join('  •  ');
        }
    }

    function updateTopbar(account) {
        const name = account.contactName || account.companyName || account.email || 'Merchant';
        if (elements.topbarUserName) {
            elements.topbarUserName.textContent = name;
        }
        if (elements.topbarUserAvatar) {
            elements.topbarUserAvatar.textContent = buildInitials(name);
        }
    }

    function renderNotifications(account) {
        if (!elements.notificationsList) {
            return;
        }
        const notifications = [];
        const status = (account.status || '').toLowerCase();
        if (status === 'active' || status === 'approved') {
            notifications.push({ icon: 'fa-circle-check', text: 'Your merchant workspace is ready. Start listing new products to reach ONRUF shoppers.' });
        } else if (status === 'pending') {
            notifications.push({ icon: 'fa-hourglass-half', text: 'Your application is under review. We will notify you once it is approved.' });
        } else if (status === 'docs-requested') {
            const requested = Array.isArray(account.requestedDocuments) ? account.requestedDocuments[account.requestedDocuments.length - 1] : '';
            notifications.push({ icon: 'fa-file-circle-question', text: requested || 'Additional documentation required. Please check your email.' });
        } else if (status === 'rejected') {
            notifications.push({ icon: 'fa-triangle-exclamation', text: 'This application has been rejected. Contact support for next steps.' });
        }
        const history = Array.isArray(account.history) ? account.history.slice(-2) : [];
        history.forEach(entry => {
            const label = formatHistoryLabel(entry.action);
            const when = formatDateLabel(entry.timestamp, '');
            notifications.push({ icon: 'fa-clock', text: `${label}${when ? ` · ${when}` : ''}` });
        });
        if (!notifications.length) {
            elements.notificationsList.innerHTML = '<li class="empty-state">No notifications found</li>';
            return;
        }
        elements.notificationsList.innerHTML = notifications.map(item => {
            return `<li><i class="fas ${item.icon}" aria-hidden="true"></i> ${escapeHtml(item.text)}</li>`;
        }).join('');
    }

    function renderInsights(account) {
        if (elements.latestClientsInsight) {
            elements.latestClientsInsight.innerHTML = '<p class="empty-state">No orders exist</p>';
        }
        if (elements.allClientsInsight) {
            elements.allClientsInsight.innerHTML = `<p class="empty-state">${escapeHtml(buildClientSummary(account))}</p>`;
        }
        if (elements.productsLowStockInsight) {
            elements.productsLowStockInsight.innerHTML = '<p class="empty-state">No products</p>';
        }
    }

    function renderProfitCard(account) {
        const series = buildProfitSeries(account);
        const lastValue = series.length ? series[series.length - 1] : 0;
        const firstValue = series.length ? series[0] : 0;
        if (elements.profitValue) {
            elements.profitValue.textContent = formatCurrency(lastValue);
        }
        if (elements.profitTrend) {
            const growth = calculateGrowth(firstValue, lastValue);
            elements.profitTrend.textContent = formatGrowthLabel(growth);
            elements.profitTrend.classList.toggle('is-negative', growth < 0);
        }
        renderProfitChart(series);
    }

    function renderProfitChart(series) {
        if (!elements.profitChart) {
            return;
        }
        const canvas = elements.profitChart;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = canvas.width;
        const height = canvas.height;
        const padding = 36;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        if (!series.length) {
            ctx.fillStyle = '#dfe5ef';
            ctx.fillRect(padding, padding, chartWidth, chartHeight);
            return;
        }
        const minValue = Math.min(...series);
        const maxValue = Math.max(...series);
        const range = maxValue - minValue || 1;
        ctx.strokeStyle = '#e6eaf3';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i += 1) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }
        const lineColor = getCssVar('--primary') || '#ff6b6b';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        series.forEach((value, index) => {
            const ratio = (value - minValue) / range;
            const x = padding + (series.length === 1 ? chartWidth / 2 : (chartWidth / (series.length - 1)) * index);
            const y = padding + chartHeight - ratio * chartHeight;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        const lastIndex = series.length - 1;
        const lastRatio = (series[lastIndex] - minValue) / range;
        const lastX = padding + (series.length === 1 ? chartWidth / 2 : (chartWidth / (series.length - 1)) * lastIndex);
        const lastY = padding + chartHeight - lastRatio * chartHeight;
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    function buildProfitSeries(account) {
        const series = Array.isArray(account.metrics?.profitSeries) ? account.metrics.profitSeries : null;
        if (Array.isArray(series) && series.length) {
            return series.map(value => Number.parseFloat(value) || 0);
        }
        const base = Math.abs(hashString(account.id)) % 1500 + 1200;
        const points = 10;
        const result = [];
        let current = base;
        for (let i = 0; i < points; i += 1) {
            current += 900 + (i * 320);
            result.push(current);
        }
        return result;
    }

    function calculateGrowth(first, last) {
        if (!Number.isFinite(first) || !Number.isFinite(last)) {
            return 0;
        }
        if (first === 0) {
            return last > 0 ? 100 : 0;
        }
        return ((last - first) / Math.abs(first)) * 100;
    }

    function formatGrowthLabel(value) {
        if (!Number.isFinite(value)) {
            return '0%';
        }
        const formatted = value.toFixed(1);
        return `${value >= 0 ? '+' : ''}${formatted}%`;
    }

    function formatCurrency(value) {
        const number = Number.parseFloat(value);
        if (!Number.isFinite(number)) {
            return '0 SAR';
        }
        return `${number.toLocaleString('en-US', { maximumFractionDigits: 0 })} SAR`;
    }

    function buildStatusLabel(status) {
        switch (status) {
            case 'active':
                return 'Active';
            case 'approved':
                return 'Approved';
            case 'pending':
                return 'Pending review';
            case 'docs-requested':
                return 'Documents requested';
            case 'rejected':
                return 'Rejected';
            case 'suspended':
                return 'Suspended';
            default:
                return 'Status unavailable';
        }
    }

    function formatDateLabel(value, prefix) {
        if (!value) {
            return '';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        return prefix ? `${prefix} ${label}` : label;
    }

    function buildClientSummary(account) {
        const clients = Array.isArray(account.clients) ? account.clients.length : 0;
        if (clients > 0) {
            return `${clients} client${clients === 1 ? '' : 's'} active`;
        }
        return 'No clients added';
    }

    function formatHistoryLabel(action) {
        if (!action) {
            return 'Activity logged';
        }
        const normalized = action.toString().toLowerCase();
        if (normalized === 'request-submitted') {
            return 'Application submitted';
        }
        if (normalized === 'approved') {
            return 'Account approved';
        }
        if (normalized === 'docs-requested') {
            return 'Documents requested';
        }
        if (normalized === 'rejected') {
            return 'Application rejected';
        }
        if (normalized === 'package-renewed') {
            return 'Package renewed';
        }
        return normalized.split(/[-_\s]+/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }

    function buildInitials(value) {
        if (!value) {
            return 'M';
        }
        const parts = value.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return value.slice(0, 2).toUpperCase();
        }
        const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
        return initials || 'M';
    }

    function getCssVar(name) {
        const computed = getComputedStyle(document.documentElement);
        return computed.getPropertyValue(name).trim();
    }

    function hashString(value) {
        if (typeof value !== 'string') {
            return 0;
        }
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = (hash << 5) - hash + value.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
})();
