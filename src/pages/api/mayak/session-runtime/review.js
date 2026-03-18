import { resolveMayakSessionReview } from "@/lib/mayakSessionRuntime";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { sessionId, reviewId, inspectorUserId, action, comment } = req.body || {};
        const review = await resolveMayakSessionReview({
            sessionId: String(sessionId || ""),
            reviewId: String(reviewId || ""),
            inspectorUserId: String(inspectorUserId || ""),
            action: String(action || ""),
            comment: String(comment || ""),
        });
        return res.status(200).json({ success: true, data: review });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message || "Не удалось обработать проверку" });
    }
}
