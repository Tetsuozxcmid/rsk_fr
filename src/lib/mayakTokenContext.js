import { validateToken } from "@/utils/mayakTokens";
import { validateMayakSessionToken } from "@/lib/mayakSessionTokens";
import { findActiveMayakSessionByTokenId } from "@/lib/mayakSessions";

const DEV_BYPASS_TOKEN = "fffff";

function isLocalMayakBypassEnabled() {
    return String(process.env.MAYAK_ENABLE_SERVER_BYPASS || "").toLowerCase() === "true" || process.env.NODE_ENV !== "production";
}

export function parseActivatedKeyCookie(rawCookieValue) {
    if (!rawCookieValue) return "";

    try {
        const parsed = JSON.parse(rawCookieValue);
        return String(parsed?.text || "").trim();
    } catch {
        return "";
    }
}

export async function resolveMayakTokenContext(tokenValue) {
    const normalizedToken = String(tokenValue || "").trim();
    if (!normalizedToken) {
        return {
            success: false,
            valid: false,
            error: "Token is missing",
        };
    }

    if (normalizedToken === DEV_BYPASS_TOKEN && isLocalMayakBypassEnabled()) {
        return {
            success: true,
            valid: true,
            isBypass: true,
            tokenType: "bypass",
            sessionId: null,
            sessionName: "",
            sectionId: null,
            taskRange: null,
            tableCount: 0,
        };
    }

    const legacyResult = validateToken(normalizedToken);
    if (legacyResult.valid || legacyResult.token) {
        return {
            success: true,
            valid: legacyResult.valid || Boolean(legacyResult.token?.isActive),
            isBypass: false,
            tokenType: "legacy",
            sessionId: null,
            sessionName: "",
            sectionId: legacyResult.token?.sectionId || null,
            taskRange: legacyResult.token?.taskRange || null,
            tableCount: 0,
            token: legacyResult.token || null,
        };
    }

    const sessionResult = await validateMayakSessionToken(normalizedToken);
    if (!sessionResult.valid && !sessionResult.token) {
        return {
            success: false,
            valid: false,
            error: sessionResult.error || "Token is invalid",
        };
    }

    const linkedSession = sessionResult.token?.id ? await findActiveMayakSessionByTokenId(sessionResult.token.id) : null;

    return {
        success: true,
        valid: sessionResult.valid || Boolean(sessionResult.token?.isActive),
        isBypass: false,
        tokenType: "session",
        sessionId: linkedSession?.id || null,
        sessionName: linkedSession?.name || "",
        sectionId: sessionResult.token?.sectionId || linkedSession?.sectionId || null,
        taskRange: sessionResult.token?.taskRange || linkedSession?.taskRange || null,
        tableCount: linkedSession?.tableCount || 0,
        token: sessionResult.token || null,
    };
}
