import { fetchPortalProfileFromRequest, PortalProfileRequestError } from "@/lib/portalProfileServer";
import { listMayakHistoryByPortalUserId, serializeMayakHistoryEntry } from "@/lib/mayakUserHistory";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { profile } = await fetchPortalProfileFromRequest(req);
        const entries = await listMayakHistoryByPortalUserId(profile.id);
        return res.status(200).json({
            success: true,
            data: entries.map(serializeMayakHistoryEntry),
        });
    } catch (error) {
        if (error instanceof PortalProfileRequestError) {
            return res.status(error.status || 500).json({ success: false, error: error.message });
        }

        console.error("Failed to read MAYAK history:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to read MAYAK history" });
    }
}
