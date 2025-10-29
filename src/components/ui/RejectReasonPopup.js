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
        <div className="fixed top-[4.6875rem] right-0 bottom-0 left-[12.5rem] flex items-center justify-center z-50 bg-white">
            <div className="bg-white max-w-[28rem] w-full mx-4 flex flex-col">
                {/* Кнопка закрытия - в самом верху */}
                <div className="flex justify-center py-[1rem]">
                    <Button inverted roundeful className="!w-fit !px-[1rem]" onClick={onClose}>
                        Закрыть Pop-Up
                    </Button>
                </div>

                {/* Основной контент */}
                <div className="p-[2rem] flex flex-col gap-[1.5rem]">
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

