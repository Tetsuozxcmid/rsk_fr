import { getMayakOnboardingLinkBySlug, getMayakOnboardingLinkSummary } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    const link = await getMayakOnboardingLinkBySlug(req.query.slug);
    if (!link || link.status !== "active") {
        return res.status(404).json({ error: { message: "Ссылка онбординга не найдена" } });
    }

    const summary = await getMayakOnboardingLinkSummary(link.id);
    return res.status(200).json({ link, summary });
}
