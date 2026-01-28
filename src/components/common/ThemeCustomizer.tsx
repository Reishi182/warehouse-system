import React from 'react';
import { useTheme } from 'next-themes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Color accent options
const COLOR_ACCENTS = [
    { name: 'Default', value: 'default', color: 'hsl(221.2, 83.2%, 53.3%)' },
    { name: 'Emerald', value: 'emerald', color: 'hsl(160, 84%, 39%)' },
    { name: 'Rose', value: 'rose', color: 'hsl(346, 77%, 49%)' },
    { name: 'Orange', value: 'orange', color: 'hsl(24, 95%, 53%)' },
    { name: 'Violet', value: 'violet', color: 'hsl(263, 70%, 50%)' },
    { name: 'Cyan', value: 'cyan', color: 'hsl(189, 94%, 43%)' },
] as const;

interface ThemeCustomizerProps {
    variant?: 'icon' | 'button';
}

/**
 * Theme Customizer - Toggle dark/light mode and accent colors
 */
export function ThemeCustomizer({ variant = 'icon' }: ThemeCustomizerProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [accent, setAccent] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('vmb-accent') || 'default';
        }
        return 'default';
    });

    // Apply accent color to CSS variables
    React.useEffect(() => {
        const root = document.documentElement;
        const selectedAccent = COLOR_ACCENTS.find(a => a.value === accent);

        if (selectedAccent && selectedAccent.value !== 'default') {
            // Extract HSL values from the color string
            const hslMatch = selectedAccent.color.match(/hsl\(([^)]+)\)/);
            if (hslMatch) {
                root.style.setProperty('--primary', hslMatch[1]);
                root.style.setProperty('--ring', hslMatch[1]);
            }
        } else {
            // Reset to default
            root.style.removeProperty('--primary');
            root.style.removeProperty('--ring');
        }

        localStorage.setItem('vmb-accent', accent);
    }, [accent]);

    const ThemeIcon = resolvedTheme === 'dark' ? Moon : resolvedTheme === 'light' ? Sun : Monitor;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {variant === 'icon' ? (
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Palette className="h-4 w-4" />
                        <span className="sr-only">Tema</span>
                    </Button>
                ) : (
                    <Button variant="outline" className="gap-2">
                        <Palette className="h-4 w-4" />
                        <span>Tema</span>
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mode Tampilan</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Terang</span>
                    {theme === 'light' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Gelap</span>
                    {theme === 'dark' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>Sistem</span>
                    {theme === 'system' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Warna Aksen</DropdownMenuLabel>

                <div className="grid grid-cols-3 gap-2 p-2">
                    {COLOR_ACCENTS.map((accentOption) => (
                        <button
                            key={accentOption.value}
                            onClick={() => setAccent(accentOption.value)}
                            className={cn(
                                "relative w-full aspect-square rounded-lg flex items-center justify-center transition-all",
                                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                                accent === accentOption.value && "ring-2 ring-offset-2"
                            )}
                            style={{
                                backgroundColor: accentOption.color,
                                ['--tw-ring-color' as any]: accentOption.color,
                            }}
                            title={accentOption.name}
                        >
                            {accent === accentOption.value && (
                                <Check className="h-4 w-4 text-white" />
                            )}
                        </button>
                    ))}
                </div>

                <p className="text-[10px] text-center text-muted-foreground px-2 pb-2">
                    Pilih warna aksen favorit Anda
                </p>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ThemeCustomizer;
