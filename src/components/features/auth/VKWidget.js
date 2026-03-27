import { useRef, useEffect } from "react";
import Button from "@/components/ui/Button";
import VK from "@/assets/general/vk.svg";

export default function VKWidget({ onStart }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const loadScript = () => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
      script.async = true;
      script.onload = initVK;
      document.body.appendChild(script);
    };

    const initVK = () => {
      if (!window.VKIDSDK) return;

      window.VKIDSDK.Config.init({
        app: 54409000,
        redirectUrl: "https://api.rosdk.ru/auth/users_interaction/auth/vk/callback",
        responseMode: window.VKIDSDK.ConfigResponseMode.Redirect,
        source: window.VKIDSDK.ConfigSource.LOWCODE,
        scope: "email",
        mode: window.VKIDSDK.ConfigAuthMode.InNewWindow,
      });
    };

    loadScript();
    initialized.current = true;
  }, []);

  const handleVKLogin = () => {
    if (!window.VKIDSDK?.Auth?.login) return;

    if (typeof onStart === "function") {
      onStart("vk");
    }

    const originalOpen = window.open;

    window.open = (url, target, features) => {
      const width = 620;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      return originalOpen(url, target, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    };

    window.VKIDSDK.Auth.login()
      .catch(() => {}) // ошибки можно игнорировать, редирект на сервер
      .finally(() => {
        window.open = originalOpen;
      });
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
