export default async function ProfileUpdateHandler(req, res) {
    try {
        const token = req.cookies.users_access_token;
        if (!token) {
            return res.status(401).json({ success: false, error: "No token provided" });
        }

        if (req.method !== "POST") {
            return res.status(405).json({ success: false, error: "Method not allowed" });
        }

        const bodyData = req.body;
        delete bodyData.token;
        const { role, ...profileFields } = bodyData;

        const response = await fetch("https://api.rosdk.ru/users/profile_interaction/update_my_profile/", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Cookie: req.headers.cookie || "",
            },
            body: JSON.stringify(profileFields),
            cache: "no-store",
        });

        // 1. Сначала читаем ответ как текст
        const textData = await response.text();
        let data;

        // 2. Безопасно пытаемся распарсить JSON
        try {
            data = textData ? JSON.parse(textData) : {};
        } catch (e) {
            console.error("Внешний API вернул не JSON:", textData);
            data = { raw_message: textData }; // Сохраняем текст, чтобы понять, что пошло не так
        }

        if (!response.ok) {
            switch (response.status) {
                case 422:
                    return res.status(422).json({ success: false, error: data });
                case 400:
                    return res.status(400).json({ success: false, error: "Неверные данные", details: data });
                case 401:
                    return res.status(401).json({ success: false, error: "Неавторизованный запрос" });
                case 403:
                    return res.status(403).json({ success: false, error: "Доступ запрещён" });
                case 404:
                    return res.status(404).json({ success: false, error: "Ресурс не найден" });
                default:
                    return res.status(response.status).json({ success: false, error: data });
            }
        }

        if (role) {
            const roleResponse = await fetch("https://api.rosdk.ru/users/profile_interaction/my-role", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: `users_access_token=${token}`,
                },
                body: JSON.stringify({ role }),
                cache: "no-store",
            });

            if (!roleResponse.ok) {
                const roleErrorText = await roleResponse.text();
                console.error("Ошибка при обновлении роли:", roleResponse.status, roleErrorText);

                return res.status(roleResponse.status).json({
                    success: false,
                    error: `Профиль обновлен, но ошибка роли (${roleResponse.status}): ${roleErrorText}`,
                });
            }
        }

        return res.json({ success: true, data });
    } catch (err) {
        console.error("Internal API Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
