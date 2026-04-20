import path from "path";
import { promises as fs } from "fs";

import { getLocalProfileMockUserId, shouldUseLocalProfileMock } from "@/lib/localProfileMock";
import { resolveMayakProfileArtifactFile } from "@/lib/mayakProfileArtifacts";

function decodeJwtPayload(token) {
    try {
        const [, payload = ""] = String(token || "").split(".");
        if (!payload) return null;

        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
        return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

async function getAuthenticatedProfileUserId(req) {
    if (shouldUseLocalProfileMock(req, { fallbackWhenAuthMissing: true })) {
        return getLocalProfileMockUserId();
    }

    const cookieToken = req.cookies.users_access_token || req.cookies.access_token || req.cookies.token;
    const authHeader = req.headers.authorization;
    const tokenSource = cookieToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : "");
    const jwtPayload = decodeJwtPayload(tokenSource);
    return jwtPayload?.sub ? String(jwtPayload.sub).trim() : "";
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const profileUserId = await getAuthenticatedProfileUserId(req);
    if (!profileUserId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const artifactId = String(req.query.artifactId || "").trim();
    const fileId = String(req.query.fileId || "").trim();
    if (!artifactId || !fileId) {
        return res.status(400).json({ success: false, error: "artifactId and fileId are required" });
    }

    try {
        const resolved = await resolveMayakProfileArtifactFile({
            userId: profileUserId,
            artifactId,
            fileId,
        });

        if (!resolved) {
            return res.status(404).json({ success: false, error: "Файл не найден" });
        }

        const fileBuffer = await fs.readFile(resolved.filePath);
        const downloadName = path.basename(resolved.file.fileName || "mayak-artifact.pdf");
        const fallbackName = downloadName.replace(/[^\x20-\x7E]+/g, "_");

        res.setHeader("Content-Type", resolved.file.contentType || "application/octet-stream");
        res.setHeader("Content-Length", String(fileBuffer.length));
        res.setHeader("Content-Disposition", `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
        return res.status(200).send(fileBuffer);
    } catch (error) {
        console.error("Mayak profile artifact file error:", error);
        return res.status(500).json({ success: false, error: "Не удалось скачать файл" });
    }
}
