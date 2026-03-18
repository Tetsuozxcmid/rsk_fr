import fs from "fs";

import { getMayakSessionReviewFile } from "@/lib/mayakSessionRuntime";

function getContentType(file = {}, fullPath = "") {
    if (file.previewKind === "pdf" || String(fullPath).toLowerCase().endsWith(".pdf")) return "application/pdf";
    if (file.previewKind === "image") {
        const ext = String(file.extension || "").toLowerCase();
        if (ext === ".png") return "image/png";
        if (ext === ".webp") return "image/webp";
        if (ext === ".gif") return "image/gif";
        return "image/jpeg";
    }
    if (file.previewKind === "audio") return file.mimeType || "audio/mpeg";
    if (file.previewKind === "video") return file.mimeType || "video/mp4";
    return file.mimeType || "application/octet-stream";
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const sessionId = String(req.query.sessionId || "");
        const reviewId = String(req.query.reviewId || "");
        const type = String(req.query.type || "original");
        const filename = String(req.query.filename || "");
        const download = req.query.download === "1";

        const { fullPath, file } = await getMayakSessionReviewFile({ sessionId, reviewId, type, filename });
        const stat = await fs.promises.stat(fullPath);
        res.setHeader("Content-Type", getContentType(file, fullPath));
        res.setHeader("Content-Length", stat.size);
        res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
        const dispositionType = download ? "attachment" : "inline";
        const dispositionName = download ? file.originalName || filename : filename;
        res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(dispositionName)}"`);
        fs.createReadStream(fullPath).pipe(res);
    } catch (error) {
        return res.status(404).json({ success: false, error: error.message || "Файл не найден" });
    }
}
