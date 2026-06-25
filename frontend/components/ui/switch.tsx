"use client";

import { useId } from "react";

type SwitchProps = {
    id?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    "aria-label"?: string;
};

export function Switch({ id, checked, onCheckedChange, disabled, "aria-label": ariaLabel }: SwitchProps) {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
        <button
            id={inputId}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                checked ? "bg-azul-600" : "bg-cinza-300"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    checked ? "translate-x-5" : "translate-x-0.5"
                }`}
            />
        </button>
    );
}
