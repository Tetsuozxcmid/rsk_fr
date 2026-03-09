import {
    QWEN_API_URL,
    QWEN_EVALUATION_SYSTEM_PROMPT,
    QWEN_MODEL,
    acquireLeastLoadedQwenToken,
    buildQwenEvaluationUserMessage,
    classifyQwenFailure,
    getQwenTokenActiveLoad,
    getStoredQwenBackupToken,
    getQwenTokenPool,
    isValidQwenEvaluationShape,
    maskSecret,
    normalizeQwenEvaluation,
    parseQwenEvaluation,
    releaseQwenToken,
} from "../../../lib/mayakQwen.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_BACKUP_MODEL = "google/gemini-3-flash-preview";
const TEMP_UNAVAILABLE_MESSAGE = "Проверка временно недоступна";

function isOpenRouterToken(token) {
    return typeof token === "string" && token.trim().startsWith("sk-or-v1");
}

function toClientPayload(evaluation) {
    return {
        message: evaluation.summary,
        zone: evaluation.overallZone,
        strongFields: evaluation.strongFields,
        weakFields: evaluation.weakFields,
    };
}

async function requestEvaluation({ apiUrl, token, model, userMessageContent, responseFormat, extraHeaders = {} }) {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...extraHeaders,
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: QWEN_EVALUATION_SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: userMessageContent,
                },
            ],
            temperature: 0.1,
            max_tokens: 700,
            ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
    });

    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            errorText: await response.text(),
        };
    }

    const data = await response.json();
    const rawMessage = data.choices?.[0]?.message?.content || "";
    const parsedEvaluation = parseQwenEvaluation(rawMessage);

    if (!parsedEvaluation || !isValidQwenEvaluationShape(parsedEvaluation)) {
        return {
            ok: false,
            status: 502,
            errorText: rawMessage,
            parseFailed: true,
        };
    }

    return {
        ok: true,
        parsedEvaluation,
    };
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { fields, taskContext } = req.body;
    if (!fields || typeof fields !== "object") {
        return res.status(400).json({ error: "fields are required" });
    }

    const userMessageContent = buildQwenEvaluationUserMessage({
        taskContext,
        fields,
    });

    const tokenPool = await getQwenTokenPool();
    const backupToken = await getStoredQwenBackupToken();
    if (tokenPool.length === 0 && !backupToken) {
        return res.status(503).json({
            error: "Qwen tokens are not configured",
            message: TEMP_UNAVAILABLE_MESSAGE,
        });
    }

    const failures = [];
    const triedTokens = new Set();

    while (triedTokens.size < tokenPool.length) {
        const token = acquireLeastLoadedQwenToken(tokenPool, Array.from(triedTokens));
        if (!token) {
            break;
        }

        triedTokens.add(token);

        try {
            const result = await requestEvaluation({
                apiUrl: QWEN_API_URL + "/v1/chat/completions",
                token,
                model: QWEN_MODEL,
                userMessageContent,
            });

            if (!result.ok) {
                if (result.parseFailed) {
                    console.error("[Qwen] Invalid structured response:", result.errorText);
                    return res.status(502).json({
                        error: "Qwen response parse failed",
                        message: TEMP_UNAVAILABLE_MESSAGE,
                        details: result.errorText,
                    });
                }

                const failure = classifyQwenFailure(result.status, result.errorText);
                failures.push({
                    provider: "qwen",
                    status: result.status,
                    reason: failure.reason,
                    token: maskSecret(token),
                    activeLoad: getQwenTokenActiveLoad(token),
                });

                console.error("[Qwen] API error:", result.status, failure.reason, maskSecret(token), result.errorText);

                if (failure.shouldTryNextToken) {
                    continue;
                }

                return res.status(502).json({
                    error: "Qwen API error",
                    message: TEMP_UNAVAILABLE_MESSAGE,
                    details: result.errorText,
                });
            }

            const evaluation = normalizeQwenEvaluation(result.parsedEvaluation, {
                fields,
                taskContext,
            });

            return res.status(200).json(toClientPayload(evaluation));
        } catch (err) {
            console.error("[Qwen] Request error:", maskSecret(token), err.message);
            return res.status(502).json({
                error: "Qwen request failed",
                message: TEMP_UNAVAILABLE_MESSAGE,
                details: err.message,
            });
        } finally {
            releaseQwenToken(token);
        }
    }

    if (backupToken && !triedTokens.has(backupToken)) {
        const backupProvider = isOpenRouterToken(backupToken) ? "openrouter" : "qwen";
        const backupApiUrl = backupProvider === "openrouter" ? OPENROUTER_API_URL + "/chat/completions" : QWEN_API_URL + "/v1/chat/completions";
        const backupModel = backupProvider === "openrouter" ? OPENROUTER_BACKUP_MODEL : QWEN_MODEL;

        try {
            const result = await requestEvaluation({
                apiUrl: backupApiUrl,
                token: backupToken,
                model: backupModel,
                userMessageContent,
                responseFormat: backupProvider === "openrouter" ? { type: "json_object" } : null,
                extraHeaders:
                    backupProvider === "openrouter"
                        ? {
                              "X-OpenRouter-Title": "MAYAK",
                          }
                        : {},
            });

            if (result.ok) {
                const evaluation = normalizeQwenEvaluation(result.parsedEvaluation, {
                    fields,
                    taskContext,
                });

                return res.status(200).json(toClientPayload(evaluation));
            }

            failures.push({
                provider: backupProvider,
                status: result.status,
                reason: result.parseFailed ? "backup_parse_failed" : "backup_token_failed",
                token: maskSecret(backupToken),
            });

            console.error("[Qwen] Backup error:", backupProvider, result.status, maskSecret(backupToken), result.errorText);
        } catch (err) {
            failures.push({
                provider: backupProvider,
                status: 0,
                reason: "backup_token_request_failed",
                token: maskSecret(backupToken),
            });
            console.error("[Qwen] Backup request error:", backupProvider, maskSecret(backupToken), err.message);
        }
    }

    console.error("[Qwen] All configured tokens failed:", failures);
    return res.status(503).json({
        error: "Qwen token pool exhausted",
        message: TEMP_UNAVAILABLE_MESSAGE,
        details: failures,
    });
}
