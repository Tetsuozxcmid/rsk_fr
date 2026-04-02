import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import Switcher from "@/components/ui/Switcher";
import RegStage0 from "@/components/pages/auth/reg/Stage0";
import RegStage1 from "@/components/pages/auth/reg/Stage1";
import LoginStage0 from "@/components/pages/auth/login/Stage0";
import LoginStage1 from "@/components/pages/auth/login/Stage1";

const pageVariants = {
    initial: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
    in: { x: 0, opacity: 1, transition: { duration: 0.35, ease: "circOut" } },
    out: (direction) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.35, ease: "circIn" } }),
};

export default function MayakPlatformAuthFlow({ onAuthenticated, onOAuthStart }) {
    const [authType, setAuthType] = useState("login");
    const [step, setStep] = useState(0);

    const direction = authType === "register" ? 1 : -1;

    return (
        <div className="flex flex-col gap-[1rem]">
            <div className="flex flex-col gap-[0.5rem]">
                <span className="big">Авторизация на платформе</span>
            </div>

            <Switcher
                value={authType}
                onChange={(nextValue) => {
                    setAuthType(nextValue);
                    setStep(0);
                }}
                className="!w-full">
                <Switcher.Option value="login">Вход</Switcher.Option>
                <Switcher.Option value="register">Регистрация</Switcher.Option>
            </Switcher>

            <div className="relative min-h-[360px] overflow-hidden">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    {authType === "login" && step === 0 && (
                        <LoginStage0 key="mayak-login-stage0" pageVariants={pageVariants} custom={direction} onForgotPassword={() => setStep(1)} onAuthenticated={onAuthenticated} onOAuthStart={onOAuthStart} />
                    )}
                    {authType === "login" && step === 1 && <LoginStage1 key="mayak-login-stage1" pageVariants={pageVariants} custom={direction} onBack={() => setStep(0)} />}
                    {authType === "register" && step === 0 && <RegStage0 key="mayak-register-stage0" pageVariants={pageVariants} custom={direction} onContinue={() => setStep(1)} onOAuthStart={onOAuthStart} />}
                    {authType === "register" && step === 1 && (
                        <RegStage1
                            key="mayak-register-stage1"
                            pageVariants={pageVariants}
                            custom={direction}
                            onSwitchToLogin={() => {
                                setAuthType("login");
                                setStep(0);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
