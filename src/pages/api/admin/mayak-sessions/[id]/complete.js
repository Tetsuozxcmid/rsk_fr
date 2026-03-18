import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { completeMayakSessionWithRuntimeCleanup } from "../../../../../lib/mayakSessionRuntime.js";

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { id } = req.query;
        const session = await completeMayakSessionWithRuntimeCleanup(String(id || ""));
        return res.status(200).json({ success: true, data: session });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Не удалось завершить сессию" });
    }
}
