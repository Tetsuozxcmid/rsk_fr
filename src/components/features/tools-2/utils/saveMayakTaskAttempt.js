import { getUserFromCookies } from "../actions";

export async function saveMayakTaskAttempt({ taskName, minutes, currentTaskIndex, type, userType, who, taskElapsedTime, sectionId }) {
    try {
        const activeUser = getUserFromCookies();
        const payload = {
            user: activeUser?.id || "anonymous",
            userName: activeUser?.name || "Участник",
            taskName,
            taskIndex: currentTaskIndex,
            timestamp: new Date().toISOString(),
            timeSpent: minutes,
            secondsSpent: taskElapsedTime,
            completed: true,
            sectionId,
            taskDetails: {
                type,
                userType,
                who,
            },
        };

        const response = await fetch("/api/mayak/saveTaskAttempt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error saving task attempt:", error);
        return { success: false, error: error.message };
    }
}
