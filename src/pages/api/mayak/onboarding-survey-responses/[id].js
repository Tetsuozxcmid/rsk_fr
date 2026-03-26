import { getMayakOnboardingSurveyResponse, updateMayakOnboardingSurveyResponse } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (req.method === "GET") {
        const response = await getMayakOnboardingSurveyResponse(req.query.id);
        if (!response) {
            return res.status(404).json({ error: { message: "Ответ анкеты не найден" } });
        }
        return res.status(200).json({ response });
    }

    if (req.method === "PATCH") {
        try {
            const response = await updateMayakOnboardingSurveyResponse(req.query.id, {
                answers: req.body?.answers,
                completed: req.body?.completed,
                completedAt: req.body?.completedAt,
                schemaSnapshot: req.body?.schemaSnapshot,
            });
            return res.status(200).json({ response });
        } catch (error) {
            const message = error?.message || "Ответ анкеты не найден";
            return res.status(message.includes("не найден") ? 404 : 400).json({ error: { message } });
        }
    }

    return res.status(405).json({ error: { message: "Method not allowed" } });
}
