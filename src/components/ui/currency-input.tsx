import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: number | string;
    onChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ className, value, onChange, ...props }, ref) => {
        // Store the display value as string to allow empty input
        const [displayValue, setDisplayValue] = React.useState<string>(
            value === 0 ? '' : String(value)
        );

        // Sync display value when external value changes
        React.useEffect(() => {
            if (value === 0 && displayValue === '') {
                // Keep empty if user cleared it
                return;
            }
            setDisplayValue(value === 0 ? '' : String(value));
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;

            // Allow empty input
            if (inputValue === '') {
                setDisplayValue('');
                onChange(0);
                return;
            }

            // Remove non-numeric characters except for the input
            const numericValue = inputValue.replace(/[^0-9]/g, '');

            if (numericValue === '') {
                setDisplayValue('');
                onChange(0);
                return;
            }

            const parsedValue = parseInt(numericValue, 10);

            if (!isNaN(parsedValue)) {
                setDisplayValue(String(parsedValue));
                onChange(parsedValue);
            }
        };

        const handleBlur = () => {
            // On blur, if empty, show 0 or keep empty based on preference
            if (displayValue === '') {
                setDisplayValue('');
                onChange(0);
            }
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            // Select all on focus for easy replacement
            e.target.select();
        };

        return (
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                {...props}
            />
        )
    }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
