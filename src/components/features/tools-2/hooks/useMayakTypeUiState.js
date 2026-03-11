import { useMemo, useState } from "react";

export const useMayakTypeUiState = ({ mayakData, type, setType }) => {
    const [isMiscAccordionOpen, setIsMiscAccordionOpen] = useState(false);
    const [openSubAccordionKey, setOpenSubAccordionKey] = useState(null);

    const miscCategory = useMemo(() => {
        return (mayakData.defaultTypes || []).find((t) => t.key === "misc");
    }, [mayakData.defaultTypes]);

    const activeTypeKey = isMiscAccordionOpen ? (miscCategory ? miscCategory.key : type) : type;

    const handleTypeSwitch = (newType) => {
        if (newType === miscCategory?.key) {
            setIsMiscAccordionOpen(true);
            return;
        }
        setIsMiscAccordionOpen(false);
        setOpenSubAccordionKey(null);
        setType(newType);
    };

    return {
        activeTypeKey,
        handleTypeSwitch,
        isMiscAccordionOpen,
        miscCategory,
        openSubAccordionKey,
        setIsMiscAccordionOpen,
        setOpenSubAccordionKey,
    };
};
