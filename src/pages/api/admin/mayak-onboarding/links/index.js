import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { createMayakOnboardingLink, getMayakOnboardingDashboard } from "../../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        await createMayakOnboardingLink(req.body || {});
        const links = await getMayakOnboardingDashboard();
        return res.status(201).json({ success: true, links });
    } catch (error) {
        return res.status(400).json({ success: false, error: error?.message || "Не удалось создать ссылку" });
    }
}
