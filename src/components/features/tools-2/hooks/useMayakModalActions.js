import { useCallback } from "react";

export function useMayakModalActions({
    autoCompleteIntroTask,
    currentTaskIndex,
    isIntroTask,
    rankingForceRetake,
    saveRankingTest,
    setCompletionTestingDone,
    setInstructionModal,
    setRankingForceRetake,
    setShowRankingTestPopup,
    setShowSessionCompletionPopup,
    setShowThirdQuestionnaire,
}) {
    const handleShowInstruction = useCallback((data) => {
        setInstructionModal(data);
    }, [setInstructionModal]);

    const handleCloseInstructionModal = useCallback(() => {
        setInstructionModal(null);
    }, [setInstructionModal]);

    const handleCloseSessionCompletionPopup = useCallback(() => {
        setShowSessionCompletionPopup(false);
    }, [setShowSessionCompletionPopup]);

    const handleSaveRankingTest = useCallback(
        async (results) => {
            await saveRankingTest(results);
        },
        [saveRankingTest]
    );

    const handleCloseRankingTestPopup = useCallback(() => {
        setShowRankingTestPopup(false);
        if (!rankingForceRetake && isIntroTask(currentTaskIndex)) {
            autoCompleteIntroTask();
        }
        if (rankingForceRetake) {
            setCompletionTestingDone(true);
            setShowThirdQuestionnaire(true);
        }
        setRankingForceRetake(false);
    }, [
        autoCompleteIntroTask,
        currentTaskIndex,
        isIntroTask,
        rankingForceRetake,
        setCompletionTestingDone,
        setRankingForceRetake,
        setShowRankingTestPopup,
        setShowThirdQuestionnaire,
    ]);

    return {
        handleCloseInstructionModal,
        handleCloseRankingTestPopup,
        handleCloseSessionCompletionPopup,
        handleSaveRankingTest,
        handleShowInstruction,
    };
}
