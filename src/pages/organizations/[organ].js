import { useState } from "react";
import { useRouter } from "next/router";

import Layout from "@/components/layout/Layout";
import TransitionWrapper from "@/components/layout/TransitionWrapper";

import OrganIndexPage from "@/components/pages/organizations";
import OrganMembersPage from "@/components/pages/organizations/members";

export default function ProfilePage() {
    const [pageKey, setPageKey] = useState("organ");
    const router = useRouter();
    const { organ } = router.query;

    const goTo = (pageName) => {
        setPageKey(pageName);
    };

    return (
        <Layout>
            <TransitionWrapper currentKey={pageKey}>
                {pageKey === "organ" && <OrganIndexPage goTo={goTo} organ={organ} />}
                {pageKey === "members" && <OrganMembersPage goTo={goTo} />}
            </TransitionWrapper>
        </Layout>
    );
}
