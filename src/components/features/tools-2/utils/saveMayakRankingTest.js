import { getUserFromCookies } from "../actions";

export async function saveMayakRankingTest({ results, setRankingDelta5 }) {
    try {
        if (results?.level5?.delta !== undefined) {
            setRankingDelta5(results.level5.delta);
        }

        const activeUser = getUserFromCookies();
        const payload = {
            date: new Date().toISOString(),
            user: activeUser?.id || "anonymous",
            userName: activeUser?.name || "Участник",
            type: "ranking_test",
            results,
            totalDelta: Object.values(results).reduce((sum, result) => sum + result.delta, 0),
        };

        await fetch("/api/mayak/saveDeltaTest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Ошибка сохранения результатов ранжирования:", error);
    }
}
