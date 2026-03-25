import { getUserFromCookies } from "../actions";

export async function saveMayakQuestionnaire({ questionnaireType, data, storageKey, onSecondCompleted }) {
    try {
        const activeUser = getUserFromCookies();

        const response = await fetch("/api/mayak/saveQuestionnaire", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: activeUser?.id || "anonymous",
                userName: activeUser?.name || "Участник",
                questionnaireType,
                data,
            }),
        });

        if (!response.ok) {
            throw new Error("Ошибка сохранения");
        }

        if (questionnaireType === "Second") {
            localStorage.setItem(storageKey, "true");
            if (typeof onSecondCompleted === "function") {
                onSecondCompleted();
            }
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка:", error);
        throw error;
    }
}
