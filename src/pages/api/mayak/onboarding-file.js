import { promises as fs } from "fs";
import { getOnboardingFilePath } from "../../../lib/mayakOnboardingStorage.js";

const MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
};

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const filePath = await getOnboardingFilePath({
            scope: req.query.scope,
            parentId: req.query.parentId,
            folder: req.query.folder,
            filename: req.query.filename,
        });
        const buffer = await fs.readFile(filePath);
        const extension = String(req.query.filename || "").match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
        res.setHeader("Content-Type", MIME_BY_EXTENSION[extension] || "application/octet-stream");
        return res.status(200).send(buffer);
    } catch {
        return res.status(404).json({ success: false, error: "Файл не найден" });
    }
}
