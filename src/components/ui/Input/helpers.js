import { useState, useEffect } from "react";

export function useDropdownFilter(controlledValue, onChange, src, name, options) {
    const [inputValue, setInputValue] = useState("");
    const [items, setItems] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    
    useEffect(() => {
        if (options && Array.isArray(options)) {
            const mapped = options.map((opt) => ({
                value: opt.id ?? opt.organization_id ?? opt.value ?? opt,
                label: opt.short_name ?? opt.label ?? opt,
            }));
            setItems(mapped);
        } else if (src) {
            fetch(src)
                .then((res) => res.text())
                .then((text) => {
                    const lines = text
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);
                    setItems(lines.map((l) => ({ value: l, label: l })));
                });
        }
    }, [options, src]);

    
    useEffect(() => {
        if (controlledValue && items.length > 0) {
            const match = items.find((i) => String(i.value) === String(controlledValue));
            if (match) {
                setInputValue(match.label);
            }
        } else if (!controlledValue) {
            setInputValue("");
        }
    }, [controlledValue, items]);

    
    const handleInput = (val) => {
        setInputValue(val);
        if (!val) {
            onChange?.({ target: { name, value: "" } });
            setFiltered([]);
            setShowDropdown(false);
            return;
        }
        const matches = items.filter((i) => String(i.label).toLowerCase().includes(val.toLowerCase()));
        setFiltered(matches);
        setShowDropdown(true);
    };

    const handleBlur = () => {
        const trimmed = String(inputValue || "").trim();
        if (!trimmed) {
            onChange?.({ target: { name, value: "" } });
            setShowDropdown(false);
            return;
        }
        const byLabel = items.find((i) => String(i.label).toLowerCase() === trimmed.toLowerCase());
        if (byLabel) {
            onChange?.({ target: { name, value: byLabel.value } });
            setInputValue(byLabel.label);
            setShowDropdown(false);
            return;
        }
        if (/^\d+$/.test(trimmed)) {
            onChange?.({ target: { name, value: Number(trimmed) } });
            setShowDropdown(false);
            return;
        }
        setShowDropdown(false);
    };

    
    const handleSelect = (item) => {
        setInputValue(item.label);
        setShowDropdown(false);
        onChange?.({ target: { name, value: item.value } });
    };

    const handleEnter = () => {
        const normalizedInput = String(inputValue || "").toLowerCase();
        const exactMatch = items.find((item) => String(item.label).toLowerCase() === normalizedInput);
        if (exactMatch) {
            handleSelect(exactMatch);
            return;
        }

        if (filtered.length > 0) {
            handleSelect(filtered[0]);
            return;
        }

        setShowDropdown(false);
    };

    return {
        inputValue,
        filtered,
        showDropdown,
        setShowDropdown,
        handleInput,
        handleSelect,
        handleEnter,
        handleBlur,
    };
}
