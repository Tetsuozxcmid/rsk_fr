export const cleanupMayakPrompt = (str) =>
    str
        .replace(/\s{2,}/g, " ")
        .replace(/ ,/g, ",")
        .replace(/ \./g, ".")
        .trim();

export function buildMayakPromptDraft(values) {
    if (Object.values(values).some((value) => !value.trim())) {
        return null;
    }

    const draftPrompt = `Представь, что ты ${values.y}. Твоя миссия — ${values.m.toLowerCase()}. Ты создаешь контент для следующей аудитории: ${values.a.toLowerCase()}. При работе ты должен учитывать такие ограничения: ${values.o1.toLowerCase()}. Готовый результат должен соответствовать следующим критериям: ${values.k.toLowerCase()}. Этот материал будет использоваться в следующем контексте: ${values.k2.toLowerCase()}. Финальное оформление должно быть таким: ${values.o2.toLowerCase()}.`;

    return {
        values,
        finalPrompt: cleanupMayakPrompt(draftPrompt),
    };
}
