export function copyMayakText(text) {
    if (!text) {
        return Promise.reject(new Error("No text to copy"));
    }

    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful ? Promise.resolve() : Promise.reject(new Error("execCommand failed"));
    } catch (error) {
        document.body.removeChild(textArea);
        return Promise.reject(error);
    }
}
