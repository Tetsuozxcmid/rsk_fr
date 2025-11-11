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
        <div className="fixed top-[5.6875rem] right-0 bottom-0 left-[16rem] max-lg:!left-0 z-50 bg-(--color-white) p-[2rem] max-lg:!p-8 flex items-center justify-center">
            <div className="w-full h-full">
                {/* Контейнер с обводкой */}
                <div className="relative p-[2rem] border-[3px] border-dashed border-(--color-gray-plus) rounded-[0.75rem] w-full h-full bg-(--color-white) flex items-center justify-center">
                    {/* Кнопка закрытия - на обводке */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <Button inverted roundeful className="!w-fit !py-[0.75rem] !px-[1rem] !bg-(--color-gray-plus-50) !border-[2px] !border-dashed !border-(--color-gray-plus) !rounded-full !gap-[0.75rem]" onClick={onClose}>
                            Закрыть Pop-Up
                        </Button>
                    </div>
                    
                    {/* Основной контент */}
                    <div className="overflow-y-auto w-[18vw] mx-auto flex flex-col gap-[1.5rem] items-center justify-center h-full">
                        {/* Заголовок */}
                        <div className="flex flex-col gap-[0.5rem] text-center">
                            <h4>Причина отклонения</h4>
                            <p className="text-(--color-gray-black)">Выберите причину по которой вы отклоняете это дело</p>
                        </div>

                        {/* Список причин */}
                        <div className="flex flex-col gap-[0.75rem] w-full">
                            {reasons.slice(0, -1).map((reason) => (
                                <div key={reason.id} className="flex items-center gap-[0.75rem]">
                                    <div className="input-wrapper !border-none !p-0 !bg-transparent">
                                        <input type="radio" id={reason.id} name="reason" checked={selectedReason === reason.id} onChange={() => setSelectedReason(reason.id)} className="size-[1.5rem] rounded-full flex-shrink-0" />
                                    </div>
                                    <label htmlFor={reason.id} className="cursor-pointer flex-1">
                                        <p className="hyphens-auto">{reason.label}</p>
                                    </label>
                                </div>
                            ))}
                            
                            {/* Поле для индивидуальной причины */}
                            <div className="flex items-center gap-[0.75rem]">
                                <div className="input-wrapper !border-none !p-0 !bg-transparent">
                                    <input type="radio" id="custom" name="reason" checked={selectedReason === "custom"} onChange={() => setSelectedReason("custom")} className="size-[1.5rem] rounded-full flex-shrink-0" />
                                </div>
                                <div className="flex-1">
                                    <div className="input-wrapper flex items-center px-[0.875rem] gap-[0.875rem] border-[1.5px] border-(--color-gray-plus-50) rounded-[0.75rem]">
                                        <input 
                                            type="text" 
                                            placeholder="Индивидуальная причина..." 
                                            value={customReason} 
                                            onChange={(e) => setCustomReason(e.target.value)}
                                            className="bg-transparent outline-none flex-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Кнопка отклонить */}
                        <Button className="reject-button nh  self-center" onClick={handleConfirm}>
                            Отклонить <Zapret />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

