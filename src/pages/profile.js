import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import Layout from "@/components/layout/Layout";
import TransitionWrapper from "@/components/layout/TransitionWrapper";
import { getCachedPortalProfilePayload, isMissingPortalProfilePayload } from "@/lib/portalProfileClient";

import IndexPage from "@/components/pages/profile/index";
import SettingsPage from "@/components/pages/profile/settings";
import FolderPage from "@/components/pages/profile/workfolder";

export default function ProfilePage() {
    const router = useRouter();
    const [pageKey, setPageKey] = useState(() => {
        const cachedPayload = getCachedPortalProfilePayload();
        return isMissingPortalProfilePayload(cachedPayload) ? "settings" : "profile";
    });

    useEffect(() => {
        if (!router.isReady) {
            return;
        }

        if (router.query.tab === "settings") {
            setPageKey("settings");
        }
    }, [router.isReady, router.query.tab]);

    const goTo = (pageName) => {
        setPageKey(pageName);
    };

    return (
        <Layout>
            <TransitionWrapper currentKey={pageKey}>
                {pageKey === "profile" && <IndexPage goTo={goTo} />}
                {pageKey === "settings" && <SettingsPage goTo={goTo} />}
                {pageKey === "workfolder" && <FolderPage goTo={goTo} />}
            </TransitionWrapper>
        </Layout>
    );
}
