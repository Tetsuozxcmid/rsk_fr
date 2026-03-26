import * as XLSX from "xlsx";
import { requireMayakAdmin } from "../../../../../lib/mayakAdminAuth.js";
import { getMayakOnboardingSurveyResults } from "../../../../../lib/mayakOnboarding.js";

function buildQuestionColumns(responses = []) {
    const columns = [];
    const seen = new Set();

    responses.forEach((response) => {
        (response.entries || []).forEach((entry) => {
            if (seen.has(entry.questionId)) return;
            seen.add(entry.questionId);
            columns.push({
                key: entry.questionId,
                label: `${entry.sectionTitle || "Раздел"}: ${entry.questionTitle || entry.questionId}`,
            });
        });
    });

    return columns;
}

function buildRows(responses = []) {
    const questionColumns = buildQuestionColumns(responses);
    return responses.map((response, index) => {
        const answerMap = Object.fromEntries((response.entries || []).map((entry) => [entry.questionId, entry.answerText]));
        const dateLabel = response.link?.eventDate && response.link?.endDate && response.link.endDate !== response.link.eventDate ? `${response.link.eventDate} - ${response.link.endDate}` : response.link?.eventDate || "";
        const baseRow = {
            "№": index + 1,
            ID: response.id,
            Session: response.link?.title || "",
            Slug: response.link?.slug || "",
            "Event date": dateLabel,
            Создано: response.createdAt || "",
            Обновлено: response.updatedAt || "",
            Завершено: response.completedAt || "",
        };

        questionColumns.forEach((column) => {
            baseRow[column.label] = answerMap[column.key] || "";
        });

        return baseRow;
    });
}

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const linkId = String(req.query.linkId || "").trim();
    const format = String(req.query.format || "json")
        .trim()
        .toLowerCase();
    const responses = await getMayakOnboardingSurveyResults(linkId);
    const rows = buildRows(responses);
    const exportSuffix = linkId || "all";
    if (format === "xlsx") {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="mayak-onboarding-survey-${exportSuffix}.xlsx"`);
        return res.status(200).send(buffer);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mayak-onboarding-survey-${exportSuffix}.json"`);
    return res.status(200).send(JSON.stringify({ rows }, null, 2));
}
