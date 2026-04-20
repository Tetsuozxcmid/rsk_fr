import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

import { getLocalProfileMockUserId, shouldUseLocalProfileMock } from "@/lib/localProfileMock";
import {
    buildMayakProfileArtifactDownloadUrl,
    createMayakProfileArtifactFiles,
    listMayakProfileArtifacts,
    saveMayakProfileArtifacts,
} from "@/lib/mayakProfileArtifacts";

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

function toPublicArtifactPayload(artifact) {
    return {
        id: artifact.id,
        sessionId: artifact.sessionId,
        tokenType: artifact.tokenType,
        sectionId: artifact.sectionId,
        role: artifact.role,
        tableNumber: artifact.tableNumber,
        createdAt: artifact.createdAt,
        completedAt: artifact.completedAt,
        files: (artifact.files || []).map((file) => ({
            id: file.id,
            kind: file.kind,
            fileName: file.fileName,
            contentType: file.contentType,
            byteSize: file.byteSize,
            downloadUrl: buildMayakProfileArtifactDownloadUrl({
                artifactId: artifact.id,
                fileId: file.id,
            }),
        })),
    };
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "25mb",
        },
    },
};

export default async function handler(req, res) {
    const profileUserId = await getAuthenticatedProfileUserId(req);
    if (!profileUserId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (req.method === "GET") {
        try {
            const artifacts = await listMayakProfileArtifacts(profileUserId);
            return res.status(200).json({
                success: true,
                artifacts: artifacts.map(toPublicArtifactPayload),
            });
        } catch (error) {
            console.error("Mayak profile artifacts list error:", error);
            return res.status(500).json({ success: false, error: "Не удалось загрузить материалы MAYAK" });
        }
    }

    if (req.method === "POST") {
        const {
            key,
            completedAt = "",
            sectionId = "",
            role = "",
            sessionId = "",
            tableNumber = "",
            tokenType = "",
            files = [],
        } = req.body || {};

        if (!key) {
            return res.status(400).json({ success: false, error: "Token key is required" });
        }

        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ success: false, error: "Файлы для сохранения не переданы" });
        }

        const artifactId = crypto.randomUUID();

        try {
            const savedFiles = await createMayakProfileArtifactFiles({
                userId: profileUserId,
                artifactId,
                files: files.map((file) => ({
                    ...file,
                    id: file?.id || crypto.randomUUID(),
                })),
            });

            if (savedFiles.length === 0) {
                throw new Error("Не удалось подготовить файлы для сохранения");
            }

            const artifactBundle = {
                id: artifactId,
                createdAt: new Date().toISOString(),
                completedAt: completedAt || new Date().toISOString(),
                sectionId: String(sectionId || "").trim(),
                role: String(role || "").trim(),
                sessionId: String(sessionId || "").trim(),
                tableNumber: String(tableNumber || "").trim(),
                tokenType: String(tokenType || "").trim(),
                files: savedFiles,
            };

            await saveMayakProfileArtifacts({
                tokenKey: key,
                userId: profileUserId,
                bundle: artifactBundle,
            });

            return res.status(200).json({
                success: true,
                artifact: toPublicArtifactPayload(artifactBundle),
            });
        } catch (error) {
            console.error("Mayak profile artifacts save error:", error);
            await fs.rm(path.join(process.cwd(), "data", "mayak-profile-artifacts", profileUserId, artifactId), { recursive: true, force: true }).catch(() => {});
            return res.status(500).json({ success: false, error: error.message || "Не удалось сохранить материалы MAYAK" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
