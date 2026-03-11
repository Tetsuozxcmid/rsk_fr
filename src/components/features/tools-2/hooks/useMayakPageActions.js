import { useCallback } from "react";

export function useMayakPageActions({ goTo, handleSubmitSecondQuestionnaire, setShowRolePopup }) {
    const handleOpenHistory = useCallback(() => {
        sessionStorage.setItem("previousPage", "trainer");
        goTo("history");
    }, [goTo]);

    const handleCloseRolePopup = useCallback(() => {
        setShowRolePopup(false);
    }, [setShowRolePopup]);

    const handleSubmitSecondQuestionnaireWithFeedback = useCallback(
        async (data) => {
            try {
                await handleSubmitSecondQuestionnaire(data);
            } catch (error) {
                console.error("?????? ??????????:", error);
                alert("????????? ?????? ??? ??????????. ?????????? ??? ???.");
            }
        },
        [handleSubmitSecondQuestionnaire]
    );

    return {
        handleCloseRolePopup,
        handleOpenHistory,
        handleSubmitSecondQuestionnaireWithFeedback,
    };
}
