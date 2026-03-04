// /pages/api/auth/logout.js
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        // Прямо обращаемся к ROSDK logout
        const response = await fetch("https://api.rosdk.ru/auth/users_interaction/logout/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                Cookie: req.headers.cookie || "",
            },
            credentials: "include",
        });

        // Получаем тело ответа
        const data = await response.json();
        console.log(data);

        // Отдаём фронту всё как есть
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Rosdk logout error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}
