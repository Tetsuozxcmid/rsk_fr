import { normalizePortalProfile } from "@/lib/portalProfile";

export class PortalProfileRequestError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "PortalProfileRequestError";
        this.status = status;
    }
}

function buildPortalHeaders(req) {
    const cookieToken = req.cookies?.users_access_token || req.cookies?.access_token || req.cookies?.token || "";
    const authHeader = req.headers.authorization || "";
    const headers = {
        "Content-Type": "application/json",
        Cookie: req.headers.cookie || "",
    };

    if (cookieToken) {
        headers.Authorization = `Bearer ${cookieToken}`;
    }
    if (authHeader) {
        headers.Authorization = authHeader;
    }

    return {
        headers,
        hasAuth: Boolean(cookieToken || authHeader),
    };
}

export async function fetchPortalProfileFromRequest(req) {
    const { headers, hasAuth } = buildPortalHeaders(req);

    if (!hasAuth) {
        throw new PortalProfileRequestError("Portal session is required", 401);
    }

    const response = await fetch("https://api.rosdk.ru/users/profile_interaction/get_my_profile/", {
        method: "GET",
        headers,
        cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new PortalProfileRequestError(payload?.detail || payload?.error || "Failed to fetch portal profile", response.status || 500);
    }

    return {
        payload,
        profile: normalizePortalProfile(payload),
    };
}
