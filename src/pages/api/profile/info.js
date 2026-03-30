import { readLocalProfileMock, shouldUseLocalProfileMock } from "@/lib/localProfileMock";

function decodeJwtPayload(token) {
    try {
        const [, payload = ""] = String(token || "").split(".");
        if (!payload) return null;

        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
        return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

export default async function ProfileInfoHandler(req, res) {
    try {
        if (shouldUseLocalProfileMock(req, { fallbackWhenAuthMissing: true })) {
            const localProfile = await readLocalProfileMock();
            return res.status(200).json({
                success: true,
                data: localProfile.data,
                userId: localProfile.userId,
                isMock: true,
            });
        }

        const cookieToken = req.cookies.users_access_token || req.cookies.access_token || req.cookies.token;
        const authHeader = req.headers.authorization;

        console.log("Profile API: Cookie Token present:", !!cookieToken);
        console.log("Profile API: Auth Header present:", !!authHeader);

        if (!cookieToken && !authHeader) {
            return res.status(401).json({ success: false, error: "No token provided" });
        }

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

        const responseInfo = await fetch("https://api.rosdk.ru/users/profile_interaction/get_my_profile/", {
            method: "GET",
            headers,
        });

        if (!responseInfo.ok) {
            console.error("Profile API: Backend error:", responseInfo.status);
            return res.status(responseInfo.status).json({
                success: false,
                error: "Failed to fetch profile from backend",
            });
        }

        const data = await responseInfo.json();
        const jwtSource = cookieToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : "");
        const jwtPayload = decodeJwtPayload(jwtSource);
        const userId = jwtPayload?.sub ? String(jwtPayload.sub) : null;

        return res.json({ success: true, data, userId });
    } catch (err) {
        console.error("Profile API: Internal error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
