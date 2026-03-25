import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";
import Textarea from "@/components/ui/Textarea";
import DropdownInput from "@/components/ui/Input/DropdownInput";
import Switcher from "@/components/ui/Switcher";
import { getPortalOrganizationId } from "@/lib/portalProfile";
import { primePortalProfileCache } from "@/lib/portalProfileClient";

function getProfileData(profilePayload) {
    if (profilePayload && typeof profilePayload === "object" && profilePayload.data && typeof profilePayload.data === "object") {
        return profilePayload.data;
    }
    return profilePayload && typeof profilePayload === "object" ? profilePayload : {};
}

function buildInitialFormState(profilePayload) {
    const data = getProfileData(profilePayload);
    return {
        Organization: getPortalOrganizationId(data),
        Region: String(data.Region || "").trim(),
        Surname: String(data.Surname || "").trim(),
        NameIRL: String(data.NameIRL || "").trim(),
        Patronymic: String(data.Patronymic || "").trim(),
        Description: String(data.Description || "").trim(),
        role: String(data.role || data.Type || "student").trim() || "student",
    };
}

function resolveSelectedOrganization(orgList, organizationId) {
    return orgList.find((item) => String(item.id ?? item.organization_id ?? "") === String(organizationId || "")) || null;
}

export default function PortalProfileEditor({
    mode = "gate",
    profilePayload,
    onSaved,
    submitLabel = "Сохранить",
    title = "",
    description = "",
    showDescription = false,
    showRole = false,
}) {
    const initialState = useMemo(() => buildInitialFormState(profilePayload), [profilePayload]);
    const profileData = getProfileData(profilePayload);

    const [formData, setFormData] = useState(initialState);
    const [region, setRegion] = useState(initialState.Region);
    const [role, setRole] = useState(initialState.role);
    const [orgList, setOrgList] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(initialState);
        setRegion(initialState.Region);
        setRole(initialState.role);
    }, [initialState]);

    const isDirty = useMemo(() => {
        return (
            String(formData.Organization || "") !== String(initialState.Organization || "") ||
            String(formData.Region || "") !== String(initialState.Region || "") ||
            String(formData.Surname || "") !== String(initialState.Surname || "") ||
            String(formData.NameIRL || "") !== String(initialState.NameIRL || "") ||
            String(formData.Patronymic || "") !== String(initialState.Patronymic || "") ||
            String(formData.Description || "") !== String(initialState.Description || "") ||
            String(role || "") !== String(initialState.role || "")
        );
    }, [formData, initialState, role]);

    useEffect(() => {
        if (!region) {
            setOrgList([]);
            return undefined;
        }

        let cancelled = false;
        const loadOrganizations = async () => {
            try {
                const response = await fetch(`/api/org/all?region=${encodeURIComponent(region)}`, {
                    credentials: "include",
                });
                const payload = await response.json().catch(() => ({}));
                if (!cancelled) {
                    setOrgList(payload.success ? payload.data || [] : []);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to load organizations:", error);
                    setOrgList([]);
                }
            }
        };

        loadOrganizations();
        return () => {
            cancelled = true;
        };
    }, [region]);

    const updateField = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        if (!formData.Surname || !formData.NameIRL || !formData.Organization) {
            alert("Для входа в MAYAK заполните фамилию, имя и организацию.");
            return;
        }

        const changes = {
            id: profileData.id,
        };

        if (String(formData.Surname || "") !== String(initialState.Surname || "")) {
            changes.Surname = formData.Surname;
        }
        if (String(formData.NameIRL || "") !== String(initialState.NameIRL || "")) {
            changes.NameIRL = formData.NameIRL;
        }
        if (String(formData.Patronymic || "") !== String(initialState.Patronymic || "")) {
            changes.Patronymic = formData.Patronymic;
        }
        if (String(formData.Description || "") !== String(initialState.Description || "")) {
            changes.Description = formData.Description;
        }
        if (String(formData.Region || "") !== String(initialState.Region || "")) {
            changes.Region = formData.Region;
        }
        if (String(formData.Organization || "") !== String(initialState.Organization || "")) {
            changes.organization_id = formData.Organization;
        }
        if (showRole && String(role || "") !== String(initialState.role || "")) {
            changes.role = role;
        }

        if (Object.keys(changes).length === 1) {
            if (typeof onSaved === "function") {
                onSaved(profilePayload);
            }
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/profile/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(changes),
                credentials: "include",
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                alert(payload?.error || "Не удалось сохранить профиль.");
                return;
            }

            const selectedOrganization = resolveSelectedOrganization(orgList, formData.Organization);
            const nextData = {
                ...profileData,
                Surname: formData.Surname,
                NameIRL: formData.NameIRL,
                Patronymic: formData.Patronymic,
                Description: formData.Description,
                Region: formData.Region,
                role,
                Type: role,
                organization_id: formData.Organization,
                Organization_id: formData.Organization,
                Organization: formData.Organization
                    ? {
                          ...(profileData.Organization || {}),
                          ...(selectedOrganization || {}),
                          id: selectedOrganization?.id ?? selectedOrganization?.organization_id ?? formData.Organization,
                          short_name: selectedOrganization?.short_name || selectedOrganization?.name || profileData?.Organization?.short_name || "",
                      }
                    : null,
            };

            primePortalProfileCache({ success: true, data: nextData });
            if (typeof onSaved === "function") {
                onSaved({ success: true, data: nextData });
            }
        } catch (error) {
            console.error("Failed to update portal profile:", error);
            alert("Ошибка соединения. Попробуйте еще раз.");
        } finally {
            setIsSaving(false);
        }
    };

    const content = (
        <>
            {title ? <h6>{title}</h6> : null}
            {description ? <p className="text-(--color-gray-black)">{description}</p> : null}
            <div className="flex flex-col gap-[0.75rem]">
                <div className="flex gap-[0.75rem] max-[640px]:flex-col">
                    <div className="flex flex-col gap-[0.5rem] flex-1">
                        <Input type="text" name="Surname" placeholder="Фамилия" value={formData.Surname} onChange={(event) => updateField("Surname", event.target.value)} required />
                        <Input type="text" name="NameIRL" placeholder="Имя" value={formData.NameIRL} onChange={(event) => updateField("NameIRL", event.target.value)} required />
                        <Input type="text" name="Patronymic" placeholder="Отчество" value={formData.Patronymic} onChange={(event) => updateField("Patronymic", event.target.value)} />
                    </div>
                </div>

                {showDescription ? <Textarea inverted name="Description" placeholder="Расскажите о себе кратко" value={formData.Description} onChange={(event) => updateField("Description", event.target.value)} /> : null}

                <DropdownInput
                    id="Organization"
                    name="Organization"
                    placeholder="Организация"
                    value={formData.Organization}
                    options={orgList}
                    onChange={(event) => updateField("Organization", event.target.value)}
                    disabled={!region}
                />
                <DropdownInput
                    id="Region"
                    name="Region"
                    placeholder="Регион"
                    value={region}
                    onChange={(event) => {
                        const nextRegion = event.target.value || "";
                        setRegion(nextRegion);
                        setFormData((prev) => ({
                            ...prev,
                            Region: nextRegion,
                            Organization: "",
                        }));
                    }}
                    src="/data/regions.txt"
                />
                <p className="text-(--color-gray-black)">
                    Если вашей организации нет в списке, заполните{" "}
                    <Link target="_blank" className="text-(--color-blue)" href="https://forms.yandex.ru/u/690391e1068ff0a3ba625eef">
                        форму
                    </Link>
                    .
                </p>

                {showRole ? (
                    <div className="flex flex-col gap-[0.5rem]">
                        <span className="big">Тип профиля</span>
                        <Switcher value={role} onChange={setRole}>
                            <Switcher.Option value="student">Студент</Switcher.Option>
                            <Switcher.Option value="teacher">Сотрудник</Switcher.Option>
                        </Switcher>
                    </div>
                ) : null}

                <Button onClick={handleSubmit} disabled={isSaving || !isDirty}>
                    {isSaving ? "Сохранение..." : submitLabel}
                </Button>
            </div>
        </>
    );

    if (mode === "full") {
        return <div className="hero grid-cols-1">{content}</div>;
    }

    return <div className="flex flex-col gap-[1rem] w-full">{content}</div>;
}
