import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { getAllTokensWithStats } from "@/utils/mayakTokens";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    if (!requireMayakAdmin(req, res)) {
        return;
    }

    try {
        const tokens = getAllTokensWithStats();
        return res.status(200).json({
            success: true,
            data: tokens,
            total: tokens.length,
            activeCount: tokens.filter((t) => t.isActive && !t.isExhausted).length,
            exhaustedCount: tokens.filter((t) => t.isExhausted).length,
        });
    } catch (error) {
        console.error("Error fetching tokens:", error);
        return res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
}
