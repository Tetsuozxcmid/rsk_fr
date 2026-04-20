import { useCallback, useEffect, useRef, useState } from "react";

import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";
import PortalAuthFlow from "@/components/features/auth/PortalAuthFlow";
import PortalProfileEditor from "@/components/features/auth/PortalProfileEditor";
import {
    addKeyToCookies,
    addUserToCookies,
    clearUserCookie,
    getKeyFromCookies,
    getUserFromCookies,
    removeKeyCookie,
} from "./actions";
import CloseIcon from "@/assets/general/close.svg";
import {
    buildPortalUserCookiePayload,
    isPortalProfileComplete,
    normalizePortalProfile,
} from "@/lib/portalProfile";
import {
    fetchPortalProfileClient,
    getCachedPortalProfilePayload,
    hasResolvedPortalProfileCache,
    primePortalProfileCache,
} from "@/lib/portalProfileClient";

const EMPTY_SESSION_INFO = {
    tokenType: "legacy",
    sessionId: null,
    sessionName: "",
    tableCount: 0,
};

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

async function consumeTokenAPI(tokenValue) {
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
        console.error("Ошибка авторизации администратора:", error);
        return { success: false, error: "Ошибка сервера" };
    }

    return payload;
}

export default function SettingsPage({ goTo }) {
    const skipNextTokenEffectRef = useRef(false);
    const portalProfilePayloadRef = useRef(getCachedPortalProfilePayload());
    const isPortalCheckedRef = useRef(hasResolvedPortalProfileCache());
    const sessionInfoRef = useRef(EMPTY_SESSION_INFO);
    const tokenRef = useRef("");
    const storedTokenRef = useRef("");

    const [token, setToken] = useState("");
    const [storedToken, setStoredToken] = useState("");
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [isDevBypass, setIsDevBypass] = useState(false);
    const [bypassPassword, setBypassPassword] = useState("");
    const [bypassPasswordError, setBypassPasswordError] = useState("");

    const [portalProfilePayload, setPortalProfilePayload] = useState(() => getCachedPortalProfilePayload());
    const [isPortalChecked, setIsPortalChecked] = useState(() => hasResolvedPortalProfileCache());

    const [sessionInfo, setSessionInfo] = useState(EMPTY_SESSION_INFO);
    const [tableNumber, setTableNumber] = useState("");
    const [hasRegisteredUser, setHasRegisteredUser] = useState(false);
    const [isHydratingAccess, setIsHydratingAccess] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [tokenRemainingAttempts, setTokenRemainingAttempts] = useState(0);
    const [usageLimit, setUsageLimit] = useState(0);
    const [tokenError, setTokenError] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        portalProfilePayloadRef.current = portalProfilePayload;
    }, [portalProfilePayload]);

    useEffect(() => {
        isPortalCheckedRef.current = isPortalChecked;
    }, [isPortalChecked]);

    useEffect(() => {
        sessionInfoRef.current = sessionInfo;
    }, [sessionInfo]);

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    useEffect(() => {
        storedTokenRef.current = storedToken;
    }, [storedToken]);

    const portalProfile = portalProfilePayload ? normalizePortalProfile(portalProfilePayload) : null;
    const isStoredTokenActive = Boolean(token && storedToken && storedToken === token);

    const getRangeClass = (val) => {
        if (val < 30) return "range-low";
        if (val < 80) return "range-mid";
        return "range-high";
    };

    const syncRegisteredUserState = useCallback((nextSessionInfo, nextProfilePayload, nextTokenValue) => {
        const effectiveSessionInfo = nextSessionInfo || sessionInfoRef.current;
        const effectiveProfilePayload = nextProfilePayload === undefined ? portalProfilePayloadRef.current : nextProfilePayload;
        const effectiveTokenValue = nextTokenValue === undefined ? tokenRef.current : nextTokenValue;

        const activeUser = getUserFromCookies();
        const profile = effectiveProfilePayload ? normalizePortalProfile(effectiveProfilePayload) : null;
        const matchesStoredToken = Boolean(effectiveTokenValue) && String(storedTokenRef.current || "") === String(effectiveTokenValue || "");

        if (!activeUser?.id || !profile?.id || !matchesStoredToken) {
            setHasRegisteredUser(false);
            return false;
        }

        if (String(activeUser.id) !== String(profile.id)) {
            clearUserCookie();
            setHasRegisteredUser(false);
            return false;
        }

        if ((effectiveSessionInfo?.tokenType || "legacy") === "session") {
            const isRegistered =
                activeUser.tokenType === "session" &&
                String(activeUser.sessionId || "") === String(effectiveSessionInfo.sessionId || "") &&
                Boolean(String(activeUser.tableNumber || "").trim());

            if (isRegistered) {
                setTableNumber(String(activeUser.tableNumber || ""));
            }

            setHasRegisteredUser(isRegistered);
            return isRegistered;
        }

        const isRegistered = activeUser.tokenType !== "session";
        setHasRegisteredUser(isRegistered);
        return isRegistered;
    }, []);

    const fetchPortalProfile = useCallback(
        async ({ force = false } = {}) => {
            try {
                const payload = await fetchPortalProfileClient({ force });
                if (!payload) {
                    setPortalProfilePayload(null);
                    setIsPortalChecked(true);
                    setHasRegisteredUser(false);
                    return null;
                }

                primePortalProfileCache(payload);
                setPortalProfilePayload(payload);
                setIsPortalChecked(true);
                syncRegisteredUserState(sessionInfoRef.current, payload, tokenRef.current);
                return payload;
            } catch (error) {
                console.error("Ошибка получения профиля портала:", error);
                setPortalProfilePayload(null);
                setIsPortalChecked(true);
                return null;
            }
        },
        [syncRegisteredUserState]
    );

    const validateToken = useCallback(
        async (tokenToValidate) => {
            if (!tokenToValidate || tokenToValidate.trim() === "") {
                setIsTokenValid(false);
                setShowNotification(false);
                setTokenError("");
                setIsDevBypass(false);
                setBypassPassword("");
                setBypassPasswordError("");
                setSessionInfo(EMPTY_SESSION_INFO);
                setHasRegisteredUser(false);
                return;
            }

            setIsValidating(true);
            try {
                const result = await validateTokenAPI(tokenToValidate);
                const isAccessible = result.valid || (result.isExhausted && result.isActive);
                const nextSessionInfo = {
                    tokenType: result.tokenType || "legacy",
                    sessionId: result.sessionId || null,
                    sessionName: result.sessionName || "",
                    tableCount: Number(result.tableCount) || 0,
                };

                setIsTokenValid(isAccessible);
                setTokenRemainingAttempts(result.remainingAttempts);
                setUsageLimit(result.usageLimit);
                setIsDevBypass(Boolean(result.isBypass));
                setSessionInfo(nextSessionInfo);
                setShowNotification(isAccessible);

                if (!result.isBypass) {
                    setBypassPassword("");
                    setBypassPasswordError("");
                }

                if ((result.tokenType || "legacy") !== "session") {
                    setTableNumber("");
                }

                if (isAccessible) {
                    setTokenError("");
                } else {
                    setTokenError(result.error || "Токен недействителен");
                }

                if (portalProfilePayloadRef.current || isPortalCheckedRef.current) {
                    syncRegisteredUserState(nextSessionInfo, portalProfilePayloadRef.current, tokenToValidate);
                }
            } finally {
                setIsValidating(false);
            }
        },
        [syncRegisteredUserState]
    );

    useEffect(() => {
        let isCancelled = false;

        const hydrate = async () => {
            setIsHydratingAccess(true);

            try {
                const keyInCookies = await getKeyFromCookies();
                const tokenFromCookie = keyInCookies?.text || "";

                if (tokenFromCookie === "ADMIN-BYPASS-TOKEN") {
                    await removeKeyCookie();
                    await clearUserCookie();

                    if (!isCancelled) {
                        setStoredToken("");
                        setToken("");
                        setIsTokenValid(false);
                        setShowNotification(false);
                        setSessionInfo(EMPTY_SESSION_INFO);
                        setHasRegisteredUser(false);
                    }

                    await fetchPortalProfile({ force: true });
                    return;
                }

                if (tokenFromCookie) {
                    skipNextTokenEffectRef.current = true;
                    if (!isCancelled) {
                        setStoredToken(tokenFromCookie);
                        setToken(tokenFromCookie);
                    }
                    await Promise.all([validateToken(tokenFromCookie), fetchPortalProfile({ force: true })]);
                    return;
                }

                await fetchPortalProfile({ force: true });
            } finally {
                if (!isCancelled) {
                    setIsHydratingAccess(false);
                }
            }
        };

        hydrate();

        return () => {
            isCancelled = true;
        };
    }, [fetchPortalProfile, validateToken]);

    useEffect(() => {
        if (skipNextTokenEffectRef.current) {
            skipNextTokenEffectRef.current = false;
            return undefined;
        }

        if (isHydratingAccess) {
            return undefined;
        }

        if (!token || token.trim() === "") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            validateToken(token);
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [isHydratingAccess, token, validateToken]);

    useEffect(() => {
        if (sessionInfo.tokenType === "session" && Number(sessionInfo.tableCount) > 0 && !String(tableNumber || "").trim()) {
            setTableNumber("1");
        }
    }, [sessionInfo.tableCount, sessionInfo.tokenType, tableNumber]);

    const enterWithDevBypass = useCallback(async () => {
        setBypassPasswordError("");
        if (!bypassPassword) {
            setBypassPasswordError("Введите пароль администратора");
            setBypassPasswordError("Введите пароль администратора");
            return;
        }

        const authResult = await loginMayakAdmin(bypassPassword);
        if (!authResult.success) {
            setBypassPasswordError(authResult.error || "Не удалось подтвердить локальный вход");
            return;
        }

        const resolvedTableNumber = getResolvedTableNumber(sessionInfo, selectedTableNumber);
        if (sessionInfo.tokenType === "session" && !resolvedTableNumber) {
            setBypassPasswordError("Пожалуйста, выберите ваш стол");
            return;
        }

        const bypassProfile = portalState.profile || (await syncPortalProfile({
            retries: 1,
            delayMs: 400,
            silent: true,
        })) || null;

        const localUserId = String(bypassProfile?.userId || "local-mayak-user").trim();
        const localFullName = String(bypassProfile?.fullName || "Локальный вход").trim() || "Локальный вход";
        const userRecord = {
            id: localUserId,
            portalUserId: localUserId,
            sessionId: sessionInfo.sessionId,
            tokenType: sessionInfo.tokenType || "legacy",
            userData: {
                firstName: bypassProfile?.firstName || "",
                lastName: bypassProfile?.lastName || "",
                patronymic: bypassProfile?.patronymic || "",
                college: bypassProfile?.organizationName || "",
            },
            portalProfile: {
                email: bypassProfile?.email || "",
                username: bypassProfile?.username || "",
                organizationId: bypassProfile?.organizationId || null,
                fullName: localFullName,
            },
        };

        const saveResponse = await fetch("/api/mayak/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                key: token,
                userId: localUserId,
                data: userRecord,
            }),
        });

        if (!saveResponse.ok) {
            throw new Error("Не удалось сохранить локального пользователя MAYAK");
        }

        const savePayload = await saveResponse.json().catch(() => ({}));
        const certificateNumber = savePayload?.certificateNumber || savePayload?.data?.certificateNumber || "";

        if (sessionInfo.tokenType === "session" && sessionInfo.sessionId) {
            const participantResponse = await fetch("/api/mayak/session-runtime/participant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sessionId: sessionInfo.sessionId,
                    userId: localUserId,
                    name: localFullName,
                    organization: bypassProfile?.organizationName || "",
                    tableNumber: resolvedTableNumber,
                }),
            });

            const participantPayload = await participantResponse.json().catch(() => ({}));
            if (!participantResponse.ok || !participantPayload.success) {
                throw new Error(participantPayload.error || "Не удалось зарегистрировать локального участника в сессии");
            }
        }

        await addKeyToCookies(token);
        setStoredToken(token);
        await addUserToCookies("dev-bypass", "Локальный вход", {
            tokenType: "bypass",
        });
        goTo("trainer");
    }, [bypassPassword, goTo, token]);

    const activatePortalAccess = useCallback(async () => {
        if (isDevBypass) {
            await enterWithDevBypass();
            return;
        }

        if (canAutoActivatePortalUser(syncedProfile)) {
            clearMayakPortalAutoActivate();
            setShouldAutoEnterTrainer(false);
            await activatePortalUser(syncedProfile);
            return;
        }

        if (isSessionTokenFlow()) {
            clearMayakPortalAutoActivate();
            setShouldAutoEnterTrainer(false);
            return;
        }

        setShouldAutoEnterTrainer(true);
        markMayakPortalAutoActivate();
    };

    const handlePortalOAuthStart = (provider) => {
        sessionStorage.setItem("currentPage", "settings");
        stashMayakPendingToken(token);
        markMayakPortalAuthPending({ provider });

        if (isSessionTokenFlow()) {
            clearMayakPortalAutoActivate();
            setShouldAutoEnterTrainer(false);
        } else {
            markMayakPortalAutoActivate();
            setShouldAutoEnterTrainer(true);
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

    const handleGuestFormChange = (event) => {
        const { name, value: nextValue } = event.target;
        setGuestForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }));
        setGuestFormError("");
    };

    const buildGuestPortalProfile = () => {
        const firstName = String(guestForm.firstName || "").trim();
        const lastName = String(guestForm.lastName || "").trim();
        const patronymic = String(guestForm.patronymic || "").trim();

        return {
            userId: buildMayakGuestUserId(sessionInfo),
            firstName,
            lastName,
            patronymic,
            email: "",
            username: "",
            organizationName: "",
            organizationId: null,
            fullName: buildPortalFullName({ firstName, lastName, patronymic }),
            guestMode: true,
        };
    };

    const canAutoActivatePortalUser = (nextProfile = portalState.profile) => {
        if (!hasRequiredMayakName(nextProfile) || !showNotification || !isTokenValid || isDevBypass) {
            return false;
        }

        return !isSessionTokenFlow();
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

            if (shouldAutoEnterTrainer && canAutoActivatePortalUser(syncedProfile)) {
                clearMayakPortalAutoActivate();
                setShouldAutoEnterTrainer(false);
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

    const activateGuestUser = async () => {
        if (!isTokenValid) {
            alert("Сначала введите корректный токен доступа.");
            return;
        }

        if (!portalProfilePayload) {
            alert("Сначала войдите в портал.");
            return;
        }

        if (!isPortalProfileComplete(portalProfilePayload)) {
            alert("Для входа в MAYAK заполните обязательные поля профиля.");
            return;
        }

        if (sessionInfo.tokenType === "session" && !String(tableNumber || "").trim()) {
            alert("Выберите стол для входа в сессию.");
            return;
        }

        if (resolvedTableNumber && resolvedTableNumber !== selectedTableNumber) {
            setSelectedTableNumber(resolvedTableNumber);
        }

        setIsLoading(true);
        try {
            if (!isStoredTokenActive) {
                const useResult = await useTokenAPI(token);
                if (!useResult.success) {
                    alert(useResult.error || "Не удалось активировать токен.");
                    return;
                }
                setTokenRemainingAttempts(useResult.remainingAttempts || 0);
                await addKeyToCookies(token);
                setStoredToken(token);
            }

            const nextProfile = normalizePortalProfile(portalProfilePayload);
            const nextCookiePayload = buildPortalUserCookiePayload(portalProfilePayload, {
                sessionId: sessionInfo.sessionId,
                sessionName: sessionInfo.sessionName,
                tableNumber: sessionInfo.tokenType === "session" ? String(tableNumber || "") : "",
                tokenType: sessionInfo.tokenType,
            });

            const saveResponse = await fetch("/api/mayak/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: token,
                    userId: nextProfile.id,
                    data: {
                        id: nextProfile.id,
                        portalUserId: nextProfile.id,
                        userData: {
                            lastName: nextProfile.surname,
                            firstName: nextProfile.name,
                            patronymic: nextProfile.patronymic,
                            college: nextProfile.organizationLabel,
                        },
                        sessionId: sessionInfo.sessionId,
                        sessionName: sessionInfo.sessionName,
                        tokenType: sessionInfo.tokenType,
                        tableNumber: sessionInfo.tokenType === "session" ? String(tableNumber || "") : "",
                    },
                }),
            });

            if (!saveResponse.ok) {
                throw new Error("Не удалось сохранить контекст входа MAYAK");
            }

            const savePayload = await saveResponse.json().catch(() => ({}));
            const certificateNumber = savePayload?.certificateNumber || savePayload?.data?.certificateNumber || "";

            if (sessionInfo.tokenType === "session" && sessionInfo.sessionId) {
                const participantResponse = await fetch("/api/mayak/session-runtime/participant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionId: sessionInfo.sessionId,
                        userId: nextProfile.id,
                        name: nextProfile.fullName,
                        organization: nextProfile.organizationLabel,
                        tableNumber,
                    }),
                });

                const participantPayload = await participantResponse.json().catch(() => ({}));
                if (!participantResponse.ok || !participantPayload.success) {
                    throw new Error(participantPayload.error || "Не удалось зарегистрировать участника в сессии");
                }
            }

            await addUserToCookies(nextCookiePayload.id, nextCookiePayload.name, nextCookiePayload);
            setHasRegisteredUser(true);
            goTo("trainer");
        } catch (error) {
            console.error("Ошибка активации MAYAK:", error);
            alert(error.message || "Произошла ошибка при активации тренажера.");
        } finally {
            setIsLoading(false);
        }
    }, [
        enterWithDevBypass,
        goTo,
        isDevBypass,
        isPortalProfileComplete,
        isStoredTokenActive,
        isTokenValid,
        portalProfilePayload,
        sessionInfo,
        tableNumber,
        token,
    ]);

    const renderPortalGate = () => {
        if (!showNotification || isDevBypass) {
            return null;
        }

        if (isHydratingAccess || !isPortalChecked) {
            return <p className="small text-(--color-gray-black) text-center">Проверяем портал...</p>;
        }

        if (!portalProfilePayload) {
            return (
                <div className="flex flex-col gap-[1rem] w-full">
                    <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">
                        Токен подходит. Войдите в портал, чтобы продолжить без отдельной регистрации в тренажере.
                    </span>
                    <PortalAuthFlow
                        className="w-full"
                        initialMode="login"
                        returnPath="/tools/mayak-oko"
                        onAuthenticated={async (payload) => {
                            primePortalProfileCache(payload);
                            setPortalProfilePayload(payload);
                            setIsPortalChecked(true);
                            syncRegisteredUserState(sessionInfoRef.current, payload, tokenRef.current);
                        }}
                    />
                </div>
            );
        }

        if (!isPortalProfileComplete(portalProfilePayload)) {
            return (
                <div className="flex flex-col gap-[1rem] w-full">
                    <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">
                        Профиль портала найден. Для входа в MAYAK заполните фамилию, имя и организацию.
                    </span>
                    <PortalProfileEditor
                        profilePayload={portalProfilePayload}
                        title="Профиль портала"
                        description="Эти данные будут использованы для сертификата и истории в личном кабинете."
                        submitLabel="Сохранить профиль"
                        onSaved={(payload) => {
                            primePortalProfileCache(payload);
                            setPortalProfilePayload(payload);
                            setIsPortalChecked(true);
                            syncRegisteredUserState(sessionInfoRef.current, payload, tokenRef.current);
                        }}
                    />
                </div>
            );
        }

        if (hasRegisteredUser) {
            return (
                <div className="flex flex-col gap-[1rem] items-center">
                    <span className="big p-3 bg-green-100 text-green-700 rounded-md">Тренажер активирован</span>
                    <span className="small text-(--color-gray-black)">
                        {portalProfile.fullName}
                        {portalProfile.organizationLabel ? `, ${portalProfile.organizationLabel}` : ""}
                    </span>
                    <Button onClick={() => goTo("trainer")} className="w-full">
                        Войти в тренажер
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-[1rem] w-full">
                <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">
                    Портальный профиль подключен. Отдельная регистрация в MAYAK больше не нужна.
                </span>
                <div className="flex flex-col gap-[0.5rem] rounded-[24px] border border-(--color-gray-plus) p-[1rem]">
                    <span className="big">{portalProfile.fullName}</span>
                    <span className="small text-(--color-gray-black)">
                        {portalProfile.organizationLabel || "Организация не указана"}
                    </span>
                    {sessionInfo.tokenType === "session" && sessionInfo.sessionName ? (
                        <span className="small text-(--color-gray-black)">Сессия: {sessionInfo.sessionName}</span>
                    ) : null}
                </div>

                {sessionInfo.tokenType === "session" && sessionInfo.tableCount > 0 ? (
                    <div className="flex flex-col gap-[0.5rem]">
                        <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700">
                            Выберите ваш стол
                        </label>
                        <select
                            id="tableNumber"
                            name="tableNumber"
                            value={tableNumber}
                            onChange={(event) => setTableNumber(event.target.value)}
                            className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Array.from({ length: sessionInfo.tableCount }, (_, index) => {
                                const value = String(index + 1);
                                return (
                                    <option key={value} value={value}>
                                        Стол {value}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                ) : null}

                <Button onClick={activatePortalAccess} disabled={isLoading}>
                    {isLoading ? "Подключаем..." : "Войти в тренажер"}
                </Button>
            </div>
        );
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
                    }}
                >
                    <CloseIcon />
                </Button>
            </Header>

            <div className="hero" style={{ placeItems: "center" }}>
                <div className="flex flex-col gap-[1.6rem] items-center h-full col-span-4 col-start-5 col-end-9">
                    <h3>Настройки</h3>

                    <div className="flex flex-col gap-[0.75rem] w-full">

                    <div className="flex flex-col gap-[0.75rem] w-full">
                        <div className="flex flex-col gap-[0.5rem]">
                            <span className="big">Данные токена</span>
                            <p className="small text-(--color-gray-black)">
                                Это ваш токен доступа. Он открывает сценарий MAYAK, а личные данные и история прохождений теперь берутся из аккаунта портала.
                            </p>
                            {sessionInfo.tokenType === "session" && sessionInfo.sessionName ? (
                                <p className="small text-(--color-gray-black)">
                                    Сессионный вход: <b>{sessionInfo.sessionName}</b>. После portal-входа нужно выбрать стол.
                                </p>
                            ) : null}
                        </div>


                        <Input
                            placeholder="Введите ваш токен"
                            value={token}
                            onChange={(event) => {
                                const nextToken = event.target.value;
                            onChange={(event) => {
                                const nextToken = event.target.value;
                                setToken(nextToken);
                                setTokenExists(false);
                                setTokenError("");
                                setShowNotification(false);
                                setIsTokenValid(false);
                                setIsDevBypass(false);
                                setBypassPassword("");
                                setBypassPasswordError("");
                                setHasRegisteredUser(false);
                            }}
                        />

                        {isValidating ? <span className="small text-blue-600 block text-center">Проверка токена...</span> : null}

                        {showNotification && isDevBypass ? (
                            <div className="flex flex-col gap-[1rem] items-center">
                                <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">
                                    Локальный вход доступен. Для входа подтвердите пароль администратора.
                                </span>
                                <Input
                                    type="password"
                                    placeholder="Пароль администратора"
                                    placeholder="Пароль администратора"
                                    value={bypassPassword}
                                    onChange={(event) => {
                                        setBypassPassword(event.target.value);
                                    onChange={(event) => {
                                        setBypassPassword(event.target.value);
                                        setBypassPasswordError("");
                                    }}
                                />
                                {bypassPasswordError ? <span className="small text-red-600 block text-center">{bypassPasswordError}</span> : null}
                                <Button onClick={enterWithDevBypass} className="w-full">
                                    Войти в тренажер
                                    Войти в тренажер
                                </Button>
                            </div>
                        ) : null}

                        {tokenError && !showNotification && !isValidating ? (
                            <span className="big p-3 bg-red-100 text-red-700 rounded-md block text-center">{tokenError}</span>
                        ) : null}

                        {isTokenValid && !isDevBypass && usageLimit > 0 ? (
                            <div className="flex flex-col gap-[0.25rem]">
                                <span className={getRangeClass(tokenRemainingAttempts)}>
                                    {tokenRemainingAttempts}/{usageLimit}
                                </span>
                                <meter id="meter-my" min="0" max={usageLimit} low="30" high="80" optimum="100" value={tokenRemainingAttempts} className={getRangeClass(tokenRemainingAttempts)} />
                            </div>
                        ) : null}
                    </div>

                    {renderPortalGate()}
                </div>
            </div>
        </>
    );
}
