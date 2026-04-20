function toSafeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizeMayakCertificateNumber(value) {
    const parsed = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getMayakEntryTimestamp(entry) {
    const candidate = entry?.finishedAt || entry?.timestamp || entry?.createdAt || "";
    const parsed = Date.parse(candidate);
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildMayakResultEntryKey(tokenKey, userId) {
    return `${normalizeString(tokenKey)}::${normalizeString(userId)}`;
}

function compareMayakResultEntries(left, right) {
    const leftNumber = normalizeMayakCertificateNumber(left?.entry?.certificateNumber);
    const rightNumber = normalizeMayakCertificateNumber(right?.entry?.certificateNumber);

    if (leftNumber && rightNumber && leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
    }

    const leftTimestamp = getMayakEntryTimestamp(left?.entry);
    const rightTimestamp = getMayakEntryTimestamp(right?.entry);

    if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp - rightTimestamp;
    }

    const tokenDelta = String(left?.tokenKey || "").localeCompare(String(right?.tokenKey || ""), "ru");
    if (tokenDelta !== 0) {
        return tokenDelta;
    }

    return String(left?.userId || "").localeCompare(String(right?.userId || ""), "ru");
}

export function listMayakResultEntries(store) {
    const entries = [];

    Object.entries(toSafeObject(store)).forEach(([tokenKey, users]) => {
        Object.entries(toSafeObject(users)).forEach(([userId, entryValue]) => {
            entries.push({
                tokenKey: normalizeString(tokenKey),
                userId: normalizeString(userId),
                entry: toSafeObject(entryValue),
            });
        });
    });

    return entries;
}

export function getMayakCertificateNumberMap(store) {
    const sortedEntries = listMayakResultEntries(store).sort(compareMayakResultEntries);
    const assignedNumbers = new Map();
    const usedNumbers = new Set();

    sortedEntries.forEach(({ tokenKey, userId, entry }) => {
        const certificateNumber = normalizeMayakCertificateNumber(entry?.certificateNumber);
        if (!certificateNumber) {
            return;
        }

        assignedNumbers.set(buildMayakResultEntryKey(tokenKey, userId), certificateNumber);
        usedNumbers.add(certificateNumber);
    });

    let nextNumber = 1;
    sortedEntries.forEach(({ tokenKey, userId }) => {
        const key = buildMayakResultEntryKey(tokenKey, userId);
        if (assignedNumbers.has(key)) {
            return;
        }

        while (usedNumbers.has(nextNumber)) {
            nextNumber += 1;
        }

        assignedNumbers.set(key, nextNumber);
        usedNumbers.add(nextNumber);
        nextNumber += 1;
    });

    return assignedNumbers;
}

export function getMayakCertificateNumberFromStore(store, { tokenKey, userId }) {
    const safeTokenKey = normalizeString(tokenKey);
    const safeUserId = normalizeString(userId);

    if (!safeTokenKey || !safeUserId) {
        return 0;
    }

    return getMayakCertificateNumberMap(store).get(buildMayakResultEntryKey(safeTokenKey, safeUserId)) || 0;
}

export function getNextMayakCertificateNumber(store) {
    let maxNumber = 0;

    getMayakCertificateNumberMap(store).forEach((value) => {
        if (value > maxNumber) {
            maxNumber = value;
        }
    });

    return maxNumber + 1;
}

export function ensureMayakCertificateNumberInStore(store, { tokenKey, userId }) {
    const safeTokenKey = normalizeString(tokenKey);
    const safeUserId = normalizeString(userId);

    if (!safeTokenKey || !safeUserId) {
        return 0;
    }

    if (!store[safeTokenKey] || typeof store[safeTokenKey] !== "object" || Array.isArray(store[safeTokenKey])) {
        store[safeTokenKey] = {};
    }

    const currentEntry = toSafeObject(store[safeTokenKey][safeUserId]);
    const existingNumber = normalizeMayakCertificateNumber(currentEntry.certificateNumber);

    if (existingNumber) {
        store[safeTokenKey][safeUserId] = {
            ...currentEntry,
            certificateNumber: existingNumber,
        };
        return existingNumber;
    }

    const fallbackNumber = getMayakCertificateNumberMap(store).get(buildMayakResultEntryKey(safeTokenKey, safeUserId)) || getNextMayakCertificateNumber(store);
    store[safeTokenKey][safeUserId] = {
        ...currentEntry,
        certificateNumber: fallbackNumber,
    };
    return fallbackNumber;
}
