export default async function ProfileInfoHandler(req, res) {
    try {
        // Пытаемся найти токен в разных местах: разные имена кук или заголовок
        const cookieToken = req.cookies.users_access_token || req.cookies.access_token || req.cookies.token;
        const authHeader = req.headers.authorization;

        // Логируем наличие токена (не сам токен для безопасности)
        console.log("Profile API: Cookie Token present:", !!cookieToken);
        console.log("Profile API: Auth Header present:", !!authHeader);

        if (!cookieToken && !authHeader) {
            return res.status(401).json({ success: false, error: "No token provided" });
        }

        // Формируем заголовки для запроса к бэку
        const headers = {
            "Content-Type": "application/json",
            // Всегда прокидываем все куки, так как бэк может зависеть от них
            Cookie: req.headers.cookie || "",
        };

        // Если есть токен в куках, добавляем его как Bearer (приоритет у куки, если нет заголовка)
        if (cookieToken) {
            headers["Authorization"] = `Bearer ${cookieToken}`;
        }

        // Если пришел явный заголовок Authorization, используем его (перезаписываем, если нужно)
        if (authHeader) {
            headers["Authorization"] = authHeader;
        }

        // Получаем основную инфу профиля
        const response_info = await fetch("https://api.rosdk.ru/users/profile_interaction/get_my_profile/", {
            method: "GET",
            headers: headers,
        });

        if (!response_info.ok) {
            console.error("Profile API: Backend error:", response_info.status);
            return res.status(response_info.status).json({
                success: false,
                error: "Failed to fetch profile from backend",
            });
        }

        const data = await response_info.json();
        return res.json({ success: true, data });
    } catch (err) {
        console.error("Profile API: Internal error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
