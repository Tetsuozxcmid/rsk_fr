export default async function ProfileInfoHandler(req, res) {
    try {
        const cookieToken = req.cookies.users_access_token || req.cookies.access_token || req.cookies.token;
        const authHeader = req.headers.authorization;

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
        return res.json({ success: true, data });
    } catch (err) {
        console.error("Profile API: Internal error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
