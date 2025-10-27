import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Zapret from "@/assets/general/zapret.svg";

export default function RejectReasonPopup({ onClose, onConfirm, projectId }) {
    const [selectedReason, setSelectedReason] = useState("info");
    const [customReason, setCustomReason] = useState("");

    const reasons = [
        { id: "info", label: "Недостаточно информации для выполнения задачи" },
        { id: "requirements", label: "Задача не соответствует требованиям проекта" },
        { id: "resources", label: "Отсутствие необходимых ресурсов для выполнения" },
        { id: "quality", label: "Задача была выполнена некачественно" },
        { id: "deadline", label: "Сроки выполнения задачи были нарушены" },
        { id: "custom", label: "Индивидуальная причина" },
    ];

    // Блокируем скролл при открытии popup
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    const handleConfirm = () => {
        const reason = selectedReason === "custom" ? customReason : reasons.find((r) => r.id === selectedReason)?.label;
        onConfirm(projectId, reason);
        onClose();
    };

    return (
        <div className="fixed top-[4.6875rem] right-0 bottom-0 left-[12.5rem] flex items-center justify-center z-50 bg-(--color-white-gray)" onClick={onClose}>
            <div
                className="bg-white rounded-[1.25rem] p-[2rem] max-w-[37.5rem] w-full mx-4"
                style={{
                    boxShadow: "0 0 60px 20px rgba(0, 0, 0, 0.08), 0 20px 50px -12px rgba(0, 0, 0, 0.15)",
                }}
                onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col gap-[1.5rem]">
                    {/* Кнопка закрытия */}
                    <div className="flex justify-end -mt-[0.5rem] -mr-[0.5rem]">
                        <Button inverted roundeful className="!w-fit !px-[1rem]" onClick={onClose}>
                            Закрыть Pop-Up
                        </Button>
                    </div>

                    {/* Заголовок */}
                    <div className="flex flex-col gap-[0.5rem]">
                        <h4>Причина отклонения</h4>
                        <p className="text-(--color-gray-black)">Выберите причину по которой вы отклоняете это дело</p>
                    </div>

                    {/* Список причин */}
                    <div className="flex flex-col gap-[0.75rem]">
                        {reasons.map((reason) => (
                            <div key={reason.id} className="flex items-start gap-[0.75rem]">
                                <div className="input-wrapper !border-none !p-0 !bg-transparent">
                                    <input type="radio" id={reason.id} name="reason" checked={selectedReason === reason.id} onChange={() => setSelectedReason(reason.id)} className="size-[1.5rem] rounded-full flex-shrink-0 mt-[0.125rem]" />
                                </div>
                                <label htmlFor={reason.id} className="cursor-pointer flex-1">
                                    <p className="big">{reason.label}</p>
                                </label>
                            </div>
                        ))}

                        {/* Поле для индивидуальной причины */}
                        {selectedReason === "custom" && (
                            <div className="ml-[2.25rem]">
                                <Textarea inverted rows={3} placeholder="Введите причину..." value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {/* Кнопка отклонить */}
                    <Button className="reject-button nh" onClick={handleConfirm}>
                        Отклонить <Zapret />
                    </Button>
                </div>
            </div>
        </div>
    );
}

