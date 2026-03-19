import { useCallback } from "react";

import { blobToBase64, buildMayakSessionArtifacts } from "../utils/mayakSessionArtifacts";
import { clearMayakSessionCompletionState, executeMayakSessionCompletion } from "../utils/mayakSessionCompletion";
import { buildMayakCertificateBlob, buildMayakQrDataUrl, buildMayakSessionLogBlob, downloadMayakBlob } from "../utils/mayakSessionDocuments";
import { getUserFromCookies } from "../actions";

const ENABLE_MAYAK_TELEGRAM_COMPLETION_DELIVERY = false;

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
            const userName = userData?.name || "Участник";
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
            const userName = userData?.name || "Участник";
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
            const userName = userData?.name || "Участник";
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
            const userName = userData?.name || "Участник";
            const dateStr = new Date().toLocaleDateString("ru-RU");
            const userId = userData?.id || "";
            const qrDataUrl = await buildMayakQrDataUrl(userId);
            const certBlob = await buildMayakCertificateBlob({ userName, dateStr, qrDataUrl });
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

            if (!res.ok) throw new Error("Ошибка подготовки сессии");

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

    const handleSaveSessionCompletion = useCallback(async () => {
        setTelegramLoading(true);

        try {
            await executeMayakSessionCompletion({
                elapsedTime,
                levels,
                onDownloadAnalytics: handleDownloadAnalytics,
                onDownloadCertificate: handleDownloadCertificate,
                onDownloadLogs: handleDownloadLogs,
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
            alert("Произошла ошибка. Если сертификат не скачался, проверьте папку загрузок.");
            window.location.href = "/";
        }
    }, [elapsedTime, getStorageKey, handleDownloadAnalytics, handleDownloadCertificate, handleDownloadLogs, handleSendToTelegram, levels, removeKeyCookie, resetQwenSessionState, setSelectedRole, setShowSessionCompletionPopup, setShowThirdQuestionnaire, setTelegramLoading]);

    return {
        handleDownloadAnalytics,
        handleDownloadCertificate,
        handleDownloadLogs,
        handleSaveSessionCompletion,
        handleSendToTelegram,
    };
};
