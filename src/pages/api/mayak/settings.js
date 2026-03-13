import { getMayakQuestionnaireSettings, readMayakSettings } from "../../../lib/mayakSettings.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const settings = await readMayakSettings();
        return res.status(200).json({
            success: true,
            data: {
                questionnaires: getMayakQuestionnaireSettings(settings),
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
