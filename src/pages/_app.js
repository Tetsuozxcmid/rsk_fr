import "@/styles/globals.css";
import "@/styles/prep-session.css";

import { useEffect } from "react";
import { useRouter } from "next/router";

import { isAuthorized, saveUserData } from "@/utils/auth";
import { clearMayakPortalAuthPending, readMayakPortalAuthPending } from "@/utils/mayakPortalAuth";

export default function App({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        const syncOAuthSession = async () => {
            const pendingMayakAuth = readMayakPortalAuthPending();
            if (pendingMayakAuth?.returnPath && router.pathname !== pendingMayakAuth.returnPath) {
                clearMayakPortalAuthPending();
                router.replace(pendingMayakAuth.returnPath);
                return;
            }

            if (isAuthorized()) {
                return;
            }

            try {
                const response = await fetch("/api/profile/info", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                await saveUserData({
                    email: data?.data?.email,
                    username: data?.data?.NameIRL,
                });

                if (router.pathname === "/auth") {
                    router.push("/profile");
                }
            } catch (error) {
                console.error("App: Error syncing session:", error);
            }
        };

        syncOAuthSession();
    }, [router]);

    return <Component {...pageProps} />;
}
