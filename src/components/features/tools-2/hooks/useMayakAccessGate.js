import { useEffect, useState } from "react";

import { getKeyFromCookies } from "../actions";

export const useMayakAccessGate = ({ getStorageKey, goTo }) => {
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [tokenTaskRange, setTokenTaskRange] = useState(null);
    const [tokenSectionId, setTokenSectionId] = useState(null);
    const [sessionStartTime, setSessionStartTime] = useState(null);

    useEffect(() => {
        async function checkToken() {
            const keyInCookies = await getKeyFromCookies();
            const token = keyInCookies?.text;

            if (!token) {
                goTo("settings");
                return;
            }
            try {
                const response = await fetch(`/api/mayak/validate-token?token=${encodeURIComponent(token)}`);
                const data = await response.json();

                if (data.valid || (data.isExhausted && data.isActive)) {
                    let isAuthenticatedAdminBypass = false;
                    if (data.isBypass) {
                        const adminResponse = await fetch("/api/admin/mayak-auth");
                        const adminData = await adminResponse.json().catch(() => ({}));
                        isAuthenticatedAdminBypass = Boolean(adminResponse.ok && adminData.authenticated);
                        if (!isAuthenticatedAdminBypass) {
                            goTo("settings");
                            return;
                        }
                    }

                    setIsTokenValid(true);
                    setIsAdmin(isAuthenticatedAdminBypass);

                    const existingSessionStartTime = localStorage.getItem(getStorageKey("sessionStartTime"));
                    if (!existingSessionStartTime) {
                        const nextSessionStartTime = Date.now().toString();
                        localStorage.setItem(getStorageKey("sessionStartTime"), nextSessionStartTime);
                        localStorage.removeItem(getStorageKey("session_tasks_log"));
                        setSessionStartTime(nextSessionStartTime);
                    } else {
                        setSessionStartTime(existingSessionStartTime);
                    }

                    if (data.sectionId) {
                        setTokenSectionId(data.sectionId);
                    }
                    if (data.taskRange) {
                        setTokenTaskRange(data.taskRange);
                    }
                } else {
                    console.warn("Токен недействителен:", data.error);
                    goTo("settings");
                }
            } catch (error) {
                console.error("Ошибка проверки токена:", error);
                goTo("settings");
            }
        }
        checkToken();
    }, [getStorageKey, goTo]);

    return {
        isAdmin,
        isTokenValid,
        tokenTaskRange,
        tokenSectionId,
        sessionStartTime,
    };
};
