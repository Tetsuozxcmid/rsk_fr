import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import { getCookie, setCookie, clearCookies } from "@/utils/cookies";
import { useProfile } from "@/hooks/fetchProfile";

const DownIcon = dynamic(() => import("@/assets/general/down.svg"));

// Базовый массив навигационных ссылок
const BASE_NAV_LINKS = [
    { label: "Главная", disable: false, login: false, learn: false, href: "/", icon: dynamic(() => import("@/assets/nav/home.svg")) },
    {
        label: "Команды",
        disable: false,
        login: true,
        learn: true,
        href: "#",
        icon: dynamic(() => import("@/assets/nav/team.svg")),
        submenu: [
            // { label: "Создать команду", href: "/teams/create" },
            { label: "Список команд", href: "/teams" },
            { label: "Моя команда", href: "/teams/my" },
        ],
    },
    { label: "Организации", disable: false, login: true, learn: false, href: "/organizations", icon: dynamic(() => import("@/assets/nav/organ.svg")) },
    { label: "Проекты", disable: false, login: true, learn: true, href: "/projects", icon: dynamic(() => import("@/assets/nav/projects.svg")) },
    // {
    //     label: "Мастерская",
    //     href: "#",
    //     icon: dynamic(() => import("@/assets/nav/pulse.svg")),
    //     submenu: [
    //         { label: "Пульс", href: "/pulse" },
    //         { label: "Статистика", href: "/pulse/stats" },
    //     ],
    // },
    // { label: 'Новости', href: '/news', icon: dynamic(() => import('@/assets/nav/news.svg')) },
    { label: "Обучение", disable: false, login: true, learn: false, href: "/cours", icon: dynamic(() => import("@/assets/nav/cours.svg")) },
    { label: "Маяк Око", href: "/tools/mayak-oko", login: false, learn: false, icon: dynamic(() => import("@/assets/nav/inst.svg")) },
    // {
    //     label: "Инструменты",
    //     disable: false,
    //     login: false,
    //     learn: false,
    //     href: "#",
    //     icon: dynamic(() => import("@/assets/nav/inst.svg")),
    //     submenu: [
    //         { label: "Маяк Око", href: "/tools/mayak-oko" },
    //         // { label: "В будущем", href: "/tools/mvp" },
    //     ],
    // },
    {
        label: "Админ панель",
        disable: true, // по умолчанию заблокирована
        login: false,
        learn: false,
        href: "#",
        icon: dynamic(() => import("@/assets/nav/king.svg")),
        submenu: [
            { label: "Проекты", href: "/admin/projects" },
            // { label: 'Преподаватели', href: '/admin/teachers' },
            { label: "Обучение", href: "/admin/cours" },
        ],
    },
];

export function useNavLinks() {
    const router = useRouter();
    const [navLinks, setNavLinks] = useState(BASE_NAV_LINKS);
    const [isLoading, setIsLoading] = useState(true);
    const { data: profileData, fetchProfile } = useProfile();

    // Функция обновления навигации
    const updateNavLinks = (role, learn, hasToken) => {
        setNavLinks((prevLinks) =>
            prevLinks.map((link) => {
                const updatedLink = { ...link };
                if (link.label === "Админ панель") {
                    updatedLink.disable = role !== "moder";
                }
                return updatedLink;
            })
        );
    };

    // Проверка авторизации и роли
    useEffect(() => {
        const checkAuthAndRole = async () => {
            const userData = getCookie("userData");
            const existingRole = getCookie("role");
            const existingLearn = getCookie("learn");

            // Если токена нет
            if (!userData) {
                setNavLinks((prevLinks) =>
                    prevLinks.map((link) => ({
                        ...link,
                        login: link.login,
                    }))
                );
                setIsLoading(false);
                return;
            }

            // Если токен есть, но роль и learn уже в куках
            if (existingRole && existingLearn !== null) {
                updateNavLinks(existingRole, existingLearn === "true", true);
                setIsLoading(false);
                return;
            }

            // Если токен есть, но роли или learn в куках нет - делаем запрос через hook
            await fetchProfile();
        };

        checkAuthAndRole();
    }, [fetchProfile]);

    // Обработка данных профиля после загрузки
    useEffect(() => {
        if (!profileData) return;

        const role = profileData?.Type;
        const learn = profileData?.learn === true;
        const organization = profileData?.Organization;

        if (!role) {
            clearCookies();
            router.push("/auth");
            return;
        }

        // Сохраняем данные в куки через централизованную функцию
        setCookie("role", role);
        setCookie("learn", learn);
        if (organization) {
            setCookie("organization", organization);
        }

        updateNavLinks(role, learn, true);
        setIsLoading(false);
    }, [profileData, router]);

    return { navLinks, isLoading };
}

export function NavItem({ label, href, icon: Icon, submenu, isCollapsed, isHovered, onHover, disable, login, learn }) {
    const router = useRouter();
    const isSubmenuActive = submenu?.some((item) => router.pathname === item.href);

    // Получаем данные из кук через централизованную функцию
    const userData = getCookie("userData");
    const userLearn = getCookie("learn") === "true";

    // Проверяем условия активности ссылки
    const isLoginInactive = login && !userData;
    const isLearnInactive = learn && !userLearn;
    const isInactive = isLoginInactive || isLearnInactive;

    // Если элемент отключен, не рендерим его
    if (disable) return null;

    // Если ссылка неактивна, скрываем подменю
    if (isInactive) {
        submenu = null;
    }

    return (
        <div key={label} className={`group flex flex-col gap-[0.75rem] cursor-pointer`} onMouseEnter={() => onHover(label)} onMouseLeave={() => onHover(null)}>
            <Link className={`${router.pathname === href ? "active" : ""} items-center ${isInactive ? "inactive pointer-events-none" : isSubmenuActive ? "opacity-100" : "opacity-30 group-hover:opacity-100"}`} href={isInactive ? "#" : href}>
                <Icon className="w-[1.375rem] h-[1.375rem] max-[900px]:w-[1.25rem] max-[900px]:h-[1.25rem]" />
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="whitespace-nowrap">
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
                {submenu && (isHovered || isSubmenuActive) && !isCollapsed && <DownIcon className="ml-auto" />}
            </Link>
            <AnimatePresence mode="wait">
                {submenu && (isHovered || isSubmenuActive) && !isCollapsed && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 200, damping: 30 }} className="submenu overflow-hidden">
                        <div className="w-[1.5px] h-full bg-(--color-gray-plus)"></div>
                        <div className="submenu-items w-full">
                            {submenu.map((item) => (
                                <Link key={item.label} href={item.href} className={`${router.pathname === item.href ? "active" : ""} opacity-30 hover:opacity-100`}>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Экспортируем базовый массив для обратной совместимости
export const NAV_LINKS = BASE_NAV_LINKS;
