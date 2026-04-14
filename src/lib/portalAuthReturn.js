const PORTAL_AUTH_RETURN_KEY = "mayak_portal_return_path";

function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setPortalAuthReturnPath(pathname) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(PORTAL_AUTH_RETURN_KEY, String(pathname || "/tools/mayak-oko"));
}

export function getPortalAuthReturnPath() {
    if (!canUseStorage()) return "";
    return window.localStorage.getItem(PORTAL_AUTH_RETURN_KEY) || "";
}

export function consumePortalAuthReturnPath() {
    if (!canUseStorage()) return "";
    const nextPath = window.localStorage.getItem(PORTAL_AUTH_RETURN_KEY) || "";
    if (nextPath) {
        window.localStorage.removeItem(PORTAL_AUTH_RETURN_KEY);
    }
    return nextPath;
}

export function clearPortalAuthReturnPath() {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(PORTAL_AUTH_RETURN_KEY);
}
