import { promises as fs } from "fs";
import path from "path";
import { requireMayakAdmin } from "../../../lib/mayakAdminAuth.js";
import { maskSecret, normalizeQwenTokenEntries, normalizeQwenTokens } from "../../../lib/mayakQwen.js";

const SETTINGS_FILE = path.join(process.cwd(), "data", "mayak-settings.json");

async function readSettings() {
    try {
        return JSON.parse(await fs.readFile(SETTINGS_FILE, "utf-8"));
    } catch {
        return {};
    }
}

async function saveSettings(settings) {
    const dir = path.dirname(SETTINGS_FILE);
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {}
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export default async function handler(req, res) {
    if (!requireMayakAdmin(req, res)) {
        return;
    }

    if (req.method === "GET") {
        const settings = await readSettings();
        const telegramBotToken = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "";
        const openrouterApiKey = settings.openrouterApiKey || process.env.OPENROUTER_API_KEY || "";
        const telegramBotUsername = settings.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || "";
        const telegramWebhookUrl = settings.telegramWebhookUrl || process.env.TELEGRAM_WEBHOOK_URL || "";
        const baseUrl = settings.baseUrl || process.env.BASE_URL || "";
        const qwenTokens = normalizeQwenTokenEntries(settings.qwenTokens);
        const qwenBackupEntry = normalizeQwenTokenEntries(settings.qwenBackupToken)[0] || null;
        const qwenBackupToken = qwenBackupEntry?.token || "";

        return res.status(200).json({
            success: true,
            data: {
                telegramBotToken: maskSecret(telegramBotToken),
                telegramBotTokenIsSet: !!telegramBotToken,
                openrouterApiKey: maskSecret(openrouterApiKey),
                openrouterApiKeyIsSet: !!openrouterApiKey,
                telegramBotUsername,
                telegramBotUsernameIsSet: !!telegramBotUsername,
                telegramWebhookUrl,
                telegramWebhookUrlIsSet: !!telegramWebhookUrl,
                baseUrl,
                baseUrlIsSet: !!baseUrl,
                qwenTokens: qwenTokens.map((entry, index) => ({
                    index,
                    name: entry.name || `Токен ${index + 1}`,
                    token: entry.token,
                    mask: maskSecret(entry.token),
                })),
                qwenTokensCount: qwenTokens.length,
                qwenTokensIsSet: qwenTokens.length > 0,
                qwenBackupToken: qwenBackupToken,
                qwenBackupTokenName: qwenBackupEntry?.name || "Резервный токен",
                qwenBackupTokenMask: maskSecret(qwenBackupToken),
                qwenBackupTokenIsSet: !!qwenBackupToken,
            },
        });
    }

    if (req.method === "POST") {
        const { telegramBotToken, openrouterApiKey, telegramBotUsername, telegramWebhookUrl, baseUrl, qwenTokens, qwenTokenAdd, qwenTokenRemoveIndex, qwenBackupToken } = req.body;

        const settings = await readSettings();
        let botRestarted = false;

        if (telegramBotToken !== undefined) {
            settings.telegramBotToken = telegramBotToken;
            process.env.TELEGRAM_BOT_TOKEN = telegramBotToken;

            try {
                const { restartBot } = await import("../../../lib/telegramBot.js");
                await restartBot();
                botRestarted = true;
            } catch (err) {
                console.error("[Settings] Ошибка перезапуска бота:", err.message);
            }
        }

        if (openrouterApiKey !== undefined) {
            settings.openrouterApiKey = openrouterApiKey;
            process.env.OPENROUTER_API_KEY = openrouterApiKey;
        }

        if (telegramBotUsername !== undefined) {
            settings.telegramBotUsername = telegramBotUsername;
            process.env.TELEGRAM_BOT_USERNAME = telegramBotUsername;
        }

        if (telegramWebhookUrl !== undefined) {
            settings.telegramWebhookUrl = telegramWebhookUrl;
            process.env.TELEGRAM_WEBHOOK_URL = telegramWebhookUrl;
        }

        if (baseUrl !== undefined) {
            settings.baseUrl = baseUrl;
        }

        if (qwenTokens !== undefined) {
            settings.qwenTokens = normalizeQwenTokenEntries(qwenTokens);
        }

        if (qwenBackupToken !== undefined) {
            const backupEntry = normalizeQwenTokenEntries(qwenBackupToken)[0] || null;
            settings.qwenBackupToken = backupEntry || "";
        }

        if (qwenTokenAdd !== undefined) {
            const entriesToAdd = normalizeQwenTokenEntries(qwenTokenAdd);
            if (entriesToAdd.length === 0) {
                return res.status(400).json({ success: false, error: "Не найдено ни одного Qwen-токена" });
            }

            settings.qwenTokens = normalizeQwenTokenEntries([...normalizeQwenTokenEntries(settings.qwenTokens), ...entriesToAdd]);
        }

        if (qwenTokenRemoveIndex !== undefined) {
            const index = Number.parseInt(qwenTokenRemoveIndex, 10);
            const currentTokens = normalizeQwenTokenEntries(settings.qwenTokens);

            if (Number.isNaN(index) || index < 0 || index >= currentTokens.length) {
                return res.status(400).json({ success: false, error: "Qwen-токен для удаления не найден" });
            }

            currentTokens.splice(index, 1);
            settings.qwenTokens = currentTokens;
        }

        await saveSettings(settings);

        return res.status(200).json({
            success: true,
            botRestarted,
        });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}


