import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { deleteMayakSession, updateMayakSession } from "../../../../../lib/mayakSessions.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method === "PATCH") {
        try {
            const { id } = req.query;
            const session = await updateMayakSession(String(id || ""), req.body || {});
            return res.status(200).json({ success: true, data: session });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message || "Не удалось обновить сессию" });
        }
    }

    if (req.method === "DELETE") {
        try {
            const { id } = req.query;
            const session = await deleteMayakSession(String(id || ""));
            return res.status(200).json({ success: true, data: session });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message || "Не удалось удалить сессию" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
