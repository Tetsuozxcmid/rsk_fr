import Link from "next/link";

const shellBackground = "bg-white";

export function OnboardingShell({ backHref, backLabel = "Назад", badge, title, subtitle, meta, aside, heroPanel, children }) {
    const hasAside = Boolean(aside);
    const renderHeroPanelBelow = Boolean(heroPanel) && !hasAside;
    const centeredHero = !hasAside;

    return (
        <div className={`min-h-screen ${shellBackground}`}>
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
                {backHref ? (
                    <Link
                        href={backHref}
                        className="!inline-flex !w-fit items-center gap-2 rounded-full border border-stone-300/80 bg-white/90 px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-stone-500 hover:text-stone-950">
                        <span aria-hidden="true">←</span>
                        <span>{backLabel}</span>
                    </Link>
                ) : null}

                <div className={`grid items-start gap-5 ${hasAside ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
                    <section className="overflow-hidden px-2 py-2 md:px-4 md:py-3">
                        {badge ? (
                            <div className={`mb-5 inline-flex rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600 ${centeredHero ? "mx-auto" : ""}`}>{badge}</div>
                        ) : null}
                        <div className={`gap-6 ${heroPanel && !renderHeroPanelBelow ? "grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start" : ""}`}>
                            <div className={`max-w-4xl ${centeredHero ? "mx-auto text-center" : ""}`}>
                                <h1 className="text-[2.2rem] font-black leading-[0.98] text-stone-950 md:text-[3.5rem]">{title}</h1>
                                {meta ? <div className="mt-5 text-sm font-semibold text-stone-500">{meta}</div> : null}
                                {subtitle ? <p className="mt-4 text-[1rem] leading-8 text-stone-500 md:text-[1.05rem]">{subtitle}</p> : null}
                            </div>
                            {heroPanel && !renderHeroPanelBelow ? <div className="lg:justify-self-end">{heroPanel}</div> : null}
                        </div>
                        {renderHeroPanelBelow ? <div className="mt-6 w-full">{heroPanel}</div> : null}
                    </section>

                    {aside ? <div className="flex flex-col gap-4 xl:sticky xl:top-6">{aside}</div> : null}
                </div>

                {children}
            </div>
        </div>
    );
}

export function SideCard({ title, subtitle, children, tone = "default" }) {
    const toneClassName = tone === "dark" ? "border-stone-950/90 bg-stone-950 text-white shadow-[0_18px_54px_rgba(28,25,23,0.16)]" : "border-stone-200 bg-white text-stone-950 shadow-[0_12px_30px_rgba(28,25,23,0.05)]";

    return (
        <div className={`rounded-[1.75rem] border p-5 ${toneClassName}`}>
            <div className={`text-lg font-bold ${tone === "dark" ? "text-white" : "text-stone-950"}`}>{title}</div>
            {subtitle ? <div className={`mt-2 text-sm leading-7 ${tone === "dark" ? "text-stone-300" : "text-stone-500"}`}>{subtitle}</div> : null}
            {children ? <div className="mt-4">{children}</div> : null}
        </div>
    );
}

export function ProgressCard({ value, label = "Готовность", hint }) {
    return (
        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</div>
                    {hint ? <div className="mt-2 text-sm leading-7 text-stone-500">{hint}</div> : null}
                </div>
                <div className="text-[2rem] font-black leading-none text-stone-950">{value}%</div>
            </div>
            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#3f3f46_48%,#0f766e_100%)] transition-[width] duration-500" style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

export function HeroProgress({ value, label = "Готовность", caption, className = "" }) {
    return (
        <div className={`w-full px-0 py-0 ${className}`.trim()}>
            <div className="flex items-end justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</div>
                <div className="text-[2rem] font-black leading-none text-stone-950">{value}%</div>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#3f3f46_48%,#0f766e_100%)] transition-[width] duration-500" style={{ width: `${value}%` }} />
            </div>
            {caption ? <div className="mt-3 text-sm leading-6 text-stone-500">{caption}</div> : null}
        </div>
    );
}

export function SectionBadge({ done, doneLabel = "Готово", pendingLabel = "В процессе" }) {
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{done ? doneLabel : pendingLabel}</span>;
}

export function ActionButton({ children, href, onClick, tone = "primary", disabled = false, type = "button", className = "" }) {
    const baseClassName =
        tone === "secondary"
            ? "!inline-flex !w-auto !appearance-none !items-center !justify-center !rounded-[1.15rem] !border !border-stone-300/80 !bg-white !px-4 !py-3 !text-sm !font-semibold !text-stone-900 transition hover:!border-stone-500 hover:!bg-stone-50 disabled:!cursor-not-allowed disabled:!opacity-50"
            : "!inline-flex !w-auto !appearance-none !items-center !justify-center !rounded-[1.15rem] !border-0 !bg-stone-950 !px-5 !py-3 !text-sm !font-bold !text-white shadow-[0_14px_28px_rgba(41,37,36,0.18)] transition hover:-translate-y-px hover:!bg-black disabled:!cursor-not-allowed disabled:!opacity-50";

    if (href) {
        return (
            <a href={href} target="_blank" rel="noreferrer" className={`${baseClassName} ${className}`.trim()}>
                {children}
            </a>
        );
    }

    return (
        <button type={type} onClick={onClick} className={`${baseClassName} ${className}`.trim()} disabled={disabled}>
            {children}
        </button>
    );
}

export function OnboardingModal({ open, title, text, children, onClose, maxWidth = "max-w-3xl", align = "left" }) {
    if (!open) return null;

    const isCentered = align === "center";

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(15,23,42,0.42)] p-4" onClick={onClose}>
            <div className={`relative w-full ${maxWidth} rounded-[1.8rem] border border-stone-300/80 bg-white p-6 shadow-[0_32px_96px_rgba(0,0,0,0.24)]`} onClick={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    aria-label="Закрыть"
                    onClick={onClose}
                    className="!absolute !right-4 !top-4 !inline-flex !h-9 !w-9 !items-center !justify-center !rounded-full !border !border-stone-300/80 !bg-white !p-0 !text-lg !font-semibold !text-stone-900 transition hover:!border-stone-500">
                    x
                </button>
                <div className={`pr-10 ${isCentered ? "text-center" : ""}`}>
                    <h2 className="text-[1.7rem] font-black leading-tight text-stone-950">{title}</h2>
                    {text ? <p className="mt-3 text-[0.98rem] leading-7 text-stone-500">{text}</p> : null}
                </div>
                {children ? <div className={`mt-5 ${isCentered ? "flex justify-center" : ""}`}>{children}</div> : null}
            </div>
        </div>
    );
}
