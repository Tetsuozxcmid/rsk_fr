import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { createMayakSessionToken, listMayakSessionTokens } from "../../../../lib/mayakSessionTokens.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method === "GET") {
        try {
            const tokens = await listMayakSessionTokens();
            return res.status(200).json({ success: true, data: tokens });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message || "Не удалось загрузить session-токены" });
        }
    }

    if (req.method === "POST") {
        try {
            const token = await createMayakSessionToken(req.body || {});
            return res.status(201).json({ success: true, data: token });
        } catch (error) {
            return res.status(400).json({ success: false, error: error.message || "Не удалось создать session-токен" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
