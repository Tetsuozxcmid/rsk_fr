const COOKIE_NAME = "mayak_admin_auth";
const COOKIE_VALUE = "1";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function parseCookies(cookieHeader = "") {
    return cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, part) => {
            const eqIndex = part.indexOf("=");
            if (eqIndex === -1) return acc;
            const key = part.slice(0, eqIndex);
            const value = decodeURIComponent(part.slice(eqIndex + 1));
            acc[key] = value;
            return acc;
        }, {});
}

export function getMayakAdminPassword() {
    return process.env.MAYAK_ADMIN_PASSWORD || "";
}

export function isMayakAdminConfigured() {
    return Boolean(getMayakAdminPassword());
}

export function isMayakAdminAuthenticated(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    return cookies[COOKIE_NAME] === COOKIE_VALUE;
}

export function setMayakAdminCookie(res) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`);
}

export function clearMayakAdminCookie(res) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function validateMayakAdminPassword(password) {
    const expectedPassword = getMayakAdminPassword();
    if (!expectedPassword) {
        return { ok: false, status: 500, error: "MAYAK_ADMIN_PASSWORD не задан" };
    }
    if (password !== expectedPassword) {
        return { ok: false, status: 403, error: "Неверный пароль" };
    }
    return { ok: true };
}

export function requireMayakAdmin(req, res) {
    if (!isMayakAdminConfigured()) {
        res.status(500).json({ success: false, error: "MAYAK_ADMIN_PASSWORD не задан" });
        return false;
    }
    if (!isMayakAdminAuthenticated(req)) {
        res.status(401).json({ success: false, error: "Требуется авторизация администратора" });
        return false;
    }
    return true;
}
