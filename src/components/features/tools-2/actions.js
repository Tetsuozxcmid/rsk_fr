// app/actions.js

export async function getKeyFromCookies() {
    const cookieString = document.cookie;
    const cookies = cookieString.split(";").reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = decodeURIComponent(value);
        return acc;
    }, {});

    const keyCookie = cookies["activated_key"];
    if (!keyCookie) return null;

    try {
        return JSON.parse(keyCookie);
    } catch {
        return null;
    }
}

export async function addKeyToCookies(text) {
    const newItem = {
        id: Date.now().toString(),
        text,
    };
    const expires = new Date();
    expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `activated_key=${encodeURIComponent(JSON.stringify(newItem))}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

// !!! ИСПРАВЛЕННАЯ ФУНКЦИЯ !!!
export async function addUserToCookies(userId, text) {
    const newItem = {
        id: userId,
        name: text // <--- ТЕПЕРЬ МЫ СОХРАНЯЕМ ИМЯ!
    };

    const expires = new Date();
    expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
    // Обратите внимание: используем encodeURIComponent, чтобы русские буквы не ломали куки
    document.cookie = `active_user=${encodeURIComponent(JSON.stringify(newItem))}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

export function getUserFromCookies() {
    const cookieString = document.cookie;
    const cookies = cookieString.split(";").reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        // Важно: декодируем значение перед использованием
        acc[name] = value ? decodeURIComponent(value) : ""; 
        return acc;
    }, {});

    const userCookie = cookies["active_user"];
    if (!userCookie) return null;

    try {
        const parsed = JSON.parse(userCookie);
        return parsed; 
    } catch {
        // Фоллбэк для старых куки, где было просто имя или ID строкой
        return { id: "unknown", name: userCookie };
    }
}

export async function removeKeyCookie() {
    // Устанавливаем дату истечения в прошлое, чтобы удалить куку
    document.cookie = "activated_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

export async function clearUserCookie() {
    document.cookie = "active_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}
