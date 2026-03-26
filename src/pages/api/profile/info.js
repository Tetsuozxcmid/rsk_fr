import { fetchPortalProfileFromRequest, PortalProfileRequestError } from "@/lib/portalProfileServer";

export default async function ProfileInfoHandler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { payload } = await fetchPortalProfileFromRequest(req);
        return res.status(200).json({ success: true, data: payload });
    } catch (error) {
        if (error instanceof PortalProfileRequestError) {
            return res.status(error.status || 500).json({
                success: false,
                error: error.message,
                details: error.payload || null,
            });
        }

        console.error("Profile API: Internal error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch portal profile",
        });
    }
}
