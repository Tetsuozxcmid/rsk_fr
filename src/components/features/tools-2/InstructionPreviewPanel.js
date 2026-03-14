import Button from "@/components/ui/Button";
import CloseIcon from "@/assets/general/close.svg";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];

function getPreviewFileMeta(url = "") {
    const match = String(url).match(/filename=([^&]+)/i);
    const decodedName = match ? decodeURIComponent(match[1]) : "";
    const extension = decodedName.includes(".") ? decodedName.split(".").pop().toLowerCase() : "";
    return {
        isImage: IMAGE_EXTENSIONS.includes(extension),
    };
}

export default function InstructionPreviewPanel({ previewFileUrl, previewTitle, onClose }) {
    if (!previewFileUrl) return null;

    const { isImage } = getPreviewFileMeta(previewFileUrl);
    const title = previewTitle || "Карта задания";

    const handleOpenSeparate = () => {
        if (typeof window !== "undefined") {
            window.open(previewFileUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="min-w-0">
                    <h6 className="text-black">{title}</h6>
                </div>
                <div className="flex items-center gap-2">
                    <Button inverted type="button" onClick={handleOpenSeparate} className="!px-3 !py-2 !text-sm">
                        {"Открыть отдельно"}
                    </Button>
                    <Button icon className="!bg-transparent !text-black hover:!bg-black/5" onClick={onClose} title={"Скрыть карту"}>
                        <CloseIcon />
                    </Button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
                {isImage ? (
                    <div className="p-4">
                        <img src={previewFileUrl} alt={title} className="h-auto w-full rounded-xl border border-slate-200 bg-white" />
                    </div>
                ) : (
                    <iframe title={title} src={previewFileUrl} className="h-full min-h-[70vh] w-full border-0 bg-white" />
                )}
            </div>
        </div>
    );
}
