export async function saveMayakRankingTest({ results, setRankingDelta5 }) {
    try {
        if (results?.level5?.delta !== undefined) {
            setRankingDelta5(results.level5.delta);
        }

        const activeUser =
            document.cookie
                .split("; ")
                .find((row) => row.startsWith("active_user="))
                ?.split("=")[1] || "anonymous";

        const payload = {
            date: new Date().toISOString(),
            user: activeUser,
            type: "ranking_test",
            results,
            totalDelta: Object.values(results).reduce((sum, r) => sum + r.delta, 0),
        };

        await fetch("/api/mayak/saveDeltaTest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        console.error("?????? ?????????? ??????????? ????????????:", err);
    }
}
