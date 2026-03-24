import { createMayakOnboardingSubmission } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    try {
        const submission = await createMayakOnboardingSubmission({
            slug: req.body?.slug,
            kind: req.body?.kind,
            name: req.body?.name,
            contact: req.body?.contact,
        });
        return res.status(201).json({ submission });
    } catch (error) {
        const message = error?.message || "Не удалось начать онбординг";
        const status = message.includes("не найдена") ? 404 : 400;
        return res.status(status).json({ error: { message } });
    }
}
