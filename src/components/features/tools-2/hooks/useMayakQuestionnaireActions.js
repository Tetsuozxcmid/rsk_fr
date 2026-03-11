import { useCallback } from "react";
import { saveMayakQuestionnaire } from "../utils/saveMayakQuestionnaire";
import { saveMayakMeasurements } from "../utils/saveMayakMeasurements";

export function useMayakQuestionnaireActions({
    getStorageKey,
    levels,
    setHasCompletedSecondQuestionnaire,
    setLevels,
    timerElapsedTime,
}) {
    const saveQuestionnaire = useCallback(
        async (questionnaireType, data) => {
            return saveMayakQuestionnaire({
                questionnaireType,
                data,
                storageKey: getStorageKey("hasCompletedSecondQuestionnaire"),
                onSecondCompleted: () => setHasCompletedSecondQuestionnaire(true),
            });
        },
        [getStorageKey, setHasCompletedSecondQuestionnaire]
    );

    const saveMeasurements = useCallback(async () => {
        return saveMayakMeasurements({
            elapsedTime: timerElapsedTime,
            levels,
            taskNumber: 3,
        });
    }, [levels, timerElapsedTime]);

    const handleLevelChange = useCallback(
        (level, value) => {
            setLevels((prev) => ({
                ...prev,
                [level]: value,
            }));
        },
        [setLevels]
    );

    return {
        handleLevelChange,
        saveMeasurements,
        saveQuestionnaire,
    };
}
