import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { createToken } from "@/utils/mayakTokens";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    if (!requireMayakAdmin(req, res)) {
        return;
    }

    try {
        const { name, usageLimit, taskRange, customToken, sectionId } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ success: false, error: "Название токена обязательно" });
        }

        if (!usageLimit || Number.isNaN(parseInt(usageLimit, 10)) || parseInt(usageLimit, 10) <= 0) {
            return res.status(400).json({ success: false, error: "Лимит использований должен быть положительным числом" });
        }

        const newToken = createToken(name.trim(), usageLimit, taskRange, customToken ? customToken.trim() : null, sectionId || null);

        return res.status(201).json({ success: true, data: newToken });
    } catch (error) {
        console.error("Error generating token:", error);
        return res.status(500).json({ success: false, error: error.message || "Ошибка сервера" });
    }
}
