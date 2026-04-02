import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";

import CloseIcon from "@/assets/general/close.svg";

import { saveUserData } from "@/utils/auth";
import { clearMayakPendingToken, markMayakPortalAuthPending, readMayakPendingToken, stashMayakPendingToken } from "@/utils/mayakPortalAuth";

import MayakPlatformAuthFlow from "./MayakPlatformAuthFlow";
import { addKeyToCookies, addUserToCookies, clearUserCookie, getKeyFromCookies, getUserFromCookies, removeKeyCookie } from "./actions";

const EMPTY_SESSION_INFO = {
    tokenType: "legacy",
    sessionId: null,
    sessionName: "",
    tableCount: 0,
};

const EMPTY_PORTAL_STATE = {
    status: "checking",
    profile: null,
    error: "",
};

const EMPTY_PROFILE_FORM = {
    firstName: "",
    lastName: "",
    patronymic: "",
};

function isEventLike(value) {
    return Boolean(value && typeof value === "object" && typeof value.preventDefault === "function");
}

function hasRequiredMayakName(profile = null) {
    return Boolean(String(profile?.firstName || "").trim() && String(profile?.lastName || "").trim());
}

function buildPortalFullName({ firstName = "", lastName = "", patronymic = "", username = "", email = "" }) {
    const fullName = [lastName, firstName, patronymic]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || String(username || "").trim() || String(email || "").trim() || "Участник";
}

function normalizePortalProfile(payload = {}) {
    const profileData = payload?.data || {};
    const organization = profileData.Organization || null;
    const firstName = String(profileData.NameIRL || "").trim();
    const lastName = String(profileData.Surname || "").trim();
    const patronymic = String(profileData.Patronymic || "").trim();
    const email = String(profileData.email || "").trim();
    const username = String(profileData.username || "").trim();
    const organizationName = String(organization?.name || organization?.short_name || organization?.full_name || "").trim();
    const organizationId = profileData.Organization_id ?? profileData.organization_id ?? organization?.id ?? null;
    const userId = String(payload?.userId || "").trim();

    return {
        userId,
        firstName,
        lastName,
        patronymic,
        email,
        username,
        organizationName,
        organizationId,
        fullName: buildPortalFullName({ firstName, lastName, patronymic, username, email }),
    };
}

async function validateTokenAPI(tokenValue) {
    try {
        const response = await fetch(`/api/mayak/validate-token?token=${encodeURIComponent(tokenValue)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        return {
            valid: data.valid || false,
            isActive: data.isActive || false,
            isExhausted: data.isExhausted || false,
            remainingAttempts: data.remainingAttempts || 0,
            usageLimit: data.usageLimit || 0,
            usedCount: data.usedCount || 0,
            error: data.error || null,
            isBypass: data.isBypass || false,
            tokenType: data.tokenType || "legacy",
            sessionId: data.sessionId || null,
            sessionName: data.sessionName || null,
            tableCount: data.tableCount || 0,
        };
    } catch (error) {
        console.error("Ошибка проверки токена:", error);
        return {
            valid: false,
            isActive: false,
            isExhausted: false,
            remainingAttempts: 0,
            usageLimit: 0,
            usedCount: 0,
            error: "Ошибка сервера",
            isBypass: false,
            tokenType: "legacy",
            sessionId: null,
            sessionName: null,
            tableCount: 0,
        };
    }
}

async function useTokenAPI(tokenValue) {
    try {
        const response = await fetch("/api/mayak/validate-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: tokenValue }),
        });
        const data = await response.json();
        return {
            success: data.success || false,
            remainingAttempts: data.remainingAttempts || 0,
            error: data.error || null,
            isBypass: data.isBypass || false,
        };
    } catch (error) {
        console.error("Ошибка использования токена:", error);
        return { success: false, remainingAttempts: 0, error: "Ошибка сервера", isBypass: false };
    }
}

async function loginMayakAdmin(password) {
    try {
        const response = await fetch("/api/admin/mayak-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });
        const data = await response.json().catch(() => ({}));
        return {
            success: response.ok && Boolean(data.success),
            error: data.error || null,
        };
    } catch (error) {
        console.error("Ошибка авторизации локального входа:", error);
        return { success: false, error: "Ошибка сервера" };
    }
}

async function fetchPortalProfile({ retries = 0, delayMs = 800 } = {}) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch("/api/profile/info", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            if (response.ok) {
                return { success: true, payload };
            }

            if (response.status === 404 && attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
            }

            return {
                success: false,
                status: response.status,
                error: payload.error || "Не удалось получить данные профиля",
            };
        } catch (error) {
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
            }

            return {
                success: false,
                status: 500,
                error: error.message || "Ошибка соединения с платформой",
            };
        }
    }

    return {
        success: false,
        status: 500,
        error: "Не удалось получить данные профиля",
    };
}

async function updatePortalProfileNames({ firstName, lastName, patronymic }) {
    const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            NameIRL: String(firstName || "").trim(),
            Surname: String(lastName || "").trim(),
            Patronymic: String(patronymic || "").trim(),
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Не удалось сохранить ФИО в профиль платформы");
    }

    return payload;
}

export default function SettingsPage({ goTo }) {
    const [token, setToken] = useState("");
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [tokenExists, setTokenExists] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [isDevBypass, setIsDevBypass] = useState(false);
    const [bypassPassword, setBypassPassword] = useState("");
    const [bypassPasswordError, setBypassPasswordError] = useState("");
    const [selectedTableNumber, setSelectedTableNumber] = useState("");
    const [sessionInfo, setSessionInfo] = useState(EMPTY_SESSION_INFO);
    const [portalState, setPortalState] = useState(EMPTY_PORTAL_STATE);
    const [hasRegisteredUser, setHasRegisteredUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [max, setMax] = useState(180);
    const [value, setValue] = useState(0);
    const [tokenRemainingAttempts, setTokenRemainingAttempts] = useState(0);
    const [tokenError, setTokenError] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [shouldPollPortalAuth, setShouldPollPortalAuth] = useState(false);
    const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
    const [profileFormError, setProfileFormError] = useState("");
    const [isSavingProfileName, setIsSavingProfileName] = useState(false);

    const syncRegisteredUserState = (nextSessionInfo = sessionInfo, nextPortalProfile = portalState.profile, nextTokenExists = tokenExists) => {
        const activeUser = getUserFromCookies();
        const portalUserId = String(nextPortalProfile?.userId || "").trim();

        if (!hasRequiredMayakName(nextPortalProfile) || !nextTokenExists || !activeUser?.id || !portalUserId || String(activeUser.id) !== portalUserId) {
            setHasRegisteredUser(false);
            return false;
        }

        if ((nextSessionInfo?.tokenType || "legacy") === "session") {
            const sameSession = !!nextSessionInfo?.sessionId && String(activeUser.sessionId || "") === String(nextSessionInfo.sessionId || "");
            const hasTable = !!String(activeUser.tableNumber || "").trim();
            const ready = sameSession && hasTable && activeUser.tokenType === "session";

            if (ready) {
                setSelectedTableNumber(String(activeUser.tableNumber || ""));
            }

            setHasRegisteredUser(ready);
            return ready;
        }

        const ready = activeUser.tokenType !== "session";
        setHasRegisteredUser(ready);
        return ready;
    };

    const getResolvedTableNumber = (nextSessionInfo = sessionInfo, preferredTableNumber = selectedTableNumber) => {
        if ((nextSessionInfo?.tokenType || "legacy") !== "session") {
            return "";
        }

        const normalizedTableNumber = String(preferredTableNumber || "").trim();
        if (normalizedTableNumber) {
            return normalizedTableNumber;
        }

        return Number(nextSessionInfo?.tableCount) === 1 ? "1" : "";
    };

    const syncPortalProfile = async ({ retries = 0, delayMs = 800, silent = false } = {}) => {
        if (!silent) {
            setPortalState((prev) => ({
                ...prev,
                status: "checking",
                error: "",
            }));
        }

        const result = await fetchPortalProfile({ retries, delayMs });
        if (!result.success) {
            if (result.status === 401) {
                setPortalState({
                    status: "unauthenticated",
                    profile: null,
                    error: "",
                });
                setHasRegisteredUser(false);
                return false;
            }

            setPortalState({
                status: result.status === 404 ? "profile_missing" : "error",
                profile: null,
                error:
                    result.status === 404
                        ? "Платформа не вернула профиль для этого аккаунта. Если вы только что зарегистрировались, попробуйте войти заново. Если сообщение не исчезает, профиль не создан или авторизация не завершилась на стороне платформы."
                        : result.error || "Не удалось проверить авторизацию на платформе.",
            });
            setHasRegisteredUser(false);
            return false;
        }

        const normalizedProfile = normalizePortalProfile(result.payload);
        if (!normalizedProfile.userId) {
            setPortalState({
                status: "error",
                profile: null,
                error: "Платформа вернула профиль без идентификатора пользователя.",
            });
            setHasRegisteredUser(false);
            return false;
        }

        await saveUserData({
            email: normalizedProfile.email,
            username: normalizedProfile.firstName || normalizedProfile.username,
        });

        setProfileForm({
            firstName: normalizedProfile.firstName,
            lastName: normalizedProfile.lastName,
            patronymic: normalizedProfile.patronymic,
        });
        setProfileFormError("");

        setPortalState({
            status: hasRequiredMayakName(normalizedProfile) ? "ready" : "needs_fio",
            profile: normalizedProfile,
            error: "",
        });
        syncRegisteredUserState(sessionInfo, normalizedProfile, tokenExists);
        return normalizedProfile;
    };

    const validateToken = async (tokenToValidate) => {
        const nextTokenValue = String(tokenToValidate || "").trim();
        if (!nextTokenValue) {
            setIsTokenValid(false);
            setShowNotification(false);
            setTokenError("");
            setIsDevBypass(false);
            setBypassPasswordError("");
            setTokenRemainingAttempts(0);
            setSessionInfo(EMPTY_SESSION_INFO);
            setHasRegisteredUser(false);
            setSelectedTableNumber("");
            clearMayakPendingToken();
            return;
        }

        setIsValidating(true);
        const result = await validateTokenAPI(nextTokenValue);
        const isAccessible = result.valid || (result.isExhausted && result.isActive);
        const nextSessionInfo = {
            tokenType: result.tokenType || "legacy",
            sessionId: result.sessionId || null,
            sessionName: result.sessionName || "",
            tableCount: Number(result.tableCount) || 0,
        };

        setIsTokenValid(isAccessible);
        setTokenRemainingAttempts(result.remainingAttempts);
        setIsDevBypass(Boolean(result.isBypass));
        setSessionInfo(nextSessionInfo);
        setValue(result.remainingAttempts || 0);
        if (result.usageLimit > 0) {
            setMax(result.usageLimit);
        }

        if (!result.isBypass) {
            setBypassPassword("");
            setBypassPasswordError("");
        }

        if (!isAccessible) {
            setTokenError(result.error || "Токен недействителен");
            setShowNotification(false);
            setHasRegisteredUser(false);
            clearMayakPendingToken();
            setIsValidating(false);
            return;
        }

        if (!result.isBypass) {
            stashMayakPendingToken(nextTokenValue);
        }

        setShowNotification(true);
        setTokenError("");
        syncRegisteredUserState(nextSessionInfo, portalState.profile, tokenExists);

        if (result.isBypass) {
            setIsValidating(false);
            return;
        }

        await syncPortalProfile({
            retries: 2,
            delayMs: 800,
            silent: true,
        });
        setIsValidating(false);
    };

    useEffect(() => {
        syncPortalProfile({ silent: true });
    }, []);

    useEffect(() => {
        async function restoreTokenState() {
            const keyInCookies = await getKeyFromCookies();
            const pendingToken = readMayakPendingToken();
            const restoredToken = keyInCookies?.text || pendingToken || "";

            if (!restoredToken) {
                setToken("");
                setTokenExists(false);
                setShowNotification(false);
                setIsTokenValid(false);
                setIsDevBypass(false);
                setBypassPassword("");
                setBypassPasswordError("");
                setTokenRemainingAttempts(0);
                setTokenError("");
                setSessionInfo(EMPTY_SESSION_INFO);
                setHasRegisteredUser(false);
                setSelectedTableNumber("");
                return;
            }

            setToken(restoredToken);
            setTokenExists(Boolean(keyInCookies?.text));
        }

        restoreTokenState();
    }, []);

    useEffect(() => {
        if (!token || !String(token).trim()) {
            return undefined;
        }

        const timerId = window.setTimeout(() => {
            validateToken(token);
        }, 500);

        return () => window.clearTimeout(timerId);
    }, [token]);

    useEffect(() => {
        if (sessionInfo.tokenType === "session" && Number(sessionInfo.tableCount) === 1 && !String(selectedTableNumber || "").trim()) {
            setSelectedTableNumber("1");
            return;
        }

        if (sessionInfo.tokenType !== "session" && selectedTableNumber) {
            setSelectedTableNumber("");
        }
    }, [selectedTableNumber, sessionInfo.tableCount, sessionInfo.tokenType]);

    useEffect(() => {
        if (!shouldPollPortalAuth) {
            return undefined;
        }

        const intervalId = window.setInterval(async () => {
            const syncedProfile = await syncPortalProfile({ retries: 1, delayMs: 800, silent: true });
            if (syncedProfile) {
                setShouldPollPortalAuth(false);
                if (canAutoActivatePortalUser(syncedProfile)) {
                    await activatePortalUser(syncedProfile);
                }
            }
        }, 2000);

        return () => window.clearInterval(intervalId);
    }, [shouldPollPortalAuth]);

    const enterWithDevBypass = async () => {
        setBypassPasswordError("");

        if (!bypassPassword) {
            setBypassPasswordError("Введите пароль администратора");
            return;
        }

        const authResult = await loginMayakAdmin(bypassPassword);
        if (!authResult.success) {
            setBypassPasswordError(authResult.error || "Не удалось авторизовать локальный вход");
            return;
        }

        await addKeyToCookies(token);
        await addUserToCookies("dev-bypass", "Локальный вход");
        setTokenExists(true);
        goTo("trainer");
    };

    const handlePortalAuthenticated = async () => {
        const syncedProfile = await syncPortalProfile({
            retries: 4,
            delayMs: 1000,
            silent: false,
        });

        if (!syncedProfile) {
            return;
        }

        if (canAutoActivatePortalUser(syncedProfile)) {
            await activatePortalUser(syncedProfile);
        }
    };

    const handlePortalOAuthStart = (provider) => {
        sessionStorage.setItem("currentPage", "settings");
        stashMayakPendingToken(token);

        if (provider === "yandex") {
            markMayakPortalAuthPending({ provider });
            return;
        }

        if (provider === "vk") {
            setShouldPollPortalAuth(true);
        }
    };

    const handleProfileFormChange = (event) => {
        const { name, value: nextValue } = event.target;
        setProfileForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }));
        setProfileFormError("");
    };

    const canAutoActivatePortalUser = (nextProfile = portalState.profile) => {
        if (!hasRequiredMayakName(nextProfile) || !showNotification || !isTokenValid || isDevBypass) {
            return false;
        }

        if ((sessionInfo.tokenType || "legacy") !== "session") {
            return true;
        }

        return Boolean(getResolvedTableNumber(sessionInfo, selectedTableNumber));
    };

    const handleSaveProfileName = async () => {
        const nextFirstName = String(profileForm.firstName || "").trim();
        const nextLastName = String(profileForm.lastName || "").trim();
        const nextPatronymic = String(profileForm.patronymic || "").trim();

        if (!nextLastName || !nextFirstName) {
            setProfileFormError("Для входа в MAYAK заполните фамилию и имя.");
            return false;
        }

        setIsSavingProfileName(true);
        setProfileFormError("");

        try {
            await updatePortalProfileNames({
                firstName: nextFirstName,
                lastName: nextLastName,
                patronymic: nextPatronymic,
            });

            const syncedProfile = await syncPortalProfile({
                retries: 2,
                delayMs: 800,
                silent: false,
            });

            if (!syncedProfile) {
                throw new Error("Профиль обновлен, но MAYAK не смог перечитать его сразу. Повторите попытку.");
            }

            if (canAutoActivatePortalUser(syncedProfile)) {
                await activatePortalUser(syncedProfile);
            }

            return true;
        } catch (error) {
            console.error("Ошибка сохранения ФИО профиля:", error);
            setProfileFormError(error.message || "Не удалось сохранить ФИО в профиль.");
            return false;
        } finally {
            setIsSavingProfileName(false);
        }
    };

    const activatePortalUser = async (profileOverride = null) => {
        if (isDevBypass) {
            await enterWithDevBypass();
            return;
        }

        if (!isTokenValid) {
            alert("Пожалуйста, введите корректный токен для активации тренажера");
            return;
        }

        const normalizedProfileOverride = isEventLike(profileOverride) ? null : profileOverride;
        const portalProfile = normalizedProfileOverride || portalState.profile;
        const hasPortalSession = Boolean(portalProfile?.userId) && (Boolean(normalizedProfileOverride) || ["ready", "needs_fio"].includes(portalState.status));
        if (!hasPortalSession) {
            alert("Сначала войдите в платформенный аккаунт");
            return;
        }

        if (!hasRequiredMayakName(portalProfile)) {
            alert("Перед входом в MAYAK заполните фамилию и имя в профиле");
            return;
        }

        const resolvedTableNumber = getResolvedTableNumber(sessionInfo, selectedTableNumber);
        if (sessionInfo.tokenType === "session" && !resolvedTableNumber) {
            alert("Пожалуйста, выберите ваш стол");
            return;
        }

        if (resolvedTableNumber && resolvedTableNumber !== selectedTableNumber) {
            setSelectedTableNumber(resolvedTableNumber);
        }

        setIsLoading(true);

        try {
            const useResult = await useTokenAPI(token);
            if (!useResult.success) {
                throw new Error(useResult.error || "Ошибка при использовании токена");
            }

            const userId = String(portalProfile.userId);
            const userRecord = {
                id: userId,
                portalUserId: userId,
                sessionId: sessionInfo.sessionId,
                tokenType: sessionInfo.tokenType,
                userData: {
                    firstName: portalProfile.firstName,
                    lastName: portalProfile.lastName,
                    patronymic: portalProfile.patronymic,
                    college: portalProfile.organizationName,
                },
                portalProfile: {
                    email: portalProfile.email,
                    username: portalProfile.username,
                    organizationId: portalProfile.organizationId,
                    fullName: portalProfile.fullName,
                },
            };

            const saveResponse = await fetch("/api/mayak/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    key: token,
                    userId,
                    data: userRecord,
                }),
            });

            if (!saveResponse.ok) {
                throw new Error("Не удалось сохранить пользователя MAYAK");
            }

            if (sessionInfo.tokenType === "session" && sessionInfo.sessionId) {
                const participantResponse = await fetch("/api/mayak/session-runtime/participant", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: sessionInfo.sessionId,
                        userId,
                        name: portalProfile.fullName,
                        organization: portalProfile.organizationName,
                        tableNumber: resolvedTableNumber,
                    }),
                });

                const participantPayload = await participantResponse.json().catch(() => ({}));
                if (!participantResponse.ok || !participantPayload.success) {
                    throw new Error(participantPayload.error || "Не удалось зарегистрировать участника в сессии");
                }
            }

            await addKeyToCookies(token);
            await addUserToCookies(userId, portalProfile.fullName, {
                firstName: portalProfile.firstName,
                lastName: portalProfile.lastName,
                patronymic: portalProfile.patronymic,
                sessionId: sessionInfo.sessionId,
                tableNumber: sessionInfo.tokenType === "session" ? resolvedTableNumber : "",
                tokenType: sessionInfo.tokenType,
            });

            setTokenExists(true);
            setHasRegisteredUser(true);
            setValue(useResult.remainingAttempts || 0);
            setTokenRemainingAttempts(useResult.remainingAttempts || 0);
            clearMayakPendingToken();
            setShouldPollPortalAuth(false);
            goTo("trainer");
        } catch (error) {
            console.error("Ошибка активации MAYAK:", error);
            alert(error.message || "Не удалось активировать тренажер");
        } finally {
            setIsLoading(false);
        }
    };

    const getRangeClass = (val) => {
        if (val < 30) return "range-low";
        if (val < 80) return "range-mid";
        return "range-high";
    };

    return (
        <>
            <Header>
                <Header.Heading>МАЯК ОКО</Header.Heading>
                <Button
                    icon
                    onClick={() => {
                        sessionStorage.setItem("currentPage", "mayakOko");
                        goTo("mayakOko");
                    }}>
                    <CloseIcon />
                </Button>
            </Header>

            <div className="hero" style={{ placeItems: "center" }}>
                <div className="flex flex-col gap-[1.6rem] items-center h-full col-span-4 col-start-5 col-end-9">
                    <h3>Настройки</h3>

                    <div className="flex flex-col gap-[0.75rem] w-full">
                        <div className="flex flex-col gap-[0.5rem]">
                            <span className="big">Данные токена</span>
                            <p className="small text-(--color-gray-black)">Введите токен доступа к MAYAK. После успешной проверки откроется платформенный вход, а повторная авторизация не понадобится, если сессия уже активна.</p>
                            {sessionInfo.tokenType === "session" && sessionInfo.sessionName && (
                                <p className="small text-(--color-gray-black)">
                                    Сессионный вход: <b>{sessionInfo.sessionName}</b>. Для этой сессии перед входом в тренажер нужно выбрать стол.
                                </p>
                            )}
                        </div>

                        <Input
                            placeholder="Введите ваш токен"
                            value={token}
                            onChange={(event) => {
                                const nextToken = event.target.value;
                                setToken(nextToken);
                                setTokenExists(false);
                                setTokenError("");
                                setShowNotification(false);
                                setIsTokenValid(false);
                                setIsDevBypass(false);
                                setBypassPasswordError("");
                                setHasRegisteredUser(false);
                                setSelectedTableNumber("");
                            }}
                        />

                        {isValidating && <span className="small text-blue-600 block text-center">Проверка токена...</span>}

                        {tokenError && !showNotification && !isValidating && <span className="big p-3 bg-red-100 text-red-700 rounded-md block text-center">{tokenError}</span>}

                        {showNotification && isDevBypass && (
                            <div className="flex flex-col gap-[1rem] items-center">
                                <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">Локальный вход доступен. Для входа подтвердите пароль администратора.</span>
                                <Input
                                    type="password"
                                    placeholder="Пароль администратора"
                                    value={bypassPassword}
                                    onChange={(event) => {
                                        setBypassPassword(event.target.value);
                                        setBypassPasswordError("");
                                    }}
                                />
                                {bypassPasswordError && <span className="small text-red-600 block text-center">{bypassPasswordError}</span>}
                                <Button onClick={enterWithDevBypass} className="w-full">
                                    Войти в тренажер
                                </Button>
                            </div>
                        )}

                        {showNotification && !isDevBypass && hasRegisteredUser && (
                            <div className="flex flex-col gap-[1rem] items-center">
                                <span className="big p-3 bg-green-100 text-green-700 rounded-md text-center">Токен активирован, платформенный аккаунт подтвержден.</span>
                                {portalState.profile?.fullName && <span className="small text-(--color-gray-black)">Вы вошли как: {portalState.profile.fullName}</span>}
                                <span className="small text-(--color-gray-black)">Осталось попыток: {tokenRemainingAttempts}</span>
                                <Button onClick={() => goTo("trainer")} className="w-full">
                                    Войти в тренажер
                                </Button>
                            </div>
                        )}

                        {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "checking" && (
                            <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">Токен подходит. Проверяем платформенную авторизацию...</span>
                        )}

                        {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "unauthenticated" && (
                            <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">Токен подходит. Теперь войдите в платформенный аккаунт, чтобы открыть MAYAK.</span>
                        )}

                        {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "profile_missing" && (
                            <div className="flex flex-col gap-[0.75rem]">
                                <span className="big p-3 bg-amber-100 text-amber-700 rounded-md block text-center">{portalState.error}</span>
                                <Button inverted className="w-full" onClick={() => syncPortalProfile({ retries: 4, delayMs: 1000, silent: false })}>
                                    Проверить профиль снова
                                </Button>
                            </div>
                        )}

                        {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "error" && (
                            <div className="flex flex-col gap-[0.75rem]">
                                <span className="big p-3 bg-red-100 text-red-700 rounded-md block text-center">{portalState.error}</span>
                                <Button inverted className="w-full" onClick={() => syncPortalProfile({ retries: 2, delayMs: 800, silent: false })}>
                                    Повторить проверку
                                </Button>
                            </div>
                        )}

                        {isTokenValid && !isDevBypass && (
                            <div className="flex flex-col gap-[0.25rem]">
                                <span className={getRangeClass(value)}>
                                    {value}/{max}
                                </span>
                                <meter id="meter-my" min="0" max={max} low="30" high="80" optimum="100" value={value} className={getRangeClass(value)} />
                            </div>
                        )}
                    </div>

                    {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "unauthenticated" && (
                        <div className="w-full">
                            <MayakPlatformAuthFlow onAuthenticated={handlePortalAuthenticated} onOAuthStart={handlePortalOAuthStart} />
                        </div>
                    )}

                    {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "needs_fio" && (
                        <div className="flex flex-col gap-[1rem] w-full">
                            <div className="flex flex-col gap-[0.35rem]">
                                <span className="big">Заполните ФИО для входа в MAYAK</span>
                                <span className="small text-(--color-gray-black)">Профиль платформы найден, но для сертификата не хватает обязательных данных. Заполните фамилию и имя.</span>
                                {portalState.profile?.email && <span className="small text-(--color-gray-black)">Аккаунт: {portalState.profile.email}</span>}
                            </div>

                            <div className="flex flex-col gap-[0.75rem]">
                                <Input name="lastName" placeholder="Фамилия *" value={profileForm.lastName} onChange={handleProfileFormChange} />
                                <Input name="firstName" placeholder="Имя *" value={profileForm.firstName} onChange={handleProfileFormChange} />
                                <Input name="patronymic" placeholder="Отчество" value={profileForm.patronymic} onChange={handleProfileFormChange} />
                                {profileFormError && <span className="small text-red-600 block text-center">{profileFormError}</span>}
                            </div>

                            <Button onClick={handleSaveProfileName} disabled={isSavingProfileName} className="w-full">
                                {isSavingProfileName ? "Сохраняем ФИО..." : "Сохранить ФИО"}
                            </Button>
                        </div>
                    )}

                    {showNotification && !isDevBypass && !hasRegisteredUser && portalState.status === "ready" && (
                        <div className="flex flex-col gap-[1rem] w-full">
                            <div className="flex flex-col gap-[0.5rem] p-4 bg-slate-50 rounded-[1rem] border border-slate-200">
                                <span className="big">Платформенный профиль</span>
                                <span className="small text-(--color-gray-black)">ФИО: {portalState.profile.fullName}</span>
                                {portalState.profile.organizationName && <span className="small text-(--color-gray-black)">Организация: {portalState.profile.organizationName}</span>}
                            </div>

                            {sessionInfo.tokenType === "session" && sessionInfo.tableCount > 0 && (
                                <div className="flex flex-col gap-[0.5rem]">
                                    <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700">
                                        Выберите ваш стол *
                                    </label>
                                    <select
                                        id="tableNumber"
                                        name="tableNumber"
                                        value={selectedTableNumber}
                                        onChange={(event) => setSelectedTableNumber(event.target.value)}
                                        className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required>
                                        {Array.from({ length: sessionInfo.tableCount }, (_, index) => {
                                            const optionValue = String(index + 1);
                                            return (
                                                <option key={optionValue} value={optionValue}>
                                                    Стол {optionValue}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            <Button onClick={() => activatePortalUser()} disabled={isLoading} className="w-full">
                                {isLoading ? "Подключаем MAYAK..." : "Войти в тренажер"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
