import * as React from "react"
import { cn } from "@/lib/utils"

export interface NumberInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value: number | string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    allowDecimals?: boolean;
}

/**
 * NumberInput - A number input that allows deleting 0 and proper empty state handling
 * Use this instead of <Input type="number" /> for better UX
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
    ({ className, value, onChange, allowDecimals = false, min, max, ...props }, ref) => {
        // Store the display value as string to allow empty input
        const [displayValue, setDisplayValue] = React.useState<string>(() => {
            if (value === 0 || value === '0' || value === '') return '';
            return String(value);
        });
        const [isFocused, setIsFocused] = React.useState(false);

        // Sync display value when external value changes (but not during focus to avoid cursor issues)
        React.useEffect(() => {
            if (!isFocused) {
                if (value === 0 || value === '0') {
                    setDisplayValue('');
                } else {
                    setDisplayValue(String(value));
                }
            }
        }, [value, isFocused]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;

            // Allow empty input
            if (inputValue === '') {
                setDisplayValue('');
                // Create synthetic event with 0 value
                const syntheticEvent = {
                    ...e,
                    target: { ...e.target, value: '0', valueAsNumber: 0 }
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
                return;
            }

            // Pattern for allowed characters
            const pattern = allowDecimals ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;

            if (!pattern.test(inputValue)) {
                return; // Reject invalid input
            }

            // Parse the value
            const numericValue = allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10);

            // Check min/max if provided
            if (min !== undefined && numericValue < Number(min)) {
                return;
            }
            if (max !== undefined && numericValue > Number(max)) {
                return;
            }

            setDisplayValue(inputValue);

            // Create synthetic event with numeric value
            const syntheticEvent = {
                ...e,
                target: { ...e.target, value: inputValue, valueAsNumber: isNaN(numericValue) ? 0 : numericValue }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            // Select all on focus for easy replacement
            e.target.select();
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            // Show empty for 0 value
            if (displayValue === '' || displayValue === '0') {
                setDisplayValue('');
            }
        };

        return (
            <input
                type="text"
                inputMode={allowDecimals ? "decimal" : "numeric"}
                pattern={allowDecimals ? "[0-9]*\\.?[0-9]*" : "[0-9]*"}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                {...props}
            />
        )
    }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
