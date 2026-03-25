import { fetchPortalProfileFromRequest, PortalProfileRequestError } from "@/lib/portalProfileServer";
import { readMayakHistoryArtifact } from "@/lib/mayakUserHistory";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { profile } = await fetchPortalProfileFromRequest(req);
        const { runId, type } = req.query || {};
        const artifact = await readMayakHistoryArtifact({
            portalUserId: profile.id,
            runId: String(runId || ""),
            type: String(type || ""),
        });

        if (!artifact) {
            return res.status(404).json({ success: false, error: "Artifact not found" });
        }

        res.setHeader("Content-Type", artifact.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${artifact.filename}"`);
        return res.status(200).send(Buffer.from(artifact.buffer));
    } catch (error) {
        if (error instanceof PortalProfileRequestError) {
            return res.status(error.status || 500).json({ success: false, error: error.message });
        }

        console.error("Failed to read MAYAK artifact:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to read MAYAK artifact" });
    }
}
