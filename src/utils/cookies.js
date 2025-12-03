import Cookies from "js-cookie";

// Конфигурация времени жизни cookies (в днях для js-cookie)
const COOKIE_EXPIRES = {
    role: 1,           // 1 день
    learn: 0.125,      // 3 часа (3/24)
    userData: 7,       // 7 дней
    organization: 1,   // 1 день
    default: 1,        // 1 день по умолчанию
};

// Получить значение cookie по имени
export function getCookie(name) {
    return Cookies.get(name) || null;
}

// Установить cookie с временем жизни из конфига
export function setCookie(name, value, customExpires = null) {
    const expires = customExpires ?? COOKIE_EXPIRES[name] ?? COOKIE_EXPIRES.default;
    Cookies.set(name, String(value), {
        path: "/",
        sameSite: "strict",
        expires: expires,
    });
}

// Удалить конкретный cookie
export function removeCookie(name) {
    Cookies.remove(name, { path: "/" });
}

// Очистить основные cookies приложения
export function clearCookies() {
    removeCookie("userData");
    removeCookie("role");
    removeCookie("learn");
    removeCookie("organization");
}

// Очистить ВСЕ cookies (полная очистка)
export function clearAllCookies() {
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach((name) => {
        Cookies.remove(name, { path: "/" });
    });
}
