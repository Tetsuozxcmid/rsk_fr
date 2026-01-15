import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import VK from "@/assets/general/vk.svg";

export default function VKWidget() {
    const router = useRouter();
    const initialized = useRef(false);

    // === LISTENER: ЛОВИМ СООБЩЕНИЕ ОТ VK ===
    useEffect(() => {
        const handleMessage = (event) => {
            console.log("[VK MESSAGE EVENT]", event);

            // принимаем ТОЛЬКО сообщения от VK
            if (event.origin !== "https://id.vk.ru") return;

            console.log("[VK MESSAGE DATA]", event.data);

            const payload = event.data?.payload;

            if (!payload?.code || !payload?.device_id) {
                console.log("[VK MESSAGE IGNORED]");
                return;
            }

            console.log("[VK CODE RECEIVED]");
            console.log("code:", payload.code);
            console.log("device_id:", payload.device_id);

            sendToBackend({
                code: payload.code,
                device_id: payload.device_id,
            });
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // === LOAD SDK + INIT ===
    useEffect(() => {
        if (initialized.current) return;

        const loadScript = () => {
            console.log("[VK SDK LOADING]");
            const script = document.createElement("script");
            script.src =
                "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
            script.async = true;
            script.onload = initVK;
            document.body.appendChild(script);
        };

        const initVK = () => {
            if (!window.VKIDSDK) {
                console.error("[VK SDK NOT FOUND]");
                return;
            }

            const VKID = window.VKIDSDK;
            console.log("[VK SDK LOADED]", VKID);

            VKID.Config.init({
                app: 54409000,
                redirectUrl: window.location.origin + "/vk-callback",
                responseMode: VKID.ConfigResponseMode.Callback,
                source: VKID.ConfigSource.LOWCODE,
                scope: "",
                mode: VKID.ConfigAuthMode.InNewWindow,
            });

            console.log("[VK SDK INIT DONE]");
        };

        loadScript();
        initialized.current = true;
    }, []);

    // === LOGIN ===
    const handleVKLogin = () => {
        console.log("[VK LOGIN CLICK]");

        if (!window.VKIDSDK?.Auth?.login) {
            console.error("[VK SDK NOT READY]");
            return;
        }

        const originalOpen = window.open;

        window.open = (url, target, features) => {
            console.log("[POPUP OPEN]", url);
            const width = 620;
            const height = 700;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            return originalOpen(
                url,
                target,
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );
        };

        window.VKIDSDK.Auth.login()
            .then((res) => {
                console.log("[VK Auth.login THEN]", res);
                // результат может прийти и тут, и через postMessage — это нормально
            })
            .catch((err) => {
                console.error("[VK Auth.login ERROR]", err);
            })
            .finally(() => {
                window.open = originalOpen;
            });
    };

    // === BACKEND ===
    const sendToBackend = async (data) => {
        console.log("[SEND TO BACKEND]", data);

        try {
            const response = await fetch("https://api.rosdk.ru/auth/users_interaction/auth/vk/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            console.log("[BACKEND STATUS]", response.status);

            const text = await response.text();
            console.log("[BACKEND RESPONSE]", text);

            if (response.ok) {
                router.push("/");
            }
        } catch (error) {
            console.error("[BACKEND ERROR]", error);
        }
    };

    return (
        <Button
            inverted
            className="w-full h-full !p-0 gap-[6px] justify-center"
            onClick={handleVKLogin}
        >
            VK ID <VK />
        </Button>
    );
}
