import { promises as fs } from "fs";
import formidable from "formidable";
import { getMayakOnboardingSubmission, updateMayakOnboardingSubmission, uploadMayakOnboardingAsset, uploadMayakOnboardingBinaryAsset } from "../../../../../lib/mayakOnboarding.js";

export const config = {
    api: {
        bodyParser: false,
    },
};

function normalizePhotoEntry(item) {
    const photos = Array.isArray(item?.photos) ? item.photos : item?.photoUrl ? [{ url: item.photoUrl, name: item.photoName || "photo" }] : [];
    return {
        done: Boolean(item?.done),
        photos,
    };
}

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
            maxFileSize: 20 * 1024 * 1024,
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
    if (req.method !== "POST") {
        return res.status(405).json({ error: { message: "Method not allowed" } });
    }

    const submission = await getMayakOnboardingSubmission(req.query.id);
    if (!submission) {
        return res.status(404).json({ error: { message: "Анкета онбординга не найдена" } });
    }

    try {
        const contentType = String(req.headers["content-type"] || "");
        let itemId = "";
        let uploaded;

        if (contentType.includes("multipart/form-data")) {
            const { fields, files } = await parseMultipartBody(req);
            const uploadedFile = firstValue(files.file);

            if (!uploadedFile?.filepath) {
                throw new Error("Не удалось обработать изображение");
            }

            itemId = String(firstValue(fields.itemId) || "").trim();
            uploaded = await uploadMayakOnboardingBinaryAsset({
                scope: "submissions",
                parentId: submission.id,
                folder: "section-photos",
                fileName: uploadedFile.originalFilename || uploadedFile.newFilename || "image",
                mimeType: uploadedFile.mimetype || "application/octet-stream",
                buffer: await fs.readFile(uploadedFile.filepath),
            });
        } else {
            const body = await readJsonBody(req);
            itemId = String(body?.itemId || "").trim();
            uploaded = await uploadMayakOnboardingAsset({
                scope: "submissions",
                parentId: submission.id,
                folder: "section-photos",
                fileName: body?.fileName,
                dataUrl: body?.dataUrl,
            });
        }

        if (!itemId) {
            throw new Error("Не удалось обработать изображение");
        }

        const currentItems = submission.checklist?.items && typeof submission.checklist.items === "object" ? submission.checklist.items : {};
        const currentEntry = normalizePhotoEntry(currentItems[itemId]);
        const nextChecklist = {
            ...(submission.checklist && typeof submission.checklist === "object" ? submission.checklist : {}),
            items: {
                ...currentItems,
                [itemId]: {
                    ...currentEntry,
                    photos: [...currentEntry.photos, { url: uploaded.url, name: uploaded.fileName }],
                },
            },
        };

        await updateMayakOnboardingSubmission(submission.id, { checklist: nextChecklist });
        return res.status(200).json(uploaded);
    } catch (error) {
        return res.status(400).json({ error: { message: error?.message || "Не удалось обработать изображение" } });
    }
}
