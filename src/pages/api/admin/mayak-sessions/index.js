import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { createMayakSession, listMayakSessions } from "../../../../lib/mayakSessions.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method === "GET") {
        try {
            const sessions = await listMayakSessions();
            return res.status(200).json({ success: true, data: sessions });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message || "Ошибка загрузки сессий" });
        }
    }

    if (req.method === "POST") {
        try {
            const session = await createMayakSession(req.body || {});
            return res.status(200).json({ success: true, data: session });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message || "Не удалось создать сессию" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
