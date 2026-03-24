import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { deleteMayakOnboardingLink, getMayakOnboardingDashboard } from "../../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method !== "DELETE") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        await deleteMayakOnboardingLink(req.query.id);
        const links = await getMayakOnboardingDashboard();
        return res.status(200).json({ success: true, links });
    } catch (error) {
        return res.status(404).json({ success: false, error: error?.message || "Ссылка не найдена" });
    }
}
