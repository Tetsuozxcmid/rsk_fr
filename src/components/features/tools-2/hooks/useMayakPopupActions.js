import { useCallback } from "react";

export function useMayakPopupActions({
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
        window.open("https://forms.yandex.ru/u/6891bb8002848f2a56f5e978/", "_blank");
        setCompletionSurveyDone(true);
    }, [setCompletionSurveyDone]);

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
