export default async function LogoutHandler(req, res) {
    // Проверяем метод запроса
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    console.log('Logout API called - clearing all cookies');

    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Нативный способ без зависимостей:
    // Удаляем все возможные варианты куки авторизации
    res.setHeader(
        "Set-Cookie",
        [
            "users_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            "userData=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict",
            "role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
            "learn=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
            "organization=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
        ]
    );

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
}
