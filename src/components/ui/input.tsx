import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  isCurrency?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, onFocus, onBlur, isCurrency, ...props }, ref) => {
    // For number and currency inputs, we use a special handling
    const isNumberType = type === "number" || isCurrency;
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const [isFocused, setIsFocused] = React.useState(false);

    const formatCurrency = (val: string | number) => {
      if (!val && val !== 0 && val !== "0") return "";
      const numStr = String(val).replace(/\D/g, "");
      if (!numStr) return "";
      return parseInt(numStr, 10).toLocaleString('id-ID'); // formats with dots for Indonesian
    };

    // Sync display value with external value for number inputs
    React.useEffect(() => {
      if (isNumberType && !isFocused) {
        if (value === 0 || value === "0" || value === "" || value === undefined) {
          setDisplayValue(isCurrency && value === 0 ? "0" : "");
        } else {
          setDisplayValue(isCurrency ? formatCurrency(value) : String(value));
        }
      }
    }, [value, isFocused, isNumberType, isCurrency]);

    // Initialize display value
    React.useEffect(() => {
      if (isNumberType && value !== undefined) {
        if (value === 0 || value === "0") {
          setDisplayValue(isCurrency && value === 0 ? "0" : "");
        } else {
          setDisplayValue(isCurrency ? formatCurrency(value) : String(value));
        }
      }
    }, []);

    if (isNumberType) {
      const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow empty input
        if (inputValue === "") {
          setDisplayValue("");
          if (onChange) {
            const syntheticEvent = {
              ...e,
              target: { ...e.target, value: "0", valueAsNumber: 0 },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
          return;
        }

        // For currency, strip non-digits. For regular number, regex check.
        let rawNumericString = inputValue;
        if (isCurrency) {
           rawNumericString = inputValue.replace(/\D/g, "");
           if (rawNumericString !== "") {
              setDisplayValue(formatCurrency(rawNumericString));
           } else {
              setDisplayValue("");
           }
        } else {
           const pattern = /^-?[0-9]*\.?[0-9]*$/;
           if (!pattern.test(inputValue)) return;
           setDisplayValue(inputValue);
        }

        if (onChange) {
          const numericValue = parseFloat(rawNumericString || "0");
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              // When type="number" with isCurrency, some components might still read e.target.value
              // So we pass the raw unformatted string so they can parse it.
              value: rawNumericString,
              valueAsNumber: isNaN(numericValue) ? 0 : numericValue,
            },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      };

      const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        e.target.select();
        if (onFocus) onFocus(e);
      };

      const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
      };

      return (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={cn(
            "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleNumberChange}
          onFocus={handleNumberFocus}
          onBlur={handleNumberBlur}
          {...props}
        />
      );
    }

    // Default handling for non-number types
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
