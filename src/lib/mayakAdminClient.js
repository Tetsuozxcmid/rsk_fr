"use client";

export const MAYAK_ADMIN_SECTIONS = [
    {
        id: "content",
        title: "Контент",
        description: "Диапазоны, задачи, файлы и общие настройки контента MAYAK.",
        href: "/admin/mayak-content",
    },
    {
        id: "tokens",
        title: "Токены",
        description: "Обычные и специальные токены, заявки и настройки выдачи доступа.",
        href: "/admin/mayak-tokens",
    },
    {
        id: "sessions",
        title: "Сессии",
        description: "Сессионные токены, состав участников, роли и управление сессиями.",
        href: "/admin/mayak-sessions",
    },
    {
        id: "onboarding",
        title: "Онбординг",
        description: "Ссылки, прогресс, конструктор и анонимная анкета подготовки.",
        href: "/admin/mayak-onboarding",
    },
];

const MAYAK_ADMIN_AUTH_URL = "/api/admin/mayak-auth";

async function parseAuthResponse(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "Не удалось выполнить запрос авторизации MAYAK.");
    }
    return payload;
}

export async function getMayakAdminAuthStatus() {
    const payload = await parseAuthResponse(await fetch(MAYAK_ADMIN_AUTH_URL));
    return { authenticated: Boolean(payload?.authenticated) };
}

export async function loginMayakAdmin(password) {
    await parseAuthResponse(
        await fetch(MAYAK_ADMIN_AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        })
    );
}

export async function logoutMayakAdmin() {
    await parseAuthResponse(
        await fetch(MAYAK_ADMIN_AUTH_URL, {
            method: "DELETE",
        })
    );
}

export function buildMayakAdminLoginUrl(nextPath = "") {
    const normalizedNext = typeof nextPath === "string" ? nextPath.trim() : "";
    if (!normalizedNext || normalizedNext === "/admin") {
        return "/admin";
    }
    return `/admin?next=${encodeURIComponent(normalizedNext)}`;
}
