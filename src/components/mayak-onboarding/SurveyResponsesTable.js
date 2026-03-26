export default function SurveyResponsesTable({ title, description, countLabel, jsonUrl, xlsxUrl, secondaryButtonClassName }) {
    return (
        <div className="rounded-[1.25rem] border border-(--color-gray-plus-50) bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-base font-black text-(--color-black)">{title}</div>
                    {description ? <div className="mt-1 max-w-3xl text-sm text-[#64748b]">{description}</div> : null}
                    {countLabel ? <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">{countLabel}</div> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <a href={jsonUrl} className={secondaryButtonClassName}>
                        Скачать JSON
                    </a>
                    <a href={xlsxUrl} className={secondaryButtonClassName}>
                        Скачать Excel
                    </a>
                </div>
            </div>
        </div>
    );
}
