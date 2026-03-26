import { createMayakOnboardingSurveyResponse } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    try {
        const response = await createMayakOnboardingSurveyResponse({
            slug: req.body?.slug,
            answers: req.body?.answers,
            completed: req.body?.completed ?? true,
        });
        return res.status(201).json({ response });
    } catch (error) {
        const message = error?.message || "Не удалось сохранить анкету";
        const status = message.includes("не найдена") ? 404 : 400;
        return res.status(status).json({ error: { message } });
    }
}
