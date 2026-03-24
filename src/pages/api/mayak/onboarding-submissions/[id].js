import { getMayakOnboardingSubmission, updateMayakOnboardingSubmission } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (req.method === "GET") {
        const submission = await getMayakOnboardingSubmission(req.query.id);
        if (!submission) {
            return res.status(404).json({ error: { message: "Анкета онбординга не найдена" } });
        }
        return res.status(200).json({ submission });
    }

    if (req.method === "PATCH") {
        try {
            const submission = await updateMayakOnboardingSubmission(req.query.id, {
                checklist: req.body?.checklist,
                completed: req.body?.completed,
            });
            return res.status(200).json({ submission });
        } catch (error) {
            return res.status(404).json({ error: { message: error?.message || "Анкета онбординга не найдена" } });
        }
    }

    return res.status(405).json({ error: { message: "Method not allowed" } });
}
