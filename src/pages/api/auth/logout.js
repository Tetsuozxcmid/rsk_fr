export default async function LogoutHandler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    console.log('Local + rosdk logout');

    // 1. ЛОКАЛЬНОЕ удаление (то что у тебя уже работало)
    const localCookies = [
        "users_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        "access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        "refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        "userData=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict",
        "role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
        "learn=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
        "organization=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
    ];

    let remoteSetCookie = null;

    try {
        // 2. Запрос в росдк для удаления их кук (.rosdk.ru)
        const response = await fetch(
            'https://api.rosdk.ru/auth/users_interaction/logout/',
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    cookie: req.headers.cookie || ''
                }
            }
        );

        remoteSetCookie = response.headers.get('set-cookie');

    } catch (e) {
        console.error('Rosdk logout error:', e);
        // не падаем — хотя бы локально разлогиним
    }

    // 3. Склеиваем оба варианта удаления
    const finalCookies = [...localCookies];

    if (remoteSetCookie) {
        finalCookies.push(remoteSetCookie);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Set-Cookie', finalCookies);

    return res.status(200).json({
        success: true,
        message: 'Logged out locally and rosdk'
    });
}
