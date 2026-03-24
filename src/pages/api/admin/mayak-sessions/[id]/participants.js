import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { listMayakSessionParticipants, setMayakSessionParticipantRole } from "../../../../../lib/mayakSessionRuntime.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    const sessionId = String(req.query?.id || "");

    if (req.method === "GET") {
        try {
            const participants = await listMayakSessionParticipants(sessionId);
            return res.status(200).json({ success: true, data: participants });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432 \u0441\u0435\u0441\u0441\u0438\u0438" });
        }
    }

    if (req.method === "PATCH") {
        try {
            const { userId, role } = req.body || {};
            const participant = await setMayakSessionParticipantRole({
                sessionId,
                userId: String(userId || ""),
                role: String(role || ""),
            });
            return res.status(200).json({ success: true, data: participant });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0440\u043e\u043b\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
