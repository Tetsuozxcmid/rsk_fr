import { fetchPortalProfileFromRequest, PortalProfileRequestError } from "@/lib/portalProfileServer";
import { isPortalProfileComplete } from "@/lib/portalProfile";
import { parseActivatedKeyCookie, resolveMayakTokenContext } from "@/lib/mayakTokenContext";
import { createMayakHistoryEntry, serializeMayakHistoryEntry } from "@/lib/mayakUserHistory";
import { buildMayakQrDataUrl, formatMayakHumanDate, generateMayakAnalyticsBuffer, generateMayakCertificateBuffer, generateMayakLogBuffer } from "@/lib/mayakDocumentGeneration";

function parseActiveUserCookie(rawCookie) {
    if (!rawCookie) return null;
    try {
        return JSON.parse(rawCookie);
    } catch {
        return null;
    }
}

function getBaseUrl(req) {
    const protoHeader = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const hostHeader = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const protocol = protoHeader || "http";
    const host = hostHeader || "localhost:3000";
    return `${protocol}://${host}`;
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "4mb",
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const { profile } = await fetchPortalProfileFromRequest(req);
        if (!isPortalProfileComplete(profile)) {
            return res.status(409).json({ success: false, error: "Portal profile is incomplete" });
        }

        const activeUser = parseActiveUserCookie(req.cookies?.active_user || "");
        if (!activeUser?.id || String(activeUser.id) !== String(profile.id)) {
            return res.status(403).json({ success: false, error: "Active MAYAK session does not match the portal user" });
        }

        const activatedToken = parseActivatedKeyCookie(req.cookies?.activated_key || "");
        const tokenContext = await resolveMayakTokenContext(activatedToken);
        if (!tokenContext.success || !tokenContext.valid) {
            return res.status(403).json({ success: false, error: tokenContext.error || "MAYAK token is invalid" });
        }

        const { logData, selectedRole } = req.body || {};
        if (!logData || typeof logData !== "object") {
            return res.status(400).json({ success: false, error: "logData is required" });
        }

        const completedAt = new Date().toISOString();
        const safeLogData = {
            ...logData,
            userName: profile.fullName,
            userRole: String(selectedRole || logData.userRole || "").trim(),
            date: formatMayakHumanDate(completedAt),
        };

        const qrDataUrl = await buildMayakQrDataUrl({
            baseUrl: getBaseUrl(req),
            userId: profile.id,
        });

        const [certificateBuffer, logBuffer, analyticsBuffer] = await Promise.all([
            generateMayakCertificateBuffer({
                userName: profile.fullName,
                qrDataUrl,
                completedAt,
            }),
            generateMayakLogBuffer({ logData: safeLogData }),
            generateMayakAnalyticsBuffer({ logData: safeLogData }),
        ]);

        const entry = await createMayakHistoryEntry({
            portalProfile: profile,
            tokenContext,
            activeUser,
            selectedRole: safeLogData.userRole,
            logData: safeLogData,
            completedAt,
            certificateBuffer,
            logBuffer,
            analyticsBuffer,
        });

        return res.status(200).json({
            success: true,
            data: serializeMayakHistoryEntry(entry),
        });
    } catch (error) {
        if (error instanceof PortalProfileRequestError) {
            return res.status(error.status || 500).json({ success: false, error: error.message });
        }

        console.error("MAYAK completion finalize failed:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to finalize MAYAK completion" });
    }
}
