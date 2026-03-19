import { useState, useEffect } from "react";

import Header from "@/components/layout/Header";
import { addKeyToCookies, addUserToCookies, clearUserCookie, getKeyFromCookies, getUserFromCookies, removeKeyCookie } from "./actions";
import { v4 as uuidv4 } from "uuid";

import CloseIcon from "@/assets/general/close.svg";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";

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
        console.error("?????? ??????????? ??????????????:", error);
        return { success: false, error: "?????? ???????" };
    }
}

export default function SettingsPage({ goTo }) {
    const [token, setToken] = useState("");
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [tokenExists, setTokenExists] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [isDevBypass, setIsDevBypass] = useState(false);
    const [bypassPassword, setBypassPassword] = useState("");
    const [bypassPasswordError, setBypassPasswordError] = useState("");

    const [userData, setUserData] = useState({
        lastName: "",
        firstName: "",
        college: "",
        tableNumber: "",
    });
    const [sessionInfo, setSessionInfo] = useState({
        tokenType: "legacy",
        sessionId: null,
        sessionName: "",
        tableCount: 0,
    });
    const [hasRegisteredUser, setHasRegisteredUser] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [max, setMax] = useState(180);
    const [value, setValue] = useState(0);

    const [tokenRemainingAttempts, setTokenRemainingAttempts] = useState(0);
    const [tokenError, setTokenError] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    const syncRegisteredUserState = (nextSessionInfo, nextTokenValue = token) => {
        const activeUser = getUserFromCookies();
        if (!activeUser?.id) {
            setHasRegisteredUser(false);
            return false;
        }

        const isSessionToken = (nextSessionInfo?.tokenType || "legacy") === "session";
        if (isSessionToken) {
            const isSameSession = !!nextSessionInfo?.sessionId && activeUser.sessionId === nextSessionInfo.sessionId;
            const hasTable = !!String(activeUser.tableNumber || "").trim();
            const hasTokenType = activeUser.tokenType === "session";
            const registered = isSameSession && hasTable && hasTokenType;
            setHasRegisteredUser(registered);
            return registered;
        }

        const registered = activeUser.tokenType !== "session" || !String(activeUser.sessionId || "").trim();
        setHasRegisteredUser(registered && !!String(nextTokenValue || "").trim());
        return registered;
    };

    async function getRecordsCount() {
        try {
            const response = await fetch("/api/mayak/count");
            if (!response.ok) {
                throw new Error("Не удалось получить количество записей");
            }
            const data = await response.json();
            return data.count;
        } catch (error) {
            console.error("Ошибка при получении количества записей:", error);
            return 0;
        }
    }

    const getRangeClass = (val) => {
        if (val < 30) return "range-low";
        if (val < 80) return "range-mid";
        return "range-high";
    };

    const validateToken = async (tokenToValidate) => {
        if (!tokenToValidate || tokenToValidate.trim() === "") {
            setIsTokenValid(false);
            setShowNotification(false);
            setTokenError("");
            setIsDevBypass(false);
            setBypassPasswordError("");
            return;
        }

        setIsValidating(true);
        const result = await validateTokenAPI(tokenToValidate);
        const isAccessible = result.valid || (result.isExhausted && result.isActive);

        setIsTokenValid(isAccessible);
        setTokenRemainingAttempts(result.remainingAttempts);
        setIsDevBypass(Boolean(result.isBypass));
        const nextSessionInfo = {
            tokenType: result.tokenType || "legacy",
            sessionId: result.sessionId || null,
            sessionName: result.sessionName || "",
            tableCount: Number(result.tableCount) || 0,
        };
        setSessionInfo(nextSessionInfo);
        syncRegisteredUserState(nextSessionInfo, tokenToValidate);
        if (!result.isBypass) {
            setBypassPassword("");
            setBypassPasswordError("");
        }

        if ((result.tokenType || "legacy") !== "session") {
            setUserData((prev) => ({ ...prev, tableNumber: "" }));
        }

        if (result.usageLimit > 0) {
            setMax(result.usageLimit);
            setValue(result.remainingAttempts);
        }

        if (isAccessible) {
            setShowNotification(true);
            setTokenError("");
        } else {
            setTokenError(result.error || "Токен недействителен");
            setShowNotification(false);
        }

        setIsValidating(false);
    };

    useEffect(() => {
        async function fetchTokenAndUsage() {
            const keyInCookies = await getKeyFromCookies();
            if (keyInCookies && keyInCookies.text) {
                if (keyInCookies.text === "ADMIN-BYPASS-TOKEN") {
                    await removeKeyCookie();
                    await clearUserCookie();
                    setToken("");
                    setTokenExists(false);
                    setShowNotification(false);
                    setIsTokenValid(false);
                    setIsDevBypass(false);
                    setSessionInfo({ tokenType: "legacy", sessionId: null, sessionName: "", tableCount: 0 });
                    setHasRegisteredUser(false);
                    return;
                }
                setToken(keyInCookies.text);
                setTokenExists(true);
                const result = await validateTokenAPI(keyInCookies.text);
                const isAccessible = result.valid || (result.isExhausted && result.isActive);
                setIsTokenValid(isAccessible);
                setTokenRemainingAttempts(result.remainingAttempts);
                setIsDevBypass(Boolean(result.isBypass));
                const nextSessionInfo = {
                    tokenType: result.tokenType || "legacy",
                    sessionId: result.sessionId || null,
                    sessionName: result.sessionName || "",
                    tableCount: Number(result.tableCount) || 0,
                };
                setSessionInfo(nextSessionInfo);
                syncRegisteredUserState(nextSessionInfo, keyInCookies.text);
                if (result.usageLimit > 0) {
                    setMax(result.usageLimit);
                    setValue(result.remainingAttempts);
                }
                if (isAccessible) {
                    setShowNotification(true);
                }
            } else {
                setToken("");
                setTokenExists(false);
                setShowNotification(false);
                setIsTokenValid(false);
                setIsDevBypass(false);
                setBypassPassword("");
                setBypassPasswordError("");
                setTokenRemainingAttempts(0);
                setTokenError("");
                setSessionInfo({ tokenType: "legacy", sessionId: null, sessionName: "", tableCount: 0 });
                setHasRegisteredUser(false);
            }
        }
        fetchTokenAndUsage();
    }, []);

    useEffect(() => {
        if (!token || token.trim() === "") {
            return undefined;
        }

        const delayDebounceFn = setTimeout(() => {
            validateToken(token);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [token]);

    useEffect(() => {
        if (sessionInfo.tokenType === "session" && Number(sessionInfo.tableCount) > 0 && !String(userData.tableNumber || "").trim()) {
            setUserData((prev) => ({
                ...prev,
                tableNumber: "1",
            }));
            return;
        }

        if (sessionInfo.tokenType !== "session" && userData.tableNumber) {
            setUserData((prev) => ({
                ...prev,
                tableNumber: "",
            }));
        }
    }, [sessionInfo.tokenType, sessionInfo.tableCount, userData.tableNumber]);

    const handleUserDataChange = (e) => {
        const { name, value: fieldValue } = e.target;
        setUserData((prev) => ({
            ...prev,
            [name]: fieldValue,
        }));
    };

    const enterWithDevBypass = async () => {
        setBypassPasswordError("");

        if (!bypassPassword) {
            setBypassPasswordError("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430");
            return;
        }

        const authResult = await loginMayakAdmin(bypassPassword);
        if (!authResult.success) {
            setBypassPasswordError(authResult.error || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u043e\u0432\u0430\u0442\u044c \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0445\u043e\u0434");
            return;
        }

        await addKeyToCookies(token);
        await addUserToCookies("dev-bypass", "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0445\u043e\u0434");
        goTo("trainer");
    };

    const saveData = async () => {
        if (isDevBypass) {
            await enterWithDevBypass();
            return;
        }

        if (!isTokenValid) {
            alert("Пожалуйста, введите корректный токен для активации тренажера");
            return;
        }

        if (!userData.lastName || !userData.firstName || !userData.college) {
            alert("Пожалуйста, заполните обязательные поля: Фамилия, Имя и Организация");
            return;
        }

        if (sessionInfo.tokenType === "session" && !userData.tableNumber) {
            alert("Пожалуйста, выберите ваш стол");
            return;
        }

        setIsLoading(true);

        try {
            const useResult = await useTokenAPI(token);
            if (!useResult.success) {
                alert(useResult.error || "Ошибка при использовании токена");
                setIsLoading(false);
                return;
            }

            const userId = uuidv4();
            const userRecord = {
                id: userId,
                userData,
                sessionId: sessionInfo.sessionId,
                tokenType: sessionInfo.tokenType,
            };

            const dataToSave = {
                key: token,
                userId,
                data: userRecord,
            };

            const response = await fetch("/api/mayak/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSave),
            });

            if (!response.ok) {
                throw new Error("Ошибка при сохранении данных");
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
                        name: `${userData.lastName} ${userData.firstName}`.trim(),
                        organization: userData.college,
                        tableNumber: userData.tableNumber,
                    }),
                });

                const participantPayload = await participantResponse.json().catch(() => ({}));
                if (!participantResponse.ok || !participantPayload.success) {
                    throw new Error(participantPayload.error || "Не удалось зарегистрировать участника в сессии");
                }
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            await addKeyToCookies(token);
            await addUserToCookies(userId, `${userData.lastName} ${userData.firstName}`, {
                sessionId: sessionInfo.sessionId,
                tableNumber: userData.tableNumber || "",
                tokenType: sessionInfo.tokenType,
            });
            setHasRegisteredUser(true);

            const updatedRecordsCount = await getRecordsCount();
            setValue(max - updatedRecordsCount);

            setUserData({
                lastName: "",
                firstName: "",
                college: "",
                tableNumber: "",
            });
        } catch (error) {
            console.error("Ошибка:", error);
            alert("Произошла ошибка при сохранении данных");
        } finally {
            setIsLoading(false);
            goTo("trainer");
        }
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
                    <div className="flex flex-col gap-[0.75rem]">
                        <div className="flex flex-col gap-[0.5rem]">
                            <span className="big">Данные токена</span>
                            <p className="small text-(--color-gray-black)">Это ваш токен доступа. Он имеет ограниченное количество использований. На шкале под полем отображается, сколько запросов уже израсходовано</p>
                            {sessionInfo.tokenType === "session" && sessionInfo.sessionName && (
                                <p className="small text-(--color-gray-black)">
                                    Сессионный вход: <b>{sessionInfo.sessionName}</b>. После регистрации выбор стола обязателен.
                                </p>
                            )}
                        </div>
                        <Input
                            placeholder="Введите ваш токен"
                            value={token}
                            onChange={(e) => {
                                const nextToken = e.target.value;
                                setToken(nextToken);
                                setTokenError("");
                                setShowNotification(false);
                                setIsTokenValid(false);
                                setIsDevBypass(false);
                                setBypassPasswordError("");
                            }}
                        />

                        {isValidating && <span className="small text-blue-600 block text-center">Проверка токена...</span>}

                        {showNotification && tokenExists && !isDevBypass && hasRegisteredUser && (
                            <div className="flex flex-col gap-[1rem] items-center">
                                <span className="big p-3 bg-green-100 text-green-700 rounded-md">Тренажер активирован</span>
                                <span className="small text-(--color-gray-black)">Осталось попыток: {tokenRemainingAttempts}</span>
                                <Button onClick={() => goTo("trainer")} className="w-full">
                                    Войти в тренажер
                                </Button>
                            </div>
                        )}

                        {showNotification && isDevBypass && (
                            <div className="flex flex-col gap-[1rem] items-center">
                                <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">{"\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0445\u043e\u0434 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u0414\u043b\u044f \u0432\u0445\u043e\u0434\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430."}</span>
                                <Input
                                    type="password"
                                    placeholder={"\u041f\u0430\u0440\u043e\u043b\u044c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430"}
                                    value={bypassPassword}
                                    onChange={(e) => {
                                        setBypassPassword(e.target.value);
                                        setBypassPasswordError("");
                                    }}
                                />
                                {bypassPasswordError && <span className="small text-red-600 block text-center">{bypassPasswordError}</span>}
                                <Button onClick={enterWithDevBypass} className="w-full">
                                    {"\u0412\u043e\u0439\u0442\u0438 \u0432 \u0442\u0440\u0435\u043d\u0430\u0436\u0435\u0440"}
                                </Button>
                            </div>
                        )}

                        {showNotification && (!tokenExists || !hasRegisteredUser) && !isDevBypass && (
                            <span className="big p-3 bg-green-100 text-green-700 rounded-md block text-center">
                                Токен подходит. Заполните форму ниже для активации тренажера.
                            </span>
                        )}

                        {tokenError && !showNotification && !isValidating && (
                            <span className="big p-3 bg-red-100 text-red-700 rounded-md block text-center">{tokenError}</span>
                        )}

                        {isTokenValid && !isDevBypass && (
                            <div className="flex flex-col gap-[0.25rem]">
                                <span className={getRangeClass(value)}>
                                    {value}/{max}
                                </span>
                                <meter id="meter-my" min="0" max={max} low="30" high="80" optimum="100" value={value} className={getRangeClass(value)}></meter>
                            </div>
                        )}
                    </div>

                    {showNotification && (!tokenExists || !hasRegisteredUser) && !isDevBypass && (
                        <>
                            <div className="flex flex-col gap-[0.75rem] w-full">
                                <span className="big">Личные данные</span>
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                                    <div>
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                            Фамилия *
                                        </label>
                                        <input
                                            type="text"
                                            id="lastName"
                                            name="lastName"
                                            value={userData.lastName}
                                            onChange={handleUserDataChange}
                                            className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                            Имя *
                                        </label>
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            value={userData.firstName}
                                            onChange={handleUserDataChange}
                                            className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-1">
                                            Организация *
                                        </label>
                                        <input
                                            type="text"
                                            id="college"
                                            name="college"
                                            value={userData.college}
                                            onChange={handleUserDataChange}
                                            className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    {sessionInfo.tokenType === "session" && sessionInfo.tableCount > 0 && (
                                        <div>
                                            <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                                Выберите ваш стол *
                                            </label>
                                            <select
                                                id="tableNumber"
                                                name="tableNumber"
                                                value={userData.tableNumber}
                                                onChange={handleUserDataChange}
                                                className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
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
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center w-full">
                                <button
                                    onClick={saveData}
                                    disabled={isLoading}
                                    className={`px-8 py-3 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                                    }`}>
                                    {isLoading ? "Сохранение..." : "Сохранить результаты"}
                                </button>
                            </div>

                            {saveSuccess && <div className="mt-6 p-3 bg-green-100 text-green-700 text-center rounded-md">Данные успешно сохранены!</div>}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
