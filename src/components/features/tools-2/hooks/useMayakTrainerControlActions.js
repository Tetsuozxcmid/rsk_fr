import { useCallback } from "react";

export function useMayakTrainerControlActions({
    autoCompleteIntroTask,
    currentTask,
    currentTaskIndex,
    introQuestionnaireUrl,
    isIntroTask,
    setShowFirstQuestionnaire,
    setShowRankingTestPopup,
    setShowRolePopup,
    setShowThirdQuestionnaire,
}) {
    const handleCompleteSession = useCallback(() => {
        setShowThirdQuestionnaire(true);
    }, [setShowThirdQuestionnaire]);

    const handleShowRolePopup = useCallback(() => {
        setShowRolePopup(true);
    }, [setShowRolePopup]);

    const handleToolLink1Click = useCallback(
        (e) => {
            const hasToolLink = !!currentTask?.toolLink1;
            const introQuestionnaireLink = typeof introQuestionnaireUrl === "string" ? introQuestionnaireUrl.trim() : "";
            const isIntroQuestionnaireTask = isIntroTask(currentTaskIndex) && currentTask?.toolName1 === "Входная анкета";

            if (currentTask?.toolName1 === "Пройти Тестирование") {
                e.preventDefault();
                setShowRankingTestPopup(true);
                return;
            }

            if (!hasToolLink && !isIntroQuestionnaireTask) return;

            if (currentTaskIndex + 1 === 1) {
                e.preventDefault();
                setShowFirstQuestionnaire(true);
                if (isIntroTask(currentTaskIndex)) {
                    autoCompleteIntroTask();
                }
                return;
            }

            if (isIntroQuestionnaireTask) {
                e.preventDefault();
                const targetUrl = introQuestionnaireLink;
                if (!targetUrl) {
                    alert("Ссылка на входную анкету не настроена.");
                    return;
                }
                window.open(targetUrl, "_blank");
                autoCompleteIntroTask();
                return;
            }

            e.preventDefault();
            window.open(currentTask.toolLink1, "_blank");
        },
        [autoCompleteIntroTask, currentTask, currentTaskIndex, introQuestionnaireUrl, isIntroTask, setShowFirstQuestionnaire, setShowRankingTestPopup]
    );

    return {
        handleCompleteSession,
        handleShowRolePopup,
        handleToolLink1Click,
    };
}

