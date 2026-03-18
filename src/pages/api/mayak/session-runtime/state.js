import { getMayakSessionRuntimeState } from "@/lib/mayakSessionRuntime";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const sessionId = String(req.query.sessionId || "");
        const userId = String(req.query.userId || "");
        if (!sessionId || !userId) {
            return res.status(400).json({ success: false, error: "Нужны sessionId и userId" });
        }

        const state = await getMayakSessionRuntimeState({ sessionId, userId });
        return res.status(200).json({ success: true, data: state });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Не удалось получить состояние сессии" });
    }
}
