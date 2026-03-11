import { useCallback } from "react";

export function useMayakConfirmationActions({
    hasCompletedSecondQuestionnaire,
    setConfirmationConfig,
    setHasCompletedQuestionnaire,
    setShowConfirmation,
    setShowSecondQuestionnaire,
    setShowThirdQuestionnaire,
    setWho,
}) {
    const showSwitchToWeConfirmation = useCallback(() => {
        setConfirmationConfig({
            title: 'Переход к разделу "МЫ"',
            message: "Вы уверены, что хотите перейти к командной части тренажера?",
            confirmText: "Да, перейти",
            onConfirm: () => {
                setShowConfirmation(false);
                setShowSecondQuestionnaire(true);
                setHasCompletedQuestionnaire(true);
            },
            onCancel: () => {
                setShowConfirmation(false);
                setWho("im");
            },
        });
        setShowConfirmation(true);
    }, [setConfirmationConfig, setHasCompletedQuestionnaire, setShowConfirmation, setShowSecondQuestionnaire, setWho]);

    const showCompleteSessionConfirmation = useCallback(() => {
        setConfirmationConfig({
            title: "Завершение сессии",
            message: 'Подтвердите, что вы завершили прохождение тренажера "МАЯК"',
            confirmText: "Да, завершил(а)",
            onConfirm: () => {
                setShowConfirmation(false);
                setShowThirdQuestionnaire(true);
            },
            onCancel: () => setShowConfirmation(false),
        });
        setShowConfirmation(true);
    }, [setConfirmationConfig, setShowConfirmation, setShowThirdQuestionnaire]);

    const handleSwitchToWe = useCallback(() => {
        if (!hasCompletedSecondQuestionnaire) {
            showSwitchToWeConfirmation();
        } else {
            setWho("we");
        }
    }, [hasCompletedSecondQuestionnaire, setWho, showSwitchToWeConfirmation]);

    return {
        handleSwitchToWe,
        showCompleteSessionConfirmation,
        showSwitchToWeConfirmation,
    };
}
