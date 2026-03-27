export const MAYAK_PORTAL_AUTH_RETURN_PATH = "/tools/mayak-oko";
const MAYAK_PORTAL_AUTH_PENDING_KEY = "mayak_portal_auth_pending";
const MAYAK_PORTAL_PENDING_TOKEN_KEY = "mayak_portal_pending_token";

function isBrowser() {
    return typeof window !== "undefined";
}

export function markMayakPortalAuthPending(payload = {}) {
    if (!isBrowser()) return;

    const nextPayload = {
        returnPath: payload.returnPath || MAYAK_PORTAL_AUTH_RETURN_PATH,
        provider: payload.provider || "",
        createdAt: new Date().toISOString(),
    };

    window.localStorage.setItem(MAYAK_PORTAL_AUTH_PENDING_KEY, JSON.stringify(nextPayload));
}

export function readMayakPortalAuthPending() {
    if (!isBrowser()) return null;

    const rawValue = window.localStorage.getItem(MAYAK_PORTAL_AUTH_PENDING_KEY);
    if (!rawValue) return null;

    try {
        return JSON.parse(rawValue);
    } catch {
        return null;
    }
}

export function clearMayakPortalAuthPending() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(MAYAK_PORTAL_AUTH_PENDING_KEY);
}

export function stashMayakPendingToken(token) {
    if (!isBrowser()) return;

    const nextToken = String(token || "").trim();
    if (!nextToken) {
        window.sessionStorage.removeItem(MAYAK_PORTAL_PENDING_TOKEN_KEY);
        return;
    }

    window.sessionStorage.setItem(MAYAK_PORTAL_PENDING_TOKEN_KEY, nextToken);
}

export function readMayakPendingToken() {
    if (!isBrowser()) return "";
    return window.sessionStorage.getItem(MAYAK_PORTAL_PENDING_TOKEN_KEY) || "";
}

export function clearMayakPendingToken() {
    if (!isBrowser()) return;
    window.sessionStorage.removeItem(MAYAK_PORTAL_PENDING_TOKEN_KEY);
}
