export function saveMayakPromptHistory({ promptValue, type, storageKey, limit = 50 }) {
    const entry = { date: new Date().toISOString(), type, prompt: promptValue };
    const currentHistory = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const nextHistory = [entry, ...currentHistory].slice(0, limit);
    localStorage.setItem(storageKey, JSON.stringify(nextHistory));
    return nextHistory;
}
