(function () {
    'use strict';

    const INDIVIDUAL_ACCOUNTS_KEY = 'onruf_individual_accounts_v1';
    const SIGNUP_RECORDS_KEY = 'onruf_individual_signup_records_v1';
    const OTP_LENGTH = 4;
    const OTP_EXPIRY_MS = 2 * 60 * 1000;
    const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const INVITE_REWARD_POINTS = 100;
    const INVITE_CODE_LENGTH = 8;

    const DEFAULT_INDIVIDUAL_ACCOUNTS = [];

    const FALLBACK_DIAL_CODES = [
        { name: 'Saudi Arabia', iso2: 'sa', dialCode: '+966' },
        { name: 'United Arab Emirates', iso2: 'ae', dialCode: '+971' },
        { name: 'United States', iso2: 'us', dialCode: '+1' },
        { name: 'United Kingdom', iso2: 'gb', dialCode: '+44' },
        { name: 'Egypt', iso2: 'eg', dialCode: '+20' }
    ];

    const LOCATION_MATRIX = {
        'Saudi Arabia': {
            'Riyadh Province': ['Riyadh', 'Al Kharj', 'Al Majmaah'],
            'Makkah Province': ['Jeddah', 'Makkah', 'Taif'],
            'Eastern Province': ['Dammam', 'Khobar', 'Dhahran']
        }
    };

    const INDIVIDUAL_PAYMENT_CARD_BRANDS = ['Mada', 'Visa', 'Mastercard', 'American Express'];
    const INDIVIDUAL_PAYMENT_CARD_STATUS = ['active', 'inactive', 'expired'];

    const INDIVIDUAL_ADDRESS_LABELS = ['Home', 'Office', 'Warehouse', 'Parents', 'Studio'];
    const INDIVIDUAL_ADDRESS_CITY_POOL = [
        { city: 'Riyadh', region: 'Riyadh Province' },
        { city: 'Jeddah', region: 'Makkah Province' },
        { city: 'Dammam', region: 'Eastern Province' },
        { city: 'Khobar', region: 'Eastern Province' },
        { city: 'Madinah', region: 'Madinah Province' }
    ];
    const INDIVIDUAL_ADDRESS_DISTRICTS = ['Al Olaya', 'Al Malqa', 'Al Nakheel', 'Al Rawdah', 'Al Yasmin', 'Al Hamra', 'Obhur Al Janoubiyah'];
    const INDIVIDUAL_ADDRESS_STREETS = ['King Fahd Rd', 'Prince Mohammed Bin Abdulaziz St', 'Al Takhassussi St', 'Imam Saud Bin Abdulaziz Rd', 'Northern Ring Branch Rd'];
    const INDIVIDUAL_ADDRESS_NOTES = [
        'Leave with security if no answer.',
        'Delivery at reception desk.',
        'Gate code 5421.',
        'Use side entrance for large packages.'
    ];

        const INDIVIDUAL_RATING_REVIEWERS = [
            'Aisha Alharbi',
            'Khalid Faris',
            'Dana Almutairi',
            'Mazen Rahman',
            'Noura Kareem',
            'Salman Tareq',
            'Lina Bahri',
            'Yasmin Hadid',
            'Fahad Alameer',
            'Omar Nassar',
            'Rana Jaber',
            'Hussain Latif'
        ];

        const INDIVIDUAL_RATING_COMMENTS = {
            positive: [
                'Smooth handoff and quick replies.',
                'Listing was spotless and ready on time.',
                'Outstanding communication from start to finish.',
                'Very professional experience throughout.',
                'Would gladly trade again with the same member.'
            ],
            neutral: [
                'Item matched the description and photos.',
                'Everything went as expected with no surprises.',
                'Communication was clear and straightforward.',
                'Pickup required some coordination but worked out.',
                'Overall a standard marketplace interaction.'
            ],
            negative: [
                'Response time was slower than expected.',
                'Needed a reminder to finalize the exchange.',
                'Listing packaging could have been better.',
                'Schedule shifted a couple of times before delivery.',
                'Experience was acceptable but could improve on timing.'
            ]
        };

        const INDIVIDUAL_POINTS_WELCOME_NOTES = [
            'Launch bonus for joining the ONRUF marketplace.',
            'Welcome aboard—starter points credited to your account.',
            'Profile completed successfully; enjoy these bonus points.'
        ];

        const INDIVIDUAL_POINTS_REFERRAL_NOTES = [
            'Referral bonus: {name} joined using invite code {code}.',
            '{name} activated their account with your invitation code {code}.',
            'Invite code {code} was redeemed—referral points unlocked.'
        ];

        const INDIVIDUAL_POINTS_WALLET_NOTES = [
            'Converted SAR {amount} from MyWallet into reward points.',
            'Exchanged wallet credits for {points} extra points.',
            'Convert {amount} Riyal to {points} Point'
        ];

        const INDIVIDUAL_POINTS_PURCHASE_NOTES = [
            'Redeemed {points} points on order #{orderId}.',
            'Applied reward points at checkout for order #{orderId}.',
            'Used points to complete a marketplace purchase (order #{orderId}).'
        ];

        const INDIVIDUAL_POINTS_MIN_TRANSACTIONS = 6;
        const INDIVIDUAL_POINTS_MAX_TRANSACTIONS = 20;
        const INDIVIDUAL_POINTS_MIN_PURCHASE_BALANCE = 140;
        const INDIVIDUAL_POINTS_MAX_HISTORY_DAYS = 240;

        const INDIVIDUAL_POINTS_EVENT_DEFINITIONS = {
            welcome: {
                label: 'Welcome bonus points',
                minDelta: 180,
                maxDelta: 420,
                direction: 1,
                notePool: INDIVIDUAL_POINTS_WELCOME_NOTES
            },
            referral: {
                label: 'Referral reward',
                minDelta: 60,
                maxDelta: 180,
                direction: 1,
                noteBuilder: ({ account, rng }) => {
                    const template = pickFromArray(rng, INDIVIDUAL_POINTS_REFERRAL_NOTES);
                    const invitedName = pickFromArray(rng, INDIVIDUAL_RATING_REVIEWERS);
                    const rawCode = account.invitationCode
                        || account.invitation?.code
                        || account.invitation?.token
                        || (account.id ? account.id.toString().slice(-4) : 'ONRUF');
                    const code = rawCode ? rawCode.toString().toUpperCase() : 'ONRUF';
                    return formatPointsNote(template, { name: invitedName, code });
                }
            },
            wallet: {
                label: 'Wallet conversion',
                minDelta: 90,
                maxDelta: 220,
                direction: 1,
                noteBuilder: ({ delta, rng }) => {
                    const template = pickFromArray(rng, INDIVIDUAL_POINTS_WALLET_NOTES);
                    const sarAmount = Math.max(50, Math.round(delta * 0.75)).toLocaleString('en-US');
                    const pointsText = Math.max(0, Math.round(delta)).toLocaleString('en-US');
                    return formatPointsNote(template, { amount: sarAmount, points: pointsText });
                }
            },
            purchase: {
                label: 'Points purchase',
                minDelta: 120,
                maxDelta: 260,
                direction: -1,
                minRequiredBalance: INDIVIDUAL_POINTS_MIN_PURCHASE_BALANCE,
                noteBuilder: ({ rng, delta }) => {
                    const template = pickFromArray(rng, INDIVIDUAL_POINTS_PURCHASE_NOTES);
                    const orderId = generateOrderIdFromRng(rng);
                    const pointsText = Math.abs(Math.round(delta)).toLocaleString('en-US');
                    return formatPointsNote(template, { orderId, points: pointsText });
                }
            }
        };

        function hashString(value) {
            const source = String(value || '');
            let hash = 0;
            for (let index = 0; index < source.length; index += 1) {
                hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
            }
            return hash >>> 0;
        }

        function formatPointsNote(template, replacements) {
            if (typeof template !== 'string') {
                return '';
            }
            return template.replace(/\{(.*?)\}/g, (match, key) => {
                if (!key) {
                    return match;
                }
                const replacement = replacements && Object.prototype.hasOwnProperty.call(replacements, key)
                    ? replacements[key]
                    : undefined;
                return replacement === undefined || replacement === null ? match : String(replacement);
            });
        }

        function generateOrderIdFromRng(rng) {
            const randomDigits = Math.floor(rng() * 900000) + 100000;
            return `ORD-${randomDigits}`;
        }

        function createDeterministicRandom(seed) {
            let state = hashString(seed) || 1;
            return function next() {
                state = (state * 1664525 + 1013904223) >>> 0;
                return state / 0x100000000;
            };
        }

        function pickFromArray(rng, collection) {
            const list = Array.isArray(collection) && collection.length ? collection : [''];
            const index = Math.floor(rng() * list.length) % list.length;
            return list[index];
        }

        function roundToDecimal(value, decimals) {
            const factor = 10 ** Math.max(decimals, 0);
            return Math.round(value * factor) / factor;
        }

        function computeAverageRating(entries) {
            const collection = Array.isArray(entries) ? entries : [];
            let total = 0;
            let weight = 0;
            collection.forEach(entry => {
                if (entry === null || entry === undefined) {
                    return;
                }
                const ratingCandidate = typeof entry === 'number'
                    ? entry
                    : Number(entry.rating ?? entry.score ?? entry.value ?? entry.average ?? entry.stars ?? entry.result);
                if (!Number.isFinite(ratingCandidate)) {
                    return;
                }
                const weightCandidate = typeof entry === 'number'
                    ? 1
                    : Number(entry.reviews ?? entry.count ?? entry.votes ?? entry.weight ?? entry.total ?? entry.quantity ?? 1);
                const ratingWeight = Number.isFinite(weightCandidate) && weightCandidate > 0 ? weightCandidate : 1;
                total += ratingCandidate * ratingWeight;
                weight += ratingWeight;
            });
            if (!weight) {
                return null;
            }
            return total / weight;
        }

        function generateIndividualRatingEntries(accountId, role, limit = 20) {
            const seed = `${accountId || 'IND'}|${role}`;
            const rng = createDeterministicRandom(seed);
            const maxEntries = Math.max(1, limit);
            const minEntries = Math.min(4, maxEntries);
            const span = Math.max(maxEntries - minEntries + 1, 1);
            const count = minEntries + Math.floor(rng() * span);
            const now = Date.now();
            const entries = [];
            for (let index = 0; index < count; index += 1) {
                const rawRating = 3 + rng() * 2;
                const rating = roundToDecimal(Math.max(2.5, Math.min(5, rawRating)), 1);
                const weight = Math.max(1, Math.round(rng() * 3));
                const reviewerName = pickFromArray(rng, INDIVIDUAL_RATING_REVIEWERS);
                let commentPool = INDIVIDUAL_RATING_COMMENTS.neutral;
                if (rating >= 4.3) {
                    commentPool = INDIVIDUAL_RATING_COMMENTS.positive;
                } else if (rating < 3.6) {
                    commentPool = INDIVIDUAL_RATING_COMMENTS.negative;
                }
                const comment = pickFromArray(rng, commentPool);
                const daysAgo = Math.floor(rng() * 180) + index;
                const hoursOffset = Math.floor(rng() * 12);
                const reviewedAt = new Date(now - daysAgo * 86_400_000 - hoursOffset * 3_600_000).toISOString();
                const orderSuffix = String(Math.floor(rng() * 9000) + 1000);
                entries.push({
                    id: `${accountId || 'IND'}-${role}-rating-${String(index + 1).padStart(3, '0')}`,
                    rating,
                    reviews: weight,
                    reviewerName,
                    reviewerRole: role === 'seller' ? 'Buyer' : 'Seller',
                    comment,
                    reviewedAt,
                    role,
                    relatedOrderId: `ORD-${orderSuffix}`
                });
            }
            return entries;
        }

        function ensureIndividualAccountPoints(account) {
            if (!account || typeof account !== 'object') {
                return;
            }

            const idBase = (account.id || account.email || 'IND')
                .toString()
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase() || 'ind';
            const existingHistoryRaw = Array.isArray(account.pointsHistory) ? account.pointsHistory.filter(Boolean) : [];

            const coerceTimestamp = (value, fallbackIso) => {
                const normalized = normalizeIsoTimestamp(value, null);
                if (normalized) {
                    return normalized;
                }
                return fallbackIso || new Date().toISOString();
            };

            if (existingHistoryRaw.length) {
                const fallbackNow = Date.now();
                const sortedHistory = existingHistoryRaw
                    .map((entry, index) => {
                        const deltaCandidate = Number(entry?.delta ?? entry?.amount ?? 0);
                        const delta = Number.isFinite(deltaCandidate) ? Math.round(deltaCandidate) : 0;
                        const fallbackTimestamp = new Date(fallbackNow - (existingHistoryRaw.length - index) * 3_600_000).toISOString();
                        const timestamp = coerceTimestamp(entry?.timestamp || entry?.recordedAt || entry?.date, fallbackTimestamp);
                        const balanceCandidate = Number(entry?.balanceAfter ?? entry?.balance);
                        const balanceAfter = Number.isFinite(balanceCandidate) ? Math.round(balanceCandidate) : null;
                        const label = typeof entry?.label === 'string' && entry.label.trim()
                            ? entry.label.trim()
                            : delta >= 0
                                ? 'Points credit'
                                : 'Points redemption';
                        const note = typeof entry?.note === 'string' ? entry.note.trim() : '';
                        return {
                            id: typeof entry?.id === 'string' && entry.id.trim() ? entry.id.trim() : null,
                            label,
                            delta,
                            balanceAfter,
                            timestamp,
                            note
                        };
                    })
                    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

                const rebuiltHistory = [];
                let runningBalance = 0;
                sortedHistory.forEach((entry) => {
                    const delta = Number.isFinite(entry.delta) ? entry.delta : 0;
                    if (Number.isFinite(entry.balanceAfter)) {
                        runningBalance = Math.max(0, entry.balanceAfter);
                    } else {
                        runningBalance = Math.max(0, runningBalance + delta);
                    }
                    rebuiltHistory.push({
                        id: entry.id,
                        label: entry.label,
                        delta: Math.round(delta),
                        balanceAfter: Math.round(runningBalance),
                        timestamp: entry.timestamp,
                        note: entry.note
                    });
                });

                const limitedHistory = rebuiltHistory.slice(-INDIVIDUAL_POINTS_MAX_TRANSACTIONS).map((entry, index) => ({
                    id: `points-${idBase}-${String(index + 1).padStart(3, '0')}`,
                    label: entry.label,
                    delta: entry.delta,
                    balanceAfter: entry.balanceAfter,
                    timestamp: entry.timestamp,
                    note: entry.note
                }));

                const latestEntry = limitedHistory[limitedHistory.length - 1] || null;
                account.pointsHistory = limitedHistory;
                const derivedBalance = latestEntry ? latestEntry.balanceAfter : (rebuiltHistory.length ? rebuiltHistory[rebuiltHistory.length - 1].balanceAfter : 0);
                if (!Number.isFinite(Number(account.pointsBalance))) {
                    account.pointsBalance = derivedBalance;
                } else {
                    account.pointsBalance = Math.max(0, Math.round(Number(account.pointsBalance)));
                }
                account.points = account.pointsBalance;
                if (!account.pointsUpdatedAt && latestEntry) {
                    account.pointsUpdatedAt = latestEntry.timestamp;
                }
                if (!account.pointsUpdatedAt) {
                    account.pointsUpdatedAt = new Date().toISOString();
                }
                return;
            }

            const rng = createDeterministicRandom(`${account.id || account.email || account.fullName || Date.now()}|points`);
            const totalTransactions = INDIVIDUAL_POINTS_MIN_TRANSACTIONS
                + Math.floor(rng() * (INDIVIDUAL_POINTS_MAX_TRANSACTIONS - INDIVIDUAL_POINTS_MIN_TRANSACTIONS + 1));
            const events = [];
            let balance = 0;
            const now = Date.now();

            const generateTimestamp = index => {
                const remaining = totalTransactions - index;
                const baseDays = (remaining + 1) * 5;
                const jitterDays = Math.floor((rng() - 0.5) * 4);
                let candidate = now - Math.min(INDIVIDUAL_POINTS_MAX_HISTORY_DAYS, baseDays + Math.max(jitterDays, -baseDays)) * 86_400_000;
                candidate += Math.floor(rng() * 18) * 3_600_000;
                candidate += Math.floor(rng() * 60) * 60_000;
                if (events.length) {
                    const previousTime = Date.parse(events[events.length - 1].timestamp) || (now - (remaining + 1) * 3_600_000);
                    if (candidate <= previousTime) {
                        candidate = previousTime + Math.max(3_600_000, Math.floor(rng() * 6) * 3_600_000);
                    }
                }
                const minAllowed = now - INDIVIDUAL_POINTS_MAX_HISTORY_DAYS * 86_400_000;
                if (candidate < minAllowed) {
                    candidate = minAllowed + index * 3_600_000;
                }
                const maxAllowed = now - Math.max(0, (totalTransactions - index - 1) * 3_600_000);
                if (candidate > maxAllowed) {
                    candidate = maxAllowed - Math.floor(rng() * 90) * 60_000;
                }
                return new Date(Math.min(candidate, now - 60_000)).toISOString();
            };

            const addEvent = type => {
                const definition = INDIVIDUAL_POINTS_EVENT_DEFINITIONS[type];
                if (!definition) {
                    return false;
                }
                const minDelta = Math.max(10, Math.round(definition.minDelta || 50));
                const deltaSpan = Math.max(0, Math.round((definition.maxDelta || minDelta) - minDelta));
                const magnitude = minDelta + Math.round(rng() * deltaSpan);
                let delta = definition.direction === -1 ? -magnitude : magnitude;
                if (definition.direction === -1) {
                    const minBalance = definition.minRequiredBalance || INDIVIDUAL_POINTS_MIN_PURCHASE_BALANCE;
                    if (balance < minBalance) {
                        return false;
                    }
                    const maxSpend = Math.max(40, Math.floor(balance * 0.7));
                    if (maxSpend < 40) {
                        return false;
                    }
                    const spend = Math.min(Math.max(40, magnitude), maxSpend);
                    delta = -spend;
                }
                balance = Math.max(0, Math.round(balance + delta));
                const timestamp = generateTimestamp(events.length);
                const note = typeof definition.noteBuilder === 'function'
                    ? definition.noteBuilder({ account, rng, delta, magnitude: Math.abs(delta) })
                    : (Array.isArray(definition.notePool) && definition.notePool.length
                        ? pickFromArray(rng, definition.notePool)
                        : '');
                events.push({
                    id: `points-${idBase}-${String(events.length + 1).padStart(3, '0')}`,
                    label: definition.label,
                    delta: Math.round(delta),
                    balanceAfter: balance,
                    timestamp,
                    note: note || ''
                });
                return true;
            };

            addEvent('welcome');

            const requiredTypes = new Set(['referral', 'wallet', 'purchase']);
            let attempts = 0;
            while (events.length < totalTransactions && attempts < totalTransactions * 4) {
                attempts += 1;
                if (requiredTypes.has('purchase') && balance < INDIVIDUAL_POINTS_MIN_PURCHASE_BALANCE && events.length >= 3) {
                    requiredTypes.delete('purchase');
                }
                let candidates = ['referral', 'wallet', 'purchase'];
                if (requiredTypes.size) {
                    candidates = candidates.filter(type => requiredTypes.has(type));
                }
                candidates = candidates.filter(type => type !== 'purchase' || balance >= INDIVIDUAL_POINTS_MIN_PURCHASE_BALANCE);
                if (!candidates.length) {
                    candidates = ['referral', 'wallet'];
                    if (balance >= INDIVIDUAL_POINTS_MIN_PURCHASE_BALANCE && events.length > 3) {
                        candidates.push('purchase');
                    }
                }
                if (!candidates.length) {
                    break;
                }
                const choice = pickFromArray(rng, candidates);
                if (addEvent(choice)) {
                    requiredTypes.delete(choice);
                }
            }

            account.pointsHistory = events;
            const latestGenerated = events[events.length - 1] || null;
            account.pointsBalance = latestGenerated ? latestGenerated.balanceAfter : balance;
            account.points = account.pointsBalance;
            account.pointsUpdatedAt = latestGenerated ? latestGenerated.timestamp : new Date(now).toISOString();
        }

        function ensureIndividualAccountRatings(account) {
            if (!account || typeof account !== 'object') {
                return;
            }
            if (!account.marketplaceActivity || typeof account.marketplaceActivity !== 'object') {
                account.marketplaceActivity = {
                    purchases: [],
                    sales: [],
                    productAds: [],
                    followUps: {},
                    sellerRatings: [],
                    buyerRatings: [],
                    savedAddresses: []
                };
            } else {
                if (!Array.isArray(account.marketplaceActivity.purchases)) account.marketplaceActivity.purchases = [];
                if (!Array.isArray(account.marketplaceActivity.sales)) account.marketplaceActivity.sales = [];
                if (!Array.isArray(account.marketplaceActivity.productAds)) account.marketplaceActivity.productAds = [];
                if (!account.marketplaceActivity.followUps || typeof account.marketplaceActivity.followUps !== 'object') {
                    account.marketplaceActivity.followUps = {};
                }
                if (!Array.isArray(account.marketplaceActivity.savedAddresses)) account.marketplaceActivity.savedAddresses = [];
                if (!Array.isArray(account.marketplaceActivity.sellerRatings)) account.marketplaceActivity.sellerRatings = [];
                if (!Array.isArray(account.marketplaceActivity.buyerRatings)) account.marketplaceActivity.buyerRatings = [];
            }

            const existingSeller = Array.isArray(account.sellerRatings) ? account.sellerRatings.filter(Boolean) : [];
            const existingBuyer = Array.isArray(account.buyerRatings) ? account.buyerRatings.filter(Boolean) : [];
            const activitySeller = Array.isArray(account.marketplaceActivity.sellerRatings)
                ? account.marketplaceActivity.sellerRatings.filter(Boolean)
                : [];
            const activityBuyer = Array.isArray(account.marketplaceActivity.buyerRatings)
                ? account.marketplaceActivity.buyerRatings.filter(Boolean)
                : [];

            const sellerRatings = existingSeller.length
                ? existingSeller
                : activitySeller.length
                    ? activitySeller
                    : generateIndividualRatingEntries(account.id || account.email || Date.now(), 'seller');
            const buyerRatings = existingBuyer.length
                ? existingBuyer
                : activityBuyer.length
                    ? activityBuyer
                    : generateIndividualRatingEntries(account.id || account.email || Date.now(), 'buyer');

            account.sellerRatings = sellerRatings;
            account.buyerRatings = buyerRatings;
            account.marketplaceActivity.sellerRatings = sellerRatings;
            account.marketplaceActivity.buyerRatings = buyerRatings;

            const sellerAverage = computeAverageRating(sellerRatings);
            const buyerAverage = computeAverageRating(buyerRatings);
            if (sellerAverage !== null) {
                if (!Number.isFinite(Number(account.sellerRating))) {
                    account.sellerRating = roundToDecimal(sellerAverage, 2);
                }
                if (!Number.isFinite(Number(account.averageSellerRating))) {
                    account.averageSellerRating = roundToDecimal(sellerAverage, 2);
                }
            }
            if (buyerAverage !== null) {
                if (!Number.isFinite(Number(account.buyerRating))) {
                    account.buyerRating = roundToDecimal(buyerAverage, 2);
                }
                if (!Number.isFinite(Number(account.averageBuyerRating))) {
                    account.averageBuyerRating = roundToDecimal(buyerAverage, 2);
                }
            }
            const combinedAverage = computeAverageRating([...sellerRatings, ...buyerRatings]);
            if (combinedAverage !== null && !Number.isFinite(Number(account.rating))) {
                account.rating = roundToDecimal(combinedAverage, 2);
            }
            if (!Number.isFinite(Number(account.ratingCount))) {
                account.ratingCount = sellerRatings.length + buyerRatings.length;
            }
        }

            function ensureIndividualAccountPaymentCards(account) {
                if (!account || typeof account !== 'object') {
                    return;
                }
                const snapshotBefore = JSON.stringify(Array.isArray(account.paymentCards) ? account.paymentCards : []);
                const normalizedExisting = Array.isArray(account.paymentCards)
                    ? account.paymentCards.map((entry, index) => normalizeIndividualPaymentCard(entry, index, account)).filter(Boolean)
                    : [];
                let cards = normalizedExisting;
                if (!cards.length) {
                    cards = generateIndividualPaymentCards(account);
                }
                if (Array.isArray(cards) && cards.length) {
                    const defaultIndex = cards.findIndex(card => card.isDefault);
                    const resolvedDefault = defaultIndex >= 0 ? defaultIndex : 0;
                    cards = cards.map((card, index) => ({
                        ...card,
                        isDefault: index === resolvedDefault
                    }));
                } else {
                    cards = [];
                }
                account.paymentCards = cards.map(card => ({ ...card }));
                const snapshotAfter = JSON.stringify(account.paymentCards);
                return snapshotBefore !== snapshotAfter;
            }

            function normalizeIndividualPaymentCard(entry, index, account) {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                const seed = (account.id || account.email || 'card').toString().replace(/[^a-z0-9]/gi, '').toLowerCase() || 'card';
                const id = typeof entry.id === 'string' && entry.id.trim()
                    ? entry.id.trim()
                    : `card-${seed}-${String(index + 1).padStart(3, '0')}`;
                const brandRaw = typeof entry.brand === 'string' && entry.brand.trim()
                    ? entry.brand.trim()
                    : typeof entry.network === 'string' && entry.network.trim()
                        ? entry.network.trim()
                        : 'Card';
                const brand = titleCase(brandRaw);
                const digitsSource = entry.last4 ?? entry.panLast4 ?? entry.cardLast4 ?? entry.pan ?? entry.number ?? entry.cardNumber ?? '';
                let last4 = String(digitsSource).replace(/[^0-9]/g, '').slice(-4);
                if (!last4) {
                    last4 = String(1000 + ((index + 3) * 137) % 9000).slice(-4);
                }
                const expiryMonth = normalizeExpiryMonth(entry.expiryMonth ?? entry.expMonth ?? entry.month);
                const expiryYear = normalizeExpiryYear(entry.expiryYear ?? entry.expYear ?? entry.year);
                const holderName = typeof entry.holderName === 'string' && entry.holderName.trim()
                    ? entry.holderName.trim()
                    : typeof entry.name === 'string' && entry.name.trim()
                        ? entry.name.trim()
                        : account.fullName
                            || `${account.firstName || ''} ${account.lastName || ''}`.trim()
                            || buildNameFromEmail(account.email || '')
                            || 'ONRUF Member';
                const statusRaw = typeof entry.status === 'string' && entry.status.trim()
                    ? entry.status.trim().toLowerCase()
                    : typeof entry.state === 'string' && entry.state.trim()
                        ? entry.state.trim().toLowerCase()
                        : 'active';
                const status = INDIVIDUAL_PAYMENT_CARD_STATUS.includes(statusRaw) ? statusRaw : 'active';
                const addedAt = normalizeIsoTimestamp(entry.addedAt || entry.createdAt, new Date().toISOString());
                const updatedAt = normalizeIsoTimestamp(entry.updatedAt, addedAt);
                const isDefault = entry.isDefault === true
                    || String(entry.isDefault).toLowerCase() === 'true'
                    || String(entry.default).toLowerCase() === 'true'
                    || String(entry.primary).toLowerCase() === 'true';
                return {
                    id,
                    brand,
                    last4,
                    expiryMonth,
                    expiryYear,
                    holderName,
                    status,
                    isDefault,
                    addedAt,
                    updatedAt
                };
            }

            function generateIndividualPaymentCards(account) {
                const baseSeed = (account.id || account.email || account.fullName || 'card').toString().trim() || 'card';
                const idSeed = baseSeed.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'card';
                const rng = createDeterministicRandom(`${baseSeed}|payment-cards`);
                const holder = account.fullName
                    || (account.firstName && account.lastName ? `${account.firstName} ${account.lastName}` : '')
                    || buildNameFromEmail(account.email || '')
                    || 'ONRUF Member';
                const cardCount = 2 + Math.floor(rng() * 2);
                const now = Date.now();
                const cards = [];
                for (let index = 0; index < cardCount; index += 1) {
                    const brand = pickFromArray(rng, INDIVIDUAL_PAYMENT_CARD_BRANDS);
                    const last4 = String(Math.floor(rng() * 9000) + 1000);
                    const expiryMonth = String(Math.floor(rng() * 12) + 1).padStart(2, '0');
                    const expiryYear = String(new Date(now).getFullYear() + 2 + index + Math.floor(rng() * 3));
                    const statusPool = ['active', 'active', 'active', 'inactive', 'expired'];
                    let status = pickFromArray(rng, statusPool);
                    if (index === 0 || status === 'expired') {
                        status = 'active';
                    }
                    const offsetDays = (cardCount - index) * (24 + Math.floor(rng() * 40));
                    const addedAt = new Date(now - offsetDays * 86_400_000).toISOString();
                    cards.push({
                        id: `card-${idSeed}-${String(index + 1).padStart(3, '0')}`,
                        brand,
                        last4,
                        expiryMonth,
                        expiryYear,
                        holderName: holder,
                        status,
                        isDefault: index === 0,
                        addedAt,
                        updatedAt: addedAt
                    });
                }
                return cards;
            }

            function ensureIndividualAccountSavedAddresses(account) {
                if (!account || typeof account !== 'object') {
                    return;
                }
                if (!account.marketplaceActivity || typeof account.marketplaceActivity !== 'object') {
                    account.marketplaceActivity = {};
                }
                const snapshotBefore = JSON.stringify({
                    saved: Array.isArray(account.savedAddresses) ? account.savedAddresses : [],
                    activity: Array.isArray(account.marketplaceActivity.savedAddresses) ? account.marketplaceActivity.savedAddresses : []
                });
                const source = Array.isArray(account.savedAddresses) && account.savedAddresses.length
                    ? account.savedAddresses
                    : Array.isArray(account.marketplaceActivity.savedAddresses)
                        ? account.marketplaceActivity.savedAddresses
                        : [];
                const normalizedExisting = source
                    .map((entry, index) => normalizeIndividualSavedAddress(entry, index, account))
                    .filter(Boolean);
                let addresses = normalizedExisting;
                if (!addresses.length) {
                    addresses = generateIndividualSavedAddresses(account);
                }
                if (!Array.isArray(addresses)) {
                    addresses = [];
                }
                if (addresses.length) {
                    const defaultIndex = addresses.findIndex(address => address.isDefault);
                    const resolvedDefault = defaultIndex >= 0 ? defaultIndex : 0;
                    addresses = addresses.map((address, index) => ({
                        ...address,
                        isDefault: index === resolvedDefault
                    }));
                }
                account.savedAddresses = addresses.map(address => ({ ...address }));
                if (!Array.isArray(account.marketplaceActivity.savedAddresses)) {
                    account.marketplaceActivity.savedAddresses = [];
                }
                account.marketplaceActivity.savedAddresses = addresses.map(address => ({ ...address }));
                const snapshotAfter = JSON.stringify({
                    saved: account.savedAddresses,
                    activity: account.marketplaceActivity.savedAddresses
                });
                return snapshotBefore !== snapshotAfter;
            }

            function normalizeIndividualSavedAddress(entry, index, account) {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                const seed = (account.id || account.email || 'address').toString().replace(/[^a-z0-9]/gi, '').toLowerCase() || 'address';
                const id = typeof entry.id === 'string' && entry.id.trim()
                    ? entry.id.trim()
                    : `addr-${seed}-${String(index + 1).padStart(3, '0')}`;
                const label = typeof entry.label === 'string' && entry.label.trim()
                    ? entry.label.trim()
                    : typeof entry.nickname === 'string' && entry.nickname.trim()
                        ? entry.nickname.trim()
                        : `Address ${index + 1}`;
                const recipient = typeof entry.recipient === 'string' && entry.recipient.trim()
                    ? entry.recipient.trim()
                    : typeof entry.contactName === 'string' && entry.contactName.trim()
                        ? entry.contactName.trim()
                        : account.fullName
                            || `${account.firstName || ''} ${account.lastName || ''}`.trim()
                            || buildNameFromEmail(account.email || '')
                            || 'ONRUF Member';
                const country = typeof entry.country === 'string' && entry.country.trim()
                    ? entry.country.trim()
                    : 'Saudi Arabia';
                const region = typeof entry.region === 'string' && entry.region.trim()
                    ? entry.region.trim()
                    : typeof entry.state === 'string' && entry.state.trim()
                        ? entry.state.trim()
                        : '';
                const city = typeof entry.city === 'string' && entry.city.trim()
                    ? entry.city.trim()
                    : account.city || 'Riyadh';
                const district = typeof entry.district === 'string' && entry.district.trim()
                    ? entry.district.trim()
                    : typeof entry.area === 'string' && entry.area.trim()
                        ? entry.area.trim()
                        : '';
                const streetNumber = typeof entry.streetNumber === 'string' && entry.streetNumber.trim()
                    ? entry.streetNumber.trim()
                    : typeof entry.buildingNumber === 'string' && entry.buildingNumber.trim()
                        ? entry.buildingNumber.trim()
                        : '';
                const streetName = typeof entry.streetName === 'string' && entry.streetName.trim()
                    ? entry.streetName.trim()
                    : typeof entry.street === 'string' && entry.street.trim()
                        ? entry.street.trim()
                        : '';
                const building = typeof entry.building === 'string' && entry.building.trim() ? entry.building.trim() : '';
                const apartment = typeof entry.apartment === 'string' && entry.apartment.trim()
                    ? entry.apartment.trim()
                    : typeof entry.unit === 'string' && entry.unit.trim()
                        ? entry.unit.trim()
                        : '';
                const zipCode = typeof entry.zipCode === 'string' && entry.zipCode.trim()
                    ? entry.zipCode.trim()
                    : typeof entry.postalCode === 'string' && entry.postalCode.trim()
                        ? entry.postalCode.trim()
                        : '';
                const notes = typeof entry.notes === 'string' && entry.notes.trim()
                    ? entry.notes.trim()
                    : typeof entry.instructions === 'string' && entry.instructions.trim()
                        ? entry.instructions.trim()
                        : '';
                const contactPhone = typeof entry.contactPhone === 'string' && entry.contactPhone.trim()
                    ? entry.contactPhone.trim()
                    : typeof entry.phone === 'string' && entry.phone.trim()
                        ? entry.phone.trim()
                        : account.mobile || '';
                const addedAt = normalizeIsoTimestamp(entry.addedAt || entry.createdAt, new Date().toISOString());
                const updatedAt = normalizeIsoTimestamp(entry.updatedAt, addedAt);
                const isDefault = entry.isDefault === true
                    || String(entry.isDefault).toLowerCase() === 'true'
                    || String(entry.default).toLowerCase() === 'true'
                    || String(entry.primary).toLowerCase() === 'true';
                return {
                    id,
                    label,
                    recipient,
                    country,
                    region,
                    city,
                    district,
                    streetNumber,
                    streetName,
                    building,
                    apartment,
                    zipCode,
                    notes,
                    contactPhone,
                    isDefault,
                    addedAt,
                    updatedAt
                };
            }

            function generateIndividualSavedAddresses(account) {
                const baseSeed = (account.id || account.email || account.fullName || 'address').toString().trim() || 'address';
                const idSeed = baseSeed.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'address';
                const rng = createDeterministicRandom(`${baseSeed}|saved-addresses`);
                const holder = account.fullName
                    || (account.firstName && account.lastName ? `${account.firstName} ${account.lastName}` : '')
                    || buildNameFromEmail(account.email || '')
                    || 'ONRUF Member';
                const count = 2 + Math.floor(rng() * 2);
                const now = Date.now();
                const addresses = [];
                for (let index = 0; index < count; index += 1) {
                    const cityEntry = pickFromArray(rng, INDIVIDUAL_ADDRESS_CITY_POOL);
                    const district = pickFromArray(rng, INDIVIDUAL_ADDRESS_DISTRICTS);
                    const streetName = pickFromArray(rng, INDIVIDUAL_ADDRESS_STREETS);
                    const streetNumber = String(100 + Math.floor(rng() * 800));
                    const building = `Building ${String.fromCharCode(65 + (index % 6))}`;
                    const apartment = index === 0 ? 'Villa 1' : `Suite ${200 + index}`;
                    const zipCode = String(10000 + Math.floor(rng() * 90000));
                    const notes = pickFromArray(rng, INDIVIDUAL_ADDRESS_NOTES);
                    const contactPhone = account.mobile || generateFallbackPhone(rng);
                    const offsetDays = (count - index) * (20 + Math.floor(rng() * 40));
                    const addedAt = new Date(now - offsetDays * 86_400_000).toISOString();
                    addresses.push({
                        id: `addr-${idSeed}-${String(index + 1).padStart(3, '0')}`,
                        label: INDIVIDUAL_ADDRESS_LABELS[index] || `Address ${index + 1}`,
                        recipient: holder,
                        country: 'Saudi Arabia',
                        region: cityEntry.region,
                        city: cityEntry.city,
                        district,
                        streetNumber,
                        streetName,
                        building,
                        apartment,
                        zipCode,
                        notes,
                        contactPhone,
                        isDefault: index === 0,
                        addedAt,
                        updatedAt: addedAt
                    });
                }
                return addresses;
            }

    const state = {
        currentStep: 1,
        generatedOtp: null,
        otpExpiresAt: null,
        countdownTimer: null,
        basicInfo: null,
        profilePreview: null,
        profileFileName: null,
        phoneCodeData: [...FALLBACK_DIAL_CODES],
        phoneCodeSearchTerm: '',
        selectedCountryIso2: 'sa',
        selectedCountryName: 'Saudi Arabia',
        selectedDialCode: '+966',
        phoneCodeDropdownOpen: false
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
    elements.phoneCodeContainer = document.getElementById('phoneCodePicker');
    elements.phoneCodeTrigger = document.getElementById('phoneCodeTrigger');
        elements.phoneCodeDropdown = document.getElementById('phoneCodeDropdown');
        elements.phoneCodeSearch = document.getElementById('phoneCodeSearch');
        elements.phoneCodeList = document.getElementById('phoneCodeList');
        elements.phoneCodeValue = document.getElementById('phoneCodeValue');
        elements.phoneCodeFlag = document.getElementById('phoneCodeFlag');

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
        setupPhoneCodePicker();

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

    function setupPhoneCodePicker() {
        if (!elements.phoneCodeTrigger || !elements.phoneCodeDropdown || !elements.phoneCodeList) {
            return;
        }

        state.phoneCodeData.sort((a, b) => a.name.localeCompare(b.name));
        renderPhoneCodeList();
        updatePhoneCodeDisplay(state.selectedCountryIso2, state.selectedDialCode, state.selectedCountryName);

        elements.phoneCodeTrigger.addEventListener('click', event => {
            event.preventDefault();
            togglePhoneCodeDropdown();
        });

        if (elements.phoneCodeSearch) {
            elements.phoneCodeSearch.addEventListener('input', handlePhoneCodeSearchInput);
        }

        elements.phoneCodeList.addEventListener('click', handlePhoneCodeListClick);
        document.addEventListener('click', handlePhoneCodeGlobalClick, { capture: true });
        document.addEventListener('keydown', handlePhoneCodeKeydown);

        loadPhoneCodeData();
    }

    function togglePhoneCodeDropdown(force) {
        if (!elements.phoneCodeDropdown || !elements.phoneCodeTrigger) {
            return;
        }
        const shouldOpen = typeof force === 'boolean' ? force : !state.phoneCodeDropdownOpen;
        state.phoneCodeDropdownOpen = shouldOpen;
        elements.phoneCodeDropdown.classList.toggle('open', shouldOpen);
        elements.phoneCodeTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        if (shouldOpen) {
            requestAnimationFrame(() => {
                if (elements.phoneCodeSearch) {
                    elements.phoneCodeSearch.focus();
                    elements.phoneCodeSearch.select();
                }
            });
        }
    }

    function closePhoneCodeDropdown() {
        if (!state.phoneCodeDropdownOpen) {
            return;
        }
        togglePhoneCodeDropdown(false);
    }

    function handlePhoneCodeSearchInput(event) {
        state.phoneCodeSearchTerm = (event.target.value || '').trim().toLowerCase();
        renderPhoneCodeList();
    }

    function handlePhoneCodeListClick(event) {
        const button = event.target.closest('button.phone-code-option');
        if (!button) {
            return;
        }
        const iso2 = button.getAttribute('data-iso') || '';
        const dialCode = button.getAttribute('data-dial') || '';
        const name = button.getAttribute('data-name') || '';
        if (!dialCode) {
            return;
        }
        selectPhoneCode({ iso2, dialCode, name });
        closePhoneCodeDropdown();
        if (elements.basicInfoForm) {
            const phoneInput = elements.basicInfoForm.querySelector('#basicPhone');
            phoneInput?.focus();
        }
    }

    function handlePhoneCodeGlobalClick(event) {
        if (!state.phoneCodeDropdownOpen) {
            return;
        }
        if (!elements.phoneCodeContainer) {
            closePhoneCodeDropdown();
            return;
        }
        if (!elements.phoneCodeContainer.contains(event.target)) {
            closePhoneCodeDropdown();
        }
    }

    function handlePhoneCodeKeydown(event) {
        if (event.key === 'Escape') {
            closePhoneCodeDropdown();
        }
    }

    function renderPhoneCodeList() {
        if (!elements.phoneCodeList) {
            return;
        }
        const term = state.phoneCodeSearchTerm;
        const fragment = document.createDocumentFragment();
        let matches = state.phoneCodeData;
        if (term) {
            matches = state.phoneCodeData.filter(entry => {
                const haystack = `${entry.name} ${entry.dialCode}`.toLowerCase();
                return haystack.includes(term);
            });
        }

        elements.phoneCodeList.innerHTML = '';

        if (!matches.length) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'phone-code-empty';
            emptyItem.textContent = 'No matching countries.';
            elements.phoneCodeList.appendChild(emptyItem);
            return;
        }

        matches.forEach(entry => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'phone-code-option';
            button.dataset.iso = entry.iso2 || '';
            button.dataset.dial = entry.dialCode;
            button.dataset.name = entry.name || entry.dialCode;
            button.setAttribute('role', 'option');
            const isActive = entry.dialCode === state.selectedDialCode && (!entry.iso2 || entry.iso2 === state.selectedCountryIso2);
            if (isActive) {
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
            } else {
                button.setAttribute('aria-selected', 'false');
            }

            const flag = document.createElement('span');
            flag.className = 'country-flag';
            const flagUrl = resolveFlagUrl(entry.iso2);
            if (flagUrl) {
                flag.style.backgroundImage = `url('${flagUrl}')`;
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'option-name';
            nameSpan.textContent = entry.name;

            const dialSpan = document.createElement('span');
            dialSpan.className = 'option-dial';
            dialSpan.textContent = entry.dialCode;

            button.appendChild(flag);
            button.appendChild(nameSpan);
            button.appendChild(dialSpan);
            listItem.appendChild(button);
            fragment.appendChild(listItem);
        });

        elements.phoneCodeList.appendChild(fragment);
    }

    function selectPhoneCode(entry) {
        if (!entry || !entry.dialCode) {
            return;
        }
        state.selectedDialCode = entry.dialCode;
        state.selectedCountryIso2 = entry.iso2 || state.selectedCountryIso2;
        state.selectedCountryName = entry.name || state.selectedCountryName;
        updatePhoneCodeDisplay(state.selectedCountryIso2, state.selectedDialCode, state.selectedCountryName);
        state.phoneCodeSearchTerm = '';
        if (elements.phoneCodeSearch) {
            elements.phoneCodeSearch.value = '';
        }
        renderPhoneCodeList();
    }

    function updatePhoneCodeDisplay(iso2, dialCode, name) {
        if (elements.phoneCodeValue) {
            elements.phoneCodeValue.textContent = dialCode || '+966';
        }
        if (elements.phoneCodeFlag) {
            const flagUrl = resolveFlagUrl(iso2);
            if (flagUrl) {
                elements.phoneCodeFlag.style.backgroundImage = `url('${flagUrl}')`;
            } else {
                elements.phoneCodeFlag.style.backgroundImage = 'none';
            }
        }
        if (elements.phoneCodeTrigger) {
            const labelName = name || 'Selected country';
            elements.phoneCodeTrigger.setAttribute('aria-label', `${labelName} ${dialCode || ''}`.trim());
        }
    }

    async function loadPhoneCodeData() {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2');
            if (!response.ok) {
                throw new Error(`Unexpected status ${response.status}`);
            }
            const data = await response.json();
            if (!Array.isArray(data) || !data.length) {
                return;
            }
            const entries = [];
            data.forEach(item => {
                const name = item?.name?.common;
                const iso2 = typeof item?.cca2 === 'string' ? item.cca2.trim().toLowerCase() : '';
                const root = item?.idd?.root || '';
                const suffixes = Array.isArray(item?.idd?.suffixes) ? item.idd.suffixes : [];
                if (!name || !iso2 || !root || !suffixes.length) {
                    return;
                }
                suffixes.forEach(suffix => {
                    if (typeof suffix !== 'string') {
                        return;
                    }
                    const sanitizedSuffix = suffix.replace(/[^0-9]/g, '');
                    const dialCode = `${root}${sanitizedSuffix}`.replace(/\s+/g, '');
                    if (!dialCode) {
                        return;
                    }
                    entries.push({ name, iso2, dialCode: dialCode.startsWith('+') ? dialCode : `+${dialCode}` });
                });
            });

            if (!entries.length) {
                return;
            }

            const unique = [];
            const seen = new Set();
            entries.forEach(entry => {
                const key = `${entry.name.toLowerCase()}|${entry.dialCode}`;
                if (seen.has(key)) {
                    return;
                }
                seen.add(key);
                unique.push(entry);
            });

            FALLBACK_DIAL_CODES.forEach(entry => {
                const key = `${entry.name.toLowerCase()}|${entry.dialCode}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(entry);
                }
            });

            unique.sort((a, b) => a.name.localeCompare(b.name));

            state.phoneCodeData = unique;
            renderPhoneCodeList();

            const preferred = unique.find(entry => entry.iso2 === state.selectedCountryIso2)
                || unique.find(entry => entry.dialCode === state.selectedDialCode)
                || unique[0];
            if (preferred) {
                selectPhoneCode(preferred);
            }
        } catch (error) {
            console.warn('Unable to load phone dial codes:', error);
        }
    }

    function resolveFlagUrl(iso2) {
        if (!iso2) {
            return '';
        }
        const normalized = iso2.trim().toLowerCase();
        if (normalized.length !== 2) {
            return '';
        }
        return `https://flagcdn.com/24x18/${normalized}.png`;
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
            state.profilePreview = null;
            state.profileFileName = null;
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'Profile photo must be 5 MB or smaller.');
            event.target.value = '';
            elements.uploadPreview.textContent = '';
            state.profilePreview = null;
            state.profileFileName = null;
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            state.profilePreview = reader.result;
            state.profileFileName = file.name || '';
            elements.uploadPreview.textContent = `${file.name}`;
        };
        reader.onerror = () => {
            showToast('error', 'Unable to preview the selected photo.');
            state.profilePreview = null;
            state.profileFileName = null;
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
    const dialCode = state.selectedDialCode || '+966';
    const phone = normalizePhone(dialCode, phoneRaw);

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
            showToast('error', 'Enter a valid mobile number.');
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
            phone,
            dialCode,
            countryIso2: state.selectedCountryIso2
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
        const photoFileName = state.profileFileName || (photoFile && photoFile.name ? photoFile.name : '');

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

        const fullName = `${firstName} ${lastName}`.trim() || state.basicInfo.userName;
        const rawReferralCode = typeof state.basicInfo.invitationCode === 'string'
            ? state.basicInfo.invitationCode.trim()
            : '';
        const normalizedReferralCode = isInviteCodeFormatValid(rawReferralCode)
            ? normalizeInviteCodeValue(rawReferralCode)
            : '';
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
        const sanitizedPhotoDataUrl = typeof photoDataUrl === 'string' ? photoDataUrl.trim() : '';
        const sanitizedPhotoFileName = typeof photoFileName === 'string' ? photoFileName.trim() : '';

        const now = new Date();
        const nowIso = now.toISOString();
    const accounts = loadIndividualAccounts();
    const invitationOwnerMatch = normalizedReferralCode ? findInvitationOwnerEntry(normalizedReferralCode, accounts) : null;
    const invitationOwner = invitationOwnerMatch ? invitationOwnerMatch.account : null;
        const newId = createNextAccountId(accounts);
        const notes = `Self-registration submitted on ${now.toLocaleDateString()} (${country}, ${city}).`;

        const pendingSupport = {
            id: `support-${newId}-review`,
            reason: 'Identity verification pending for new self-registration.',
            requestedAt: nowIso,
            expiresAt: null,
            status: 'pending'
        };

        const accountAddress = {
            country,
            region,
            city: city || 'Riyadh',
            district,
            streetName: street,
            street,
            zipCode: zip
        };

        const normalizedAccount = normalizeIndividualAccountPayload({
            id: newId,
            fullName,
            firstName,
            lastName,
            gender,
            dateOfBirth: dob,
            username: state.basicInfo.userName,
            email: state.basicInfo.email,
            mobile: state.basicInfo.phone,
            city: city || 'Riyadh',
            status: 'active',
            balance: 0,
            adsCount: 0,
            pendingAds: 0,
            createdAt: nowIso,
            lastActiveAt: null,
            permissions: { autoPosting: false, manualReview: true },
            subscriptions: [],
            financialHistory: [],
            supportRequests: [pendingSupport],
            notes,
            address: accountAddress,
            profilePicture: sanitizedPhotoDataUrl,
            photoDataUrl: sanitizedPhotoDataUrl,
            photoFileName: sanitizedPhotoFileName
        }, accounts.length, { ensurePoints: false });

        const existingInviteCodes = collectExistingInviteCodesFromAccounts(accounts);
        mergeInviteCodesFromSignupRecords(existingInviteCodes);
        if (normalizedReferralCode) {
            existingInviteCodes.add(normalizedReferralCode);
        }
        const generatedInviteCode = ensureUniqueInviteCode({
            existingCodes: existingInviteCodes,
            seed: `${newId}|${normalizedAccount.email}|${nowIso}`,
            length: INVITE_CODE_LENGTH
        });

        applyInviteCodeToAccount(normalizedAccount, generatedInviteCode, nowIso);
    ensureIndividualAccountPoints(normalizedAccount);

        accounts.push(normalizedAccount);
        let referralRewardDetails = null;
        if (invitationOwner && invitationOwner.id !== normalizedAccount.id && normalizedReferralCode) {
            const canonicalInviteCode = resolveAccountInvitationCode(invitationOwner) || rawReferralCode;
            referralRewardDetails = awardInvitationOwner({
                ownerAccount: invitationOwner,
                invitationCode: canonicalInviteCode,
                rewardPoints: INVITE_REWARD_POINTS,
                timestamp: nowIso,
                newAccountId: normalizedAccount.id,
                newAccountName: fullName
            });
            if (invitationOwnerMatch && Number.isInteger(invitationOwnerMatch.index) && invitationOwnerMatch.index >= 0) {
                accounts[invitationOwnerMatch.index] = invitationOwner;
            }
        }
        const signupInvitationCode = referralRewardDetails?.invitationCode || rawReferralCode;
        saveIndividualAccounts(accounts);

        appendSignupRecord({
            accountId: normalizedAccount.id,
            userName: state.basicInfo.userName,
            email: normalizedAccount.email,
            phone: normalizedAccount.mobile,
            invitationCode: signupInvitationCode,
            passwordHash: hashPassword(state.basicInfo.password),
            submittedAt: nowIso,
            profile: {
                fullName,
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
                photoDataUrl: sanitizedPhotoDataUrl,
                profilePhoto: sanitizedPhotoDataUrl,
                photoFileName: sanitizedPhotoFileName,
                inviteCode: isInviteCodeFormatValid(generatedInviteCode) ? generatedInviteCode : null
            },
            referralReward: referralRewardDetails ? {
                invitationCode: referralRewardDetails.invitationCode,
                points: referralRewardDetails.delta,
                creditedAccountId: referralRewardDetails.ownerAccountId,
                creditedAt: referralRewardDetails.timestamp
            } : null,
            generatedInviteCode: isInviteCodeFormatValid(generatedInviteCode) ? generatedInviteCode : null
        });

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
        state.profileFileName = null;
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

    function collectExistingInviteCodesFromAccounts(accounts) {
        const codes = new Set();
        if (!Array.isArray(accounts)) {
            return codes;
        }
        accounts.forEach(account => {
            const candidates = getAccountInviteCandidates(account);
            candidates.forEach(value => {
                if (!isInviteCodeFormatValid(value)) {
                    return;
                }
                const normalized = normalizeInviteCodeValue(value);
                if (normalized) {
                    codes.add(normalized);
                }
            });
        });
        return codes;
    }

    function mergeInviteCodesFromSignupRecords(existingCodes) {
        if (!(existingCodes instanceof Set)) {
            return;
        }
        const records = loadSignupRecords();
        records.forEach(record => {
            const candidates = getSignupInviteCandidates(record);
            candidates.forEach(value => {
                if (!isInviteCodeFormatValid(value)) {
                    return;
                }
                const normalized = normalizeInviteCodeValue(value);
                if (normalized) {
                    existingCodes.add(normalized);
                }
            });
        });
    }

    function getAccountInviteCandidates(account) {
        if (!account || typeof account !== 'object') {
            return [];
        }
        const candidates = [];
        if (typeof account.invitationCode === 'string') {
            candidates.push(account.invitationCode);
        }
        if (account.invitation && typeof account.invitation === 'object') {
            if (typeof account.invitation.code === 'string') {
                candidates.push(account.invitation.code);
            }
            if (typeof account.invitation.token === 'string') {
                candidates.push(account.invitation.token);
            }
        }
        if (account.profile && typeof account.profile === 'object') {
            if (typeof account.profile.inviteCode === 'string') {
                candidates.push(account.profile.inviteCode);
            }
        }
        if (Array.isArray(account.pointsHistory)) {
            account.pointsHistory.forEach(entry => {
                if (entry && typeof entry === 'object' && typeof entry.invitationCode === 'string') {
                    candidates.push(entry.invitationCode);
                }
            });
        }
        return candidates;
    }

    function getSignupInviteCandidates(record) {
        if (!record || typeof record !== 'object') {
            return [];
        }
        const candidates = [];
        if (typeof record.invitationCode === 'string') {
            candidates.push(record.invitationCode);
        }
        if (typeof record.generatedInviteCode === 'string') {
            candidates.push(record.generatedInviteCode);
        }
        if (record.invitation && typeof record.invitation === 'object') {
            if (typeof record.invitation.code === 'string') {
                candidates.push(record.invitation.code);
            }
        }
        if (record.profile && typeof record.profile === 'object') {
            if (typeof record.profile.inviteCode === 'string') {
                candidates.push(record.profile.inviteCode);
            }
        }
        return candidates;
    }

    function loadSignupRecords() {
        try {
            const raw = localStorage.getItem(SIGNUP_RECORDS_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Unable to load signup records', error);
            return [];
        }
    }

    function ensureUniqueInviteCode({ existingCodes, seed, length }) {
        const codes = existingCodes instanceof Set ? existingCodes : new Set();
        const requiredLength = Math.max(length || INVITE_CODE_LENGTH, 6);
        for (let attempt = 0; attempt < 160; attempt += 1) {
            const candidate = createInviteCodeCandidate(requiredLength);
            if (!isInviteCodeFormatValid(candidate)) {
                continue;
            }
            const normalized = candidate.toLowerCase();
            if (!codes.has(normalized)) {
                codes.add(normalized);
                return candidate;
            }
        }
        for (let attempt = 0; attempt < 160; attempt += 1) {
            const candidate = buildInviteCodeFromSeed(`${seed}|${attempt}`, requiredLength);
            if (!isInviteCodeFormatValid(candidate)) {
                continue;
            }
            const normalized = candidate.toLowerCase();
            if (!codes.has(normalized)) {
                codes.add(normalized);
                return candidate;
            }
        }
        return buildFallbackInviteCode(requiredLength, codes);
    }

    function buildFallbackInviteCode(length, existingCodes) {
        const codes = existingCodes instanceof Set ? existingCodes : new Set();
        const baseLength = Math.max(length || INVITE_CODE_LENGTH, 6);
        for (let attempt = 0; attempt < 240; attempt += 1) {
            const candidate = buildInviteCodeFromSeed(`fallback|${Date.now()}|${Math.random()}|${attempt}`, baseLength);
            if (!isInviteCodeFormatValid(candidate)) {
                continue;
            }
            const normalized = candidate.toLowerCase();
            if (!codes.has(normalized)) {
                codes.add(normalized);
                return candidate;
            }
        }
        const emergencySeed = `ONRUF${Date.now()}${Math.random()}`.replace(/[^A-Za-z0-9]/g, '');
        let fallback = `${emergencySeed}Aa0`;
        if (fallback.length < baseLength) {
            fallback = `${fallback}${'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'}`;
        }
        fallback = fallback.slice(0, baseLength);
        if (!isInviteCodeFormatValid(fallback)) {
            fallback = `${fallback}Aa0`.slice(0, baseLength);
        }
        codes.add(fallback.toLowerCase());
        return fallback;
    }

    function findInvitationOwnerEntry(invitationCode, accounts) {
        const normalizedCode = normalizeInviteCodeValue(invitationCode);
        if (!normalizedCode) {
            return null;
        }
        const list = Array.isArray(accounts) ? accounts : [];
        for (let index = 0; index < list.length; index += 1) {
            const account = list[index];
            if (!account || typeof account !== 'object') {
                continue;
            }
            const candidates = getAccountInviteCandidates(account);
            const hasMatch = candidates.some(candidate => {
                if (!isInviteCodeFormatValid(candidate)) {
                    return false;
                }
                return normalizeInviteCodeValue(candidate) === normalizedCode;
            });
            if (hasMatch) {
                return { account, index };
            }
        }

        const signupRecords = loadSignupRecords();
        for (const record of signupRecords) {
            const candidates = getSignupInviteCandidates(record);
            const recordHasMatch = candidates.some(candidate => {
                if (!isInviteCodeFormatValid(candidate)) {
                    return false;
                }
                return normalizeInviteCodeValue(candidate) === normalizedCode;
            });
            if (!recordHasMatch) {
                continue;
            }
            const matchId = typeof record.accountId === 'string' ? record.accountId.trim() : '';
            const matchEmail = normalizeEmail(record.email);
            const indexById = matchId ? list.findIndex(entry => entry && entry.id === matchId) : -1;
            if (indexById >= 0) {
                return { account: list[indexById], index: indexById };
            }
            if (matchEmail) {
                const indexByEmail = list.findIndex(entry => normalizeEmail(entry?.email) === matchEmail);
                if (indexByEmail >= 0) {
                    return { account: list[indexByEmail], index: indexByEmail };
                }
            }
        }

        return null;
    }

    function normalizeInviteCodeValue(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }
        return trimmed.toLowerCase();
    }

    function applyInviteCodeToAccount(account, inviteCode, issuedAt) {
        if (!account || typeof account !== 'object') {
            return;
        }
        const normalizedCode = typeof inviteCode === 'string' ? inviteCode.trim() : '';
        if (!isInviteCodeFormatValid(normalizedCode)) {
            return;
        }
        const issuedAtIso = normalizeIsoTimestamp(issuedAt, new Date().toISOString());
        account.invitationCode = normalizedCode;
        const invitationPayload = account.invitation && typeof account.invitation === 'object'
            ? { ...account.invitation }
            : {};
        invitationPayload.code = normalizedCode;
        invitationPayload.token = invitationPayload.token || normalizedCode;
        if (issuedAtIso) {
            invitationPayload.issuedAt = issuedAtIso;
        }
        invitationPayload.issuedBy = invitationPayload.issuedBy || 'self-signup';
        account.invitation = invitationPayload;
        if (!account.profile || typeof account.profile !== 'object') {
            account.profile = {};
        }
        account.profile.inviteCode = normalizedCode;
    }

    function resolveAccountInvitationCode(account) {
        if (!account || typeof account !== 'object') {
            return '';
        }
        const candidates = [];
        if (typeof account.invitationCode === 'string' && account.invitationCode.trim()) {
            candidates.push(account.invitationCode.trim());
        }
        if (account.invitation && typeof account.invitation === 'object') {
            if (typeof account.invitation.code === 'string' && account.invitation.code.trim()) {
                candidates.push(account.invitation.code.trim());
            }
            if (typeof account.invitation.token === 'string' && account.invitation.token.trim()) {
                candidates.push(account.invitation.token.trim());
            }
        }
        return candidates.find(Boolean) || '';
    }

    function awardInvitationOwner({ ownerAccount, invitationCode, rewardPoints, timestamp, newAccountId, newAccountName }) {
        if (!ownerAccount || typeof ownerAccount !== 'object') {
            return null;
        }
        const normalizedCode = typeof invitationCode === 'string' ? invitationCode.trim() : '';
        if (!normalizedCode) {
            return null;
        }
        const rewardValue = Number.isFinite(rewardPoints) ? Number(rewardPoints) : INVITE_REWARD_POINTS;
        const currentBalance = Number.isFinite(ownerAccount.pointsBalance) ? Number(ownerAccount.pointsBalance) : 0;
        const updatedBalance = currentBalance + rewardValue;

        ownerAccount.pointsBalance = updatedBalance;
        ownerAccount.pointsUpdatedAt = timestamp;

        if (!ownerAccount.pointsHistory || !Array.isArray(ownerAccount.pointsHistory)) {
            ownerAccount.pointsHistory = [];
        }

        const historyEntry = {
            id: buildPointsHistoryEntryId(ownerAccount),
            label: newAccountName ? `Referral reward: ${newAccountName}` : 'Referral reward',
            delta: rewardValue,
            timestamp,
            balanceAfter: updatedBalance,
            invitationCode: normalizedCode,
            sourceAccountId: newAccountId
        };

        ownerAccount.pointsHistory = [historyEntry, ...ownerAccount.pointsHistory].slice(0, 25);

        if (!ownerAccount.invitation || typeof ownerAccount.invitation !== 'object') {
            ownerAccount.invitation = { code: normalizedCode, token: normalizedCode };
        } else {
            if (!ownerAccount.invitation.code) {
                ownerAccount.invitation.code = normalizedCode;
            }
            if (!ownerAccount.invitation.token) {
                ownerAccount.invitation.token = normalizedCode;
            }
        }
        if (!ownerAccount.invitationCode) {
            ownerAccount.invitationCode = normalizedCode;
        }

        return {
            ownerAccountId: ownerAccount.id,
            invitationCode: normalizedCode,
            delta: rewardValue,
            timestamp,
            historyEntryId: historyEntry.id
        };
    }

    function buildPointsHistoryEntryId(ownerAccount) {
        const prefix = ownerAccount && typeof ownerAccount.id === 'string' && ownerAccount.id.trim()
            ? ownerAccount.id.trim()
            : 'IND';
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        return `${prefix}-points-${Date.now()}-${randomSuffix}`;
    }

    function createInviteCodeCandidate(length) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const allChars = `${uppercase}${lowercase}${digits}`;
        const pools = [uppercase, lowercase, digits];
        const requiredLength = Math.max(length || INVITE_CODE_LENGTH, 6);

        const getRandomIndex = max => {
            if (max <= 0) {
                return 0;
            }
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                const array = new Uint32Array(1);
                crypto.getRandomValues(array);
                return array[0] % max;
            }
            return Math.floor(Math.random() * max);
        };

        const chars = pools.map(pool => pool.charAt(getRandomIndex(pool.length)));
        while (chars.length < requiredLength) {
            chars.push(allChars.charAt(getRandomIndex(allChars.length)));
        }
        for (let index = chars.length - 1; index > 0; index -= 1) {
            const swapIndex = getRandomIndex(index + 1);
            const temp = chars[index];
            chars[index] = chars[swapIndex];
            chars[swapIndex] = temp;
        }
        return chars.join('').slice(0, requiredLength);
    }

    function buildInviteCodeFromSeed(seed, length) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const digits = '0123456789';
        const allChars = `${uppercase}${lowercase}${digits}`;
        const chars = [];
        let hash = Math.abs(hashString(seed || '')) || 1;

        const pullChar = (pool, modifier) => {
            hash = (hash * 1664525 + modifier) >>> 0;
            return pool.charAt(hash % pool.length);
        };

        chars.push(pullChar(uppercase, 1013904223));
        chars.push(pullChar(lowercase, 1103515245));
        chars.push(pullChar(digits, 12345));

        while (chars.length < length) {
            hash = (hash * 22695477 + 1) >>> 0;
            chars.push(allChars.charAt(hash % allChars.length));
        }

        for (let index = chars.length - 1; index > 0; index -= 1) {
            hash = (hash * 134775813 + 1) >>> 0;
            const swapIndex = hash % (index + 1);
            const temp = chars[index];
            chars[index] = chars[swapIndex];
            chars[swapIndex] = temp;
        }

        return chars.join('').slice(0, length);
    }

    function isInviteCodeFormatValid(value) {
        if (typeof value !== 'string') {
            return false;
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return false;
        }
        if (trimmed.length < 6) {
            return false;
        }
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]+$/.test(trimmed);
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

    function normalizeIndividualAccountPayload(account, index, options) {
        const normalizationOptions = options && typeof options === 'object' ? options : {};
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
        const rawStatus = typeof account.status === 'string' && account.status.trim()
            ? account.status.trim().toLowerCase()
            : 'active';
    const activeStatuses = new Set(['active', 'activated', 'approved', 'verified', 'pending']);
    const inactiveStatuses = new Set(['inactive', 'frozen', 'deleted', 'suspended', 'blocked', 'disabled', 'deactivated']);
        const status = inactiveStatuses.has(rawStatus)
            ? 'inactive'
            : activeStatuses.has(rawStatus)
                ? 'active'
                : rawStatus
                    ? 'inactive'
                    : 'active';
        const balance = Number.isFinite(account.balance) ? Number(account.balance) : 0;
        const adsCount = Number.isFinite(account.adsCount) ? Math.max(0, Math.floor(account.adsCount)) : 0;
        const pendingAds = Number.isFinite(account.pendingAds) ? Math.max(0, Math.floor(account.pendingAds)) : 0;
        const rawCreatedAt = account.createdAt;
        const createdAt = normalizeIsoTimestamp(rawCreatedAt, new Date().toISOString());
        const rawLastActiveAt = account.lastActiveAt;
        let lastActiveAt = normalizeIsoTimestamp(rawLastActiveAt, null);
        const hasExplicitLastActive = Object.prototype.hasOwnProperty.call(account, 'lastActiveAt');
        const creationTime = createdAt ? Date.parse(createdAt) : NaN;
        const lastActiveTime = lastActiveAt ? Date.parse(lastActiveAt) : NaN;
        const matchesCreation = hasExplicitLastActive
            && typeof rawLastActiveAt === 'string'
            && typeof rawCreatedAt === 'string'
            && rawLastActiveAt.trim()
            && rawCreatedAt.trim()
            && rawLastActiveAt.trim() === rawCreatedAt.trim();
        const timestampsNearlyEqual = !Number.isNaN(creationTime)
            && !Number.isNaN(lastActiveTime)
            && Math.abs(lastActiveTime - creationTime) <= 1000;
        if (matchesCreation && timestampsNearlyEqual) {
            // Ignore creation-time defaults so "Last Login" stays empty until a real session occurs.
            lastActiveAt = null;
        }
        const permissionsSource = account.permissions && typeof account.permissions === 'object' ? account.permissions : {};
        const permissions = {
            autoPosting: Boolean(permissionsSource.autoPosting),
            manualReview: Boolean(permissionsSource.manualReview)
        };
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const fallbackFirstName = nameParts[0] || '';
        const fallbackLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        const firstName = typeof account.firstName === 'string' && account.firstName.trim() ? account.firstName.trim() : fallbackFirstName;
        const lastName = typeof account.lastName === 'string' && account.lastName.trim() ? account.lastName.trim() : fallbackLastName;
        const gender = typeof account.gender === 'string' && account.gender.trim() ? account.gender.trim() : '';
        const dateOfBirth = normalizeIsoTimestamp(account.dateOfBirth, null);
        const username = typeof account.username === 'string' && account.username.trim()
            ? account.username.trim()
            : typeof account.userName === 'string' && account.userName.trim()
                ? account.userName.trim()
                : '';
        const addressSource = account.address && typeof account.address === 'object' ? account.address : {};
        const address = {
            country: typeof addressSource.country === 'string' && addressSource.country.trim() ? addressSource.country.trim() : '',
            region: typeof addressSource.region === 'string' && addressSource.region.trim() ? addressSource.region.trim() : '',
            city: typeof addressSource.city === 'string' && addressSource.city.trim() ? addressSource.city.trim() : city,
            district: typeof addressSource.district === 'string' && addressSource.district.trim() ? addressSource.district.trim() : '',
            streetNumber: typeof addressSource.streetNumber === 'string' && addressSource.streetNumber.trim()
                ? addressSource.streetNumber.trim()
                : typeof addressSource.streetNo === 'string' && addressSource.streetNo.trim()
                    ? addressSource.streetNo.trim()
                    : '',
            streetName: typeof addressSource.streetName === 'string' && addressSource.streetName.trim() ? addressSource.streetName.trim() : '',
            zipCode: typeof addressSource.zipCode === 'string' && addressSource.zipCode.trim()
                ? addressSource.zipCode.trim()
                : typeof addressSource.postalCode === 'string' && addressSource.postalCode.trim()
                    ? addressSource.postalCode.trim()
                    : ''
        };
        const photoDataUrl = typeof account.photoDataUrl === 'string' && account.photoDataUrl.trim() ? account.photoDataUrl.trim() : '';
        const photoFileName = typeof account.photoFileName === 'string' && account.photoFileName.trim() ? account.photoFileName.trim() : '';
        const profilePicture = typeof account.profilePicture === 'string' && account.profilePicture.trim()
            ? account.profilePicture.trim()
            : photoDataUrl
                ? photoDataUrl
                : '';
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
        const invitationSource = account.invitation && typeof account.invitation === 'object' ? account.invitation : null;
        const invitationCodeCandidate = typeof account.invitationCode === 'string' && account.invitationCode.trim() ? account.invitationCode.trim() : '';
        const invitationPayload = {};
        if (invitationSource) {
            if (typeof invitationSource.code === 'string' && invitationSource.code.trim()) {
                invitationPayload.code = invitationSource.code.trim();
            }
            if (typeof invitationSource.token === 'string' && invitationSource.token.trim()) {
                invitationPayload.token = invitationSource.token.trim();
            }
            if (invitationSource.issuedAt) {
                const issuedAt = normalizeIsoTimestamp(invitationSource.issuedAt, null);
                if (issuedAt) {
                    invitationPayload.issuedAt = issuedAt;
                }
            }
            if (typeof invitationSource.issuedBy === 'string' && invitationSource.issuedBy.trim()) {
                invitationPayload.issuedBy = invitationSource.issuedBy.trim();
            }
        }
        if (invitationCodeCandidate && !invitationPayload.code) {
            invitationPayload.code = invitationCodeCandidate;
        }
        if (invitationPayload.code && !invitationPayload.token) {
            invitationPayload.token = invitationPayload.code;
        }
        const invitation = Object.keys(invitationPayload).length ? invitationPayload : null;
        const invitationCode = invitation?.code || invitation?.token || invitationCodeCandidate || '';
        const pointsBalanceCandidate = Number.parseFloat(account.pointsBalance);
        const pointsBalance = Number.isFinite(pointsBalanceCandidate) ? Number(pointsBalanceCandidate) : 0;
        const pointsUpdatedAt = normalizeIsoTimestamp(account.pointsUpdatedAt, lastActiveAt || createdAt);
        const pointsHistorySource = Array.isArray(account.pointsHistory) ? account.pointsHistory : [];
        const pointsHistory = pointsHistorySource.map((entry, entryIndex) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            const historyId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `points-${id}-${entryIndex}`;
            const label = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : 'Points adjustment';
            const deltaValue = Number.parseFloat(entry.delta ?? entry.amount ?? 0) || 0;
            const timestamp = normalizeIsoTimestamp(entry.timestamp || entry.date || entry.recordedAt, pointsUpdatedAt || createdAt);
            const balanceAfterCandidate = Number.parseFloat(entry.balanceAfter ?? entry.balance);
            const balanceAfter = Number.isFinite(balanceAfterCandidate) ? balanceAfterCandidate : pointsBalance + deltaValue;
            const invitationReference = typeof entry.invitationCode === 'string' && entry.invitationCode.trim()
                ? entry.invitationCode.trim()
                : invitationCode || '';
            const sourceAccountId = typeof entry.sourceAccountId === 'string' && entry.sourceAccountId.trim()
                ? entry.sourceAccountId.trim()
                : undefined;
            const sanitized = {
                id: historyId,
                label,
                delta: deltaValue,
                timestamp,
                balanceAfter
            };
            if (invitationReference) {
                sanitized.invitationCode = invitationReference;
            }
            if (sourceAccountId) {
                sanitized.sourceAccountId = sourceAccountId;
            }
            return sanitized;
        }).filter(Boolean).slice(0, 50);
        const marketplaceActivitySource = account.marketplaceActivity && typeof account.marketplaceActivity === 'object'
            ? account.marketplaceActivity
            : {};
        const marketplaceActivity = {
            purchases: Array.isArray(marketplaceActivitySource.purchases) ? marketplaceActivitySource.purchases.filter(Boolean) : [],
            sales: Array.isArray(marketplaceActivitySource.sales) ? marketplaceActivitySource.sales.filter(Boolean) : [],
            productAds: Array.isArray(marketplaceActivitySource.productAds) ? marketplaceActivitySource.productAds.filter(Boolean) : [],
            followUps: marketplaceActivitySource.followUps && typeof marketplaceActivitySource.followUps === 'object'
                ? { ...marketplaceActivitySource.followUps }
                : {},
            sellerRatings: Array.isArray(marketplaceActivitySource.sellerRatings)
                ? marketplaceActivitySource.sellerRatings.filter(Boolean)
                : Array.isArray(account.sellerRatings) ? account.sellerRatings.filter(Boolean) : [],
            buyerRatings: Array.isArray(marketplaceActivitySource.buyerRatings)
                ? marketplaceActivitySource.buyerRatings.filter(Boolean)
                : Array.isArray(account.buyerRatings) ? account.buyerRatings.filter(Boolean) : [],
            savedAddresses: Array.isArray(marketplaceActivitySource.savedAddresses) ? marketplaceActivitySource.savedAddresses.filter(Boolean) : []
        };
        const notes = typeof account.notes === 'string' ? account.notes.trim() : '';
        const normalizedAccount = {
            id,
            fullName,
            firstName,
            lastName,
            gender,
            dateOfBirth,
            email,
            mobile,
            city,
            address,
            status,
            balance,
            adsCount,
            pendingAds,
            createdAt,
            lastActiveAt,
            username,
            permissions,
            marketplaceActivity,
            subscriptions,
            financialHistory,
            supportRequests,
            notes,
            invitationCode: invitationCode || null,
            invitation,
            savedAddresses: Array.isArray(account.savedAddresses) ? account.savedAddresses.filter(Boolean) : [],
            paymentCards: Array.isArray(account.paymentCards) ? account.paymentCards.filter(Boolean) : [],
            pointsBalance,
            pointsUpdatedAt,
            pointsHistory,
            profilePicture,
            photoDataUrl,
            photoFileName
        };
        if (normalizationOptions.ensurePoints !== false) {
            ensureIndividualAccountPoints(normalizedAccount);
        }
        ensureIndividualAccountRatings(normalizedAccount);
        ensureIndividualAccountPaymentCards(normalizedAccount);
        ensureIndividualAccountSavedAddresses(normalizedAccount);
        return normalizedAccount;
    }

    function normalizeExpiryMonth(value) {
        if (Number.isFinite(value)) {
            return String(Math.trunc(value)).padStart(2, '0').slice(-2);
        }
        if (typeof value === 'string') {
            const digits = value.replace(/[^0-9]/g, '');
            if (!digits) {
                return '';
            }
            return digits.padStart(2, '0').slice(-2);
        }
        return '';
    }

    function normalizeExpiryYear(value) {
        if (Number.isFinite(value)) {
            const year = Math.trunc(value);
            if (year < 100) {
                return String(2000 + year);
            }
            return String(year);
        }
        if (typeof value === 'string') {
            const digits = value.replace(/[^0-9]/g, '');
            if (!digits) {
                return '';
            }
            if (digits.length === 2) {
                return String(2000 + Number.parseInt(digits, 10));
            }
            return digits.padStart(4, '0').slice(-4);
        }
        return '';
    }

    function generateFallbackPhone(rng) {
        const next = typeof rng === 'function' ? rng : Math.random;
        let number = '05';
        for (let index = 0; index < 8; index += 1) {
            number += Math.floor(next() * 10);
        }
        return number;
    }

    function buildNameFromEmail(email) {
        if (!email || typeof email !== 'string') {
            return '';
        }
        const normalized = email.split('@')[0].replace(/[^a-z0-9]+/gi, ' ').trim();
        if (!normalized) {
            return '';
        }
        return normalized
            .split(/\s+/)
            .map(piece => piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase())
            .join(' ');
    }

    function titleCase(value) {
        if (!value) {
            return '';
        }
        return String(value)
            .split(/\s+/)
            .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
            .join(' ');
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
        const rawPrefix = typeof prefix === 'string' ? prefix.trim() : '';
        const sanitizedPrefixDigits = rawPrefix.replace(/[^0-9+]/g, '');
        const safePrefix = sanitizedPrefixDigits.startsWith('+')
            ? sanitizedPrefixDigits
            : sanitizedPrefixDigits
                ? `+${sanitizedPrefixDigits.replace(/[^0-9]/g, '')}`
                : '+';
        const digits = (value || '').replace(/\D/g, '');
        if (!digits) {
            return '';
        }
        const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
        if (normalized.length < 8) {
            return '';
        }
        return `${safePrefix}${normalized}`;
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
