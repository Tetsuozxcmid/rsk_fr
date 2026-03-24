import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { getMayakOnboardingDashboard } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const links = await getMayakOnboardingDashboard();
    return res.status(200).json({ success: true, links });
}
