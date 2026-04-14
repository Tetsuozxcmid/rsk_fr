let portalProfileCache = undefined;
let portalProfileRequestPromise = null;
const PROFILE_NOT_FOUND_ERROR_CODE = "PROFILE_NOT_FOUND";

function canUseBrowser() {
    return typeof window !== "undefined";
}

function createMissingPortalProfilePayload() {
    return {
        success: true,
        data: {
            __portalProfileMissing: true,
        },
    };
}

function isProfileMissingResponse(response, payload) {
    if (Number(response?.status) !== 404) {
        return false;
    }

    if (payload?.errorCode === PROFILE_NOT_FOUND_ERROR_CODE) {
        return true;
    }

    return /profile not found/i.test(String(payload?.error || ""));
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

export function isMissingPortalProfilePayload(payload) {
    return Boolean(payload?.data?.__portalProfileMissing);
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

                if (isProfileMissingResponse(response, payload)) {
                    const missingPayload = createMissingPortalProfilePayload();
                    portalProfileCache = missingPayload;
                    return missingPayload;
                }

                const error = new Error(payload?.error || "Failed to load portal profile.");
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
