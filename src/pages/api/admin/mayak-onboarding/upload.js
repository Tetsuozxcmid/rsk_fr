import { promises as fs } from "fs";
import formidable from "formidable";
import { requireMayakAdmin } from "../../../../lib/mayakAdminAuth.js";
import { uploadMayakOnboardingAsset, uploadMayakOnboardingBinaryAsset } from "../../../../lib/mayakOnboarding.js";

export const config = {
    api: {
        bodyParser: false,
    },
};

function firstValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString("utf-8");
    return rawBody ? JSON.parse(rawBody) : {};
}

async function parseMultipartBody(req) {
    return new Promise((resolve, reject) => {
        const form = formidable({
            multiples: false,
            maxFiles: 1,
            maxFileSize: 40 * 1024 * 1024,
            allowEmptyFiles: false,
        });

        form.parse(req, (error, fields, files) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ fields, files });
        });
    });
}

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    try {
        const contentType = String(req.headers["content-type"] || "");
        let uploaded;

        if (contentType.includes("multipart/form-data")) {
            const { fields, files } = await parseMultipartBody(req);
            const uploadedFile = firstValue(files.file);

            if (!uploadedFile?.filepath) {
                throw new Error("Не удалось обработать изображение");
            }

            uploaded = await uploadMayakOnboardingBinaryAsset({
                scope: firstValue(fields.scope) === "submissions" ? "submissions" : "links",
                parentId: firstValue(fields.parentId),
                folder: firstValue(fields.folder) || "instructions",
                fileName: uploadedFile.originalFilename || uploadedFile.newFilename || "image",
                mimeType: uploadedFile.mimetype || "application/octet-stream",
                buffer: await fs.readFile(uploadedFile.filepath),
            });
        } else {
            const body = await readJsonBody(req);
            uploaded = await uploadMayakOnboardingAsset({
                scope: body?.scope === "submissions" ? "submissions" : "links",
                parentId: body?.parentId,
                folder: body?.folder || "instructions",
                fileName: body?.fileName,
                dataUrl: body?.dataUrl,
            });
        }

        return res.status(200).json({ success: true, ...uploaded });
    } catch (error) {
        return res.status(400).json({ success: false, error: error?.message || "Не удалось обработать изображение" });
    }
}
