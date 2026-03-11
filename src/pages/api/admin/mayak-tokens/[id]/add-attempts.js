import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { addAttemptsToToken, getTokenById } from "@/utils/mayakTokens";

export default async function handler(req, res) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    if (!requireMayakAdmin(req, res)) {
        return;
    }

    try {
        const { id } = req.query;
        const { attempts } = req.body;

        const existingToken = getTokenById(id);
        if (!existingToken) {
            return res.status(404).json({ success: false, error: "Токен не найден" });
        }

        if (!attempts || Number.isNaN(parseInt(attempts, 10)) || parseInt(attempts, 10) <= 0) {
            return res.status(400).json({ success: false, error: "Количество попыток должно быть положительным числом" });
        }

        const updatedToken = addAttemptsToToken(id, attempts);
        if (!updatedToken) {
            return res.status(500).json({ success: false, error: "Ошибка обновления токена" });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...updatedToken,
                remainingAttempts: updatedToken.usageLimit - updatedToken.usedCount,
            },
        });
    } catch (error) {
        console.error("Error adding attempts:", error);
        return res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
}
