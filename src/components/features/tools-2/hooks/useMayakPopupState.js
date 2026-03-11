import { useState } from "react";

export const useMayakPopupState = () => {
    const [showRolePopup, setShowRolePopup] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationConfig, setConfirmationConfig] = useState({
        title: "",
        message: "",
        confirmText: "",
        onConfirm: () => {},
        onCancel: () => {},
    });
    const [showCompletionPopup, setShowCompletionPopup] = useState(false);
    const [currentTaskData, setCurrentTaskData] = useState(null);

    return {
        confirmationConfig,
        currentTaskData,
        setConfirmationConfig,
        setCurrentTaskData,
        setShowCompletionPopup,
        setShowConfirmation,
        setShowRolePopup,
        showCompletionPopup,
        showConfirmation,
        showRolePopup,
    };
};
