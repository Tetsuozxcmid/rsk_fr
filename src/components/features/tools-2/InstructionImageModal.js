import Button from "@/components/ui/Button";
import CloseIcon from "@/assets/general/close.svg";

export default function InstructionImageModal({ instructionModal, onClose }) {
    if (!instructionModal) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-[95vw] max-h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 rounded-t-2xl">
                    <h3 className="text-base font-semibold text-gray-900">Инструкция: {instructionModal.name}</h3>
                    <Button icon className="!bg-transparent !text-black hover:!bg-black/5" onClick={onClose}>
                        <CloseIcon />
                    </Button>
                </div>
                <div className="p-4">
                    <img
                        src={instructionModal.image}
                        alt={`Инструкция ${instructionModal.name}`}
                        className="w-full max-w-[900px] rounded-xl"
                        onError={(e) => {
                            const src = e.target.src;
                            if (src.endsWith(".jpg")) {
                                e.target.src = src.replace(".jpg", ".png");
                            } else if (src.endsWith(".png")) {
                                e.target.src = src.replace(".png", ".jpg");
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
