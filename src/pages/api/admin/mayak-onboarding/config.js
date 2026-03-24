import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { getMayakOnboardingConfig, updateMayakOnboardingConfig } from "../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method === "GET") {
        const config = await getMayakOnboardingConfig();
        return res.status(200).json({ success: true, config });
    }

    if (req.method === "PATCH") {
        try {
            const config = await updateMayakOnboardingConfig(req.body?.config || {});
            return res.status(200).json({ success: true, config });
        } catch (error) {
            return res.status(400).json({ success: false, error: error?.message || "Некорректная структура конфигурации" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
