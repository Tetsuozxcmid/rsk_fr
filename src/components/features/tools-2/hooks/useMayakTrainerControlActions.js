import { useCallback } from "react";

export function useMayakTrainerControlActions({
    autoCompleteIntroTask,
    currentTask,
    currentTaskIndex,
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
            if (!currentTask?.toolLink1) return;

            if (currentTask.toolName1 === "\u041f\u0440\u043e\u0439\u0442\u0438 \u0422\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435") {
                e.preventDefault();
                setShowRankingTestPopup(true);
                return;
            }

            if (currentTaskIndex + 1 === 1) {
                e.preventDefault();
                setShowFirstQuestionnaire(true);
                if (isIntroTask(currentTaskIndex)) {
                    autoCompleteIntroTask();
                }
                return;
            }

            if (currentTaskIndex + 1 === 2) {
                e.preventDefault();
                window.open("https://forms.yandex.ru/u/689197c9eb6146293aca92fa/", "_blank");
                if (isIntroTask(currentTaskIndex)) {
                    autoCompleteIntroTask();
                }
                return;
            }

            e.preventDefault();
            window.open(currentTask.toolLink1, "_blank");
        },
        [autoCompleteIntroTask, currentTask, currentTaskIndex, isIntroTask, setShowFirstQuestionnaire, setShowRankingTestPopup]
    );

    return {
        handleCompleteSession,
        handleShowRolePopup,
        handleToolLink1Click,
    };
}
