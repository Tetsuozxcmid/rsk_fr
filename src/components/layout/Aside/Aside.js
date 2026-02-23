import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";

import Image from "next/image";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";

import { useUserData } from "@/utils/auth";
import Button from "@/components/ui/Button";

import { useNavLinks, NavItem } from "./Nav";

const AuthIcon = dynamic(() => import("@/assets/nav/auth.svg"));
const Burger = dynamic(() => import("@/assets/nav/burger.svg"));
const Telegram = dynamic(() => import("@/assets/general/tg.svg"));

export default function Aside() {
    const router = useRouter();
    const initialCollapsed = Cookies.get("sidebarCollapsed") === "true";

    const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
    const [hovered, setHovered] = useState(null);
    const { navLinks, isLoading } = useNavLinks();
    const userData = useUserData();

    const toggleSidebar = () => {
        setIsCollapsed((c) => {
            const next = !c;
            Cookies.set("sidebarCollapsed", String(next), {
                path: "/",
                sameSite: "strict",
                expires: 7,
            });
            return next;
        });
    };

    // Пока загружаются данные, можно показать скелетон или ничего не показывать
    if (isLoading) {
        return (
            <motion.aside
                initial={false}
                animate={isCollapsed ? "collapsed" : "expanded"}
                variants={{
                    expanded: { width: "16rem", transition: { type: "spring", stiffness: 200, damping: 30 } },
                    collapsed: { width: "6.5rem", transition: { type: "spring", stiffness: 200, damping: 30 } },
                }}
                className="overflow-hidden">
                <div className={`logo-container flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div key="logo" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                                <div className="relative w-[76px] h-[40px] max-lg:w-[46px] max-lg:h-[24px]">
                                    <Image src="/images/logo.svg" alt="logo" fill />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <Burger onClick={toggleSidebar} className="cursor-pointer" />
                </div>
                <div className="flex justify-center items-center h-20">
                    <span>Загрузка...</span>
                </div>
            </motion.aside>
        );
    }

    return (
        <motion.aside
            initial={false}
            animate={isCollapsed ? "collapsed" : "expanded"}
            variants={{
                expanded: { width: "16rem", transition: { type: "spring", stiffness: 200, damping: 30 } },
                collapsed: { width: "6.5rem", transition: { type: "spring", stiffness: 200, damping: 30 } },
            }}
            className="overflow-hidden">
            <div className={`logo-container flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div key="logo" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                            <div className="relative w-[76px] h-[40px] max-lg:w-[46px] max-lg:h-[24px]">
                                <Image src="/images/logo.svg" alt="logo" fill />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <Burger onClick={toggleSidebar} className="cursor-pointer" />
            </div>

            <nav>
                {navLinks.map((item) => (
                    <NavItem key={item.label} {...item} isCollapsed={isCollapsed} disable={item.disable} isHovered={hovered === item.label} onHover={setHovered} />
                ))}
            </nav>

            <Button inverted className={`bg-(--color-blue-noise)! text-(--color-blue)! ${isCollapsed ? "!p-[1rem]" : ""}`} onClick={() => window.open("https://t.me/rskfed", "_blank")}>
                <AnimatePresence mode="wait">
                    {!isCollapsed ? (
                        <motion.span
                            className="flex items-center gap-2"
                            key="full-text"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                            <Telegram className="h-[1.375rem] aspect-quare" />
                            Наш телеграмм
                        </motion.span>
                    ) : (
                        <motion.span key="icon" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                            <Telegram className="h-[1.375rem] aspect-quare" />
                        </motion.span>
                    )}
                </AnimatePresence>
            </Button>
            {userData ? (
                <div className="flex gap-[0.75rem] justify-center h-[2rem] cursor-pointer" onClick={() => router.push("/profile")}>
                    <div className="h-full rounded-[0.5rem] aspect-square bg-(--color-black)"></div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col w-full">
                                <span className="link big">{userData.username ? `${userData.username}` : "Незаполнено"}</span>
                                <span className="link small text-bold text-(--color-gray-black)">{userData.email}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <Button inverted roundeful className={`auth ${isCollapsed ? "!p-[1rem]" : ""}`} onClick={() => router.push("/auth")}>
                    <AnimatePresence mode="wait">
                        {!isCollapsed ? (
                            <motion.span key="full-text" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                                Авторизация
                            </motion.span>
                        ) : (
                            <motion.span key="icon" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                                <AuthIcon />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>
            )}
        </motion.aside>
    );
}
