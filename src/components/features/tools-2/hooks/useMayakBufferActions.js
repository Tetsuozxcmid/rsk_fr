import { useCallback } from "react";
import { appendMayakBufferValue, ensureMayakBufferOptions, saveMayakBuffer } from "../utils/mayakBufferStorage";

export function useMayakBufferActions({
    buffer,
    contentTypeOptions,
    currentField,
    fields,
    getStorageKey,
    handleChange,
    setBuffer,
    setCurrentField,
    setSavedField,
    setShowBuffer,
    type,
}) {
    const handleCloseBuffer = useCallback(() => {
        setShowBuffer(false);
        setCurrentField(null);
    }, [setCurrentField, setShowBuffer]);

    const handleUpdateBuffer = useCallback(
        (newBuffer) => {
            setBuffer(newBuffer);
            saveMayakBuffer(getStorageKey("buffer"), newBuffer);
        },
        [getStorageKey, setBuffer]
    );

    const handleAddToBuffer = useCallback(
        (code) => {
            const nextBuffer = appendMayakBufferValue(buffer, code, fields[code]);

            if (nextBuffer !== buffer) {
                setBuffer(nextBuffer);
                saveMayakBuffer(getStorageKey("buffer"), nextBuffer);
            }

            setSavedField(code);
            setTimeout(() => setSavedField(null), 1000);
        },
        [buffer, fields, getStorageKey, setBuffer, setSavedField]
    );

    const handleInsertFromBuffer = useCallback(
        (text) => {
            if (currentField) {
                handleChange(currentField, text);
            }
            handleCloseBuffer();
        },
        [currentField, handleChange, handleCloseBuffer]
    );

    const handleShowBufferForField = useCallback(
        (code) => {
            setCurrentField(code);

            const nextBuffer = ensureMayakBufferOptions({
                buffer,
                code,
                type,
                contentTypeOptions,
            });

            if (nextBuffer !== buffer) {
                setBuffer(nextBuffer);
                saveMayakBuffer(getStorageKey("buffer"), nextBuffer);
            }

            setShowBuffer(true);
        },
        [buffer, contentTypeOptions, getStorageKey, setBuffer, setCurrentField, setShowBuffer, type]
    );

    return {
        handleAddToBuffer,
        handleCloseBuffer,
        handleInsertFromBuffer,
        handleShowBufferForField,
        handleUpdateBuffer,
    };
}
