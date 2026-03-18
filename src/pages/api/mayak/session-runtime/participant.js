import { registerMayakSessionParticipant } from "@/lib/mayakSessionRuntime";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { sessionId, userId, name, organization, tableNumber } = req.body || {};
        const participant = await registerMayakSessionParticipant({
            sessionId: String(sessionId || ""),
            userId: String(userId || ""),
            name: String(name || ""),
            organization: String(organization || ""),
            tableNumber,
        });

        return res.status(200).json({ success: true, data: participant });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Не удалось зарегистрировать участника" });
    }
}
