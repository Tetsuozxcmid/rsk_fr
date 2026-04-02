import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tags from "@/components/ui/Tags";

import Setts from "@/assets/general/setts.svg";
import LinkIcon from "@/assets/general/link.svg";

const MAYAK_FILE_LABELS = {
    certificate: "Сертификат",
    log: "Лог сессии",
    analytics: "Аналитический отчёт",
};

const MAYAK_FILE_ORDER = {
    certificate: 0,
    log: 1,
    analytics: 2,
};

function formatProfileHeading(data) {
    const firstName = String(data?.NameIRL || "").trim();
    const lastName = String(data?.Surname || "").trim();
    return [firstName, lastName].filter(Boolean).join(" ") || "Не заполнено";
}

function formatProfileFullName(data) {
    const firstName = String(data?.NameIRL || "").trim();
    const lastName = String(data?.Surname || "").trim();
    const patronymic = String(data?.Patronymic || "").trim();
    return [firstName, lastName, patronymic].filter(Boolean).join(" ") || "ФИО не заполнено";
}

function formatDateTime(value) {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
        return "Дата не указана";
    }

    return parsed.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatFileSize(byteSize) {
    const size = Number(byteSize) || 0;
    if (size < 1024) {
        return `${size} Б`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} КБ`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatAttemptsLabel(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return `${count} прохождение`;
    }

    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return `${count} прохождения`;
    }

    return `${count} прохождений`;
}

function getSortedMayakFiles(files = []) {
    return [...files].sort((left, right) => {
        const leftOrder = MAYAK_FILE_ORDER[left?.kind] ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = MAYAK_FILE_ORDER[right?.kind] ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }

        return String(left?.fileName || "").localeCompare(String(right?.fileName || ""), "ru");
    });
}

function getUserTypeLabel(type) {
    if (type === "teacher") return "Сотрудник";
    if (type === "student") return "Студент";
    if (type === "moder") return "Модератор";
    if (type === "admin") return "Администратор";
    return "Тип не указан";
}

export default function ProfileIndexPage({ goTo }) {
    const [userData, setUserData] = useState(null);
    const [hydrated, setHydrated] = useState(false);
    const [mayakArtifacts, setMayakArtifacts] = useState([]);
    const [artifactsLoading, setArtifactsLoading] = useState(true);
    const [artifactsError, setArtifactsError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const clearCookies = () => {
            const cookies = document.cookie.split(";");
            for (const cookie of cookies) {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
        };

        const fetchMayakArtifacts = async () => {
            try {
                setArtifactsLoading(true);
                setArtifactsError("");

                const response = await fetch("/api/profile/mayak-artifacts", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || "Не удалось загрузить материалы МАЯК");
                }

                setMayakArtifacts(Array.isArray(payload.artifacts) ? payload.artifacts : []);
            } catch (error) {
                console.error("Mayak artifacts fetch error:", error);
                setArtifactsError(error.message || "Не удалось загрузить материалы МАЯК");
            } finally {
                setArtifactsLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const response = await fetch("/api/profile/info", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        clearCookies();
                        router.push("/auth");
                        return;
                    }

                    switch (data.errorCode) {
                        case "EMAIL_NOT_CONFIRMED":
                            alert("Вы не подтвердили почту. Зайдите в свой почтовый клиент и перейдите по ссылке из письма");
                            clearCookies();
                            router.push("/auth");
                            return;
                        case "UNAUTHORIZED":
                            clearCookies();
                            router.push("/auth");
                            return;
                        case "NOT_FOUND":
                            alert("Профиль не найден");
                            return;
                        default:
                            console.error("Profile fetch error:", data.error);
                            return;
                    }
                }

                setUserData(data);
                await fetchMayakArtifacts();
                setHydrated(true);
            } catch (error) {
                console.error("Request error:", error);
                setArtifactsLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleLogout = async () => {
        const confirmed = window.confirm("Вы уверены, что хотите выйти?");
        if (!confirmed) {
            return;
        }

        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
            });
        } catch (error) {
            console.error("Logout API error:", error);
        }

        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }

        router.push("/auth");
    };

    const handleArtifactDownload = (downloadUrl) => {
        if (!downloadUrl) {
            return;
        }

        window.open(downloadUrl, "_blank", "noopener,noreferrer");
    };

    if (!hydrated || !userData) {
        return null;
    }

    return (
        <>
            <Header>
                <Header.Heading>{formatProfileHeading(userData.data)}</Header.Heading>
                <Button red className="w-fit! shadow-none!" onClick={handleLogout}>
                    Выйти
                </Button>
                <Button icon onClick={() => goTo("settings")}>
                    <Setts />
                </Button>
            </Header>

            <div className="hero" style={{ gridTemplateRows: "repeat(2, auto)" }}>
                <Card>
                    <Card.Heading>
                        <div className="flex gap-[1rem] w-full">
                            <div className="flex flex-col gap-[0.25rem] flex-1">
                                <h4>{formatProfileFullName(userData.data)}</h4>
                                <p className="line-clamp-3">{userData.data?.Description ? userData.data.Description : "Описание не заполнено"}</p>
                            </div>
                        </div>
                        <div className="flex gap-[0.5rem] flex-wrap">
                            <Tags
                                tags={[
                                    { name: userData.data?.username || "username отсутствует", color: "blue" },
                                    {
                                        name: getUserTypeLabel(userData.data.Type),
                                        color: "blue",
                                        icon: "coin",
                                    },
                                    { name: `${userData.data?.Region ? `${userData.data.Region}` : "Регион не заполнен"}`, color: "blue" },
                                ]}
                            />
                        </div>
                    </Card.Heading>
                </Card>

                <div className="col-span-4 max-[900px]:col-span-12 h-fit">
                    <div className="block-wrapper col-span-4 max-[900px]:col-span-12">
                        <h6>Организация и команда</h6>
                        <div className="flex flex-col gap-[0.75rem]">
                            <Link href={`/organizations/${userData.data.Organization ? userData.data.Organization.id : ""}`}>
                                <div className="group cursor-pointer flex items-center justify-between w-full">
                                    <p className="flex-1 link">{userData.data.Organization ? userData.data.Organization.short_name : "Отсутствует"}</p>
                                    <LinkIcon className="stroke-(--color-gray-white) group-hover:stroke-black" style={{ transition: "stroke .3s ease-in-out" }} />
                                </div>
                            </Link>

                            <hr className="w-full border-solid border-[1.5px] border-(--color-gray-plus)" />

                            <Link href={`/teams/${userData.data.team_id}`}>
                                <div className="group flex items-center justify-between w-full">
                                    <p className="flex-1 link">{userData.data.team ? userData.data.team : "Отсутствует"}</p>
                                    <LinkIcon className="stroke-(--color-gray-white) group-hover:stroke-black" style={{ transition: "stroke .3s ease-in-out" }} />
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="block-wrapper col-span-12 max-[900px]:col-span-12 flex flex-col gap-[1rem]">
                    <div className="flex items-center justify-between gap-[1rem] flex-wrap">
                        <h6>Материалы МАЯК</h6>
                        {!artifactsLoading && !artifactsError && mayakArtifacts.length > 0 ? (
                            <span className="small text-(--color-gray-black)">{formatAttemptsLabel(mayakArtifacts.length)}</span>
                        ) : null}
                    </div>

                    {artifactsLoading ? <p className="text-(--color-gray-black)">Загружаем материалы...</p> : null}
                    {!artifactsLoading && artifactsError ? <p className="text-[var(--color-red)]">{artifactsError}</p> : null}
                    {!artifactsLoading && !artifactsError && mayakArtifacts.length === 0 ? (
                        <p className="text-(--color-gray-black)">После завершения тренажёра материалы появятся в этом разделе.</p>
                    ) : null}

                    {!artifactsLoading && !artifactsError && mayakArtifacts.length > 0 ? (
                        <div className="flex flex-col gap-[0.75rem]">
                            {mayakArtifacts.map((artifact, index) => (
                                <details key={artifact.id} className="group rounded-[1rem] border border-(--color-gray-plus) bg-white px-4 py-3">
                                    <summary className="list-none cursor-pointer">
                                        <div className="flex items-center justify-between gap-[1rem]">
                                            <div className="flex flex-col gap-[0.25rem]">
                                                <span className="big">{`№${index + 1}`}</span>
                                                <span className="small text-(--color-gray-black)">
                                                    {`Дата прохождения: ${formatDateTime(artifact.completedAt || artifact.createdAt)}`}
                                                </span>
                                            </div>
                                            <span className="text-(--color-gray-black) text-[1.5rem] leading-none transition-transform duration-300 group-open:rotate-180">
                                                ˅
                                            </span>
                                        </div>
                                    </summary>

                                    <div className="mt-[1rem] flex flex-col gap-[0.75rem] border-t border-(--color-gray-plus) pt-[1rem]">
                                        {artifact.role ? <span className="small text-(--color-gray-black)">{`Роль: ${artifact.role}`}</span> : null}

                                        <div className="grid grid-cols-3 gap-[0.5rem] max-[680px]:grid-cols-1">
                                            {getSortedMayakFiles(artifact.files || []).map((file) => (
                                                <Button
                                                    key={file.id}
                                                    small
                                                    inverted
                                                    roundeful
                                                    className="w-full! border border-(--color-gray-plus) shadow-none! justify-center!"
                                                    onClick={() => handleArtifactDownload(file.downloadUrl)}
                                                    title={
                                                        file.byteSize
                                                            ? `${MAYAK_FILE_LABELS[file.kind] || file.fileName} · ${formatFileSize(file.byteSize)}`
                                                            : MAYAK_FILE_LABELS[file.kind] || file.fileName
                                                    }
                                                >
                                                    {MAYAK_FILE_LABELS[file.kind] || file.fileName}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </details>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
