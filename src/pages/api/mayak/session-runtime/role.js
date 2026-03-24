import { setMayakSessionParticipantRole } from "@/lib/mayakSessionRuntime";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { sessionId, userId, role } = req.body || {};
        const participant = await setMayakSessionParticipantRole({
            sessionId: String(sessionId || ""),
            userId: String(userId || ""),
            role: String(role || ""),
        });
        return res.status(200).json({ success: true, data: participant });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Не удалось сохранить роль" });
    }
}
