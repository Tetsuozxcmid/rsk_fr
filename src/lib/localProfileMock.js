import path from "path";
import { promises as fs } from "fs";

const LOCAL_PROFILE_FILE = path.join(process.cwd(), "data", "local-profile-mock.json");

function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function isTruthyEnv(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function buildDefaultLocalProfileMock() {
    const userId = normalizeString(process.env.MAYAK_LOCAL_PROFILE_USER_ID) || "local-mayak-user";
    const firstName = process.env.MAYAK_LOCAL_PROFILE_FIRST_NAME ?? "Тест";
    const lastName = process.env.MAYAK_LOCAL_PROFILE_LAST_NAME ?? "Пользователь";
    const patronymic = process.env.MAYAK_LOCAL_PROFILE_PATRONYMIC ?? "";
    const email = normalizeString(process.env.MAYAK_LOCAL_PROFILE_EMAIL) || "local-mayak@example.test";
    const username = normalizeString(process.env.MAYAK_LOCAL_PROFILE_USERNAME) || "local-mayak";
    const role = normalizeString(process.env.MAYAK_LOCAL_PROFILE_TYPE) || "student";
    const region = process.env.MAYAK_LOCAL_PROFILE_REGION ?? "Локальная среда";
    const description = process.env.MAYAK_LOCAL_PROFILE_DESCRIPTION ?? "Локальный тестовый профиль для проверки MAYAK.";
    const organizationId = normalizeString(process.env.MAYAK_LOCAL_PROFILE_ORGANIZATION_ID) || "local-org";
    const organizationName = process.env.MAYAK_LOCAL_PROFILE_ORGANIZATION ?? "Локальная организация";
    const teamId = normalizeString(process.env.MAYAK_LOCAL_PROFILE_TEAM_ID) || "local-team";
    const teamName = process.env.MAYAK_LOCAL_PROFILE_TEAM ?? "Локальная команда";

    return {
        userId,
        data: {
            id: userId,
            email,
            username,
            NameIRL: firstName,
            Surname: lastName,
            Patronymic: patronymic,
            Type: role,
            Region: region,
            Description: description,
            Organization_id: organizationId,
            Organization: {
                id: organizationId,
                short_name: organizationName,
                name: organizationName,
                full_name: organizationName,
            },
            team: teamName,
            team_id: teamId,
        },
    };
}

async function ensureLocalProfileMockFile() {
    try {
        await fs.access(LOCAL_PROFILE_FILE);
    } catch {
        await fs.mkdir(path.dirname(LOCAL_PROFILE_FILE), { recursive: true });
        await fs.writeFile(LOCAL_PROFILE_FILE, JSON.stringify(buildDefaultLocalProfileMock(), null, 2), "utf-8");
    }
}

export function isLocalProfileMockEnabled() {
    return process.env.NODE_ENV !== "production" && isTruthyEnv(process.env.MAYAK_LOCAL_PROFILE_MOCK);
}

function isLocalDevHost(req) {
    const host = normalizeString(req?.headers?.host).toLowerCase();
    return host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0") || host.includes("[::1]");
}

function hasPlatformAuthToken(req) {
    return Boolean(req?.cookies?.users_access_token || req?.cookies?.access_token || req?.cookies?.token || req?.headers?.authorization);
}

export function shouldUseLocalProfileMock(req, { fallbackWhenAuthMissing = false } = {}) {
    if (isLocalProfileMockEnabled()) {
        return true;
    }

    if (!fallbackWhenAuthMissing || process.env.NODE_ENV === "production") {
        return false;
    }

    return isLocalDevHost(req) && !hasPlatformAuthToken(req);
}

export async function readLocalProfileMock() {
    await ensureLocalProfileMockFile();

    try {
        const raw = await fs.readFile(LOCAL_PROFILE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const fallback = buildDefaultLocalProfileMock();
        const userId = normalizeString(parsed?.userId) || fallback.userId;
        const data = parsed?.data && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? parsed.data : {};

        return {
            userId,
            data: {
                ...fallback.data,
                ...data,
                id: userId,
            },
        };
    } catch {
        const fallback = buildDefaultLocalProfileMock();
        await fs.writeFile(LOCAL_PROFILE_FILE, JSON.stringify(fallback, null, 2), "utf-8");
        return fallback;
    }
}

export async function updateLocalProfileMock(profileFields = {}) {
    const current = await readLocalProfileMock();
    const nextProfile = {
        userId: current.userId,
        data: {
            ...current.data,
            ...profileFields,
            id: current.userId,
        },
    };

    await fs.mkdir(path.dirname(LOCAL_PROFILE_FILE), { recursive: true });
    await fs.writeFile(LOCAL_PROFILE_FILE, JSON.stringify(nextProfile, null, 2), "utf-8");
    return nextProfile;
}

export async function getLocalProfileMockUserId() {
    const profile = await readLocalProfileMock();
    return normalizeString(profile.userId);
}
