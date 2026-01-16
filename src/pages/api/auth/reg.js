export default async function RegHandler(req, res) {
    try {
        const response = await fetch("https://api.rosdk.ru/auth/users_interaction/register/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                password: req.body.password.toString(),
                name: req.body.name.toString(),
                email: req.body.email.toString(),
                role: req.body.role.toString(),
            }),
            cache: "no-store",
        });

        const setCookie = response.headers.get("set-cookie");

        if (setCookie) {
            res.setHeader("Set-Cookie", setCookie);
        }

        const data = await response.json();

        if (!response.ok) {
            switch (response.status) {
                case 422:
                    return res.status(422).json({ 
                        success: false, 
                        error: JSON.stringify(data),
                        errorCode: "VALIDATION_ERROR"
                    });
                case 400:
                    // Проверяем различные типы ошибок 400
                    if (data.error_code === "EMAIL_NOT_CONFIRMED" || data.detail?.includes('email not confirmed')) {
                        return res.status(400).json({ 
                            success: false, 
                            error: "Вы не подтвердили почту",
                            errorCode: "EMAIL_NOT_CONFIRMED"
                        });
                    }
                    if (data.error_code === "USER_EXISTS" || data.detail?.includes('already exists')) {
                        return res.status(400).json({ 
                            success: false, 
                            error: "Пользователь с такой почтой уже существует",
                            errorCode: "USER_EXISTS"
                        });
                    }
                    return res.status(400).json({ 
                        success: false, 
                        error: "Пользователь с таким именем уже существует",
                        errorCode: "BAD_REQUEST"
                    });
                case 401:
                    return res.status(401).json({ 
                        success: false, 
                        error: "Пользователь не найден",
                        errorCode: "UNAUTHORIZED"
                    });
                case 403:
                    return res.status(403).json({ 
                        success: false, 
                        error: "Доступ запрещён",
                        errorCode: "FORBIDDEN"
                    });
                case 404:
                    return res.status(404).json({ 
                        success: false, 
                        error: "Ресурс не найден",
                        errorCode: "NOT_FOUND"
                    });
                default:
                    return res.status(response.status).json({ 
                        success: false, 
                        error: data,
                        errorCode: "UNKNOWN_ERROR"
                    });
            }
        }

        // возвращаем клиенту
        return res.json({ success: true, data });
    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({ 
            success: false, 
            error: "Ошибка сервера. Попробуйте позже",
            errorCode: "SERVER_ERROR"
        });
    }
}