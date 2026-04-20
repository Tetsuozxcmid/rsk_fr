import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Link from "next/link";

import Tags from "@/components/ui/Tags";
import Button from "@/components/ui/Button";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import MayakHistoryPanel from "@/components/pages/profile/MayakHistoryPanel";
import Setts from "@/assets/general/setts.svg";
import LinkIcon from "@/assets/general/link.svg";
import { getPortalOrganizationId, getPortalOrganizationLabel } from "@/lib/portalProfile";
import { fetchPortalProfileClient, isMissingPortalProfilePayload } from "@/lib/portalProfileClient";

const PROFILE_EMPTY_LABEL = "\u041D\u0435\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
const FULL_NAME_EMPTY_LABEL = "\u0424\u0418\u041E \u043D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
const DESCRIPTION_EMPTY_LABEL = "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
const USERNAME_EMPTY_LABEL = "username \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
const REGION_EMPTY_LABEL = "\u0420\u0435\u0433\u0438\u043E\u043D \u043D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D";
const ORGANIZATION_EMPTY_LABEL = "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
const PROFILE_LOADING_LABEL = "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u044C...";
const LOGOUT_CONFIRM_LABEL = "\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0432\u044B\u0439\u0442\u0438?";
const ROLE_LABELS = {
    teacher: "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A",
    student: "\u0421\u0442\u0443\u0434\u0435\u043D\u0442",
    moder: "\u041C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440",
    admin: "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440",
};

function clearCookies() {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
}

export default function ProfileIndexPage({ goTo }) {
    const [userData, setUserData] = useState(null);
    const [hydrated, setHydrated] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await fetchPortalProfileClient({ force: true });
                if (!data) {
                    clearCookies();
                    router.push("/auth");
                    return;
                }

                if (isMissingPortalProfilePayload(data)) {
                    setHydrated(true);
                    goTo("settings");
                    return;
                }


                setUserData(data);
                await fetchMayakArtifacts();
                setHydrated(true);
            } catch (error) {
                console.error("Request error:", error);
                setHydrated(true);
            }
        };

        fetchProfile();
    }, [goTo, router]);

    const handleLogout = async () => {
        const confirmed = window.confirm(LOGOUT_CONFIRM_LABEL);
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

        clearCookies();
        router.push("/auth");
    };

    if (!hydrated) {
        return (
            <div className="hero" style={{ placeItems: "center" }}>
                <p className="text-(--color-gray-black)">{PROFILE_LOADING_LABEL}</p>
            </div>
        );
    }

    if (!userData) {
        return null;
    }

    const profileName = userData.data.NameIRL && userData.data.Surname ? `${userData.data.NameIRL} ${userData.data.Surname}` : PROFILE_EMPTY_LABEL;
    const profileFullName =
        userData.data.NameIRL || userData.data.Surname || userData.data.Patronymic
            ? `${userData.data.NameIRL} ${userData.data.Surname} ${userData.data.Patronymic}`
            : FULL_NAME_EMPTY_LABEL;
    const roleLabel = ROLE_LABELS[userData.data.Type] || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445";
    const organizationLinkId = getPortalOrganizationId(userData);
    const organizationDisplayName = getPortalOrganizationLabel(userData);

    return (
        <>
            <Header>
                <Header.Heading>{profileName}</Header.Heading>
                <Button red className={"w-fit! shadow-none!"} onClick={handleLogout}>
                    {"\u0412\u044B\u0439\u0442\u0438"}
                </Button>
                <Button icon onClick={() => goTo("settings")}>
                    <Setts />
                </Button>
            </Header>

            <div className="hero" style={{ gridTemplateRows: "repeat(2, auto)" }}>
                <Card>
                    <Card.Heading>
                        <div className="flex gap-[1rem] w-full">
                            <div className="flex flex-col gap-[0.25rem] flex-1 ">
                                <h4>{profileFullName}</h4>
                                <p className="line-clamp-3">{userData.data?.Description || DESCRIPTION_EMPTY_LABEL}</p>
                            </div>
                        </div>
                        <div className="flex gap-[0.5rem] flex-wrap">
                            <Tags
                                tags={[
                                    { name: userData.data?.username || USERNAME_EMPTY_LABEL, color: "blue" },
                                    { name: roleLabel, color: "blue", icon: "coin" },
                                    { name: userData.data?.Region || REGION_EMPTY_LABEL, color: "blue" },
                                ]}
                            />
                        </div>
                    </Card.Heading>
                    <Card.Footer>
                        <a className="big relative z-[1]">{"\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0441 \u043D\u0430\u043C\u0438!"}</a>
                    </Card.Footer>
                </Card>

                <div className="col-span-4 max-[900px]:col-span-12 h-fit">
                    <div className="block-wrapper col-span-4 max-[900px]:col-span-12">
                        <h6>{"\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0430"}</h6>
                        <div className="flex flex-col gap-[0.75rem]">
                            {organizationLinkId ? (
                                <Link href={`/organizations/${organizationLinkId}`}>
                                    <div className="group cursor-pointer flex items-center justify-between w-full">
                                        <p className="flex-1 link">{organizationDisplayName || ORGANIZATION_EMPTY_LABEL}</p>
                                        <LinkIcon className="stroke-(--color-gray-white) group-hover:stroke-black" style={{ transition: "stroke .3s ease-in-out" }} />
                                    </div>
                                </Link>
                            ) : (
                                <div className="flex items-center justify-between w-full">
                                    <p className="flex-1 text-(--color-gray-black)">{organizationDisplayName || ORGANIZATION_EMPTY_LABEL}</p>
                                </div>
                            )}

                            <hr className="w-full border-solid border-[1.5px] border-(--color-gray-plus)" />

                            <Link href={`/teams/${userData.data.team_id}`}>
                                <div className="group flex items-center justify-between w-full">
                                    <p className="flex-1 link">{userData.data.team || ORGANIZATION_EMPTY_LABEL}</p>
                                    <LinkIcon className="stroke-(--color-gray-white) group-hover:stroke-black" style={{ transition: "stroke .3s ease-in-out" }} />
                                </div>
                            </Link>
                        </div>
                    </div>
                    <MayakHistoryPanel />
                </div>
            </div>
        </>
    );
}
