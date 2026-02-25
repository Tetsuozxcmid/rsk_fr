import { useRouter } from "next/router";
import { useState, useEffect, useContext } from "react"; // Добавили useContext
import { motion, AnimatePresence } from "framer-motion";
import { isAuthorized } from "@/utils/auth";
import dynamic from "next/dynamic";

import Switcher from "@/components/ui/Switcher";
import Layout from "@/components/layout/Layout";
import Header from "@/components/layout/Header";

// Импорты стадий
import RegStage0 from "@/components/pages/auth/reg/Stage0";
import RegStage1 from "@/components/pages/auth/reg/Stage1";
import LoginStage0 from "@/components/pages/auth/login/Stage0";
import LoginStage1 from "@/components/pages/auth/login/Stage1";

const AuthIcon = dynamic(() => import("@/assets/nav/auth.svg"));

const pageVariants = {
    initial: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
    in: { x: 0, opacity: 1, transition: { duration: 0.5, ease: "circOut" } },
    out: (direction) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.5, ease: "circIn" } }),
};

export default function AuthPage() {
    const [authType, setAuthType] = useState("register");
    const [step, setStep] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (isAuthorized()) router.push("/profile");
    }, [router]);

    const getDirection = () => (authType === "register" ? 1 : -1);
    const switchToLogin = () => { setAuthType("login"); setStep(0); };

    const stages = {
        register: [
            <RegStage0 key="reg-0" onContinue={() => setStep(1)} pageVariants={pageVariants} custom={getDirection()} />,
            <RegStage1 key="reg-1" pageVariants={pageVariants} custom={getDirection()} onSwitchToLogin={switchToLogin} />,
        ],
        login: [
            <LoginStage0 key="login-0" pageVariants={pageVariants} custom={getDirection()} onForgotPassword={() => setStep(1)} />,
            <LoginStage1 key="login-1" onRecover={() => {}} onBack={() => setStep(0)} pageVariants={pageVariants} custom={getDirection()} />,
        ],
    };

    return (
        <Layout>
            <Header className="flex items-center w-full">
                {/* ЛЕВО: На мобилке flex-1 (толкает центр), на десктопе flex-none (не мешает) */}
                <div className="max-[640px]:flex-1 flex-none flex justify-start">
                    {/* Бургер из Header.js сам сюда встанет на мобилке */}
                </div>

                {/* ЦЕНТР: Свитчер */}
                <div className="flex-none flex justify-center">
                    <Switcher
                        value={authType}
                        onChange={(val) => {
                            setAuthType(val);
                            setStep(0);
                        }}>
                        <Switcher.Option value="login">Вход</Switcher.Option>
                        <Switcher.Option value="register">Регистрация</Switcher.Option>
                    </Switcher>
                </div>
            </Header>

            <div className="hero relative overflow-hidden">
                <AnimatePresence mode="wait" custom={getDirection()} initial={false}>
                    {stages[authType][step]}
                </AnimatePresence>
            </div>
        </Layout>
    );
}