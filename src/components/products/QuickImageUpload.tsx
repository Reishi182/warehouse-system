import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Package, Upload, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickImageUploadProps {
    productId: string;
    currentUrl?: string | null;
    className?: string;
    onUploadSuccess?: (url: string) => void;
}

export function QuickImageUpload({ productId, currentUrl, className, onUploadSuccess }: QuickImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Gagal', description: 'Ukuran gambar maksimal 5MB.', variant: 'destructive' });
            return;
        }

        try {
            setIsUploading(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from('products')
                .update({ image_url: publicUrl })
                .eq('id', productId);

            if (updateError) throw updateError;

            toast({ title: 'Berhasil', description: 'Gambar produk berhasil diupload.' });
            
            if (onUploadSuccess) {
                onUploadSuccess(publicUrl);
            }
            
            // Invalidate queries so that other components refresh
            queryClient.invalidateQueries({ queryKey: ['products'] });

        } catch (error: any) {
            console.error('Upload error:', error);
            toast({ title: 'Error', description: error.message || 'Gagal upload gambar.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div 
            className={cn("relative group cursor-pointer overflow-hidden rounded-xl bg-muted/30 border border-dashed hover:border-primary/50 transition-colors flex items-center justify-center", className)}
            onClick={() => !isUploading && fileInputRef.current?.click()}
        >
            {isUploading ? (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10 backdrop-blur-[2px]">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mb-1" />
                </div>
            ) : null}

            {currentUrl ? (
                <>
                    <img src={currentUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1px]">
                        <Upload className="w-4 h-4" />
                        <span className="text-[9px] font-medium tracking-wide">Ubah</span>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors relative">
                    <ImagePlus className="w-5 h-5 mb-0.5" />
                    <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex flex-col items-center justify-center bg-primary/5 transition-all text-primary">
                        <Upload className="w-5 h-5 mb-0.5" />
                    </div>
                </div>
            )}
            
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
