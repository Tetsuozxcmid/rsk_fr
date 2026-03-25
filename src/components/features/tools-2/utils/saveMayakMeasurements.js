import { getUserFromCookies } from "../actions";

export async function saveMayakMeasurements({ elapsedTime, levels, taskNumber = 3 }) {
    try {
        const activeUser = getUserFromCookies();
        const userKey = activeUser?.id || "anonymous";
        const timestamp = new Date().toISOString();
        const measurementData = {
            taskNumber,
            elapsedTime,
            levels: {
                level1: parseInt(levels.level1, 10) || 0,
                level2: parseInt(levels.level2, 10) || 0,
                level3: parseInt(levels.level3, 10) || 0,
                level4: parseInt(levels.level4, 10) || 0,
                level5: parseInt(levels.level5, 10) || 0,
            },
        };

        const payload = {
            [userKey]: {
                [timestamp]: measurementData,
            },
        };

        const response = await fetch("/api/mayak/saveDeltaTest", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        alert("Измерения успешно сохранены!");
        return result;
    } catch (error) {
        console.error("Ошибка при сохранении измерений:", error);
        alert("Произошла ошибка при сохранении измерений");
        return { success: false, error: error.message };
    }
}
