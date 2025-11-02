(function () {
    'use strict';

    const LOGIN_SESSION_KEY = 'onruf_individual_login_session_v1';
    const PRODUCT_ADS_KEY = 'onruf_product_ads_v1';
    const CHECKOUT_DRAFT_KEY = 'onruf_add_product_draft_v1';
    const EDIT_STEP_KEY = 'onruf_add_product_edit_step';
    const FLASH_MESSAGE_KEY = 'onruf_add_product_flash_v1';

    const STEP_MESSAGES = {
        2: 'We reopened Item details so you can adjust the specs.',
        4: 'We reopened Sale details so you can tweak your pricing.',
        5: 'We reopened Shipping to review delivery options.',
        6: 'You can continue from the Packages step when you return.'
    };

    const state = {
        session: null,
        draft: null,
        isPublishing: false
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        cacheElements();
        state.session = readSession();
        if (!state.session) {
            showGuard();
            showToast('Sign in to finish publishing your listing.');
            return;
        }
        state.draft = loadDraft();
        if (!state.draft) {
            showGuard();
            showToast('Your listing draft is missing. Start again from the listing form.');
            return;
        }
        renderSummary(state.draft.model, state.draft.payload);
        bindEvents();
        elements.main.hidden = false;
        elements.toast.textContent = '';
    }

    function cacheElements() {
        elements.main = document.getElementById('checkoutMain');
        elements.guard = document.getElementById('checkoutGuard');
        elements.toast = document.getElementById('checkoutToast');
        elements.checkoutConfirmBtn = document.getElementById('checkoutConfirmBtn');
        elements.checkoutBackBtn = document.getElementById('checkoutBackBtn');
        elements.checkoutProfileBtn = document.getElementById('checkoutProfileBtn');
        elements.checkoutSignOutBtn = document.getElementById('checkoutSignOutBtn');
        elements.summaryItemImage = document.getElementById('summaryItemImage');
        elements.summaryItemTitle = document.getElementById('summaryItemTitle');
        elements.summaryItemSubtitle = document.getElementById('summaryItemSubtitle');
        elements.summaryItemNotes = document.getElementById('summaryItemNotes');
        elements.summaryItemCondition = document.getElementById('summaryItemCondition');
        elements.summaryItemQuantity = document.getElementById('summaryItemQuantity');
        elements.summarySaleTypes = document.getElementById('summarySaleTypes');
        elements.summaryPurchasePrice = document.getElementById('summaryPurchasePrice');
        elements.summaryMinimumBid = document.getElementById('summaryMinimumBid');
        elements.summaryNegotiable = document.getElementById('summaryNegotiable');
        elements.summaryPaymentOptions = document.getElementById('summaryPaymentOptions');
        elements.summaryAuctionClosing = document.getElementById('summaryAuctionClosing');
        elements.summaryShippingOptions = document.getElementById('summaryShippingOptions');
        elements.summaryPickupOptions = document.getElementById('summaryPickupOptions');
        elements.summaryFeeFixed = document.getElementById('summaryFeeFixed');
        elements.summaryFeeNegotiable = document.getElementById('summaryFeeNegotiable');
        elements.summaryFeeAuction = document.getElementById('summaryFeeAuction');
        elements.summaryFeeSubtotal = document.getElementById('summaryFeeSubtotal');
        elements.summaryFeeTax = document.getElementById('summaryFeeTax');
        elements.summaryFeeTotal = document.getElementById('summaryFeeTotal');
        elements.summaryPoints = document.getElementById('summaryPoints');
        elements.checkoutPaymentSummary = document.getElementById('checkoutPaymentSummary');
    }

    function bindEvents() {
        if (elements.checkoutConfirmBtn) {
            elements.checkoutConfirmBtn.addEventListener('click', handleCheckoutConfirm);
        }
        if (elements.checkoutBackBtn) {
            elements.checkoutBackBtn.addEventListener('click', () => redirectToListing(6));
        }
        document.querySelectorAll('[data-edit-step]').forEach(button => {
            button.addEventListener('click', () => {
                const step = Number.parseInt(button.getAttribute('data-edit-step'), 10);
                redirectToListing(step);
            });
        });
        if (elements.checkoutProfileBtn) {
            elements.checkoutProfileBtn.addEventListener('click', () => {
                window.location.href = 'onruf-profile.html';
            });
        }
        if (elements.checkoutSignOutBtn) {
            elements.checkoutSignOutBtn.addEventListener('click', () => {
                try {
                    sessionStorage.removeItem(LOGIN_SESSION_KEY);
                } catch (error) {
                    console.warn('Unable to clear login session', error);
                }
                sessionStorage.setItem(FLASH_MESSAGE_KEY, 'Sign in to continue your listing.');
                window.location.href = 'onruf-login.html';
            });
        }
    }

    function handleCheckoutConfirm(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (state.isPublishing) {
            return;
        }
        const payload = state.draft?.payload;
        if (!payload) {
            showToast('Your listing payload is missing. Return to the form to rebuild it.');
            redirectToListing(6);
            return;
        }
        state.isPublishing = true;
        setButtonPublishingState(true);
        try {
            const ads = loadDataset(PRODUCT_ADS_KEY);
            ads.push(payload);
            saveDataset(PRODUCT_ADS_KEY, ads);
            sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
            showToast('Listing published! Redirecting to ONRUF…');
            setTimeout(() => {
                window.location.href = 'onruf-platform.html';
            }, 1200);
        } catch (error) {
            console.warn('Unable to publish product ad', error);
            showToast('Something went wrong while publishing. Please try again.');
            state.isPublishing = false;
            setButtonPublishingState(false);
        }
    }

    function setButtonPublishingState(isPublishing) {
        if (elements.checkoutConfirmBtn) {
            elements.checkoutConfirmBtn.disabled = Boolean(isPublishing);
        }
    }

    function renderSummary(model, payload) {
        const summary = model || buildFallbackSummary(payload);
        if (!summary) {
            showToast('Your summary is missing. Return to the form to rebuild it.');
            redirectToListing(6);
            return;
        }
        if (elements.summaryItemImage) {
            elements.summaryItemImage.src = summary.image || getFallbackImageForCategory(summary.category);
            elements.summaryItemImage.alt = summary.title ? `Preview of ${summary.title}` : 'Listing preview';
        }
        if (elements.summaryItemTitle) elements.summaryItemTitle.textContent = summary.title || 'ONRUF Listing';
        if (elements.summaryItemSubtitle) elements.summaryItemSubtitle.textContent = summary.subtitle || '';
        if (elements.summaryItemNotes) elements.summaryItemNotes.textContent = summary.notes || '';
        if (elements.summaryItemCondition) elements.summaryItemCondition.textContent = summary.condition || '—';
        if (elements.summaryItemQuantity) elements.summaryItemQuantity.textContent = summary.quantity || '1';
        if (elements.summarySaleTypes) elements.summarySaleTypes.textContent = summary.saleTypes || '—';
        if (elements.summaryPurchasePrice) elements.summaryPurchasePrice.textContent = summary.purchasePrice || '—';
        if (elements.summaryMinimumBid) elements.summaryMinimumBid.textContent = summary.minimumBid || '—';
        if (elements.summaryNegotiable) elements.summaryNegotiable.textContent = summary.negotiable || '—';
        if (elements.summaryPaymentOptions) elements.summaryPaymentOptions.textContent = summary.paymentOptions || '—';
        if (elements.summaryAuctionClosing) elements.summaryAuctionClosing.textContent = summary.auctionClosing || '—';
        if (elements.summaryShippingOptions) elements.summaryShippingOptions.textContent = summary.shippingOptions || '—';
        if (elements.summaryPickupOptions) elements.summaryPickupOptions.textContent = summary.pickupOptions || '—';
        if (elements.summaryFeeFixed) elements.summaryFeeFixed.textContent = summary.fee?.fixed || '0 SAR';
        if (elements.summaryFeeNegotiable) elements.summaryFeeNegotiable.textContent = summary.fee?.negotiable || '0 SAR';
        if (elements.summaryFeeAuction) elements.summaryFeeAuction.textContent = summary.fee?.auction || '0 SAR';
        if (elements.summaryFeeSubtotal) elements.summaryFeeSubtotal.textContent = summary.fee?.subtotal || '0 SAR';
        if (elements.summaryFeeTax) elements.summaryFeeTax.textContent = summary.fee?.tax || '0 SAR';
        if (elements.summaryFeeTotal) elements.summaryFeeTotal.textContent = summary.fee?.total || '0 SAR';
        if (elements.summaryPoints) {
            const points = Number.parseInt(summary.points, 10);
            elements.summaryPoints.textContent = Number.isFinite(points) ? points.toLocaleString('en-US') : '0';
        }
        if (elements.checkoutPaymentSummary) {
            const tags = Array.isArray(summary.paymentMethodTags) ? summary.paymentMethodTags : [];
            elements.checkoutPaymentSummary.innerHTML = tags.length
                ? tags.map(label => `<span class="checkout-tag">${escapeHtml(label)}</span>`).join('')
                : '<span class="checkout-tag">Visa / Mastercard</span>';
        }
    }

    function redirectToListing(step) {
        if (Number.isInteger(step)) {
            sessionStorage.setItem(EDIT_STEP_KEY, String(step));
        }
        const message = STEP_MESSAGES[step] || 'You can continue editing your listing before publishing.';
        if (message) {
            sessionStorage.setItem(FLASH_MESSAGE_KEY, message);
        }
        window.location.href = 'onruf-add-product.html';
    }

    function showGuard() {
        if (elements.main) {
            elements.main.hidden = true;
        }
        if (elements.guard) {
            elements.guard.hidden = false;
        }
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

    function readSession() {
        try {
            const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('Unable to parse login session payload', error);
            return null;
        }
    }

    function loadDraft() {
        try {
            const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }
            if (!parsed.payload || typeof parsed.payload !== 'object') {
                return null;
            }
            return parsed;
        } catch (error) {
            console.warn('Unable to parse checkout draft', error);
            return null;
        }
    }

    function loadDataset(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn(`Unable to read dataset for ${key}`, error);
            return [];
        }
    }

    function saveDataset(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn(`Unable to save dataset for ${key}`, error);
            throw error;
        }
    }

    function buildFallbackSummary(payload) {
        if (!payload || typeof payload !== 'object') {
            return null;
        }
        const saleTypes = [];
        if (payload.saleOptions?.fixedPrice) saleTypes.push('Fixed price');
        if (payload.saleOptions?.auction) saleTypes.push('Auction');
        if (payload.saleOptions?.negotiable) saleTypes.push('Price negotiable');
        const paymentOptions = Array.isArray(payload.paymentOptions)
            ? payload.paymentOptions.map(humanizePaymentOption)
            : [];
        const shippingOptions = Array.isArray(payload.shippingOptions)
            ? payload.shippingOptions.map(humanizeShippingOption)
            : [];
        const pickupOptions = Array.isArray(payload.pickupOptions)
            ? payload.pickupOptions.map(humanizeShippingOption)
            : [];
        return {
            title: payload.title || 'ONRUF Listing',
            subtitle: `${payload.city || 'Riyadh'} • ${formatDateShort(payload.endsAt)}`,
            notes: payload.description || '',
            condition: payload.itemStatus ? capitalizeWord(payload.itemStatus) : 'Not specified',
            quantity: String(payload.quantity || 1),
            saleTypes: saleTypes.join(', ') || 'Fixed price',
            purchasePrice: formatCurrency(payload.priceMin),
            minimumBid: payload.saleOptions?.auction ? formatCurrency(payload.priceMax) : '—',
            negotiable: payload.saleOptions?.negotiable ? 'Yes' : 'No',
            paymentOptions: paymentOptions.length ? paymentOptions.join(', ') : '—',
            shippingOptions: shippingOptions.length ? shippingOptions.join(', ') : '—',
            pickupOptions: pickupOptions.length ? pickupOptions.join(', ') : '—',
            auctionClosing: formatDateTime(payload.endsAt),
            image: payload.image || getFallbackImageForCategory(payload.category),
            category: payload.category,
            fee: {
                fixed: '0 SAR',
                negotiable: '0 SAR',
                auction: '0 SAR',
                subtotal: '0 SAR',
                tax: '0 SAR',
                total: '0 SAR'
            },
            points: 0,
            paymentMethodTags: ['Visa / Mastercard']
        };
    }

    function humanizePaymentOption(value) {
        switch (value) {
            case 'bank':
                return 'Bank transfer';
            case 'cash':
                return 'Cash';
            case 'credit':
                return 'Credit card';
            case 'mada':
                return 'Mada';
            default:
                return value;
        }
    }

    function humanizeShippingOption(value) {
        switch (value) {
            case 'integrated':
                return 'Integrated shipping company options';
            case 'free':
                return 'Free shipping within Saudi Arabia';
            case 'arrange':
                return 'Arrangement with seller';
            case 'seller':
                return 'Pick-up from seller';
            case 'no-pickup':
                return 'No pick-up';
            case 'alt':
                return 'Pick-up from seller (alternative)';
            default:
                return value;
        }
    }

    function formatCurrency(value) {
        const amount = Number.parseFloat(value);
        if (!Number.isFinite(amount) || amount <= 0) {
            return '—';
        }
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
    }

    function formatDateShort(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'Soon';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getFallbackImageForCategory(category) {
        const normalized = (category || '').toLowerCase();
        if (normalized.includes('mobile') || normalized.includes('phone')) {
            return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80';
        }
        if (normalized.includes('fashion')) {
            return 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80';
        }
        if (normalized.includes('service')) {
            return 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80';
        }
        return 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function capitalizeWord(value) {
        const text = String(value || '').trim();
        if (!text) {
            return '';
        }
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
})();
