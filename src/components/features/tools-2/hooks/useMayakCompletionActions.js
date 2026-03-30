import { useCallback } from "react";

import { blobToBase64, buildMayakSessionArtifacts } from "../utils/mayakSessionArtifacts";
import { clearMayakSessionCompletionState, executeMayakSessionCompletion } from "../utils/mayakSessionCompletion";
import { buildMayakCertificateBlob, buildMayakQrDataUrl, buildMayakSessionLogBlob, downloadMayakBlob } from "../utils/mayakSessionDocuments";
import { getKeyFromCookies, getUserFromCookies } from "../actions";

const ENABLE_MAYAK_TELEGRAM_COMPLETION_DELIVERY = false;

function buildFullMayakName(userData) {
    const explicitParts = [userData?.lastName, userData?.firstName, userData?.patronymic]
        .map((item) => String(item || "").trim())
        .filter(Boolean);

    if (explicitParts.length > 0) {
        return explicitParts.join(" ");
    }

    return String(userData?.name || "").trim() || "Участник";
}

function buildCertificateMayakName(userData) {
    const explicitParts = [userData?.lastName, userData?.firstName]
        .map((item) => String(item || "").trim())
        .filter(Boolean);

    if (explicitParts.length > 0) {
        return explicitParts.join(" ");
    }

    const fallbackName = buildFullMayakName(userData);
    const fallbackParts = fallbackName.split(/\s+/).filter(Boolean);

    if (fallbackParts.length >= 2) {
        return fallbackParts.slice(0, 2).join(" ");
    }

    return fallbackName;
}

function buildSafeMayakFilePart(value) {
    const prepared = String(value || "")
        .trim()
        .replace(/[^\p{L}\p{N}_-]+/gu, "_")
        .replace(/^_+|_+$/g, "");

    return prepared || "Participant";
}

export const useMayakCompletionActions = ({
    elapsedTime,
    getStorageKey,
    levels,
    removeKeyCookie,
    resetQwenSessionState,
    selectedRole,
    setSelectedRole,
    setShowSessionCompletionPopup,
    setShowThirdQuestionnaire,
    setTelegramLink,
    setTelegramLoading,
    tokenSectionId,
}) => {
    const formatTaskTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }, []);

    const handleDownloadLogs = useCallback(async () => {
        try {
            const userData = getUserFromCookies();
            const userName = buildFullMayakName(userData);
            const dateStr = new Date().toLocaleDateString("ru-RU");
            const { rankingData, enrichedTasks, totalSessionSeconds } = await buildMayakSessionArtifacts({
                getStorageKey,
                tokenSectionId,
            });
            const blobLogs = await buildMayakSessionLogBlob({
                userName,
                userRole: selectedRole,
                dateStr,
                totalTime: formatTaskTime(totalSessionSeconds),
                rankingData,
                tasks: enrichedTasks,
            });
            downloadMayakBlob(blobLogs, `Log_Mayak_${userName.replace(/\s+/g, "_")}_${dateStr}.pdf`);
        } catch (error) {
            console.error("Ошибка при генерации логов:", error);
        }
    }, [formatTaskTime, getStorageKey, selectedRole, tokenSectionId]);

    const handleDownloadCertificate = useCallback(async () => {
        try {
            const userData = getUserFromCookies();
            const userName = buildCertificateMayakName(userData);
            const dateStr = new Date().toLocaleDateString("ru-RU");
            const userId = userData?.id || "";
            const qrDataUrl = await buildMayakQrDataUrl(userId);
            const blobCert = await buildMayakCertificateBlob({ userName, dateStr, qrDataUrl });
            downloadMayakBlob(blobCert, `Certificate_Mayak_${userName.replace(/\s+/g, "_")}.pdf`);
        } catch (error) {
            console.error("Ошибка при генерации сертификата:", error);
        }
    }, []);

    const handleDownloadAnalytics = useCallback(async () => {
        try {
            const userData = getUserFromCookies();
            const userName = buildFullMayakName(userData);
            const dateStr = new Date().toLocaleDateString("ru-RU");
            const { rankingData, enrichedTasks, totalSessionSeconds } = await buildMayakSessionArtifacts({
                getStorageKey,
                tokenSectionId,
            });
            const totalTime = formatTaskTime(totalSessionSeconds);

            const res = await fetch("/api/mayak/session-analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logData: {
                        userName,
                        userRole: selectedRole,
                        date: dateStr,
                        totalTime,
                        rankingData,
                        tasks: enrichedTasks,
                    },
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || "Не удалось сформировать аналитику");
            }

            const analyticsBlob = await res.blob();
            downloadMayakBlob(analyticsBlob, `Analytics_Mayak_${userName.replace(/\s+/g, "_")}_${dateStr}.pdf`);
        } catch (error) {
            console.error("Ошибка при генерации аналитики:", error);
        }
    }, [formatTaskTime, getStorageKey, selectedRole, tokenSectionId]);

    const handleSendToTelegram = useCallback(async () => {
        if (!ENABLE_MAYAK_TELEGRAM_COMPLETION_DELIVERY) {
            return;
        }

        setTelegramLoading(true);

        try {
            const userData = getUserFromCookies();
            const userName = buildFullMayakName(userData);
            const dateStr = new Date().toLocaleDateString("ru-RU");
            const userId = userData?.id || "";
            const qrDataUrl = await buildMayakQrDataUrl(userId);
            const certBlob = await buildMayakCertificateBlob({
                userName: buildCertificateMayakName(userData),
                dateStr,
                qrDataUrl,
            });
            const { rankingData, enrichedTasks, totalSessionSeconds } = await buildMayakSessionArtifacts({
                getStorageKey,
                tokenSectionId,
            });
            const totalTime = formatTaskTime(totalSessionSeconds);
            const logBlob = await buildMayakSessionLogBlob({
                userName,
                userRole: selectedRole,
                dateStr,
                totalTime,
                rankingData,
                tasks: enrichedTasks,
            });

            const certBase64 = await blobToBase64(certBlob);
            const logBase64 = await blobToBase64(logBlob);

            const res = await fetch("/api/mayak/telegram-prepare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userName,
                    certificate: certBase64,
                    log: logBase64,
                    logData: {
                        userName,
                        userRole: selectedRole,
                        date: dateStr,
                        totalTime,
                        rankingData,
                        tasks: enrichedTasks,
                    },
                }),
            });

            if (!res.ok) {
                throw new Error("Ошибка подготовки сессии");
            }

            const { deepLink } = await res.json();
            setTelegramLink(deepLink);
            window.open(deepLink, "_blank");
        } catch (error) {
            console.error("Ошибка отправки в Telegram:", error);
            alert("Не удалось подготовить файлы для Telegram. Попробуйте ещё раз.");
        } finally {
            setTelegramLoading(false);
        }
    }, [formatTaskTime, getStorageKey, selectedRole, setTelegramLink, setTelegramLoading, tokenSectionId]);

    const handleSaveArtifactsToProfile = useCallback(async () => {
        const activeUser = getUserFromCookies();
        const activeKey = await getKeyFromCookies();
        const fullUserName = buildFullMayakName(activeUser);
        const certificateUserName = buildCertificateMayakName(activeUser);
        const safeNamePart = buildSafeMayakFilePart(fullUserName);
        const dateStr = new Date().toLocaleDateString("ru-RU");
        const fileStamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\.\d+Z$/, "Z");
        const userId = activeUser?.id || "";

        if (!activeKey?.text) {
            throw new Error("Не найден активный токен MAYAK");
        }

        if (!userId) {
            throw new Error("Не найден активный пользователь MAYAK");
        }

        const qrDataUrl = await buildMayakQrDataUrl(userId);
        const certificateBlob = await buildMayakCertificateBlob({
            userName: certificateUserName,
            dateStr,
            qrDataUrl,
        });

        const { rankingData, enrichedTasks, totalSessionSeconds } = await buildMayakSessionArtifacts({
            getStorageKey,
            tokenSectionId,
        });
        const totalTime = formatTaskTime(totalSessionSeconds);
        const logData = {
            userName: fullUserName,
            userRole: selectedRole,
            date: dateStr,
            totalTime,
            rankingData,
            tasks: enrichedTasks,
        };

        const logBlob = await buildMayakSessionLogBlob({
            userName: fullUserName,
            userRole: selectedRole,
            dateStr,
            totalTime,
            rankingData,
            tasks: enrichedTasks,
        });

        let analyticsBlob = null;

        try {
            const analyticsResponse = await fetch("/api/mayak/session-analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logData }),
            });

            if (!analyticsResponse.ok) {
                const payload = await analyticsResponse.json().catch(() => ({}));
                throw new Error(payload.error || "Не удалось сформировать аналитический отчёт");
            }

            analyticsBlob = await analyticsResponse.blob();
        } catch (error) {
            console.error("Не удалось сформировать аналитику MAYAK, сохраняем остальные материалы:", error);
        }
        const filesToSave = [
            {
                kind: "certificate",
                fileName: `Certificate_Mayak_${safeNamePart}_${fileStamp}.pdf`,
                contentType: "application/pdf",
                base64: await blobToBase64(certificateBlob),
            },
            {
                kind: "log",
                fileName: `Log_Mayak_${safeNamePart}_${fileStamp}.pdf`,
                contentType: "application/pdf",
                base64: await blobToBase64(logBlob),
            },
        ];

        if (analyticsBlob) {
            filesToSave.push({
                kind: "analytics",
                fileName: `Analytics_Mayak_${safeNamePart}_${fileStamp}.pdf`,
                contentType: "application/pdf",
                base64: await blobToBase64(analyticsBlob),
            });
        }

        const saveResponse = await fetch("/api/profile/mayak-artifacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                key: activeKey.text,
                completedAt: new Date().toISOString(),
                sectionId: tokenSectionId,
                role: selectedRole,
                sessionId: activeUser?.sessionId || "",
                tableNumber: activeUser?.tableNumber || "",
                tokenType: activeUser?.tokenType || "legacy",
                files: filesToSave,
            }),
        });

        if (!saveResponse.ok) {
            const payload = await saveResponse.json().catch(() => ({}));
            throw new Error(payload.error || "Не удалось сохранить материалы в личном кабинете");
        }

        return saveResponse.json().catch(() => ({}));
    }, [formatTaskTime, getStorageKey, selectedRole, tokenSectionId]);

    const handleSaveSessionCompletion = useCallback(async () => {
        setTelegramLoading(true);

        try {
            await executeMayakSessionCompletion({
                elapsedTime,
                levels,
                onPersistArtifacts: handleSaveArtifactsToProfile,
                onSendToTelegram: handleSendToTelegram,
                onClearState: () =>
                    clearMayakSessionCompletionState({
                        getStorageKey,
                        removeKeyCookie,
                        resetQwenSessionState,
                        setSelectedRole,
                        setShowSessionCompletionPopup,
                        setShowThirdQuestionnaire,
                    }),
            });
        } catch (error) {
            console.error("Ошибка в процессе завершения:", error);
            alert(error.message || "Не удалось сохранить материалы MAYAK в личном кабинете.");
        } finally {
            setTelegramLoading(false);
        }
    }, [elapsedTime, getStorageKey, handleSaveArtifactsToProfile, handleSendToTelegram, levels, removeKeyCookie, resetQwenSessionState, setSelectedRole, setShowSessionCompletionPopup, setShowThirdQuestionnaire, setTelegramLoading]);

    return {
        handleDownloadAnalytics,
        handleDownloadCertificate,
        handleDownloadLogs,
        handleSaveSessionCompletion,
        handleSendToTelegram,
    };
};
