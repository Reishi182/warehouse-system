import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, onFocus, onBlur, ...props }, ref) => {
    // For number inputs, we use a special handling to allow empty state
    const isNumberType = type === "number";
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync display value with external value for number inputs
    React.useEffect(() => {
      if (isNumberType && !isFocused) {
        if (value === 0 || value === "0" || value === "" || value === undefined) {
          setDisplayValue("");
        } else {
          setDisplayValue(String(value));
        }
      }
    }, [value, isFocused, isNumberType]);

    // Initialize display value
    React.useEffect(() => {
      if (isNumberType && value !== undefined) {
        if (value === 0 || value === "0") {
          setDisplayValue("");
        } else {
          setDisplayValue(String(value));
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
            // Create synthetic event with 0 value
            const syntheticEvent = {
              ...e,
              target: { ...e.target, value: "0", valueAsNumber: 0 },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
          return;
        }

        // Only allow numeric input (with optional decimal for step)
        const pattern = /^-?[0-9]*\.?[0-9]*$/;
        if (!pattern.test(inputValue)) {
          return;
        }

        setDisplayValue(inputValue);

        if (onChange) {
          const numericValue = parseFloat(inputValue);
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: inputValue,
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
