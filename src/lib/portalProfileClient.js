let portalProfileCache = undefined;
let portalProfileRequestPromise = null;

function canUseBrowser() {
    return typeof window !== "undefined";
}

export function hasResolvedPortalProfileCache() {
    return portalProfileCache !== undefined;
}

export function getCachedPortalProfilePayload() {
    return portalProfileCache ?? null;
}

export function primePortalProfileCache(payload) {
    portalProfileCache = payload || null;
    return portalProfileCache;
}

export function invalidatePortalProfileCache() {
    portalProfileCache = undefined;
    portalProfileRequestPromise = null;
}

export async function fetchPortalProfileClient({ force = false } = {}) {
    if (!canUseBrowser()) {
        return null;
    }

    if (!force && portalProfileCache !== undefined) {
        return portalProfileCache;
    }

    if (!force && portalProfileRequestPromise) {
        return portalProfileRequestPromise;
    }

    portalProfileRequestPromise = fetch("/api/profile/info", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    })
        .then(async (response) => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    portalProfileCache = null;
                    return null;
                }

                const error = new Error(payload?.error || "Не удалось загрузить профиль портала.");
                error.status = response.status;
                error.payload = payload;
                throw error;
            }

            portalProfileCache = payload;
            return payload;
        })
        .finally(() => {
            portalProfileRequestPromise = null;
        });

    return portalProfileRequestPromise;
}
