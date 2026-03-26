import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { getMayakOnboardingSurveyResults } from "../../../../../lib/mayakOnboarding.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const linkId = String(req.query.linkId || "").trim();
    const responses = await getMayakOnboardingSurveyResults(linkId);
    return res.status(200).json({ success: true, responses });
}
