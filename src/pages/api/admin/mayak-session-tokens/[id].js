import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { deleteMayakSessionToken } from "../../../../lib/mayakSessionTokens.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method !== "DELETE") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { id } = req.query;
        const token = await deleteMayakSessionToken(String(id || ""));
        return res.status(200).json({ success: true, data: token });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Не удалось удалить session-токен" });
    }
}
