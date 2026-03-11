import { getAllSectionsIndexBundles, getSectionBundle, readManifest } from "../../../lib/mayakContentStorage.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { sectionId, includeTexts } = req.query;
        if (sectionId) {
            const bundle = await getSectionBundle(sectionId, { includeTexts: includeTexts !== "0" });
            return res.status(200).json({ success: true, data: bundle });
        }

        const data = await getAllSectionsIndexBundles();
        return res.status(200).json({
            success: true,
            data: {
                sectionIds: Array.isArray(data.sectionIds) ? data.sectionIds : await readManifest(),
                bundles: Array.isArray(data.bundles) ? data.bundles : [],
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
