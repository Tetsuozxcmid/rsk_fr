import { generateAnalyticsBufferFromLogData } from "@/lib/analyticsGenerator";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "2mb",
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { logData } = req.body || {};
        if (!logData || typeof logData !== "object") {
            return res.status(400).json({ error: "logData is required" });
        }

        const pdfBuffer = await generateAnalyticsBufferFromLogData(logData);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="mayak-analytics.pdf"');
        return res.status(200).send(Buffer.from(pdfBuffer));
    } catch (error) {
        console.error("Error generating session analytics:", error);
        return res.status(500).json({ error: error.message || "Не удалось сформировать аналитику" });
    }
}
