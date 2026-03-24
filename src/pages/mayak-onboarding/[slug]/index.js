import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OrganizerHelp from "@/components/mayak-onboarding/OrganizerHelp";
import { formatOnboardingDate, getChecklistConfig, getOnboardingLink } from "@/lib/mayakOnboardingClient";

function RoleCard({ href, badge, title, text, cta, tone = "participant" }) {
    const pillClassName = tone === "tech" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-800";

    return (
        <Link
            href={href}
            className="group flex h-full min-h-[280px] flex-col rounded-[2rem] border border-stone-200 bg-white p-7 text-stone-950 shadow-[0_14px_40px_rgba(28,25,23,0.06)] transition duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_20px_48px_rgba(28,25,23,0.08)]">
            <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${pillClassName}`}>{badge}</span>
            <div className="mt-8 max-w-[12ch] text-[2.5rem] font-black leading-[0.92] tracking-[-0.03em] text-stone-950 md:text-[3rem]">{title}</div>
            <p className="mt-auto pt-8 text-base leading-8 text-stone-500">{text}</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-stone-950">
                <span>{cta}</span>
                <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    →
                </span>
            </div>
        </Link>
    );
}

export default function MayakOnboardingIndexPage() {
    const router = useRouter();
    const [link, setLink] = useState(null);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const slug = typeof router.query.slug === "string" ? router.query.slug : "";

    useEffect(() => {
        if (!router.isReady || !slug) return;
        Promise.all([getOnboardingLink(slug), getChecklistConfig()])
            .then(([linkResponse, configResponse]) => {
                setLink(linkResponse.link);
                setConfig(configResponse.config);
                setError("");
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Ссылка недоступна."));
    }, [router.isReady, slug]);

    const baseClassName = "flex min-h-screen items-center justify-center bg-[#f8f8f6] px-4";

    if (!slug) {
        return (
            <div className={baseClassName}>
                <div className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center text-stone-500 shadow-[0_18px_48px_rgba(28,25,23,0.06)]">Используйте персональную ссылку, которую отправил администратор.</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={baseClassName}>
                <div className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center text-stone-500 shadow-[0_18px_48px_rgba(28,25,23,0.06)]">{error}</div>
            </div>
        );
    }

    if (!link) return null;

    return (
        <>
            <div className="min-h-screen bg-[#f8f8f6] px-4 py-8 md:py-10">
                <div className="mx-auto max-w-6xl space-y-6">
                    <section className="px-2 py-2 text-center md:px-4">
                        <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-stone-600">Подготовка к сессии</div>
                        <div className="mx-auto mt-6 max-w-4xl">
                            <h1 className="text-[2.35rem] font-black leading-[0.92] tracking-[-0.04em] text-stone-950 md:text-[3.8rem]">{link.title}</h1>
                            {link.eventDate ? (
                                <div className="mt-5 text-sm font-semibold text-stone-500">{link.endDate ? `${formatOnboardingDate(link.eventDate)} - ${formatOnboardingDate(link.endDate)}` : formatOnboardingDate(link.eventDate)}</div>
                            ) : null}
                            {link.location ? <div className="mt-2 text-sm text-stone-500">{link.location}</div> : null}
                            <p className="mx-auto mt-5 max-w-3xl text-[1rem] leading-8 text-stone-500 md:text-[1.05rem]">Выберите нужный поток подготовки.</p>
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <RoleCard
                            href={`/mayak-onboarding/${encodeURIComponent(slug)}/participant`}
                            badge="Участник"
                            title="Подготовить ноутбук и сервисы"
                            text="Проверка личного ноутбука, подтверждение характеристик, входы в сервисы и фиксация готовности к старту."
                            cta="Перейти к подготовке"
                        />
                        <RoleCard
                            href={`/mayak-onboarding/${encodeURIComponent(slug)}/tech`}
                            badge="Техспециалист"
                            title="Подтвердить готовность площадки"
                            text="Проверка пространства, сети и оборудования."
                            cta="Перейти к подготовке"
                            tone="tech"
                        />
                    </div>
                </div>
            </div>

            <OrganizerHelp organizer={config?.organizer} open={showHelp} onToggle={() => setShowHelp((value) => !value)} />
        </>
    );
}
