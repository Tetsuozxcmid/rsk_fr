"use client";

import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { MAYAK_ADMIN_SECTIONS, getMayakAdminAuthStatus, loginMayakAdmin, logoutMayakAdmin } from "@/lib/mayakAdminClient";

const inputClassName =
    "!w-full !rounded-[0.95rem] !border-2 !border-stone-700/80 !bg-white !px-4 !py-3 !text-sm !text-(--color-black) !shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none transition placeholder:!text-[#94a3b8] focus:!border-black";
const primaryButtonClassName =
    "!inline-flex !w-auto !items-center !justify-center !rounded-[1rem] !border-0 !bg-[linear-gradient(135deg,#0f766e_0%,#115e59_100%)] !px-4 !py-3 !text-sm !font-bold !text-white shadow-[0_12px_24px_rgba(15,118,110,0.18)] transition hover:-translate-y-px disabled:opacity-60";
const secondaryButtonClassName =
    "!inline-flex !w-auto !items-center !justify-center !rounded-[1rem] !border !border-(--color-gray-plus-50) !bg-white !px-4 !py-3 !text-sm !font-semibold !text-(--color-black) transition hover:!border-(--color-main) hover:!text-(--color-main)";

function AdminSectionCard({ section }) {
    return (
        <a
            href={section.href}
            className="group !block !w-full !cursor-pointer !rounded-[1.5rem] !border !border-stone-200 !bg-white !p-5 !text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:!border-stone-300">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">MAYAK admin</div>
            <div className="mt-3 text-[1.6rem] font-black leading-tight text-(--color-black)">{section.title}</div>
            <div className="mt-3 text-sm leading-6 text-[#64748b]">{section.description}</div>
            <div className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-(--color-black)">Открыть раздел</div>
        </a>
    );
}

export default function MayakAdminIndexPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const nextPath = useMemo(() => (typeof router.query.next === "string" ? router.query.next : ""), [router.query.next]);
    const showSections = useMemo(() => router.query.view === "sections", [router.query.view]);
    const navigate = useCallback(
        (path, { replace = false } = {}) => {
            if (!path) return;

            if (typeof window !== "undefined") {
                if (replace) {
                    window.location.replace(path);
                } else {
                    window.location.assign(path);
                }
                return;
            }

            if (replace) {
                router.replace(path);
            } else {
                router.push(path);
            }
        },
        [router]
    );

    useEffect(() => {
        if (!router.isReady) return;
        let cancelled = false;

        (async () => {
            try {
                const { authenticated } = await getMayakAdminAuthStatus();
                if (cancelled) return;

                if (authenticated) {
                    if (nextPath && nextPath !== "/admin") {
                        navigate(nextPath, { replace: true });
                        return;
                    }
                    setIsAuth(showSections);
                } else {
                    setIsAuth(false);
                }
                setError("");
            } catch (authError) {
                if (!cancelled) {
                    setError(authError instanceof Error ? authError.message : "Не удалось проверить авторизацию.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [navigate, nextPath, router.isReady, showSections]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            await loginMayakAdmin(password);
            setPassword("");

            if (nextPath && nextPath !== "/admin") {
                navigate(nextPath, { replace: true });
                return;
            }

            navigate("/admin?view=sections", { replace: true });
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : "Не удалось выполнить вход.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        setError("");
        try {
            await logoutMayakAdmin();
            setIsAuth(false);
            navigate("/admin", { replace: true });
        } catch (logoutError) {
            setError(logoutError instanceof Error ? logoutError.message : "Не удалось выйти из админ-панели.");
        } finally {
            setLoggingOut(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header>
                    <Header.Heading>MAYAK admin</Header.Heading>
                </Header>
                <div className="px-6 py-10 text-sm text-[#64748b]">Проверка доступа…</div>
            </>
        );
    }

    if (!isAuth) {
        return (
            <>
                <Header>
                    <Header.Heading>MAYAK admin</Header.Heading>
                </Header>
                <div className="mx-auto flex min-h-[70vh] w-full max-w-[560px] items-center px-5 py-8">
                    <section className="w-full rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:p-7">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Авторизация</div>
                        <div className="mt-3 text-[1.7rem] font-black leading-tight text-(--color-black)">Вход администратора</div>
                        <p className="mt-3 text-sm leading-7 text-[#64748b]">Сначала введите пароль администратора. После входа откроется главная MAYAK-админка с выбором разделов.</p>
                        {nextPath && nextPath !== "/admin" ? <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-700">{`После входа откроется: ${nextPath}`}</div> : null}
                        <form onSubmit={handleLogin} className="mt-6 space-y-4">
                            <label className="block">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Пароль</div>
                                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введите пароль MAYAK" className={inputClassName} autoFocus />
                            </label>
                            {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}
                            <button type="submit" className={primaryButtonClassName} disabled={submitting}>
                                {submitting ? "Входим…" : "Войти"}
                            </button>
                        </form>
                    </section>
                </div>
            </>
        );
    }

    return (
        <>
            <Header>
                <Header.Heading>MAYAK admin</Header.Heading>
            </Header>
            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-8">
                <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:p-7">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-2xl">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">MAYAK admin</div>
                            <h1 className="mt-3 text-[2.2rem] font-black leading-[1.02] text-(--color-black)">Выберите раздел</h1>
                            <p className="mt-3 text-sm leading-7 text-[#64748b]">Единая точка входа для основных MAYAK-админок. Авторизация уже активна для связанных разделов.</p>
                        </div>
                        <button type="button" className={secondaryButtonClassName} onClick={handleLogout} disabled={loggingOut}>
                            {loggingOut ? "Выходим…" : "Выйти"}
                        </button>
                    </div>
                </section>

                {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}

                <section className="grid gap-5 md:grid-cols-2">
                    {MAYAK_ADMIN_SECTIONS.map((section) => (
                        <AdminSectionCard key={section.id} section={section} />
                    ))}
                </section>
            </div>
        </>
    );
}
