function normalizeText(value = "") {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeUrl(value = "") {
    return String(value || "").trim();
}

export const DEFAULT_MAYAK_ONBOARDING_QUESTIONNAIRE = {
    title: "Анкета диагностики цифровой трансформации",
    description: "Модель «Среда - Деятельность - Сознание». Перед выбором потока пройдите анкету диагностики цифровой трансформации в Яндекс Форме.",
    buttonLabel: "Пройти анкетирование",
    returnText: "После прохождения формы вернитесь назад, чтобы продолжить онбординг и выбрать нужный поток подготовки.",
    formUrl: "",
};

export function normalizeMayakOnboardingQuestionnaire(rawQuestionnaire = {}, legacySurvey = {}) {
    const questionnaire = rawQuestionnaire && typeof rawQuestionnaire === "object" ? rawQuestionnaire : {};
    const survey = legacySurvey && typeof legacySurvey === "object" ? legacySurvey : {};

    return {
        title: String(questionnaire.title || survey.title || DEFAULT_MAYAK_ONBOARDING_QUESTIONNAIRE.title).trim(),
        description: normalizeText(questionnaire.description || survey.description || DEFAULT_MAYAK_ONBOARDING_QUESTIONNAIRE.description),
        buttonLabel: String(questionnaire.buttonLabel || questionnaire.submitLabel || DEFAULT_MAYAK_ONBOARDING_QUESTIONNAIRE.buttonLabel).trim() || DEFAULT_MAYAK_ONBOARDING_QUESTIONNAIRE.buttonLabel,
        returnText: normalizeText(questionnaire.returnText || questionnaire.helpText || DEFAULT_MAYAK_ONBOARDING_QUESTIONNAIRE.returnText),
        formUrl: normalizeUrl(questionnaire.formUrl || questionnaire.url || ""),
    };
}

export function isMayakOnboardingQuestionnaireUrlConfigured(value) {
    const formUrl = typeof value === "string" ? value : value?.formUrl;
    return /^https?:\/\//i.test(normalizeUrl(formUrl));
}
