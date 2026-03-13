import { promises as fs } from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "mayak-settings.json");

export function normalizeMayakQuestionnaireUrl(value) {
    return typeof value === "string" ? value.trim() : "";
}

export function getMayakQuestionnaireSettings(settings = {}) {
    return {
        introQuestionnaireUrl: normalizeMayakQuestionnaireUrl(settings.introQuestionnaireUrl),
        completionSurveyUrl: normalizeMayakQuestionnaireUrl(settings.completionSurveyUrl),
    };
}

export async function readMayakSettings() {
    try {
        return JSON.parse(await fs.readFile(SETTINGS_FILE, "utf-8"));
    } catch {
        return {};
    }
}

export async function writeMayakSettings(settings) {
    const dir = path.dirname(SETTINGS_FILE);
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {}
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}
