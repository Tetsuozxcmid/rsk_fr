import { useMemo } from "react";

export default function OrganizerHelp({ organizer, open, onToggle }) {
    const hasContact = useMemo(() => Boolean(organizer && (organizer.name || organizer.phone)), [organizer]);
    if (!hasContact) return null;

    if (open) {
        return (
            <div className="fixed bottom-4 right-4 z-30 w-[300px] overflow-hidden rounded-[1.3rem] border border-stone-300/80 bg-white shadow-[0_22px_54px_rgba(15,23,42,0.18)]">
                <button type="button" onClick={onToggle} className="!w-full !rounded-none !border-0 border-b border-stone-200 !bg-[linear-gradient(135deg,#fff0c2_0%,#fde68a_100%)] !px-4 !py-3 !text-left !text-sm !font-bold !text-stone-950">
                    Нужна помощь организатора
                </button>
                <div className="flex flex-col gap-2 px-4 py-4">
                    {organizer.name ? <div className="text-sm font-bold text-stone-950">{organizer.name}</div> : null}
                    {organizer.phone ? <div className="text-sm font-medium text-[#4f6479]">{organizer.phone}</div> : null}
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onToggle}
            className="!fixed !bottom-4 !right-4 !z-30 !inline-flex !w-auto !items-center !gap-2 !rounded-full !border !border-stone-300/80 !bg-white !px-4 !py-3 !text-sm !font-semibold !text-stone-950 shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition hover:!border-[#0f766e] hover:!text-[#0f766e]">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#0f766e]" />
            <span>Нужна помощь</span>
        </button>
    );
}
