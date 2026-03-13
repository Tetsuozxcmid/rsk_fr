import { useCallback } from "react";

export function useMayakPopupActions({
    completionSurveyUrl,
    handleSaveSessionCompletion,
    saveQuestionnaire,
    setCompletionSurveyDone,
    setShowSecondQuestionnaire,
    setShowThirdQuestionnaire,
    setWho,
}) {
    const handleCloseSecondQuestionnaire = useCallback(() => {
        setShowSecondQuestionnaire(false);
        setWho("we");
    }, [setShowSecondQuestionnaire, setWho]);

    const handleSubmitSecondQuestionnaire = useCallback(
        async (data) => {
            await saveQuestionnaire("Second", data);
            setWho("we");
        },
        [saveQuestionnaire, setWho]
    );

    const handleCloseThirdQuestionnaire = useCallback(() => {
        setShowThirdQuestionnaire(false);
    }, [setShowThirdQuestionnaire]);

    const handleOpenCompletionTesting = useCallback(() => {
        window.__openRankingTestPopup && window.__openRankingTestPopup();
    }, []);

    const handleOpenCompletionSurvey = useCallback(() => {
        const targetUrl = typeof completionSurveyUrl === "string" ? completionSurveyUrl.trim() : "";
        if (!targetUrl) {
            alert("Ссылка на выходную анкету не настроена.");
            return;
        }
        window.open(targetUrl, "_blank");
        setCompletionSurveyDone(true);
    }, [completionSurveyUrl, setCompletionSurveyDone]);

    const handleGetCompletionCertificate = useCallback(() => {
        handleSaveSessionCompletion();
    }, [handleSaveSessionCompletion]);

    return {
        handleCloseSecondQuestionnaire,
        handleCloseThirdQuestionnaire,
        handleGetCompletionCertificate,
        handleOpenCompletionSurvey,
        handleOpenCompletionTesting,
        handleSubmitSecondQuestionnaire,
    };
}
