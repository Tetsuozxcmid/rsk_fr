import { useCallback } from "react";

import { buildMayakSessionArtifacts } from "../utils/mayakSessionArtifacts";
import { clearMayakSessionCompletionState, saveMayakCompletionDelta } from "../utils/mayakSessionCompletion";
import { buildMayakCertificateBlob, buildMayakQrDataUrl, buildMayakSessionLogBlob, downloadMayakBlob } from "../utils/mayakSessionDocuments";
import { getUserFromCookies } from "../actions";

const ENABLE_MAYAK_TELEGRAM_COMPLETION_DELIVERY = false;

function triggerDownload(url) {
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    const buildCompletionLogData = useCallback(async () => {
        const userData = getUserFromCookies();
        const dateStr = new Date().toLocaleDateString("ru-RU");
        const { rankingData, enrichedTasks, totalSessionSeconds } = await buildMayakSessionArtifacts({
            getStorageKey,
            tokenSectionId,
        });

        return {
            userName: userData?.name || "Участник",
            userRole: selectedRole,
            date: dateStr,
            totalTime: formatTaskTime(totalSessionSeconds),
            rankingData,
            tasks: enrichedTasks,
        };
    }, [formatTaskTime, getStorageKey, selectedRole, tokenSectionId]);

    const handleDownloadLogs = useCallback(async () => {
        try {
            const logData = await buildCompletionLogData();
            const blobLogs = await buildMayakSessionLogBlob({
                userName: logData.userName,
                userRole: logData.userRole,
                dateStr: logData.date,
                totalTime: logData.totalTime,
                rankingData: logData.rankingData,
                tasks: logData.tasks,
            });
            downloadMayakBlob(blobLogs, `Log_Mayak_${logData.userName.replace(/\s+/g, "_")}_${logData.date}.pdf`);
        } catch (error) {
            console.error("Ошибка при генерации логов:", error);
        }
    }, [buildCompletionLogData]);

    const handleDownloadCertificate = useCallback(async () => {
        try {
            const userData = getUserFromCookies();
            const userName = userData?.name || "Участник";
            const userId = userData?.id || "";
            const qrDataUrl = await buildMayakQrDataUrl(userId);
            const blobCert = await buildMayakCertificateBlob({ userName, qrDataUrl });
            downloadMayakBlob(blobCert, `Certificate_Mayak_${userName.replace(/\s+/g, "_")}.pdf`);
        } catch (error) {
            console.error("Ошибка при генерации сертификата:", error);
        }
    }, []);

    const handleDownloadAnalytics = useCallback(async () => {
        try {
            const logData = await buildCompletionLogData();
            const response = await fetch("/api/mayak/session-analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logData }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || "Не удалось сформировать аналитику");
            }

            const analyticsBlob = await response.blob();
            downloadMayakBlob(analyticsBlob, `Analytics_Mayak_${logData.userName.replace(/\s+/g, "_")}_${logData.date}.pdf`);
        } catch (error) {
            console.error("Ошибка при генерации аналитики:", error);
        }
    }, [buildCompletionLogData]);

    const handleSendToTelegram = useCallback(async () => {
        if (!ENABLE_MAYAK_TELEGRAM_COMPLETION_DELIVERY) {
            return;
        }
        setTelegramLoading(true);
        try {
            setTelegramLink("");
        } finally {
            setTelegramLoading(false);
        }
    }, [setTelegramLink, setTelegramLoading]);

    const handleSaveSessionCompletion = useCallback(async () => {
        setTelegramLoading(true);

        try {
            await saveMayakCompletionDelta({
                elapsedTime,
                levels,
            }).catch((error) => console.error("Ошибка сохранения MAYAK delta test:", error));

            const logData = await buildCompletionLogData();
            const response = await fetch("/api/mayak/completions/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logData,
                    selectedRole,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "Не удалось сохранить историю MAYAK");
            }

            triggerDownload(payload.data.files.certificate);
            triggerDownload(payload.data.files.log);
            triggerDownload(payload.data.files.analytics);

            await new Promise((resolve) => setTimeout(resolve, 1500));
            clearMayakSessionCompletionState({
                getStorageKey,
                removeKeyCookie,
                resetQwenSessionState,
                setSelectedRole,
                setShowSessionCompletionPopup,
                setShowThirdQuestionnaire,
            });
            window.location.href = "/";
        } catch (error) {
            console.error("Ошибка в процессе завершения:", error);
            alert(error.message || "Не удалось завершить сессию MAYAK.");
        } finally {
            setTelegramLoading(false);
        }
    }, [buildCompletionLogData, elapsedTime, getStorageKey, levels, removeKeyCookie, resetQwenSessionState, selectedRole, setSelectedRole, setShowSessionCompletionPopup, setShowThirdQuestionnaire, setTelegramLoading]);

    return {
        handleDownloadAnalytics,
        handleDownloadCertificate,
        handleDownloadLogs,
        handleSaveSessionCompletion,
        handleSendToTelegram,
    };
};
