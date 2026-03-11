import { useCallback } from "react";

export function useMayakTypeSwitcherActions({ mayakDefaultTypes, setIsMiscAccordionOpen, setType, type }) {
    const handleTypeSwitch = useCallback(
        (newType) => {
            const selectedOption = mayakDefaultTypes.find((t) => t.key === newType);

            if (selectedOption && selectedOption.subCategories) {
                setIsMiscAccordionOpen((prev) => !prev);
                if (newType !== type) {
                    setType(newType);
                }
                return;
            }

            if (newType !== type) {
                setType(newType);
            }
            setIsMiscAccordionOpen(false);
        },
        [mayakDefaultTypes, setIsMiscAccordionOpen, setType, type]
    );

    return {
        handleTypeSwitch,
    };
}
