export async function saveMayakQuestionnaire({ questionnaireType, data, storageKey, onSecondCompleted }) {
    try {
        const activeUser =
            document.cookie
                .split("; ")
                .find((row) => row.startsWith("active_user="))
                ?.split("=")[1] || "anonymous";

        const response = await fetch("/api/mayak/saveQuestionnaire", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: decodeURIComponent(activeUser),
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
