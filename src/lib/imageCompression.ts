/**
 * Image compression utility for product images
 * Reduces file size before uploading to Supabase Storage
 */

interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const defaultOptions: CompressOptions = {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.8,
    format: 'image/webp',
};

/**
 * Compress an image file before upload
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed image as Blob
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<Blob> {
    const opts = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Calculate new dimensions while maintaining aspect ratio
                let { width, height } = img;

                if (width > opts.maxWidth! || height > opts.maxHeight!) {
                    const ratio = Math.min(
                        opts.maxWidth! / width,
                        opts.maxHeight! / height
                    );
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                // Draw image on canvas with high quality settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    opts.format,
                    opts.quality
                );
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = event.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Compress image and return as File object
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed image as File
 */
export async function compressImageToFile(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const opts = { ...defaultOptions, ...options };
    const blob = await compressImage(file, options);

    // Determine file extension based on format
    const ext = opts.format === 'image/webp' ? 'webp' :
        opts.format === 'image/jpeg' ? 'jpg' : 'png';

    // Create new filename
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${originalName}.${ext}`;

    return new File([blob], newName, { type: opts.format });
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
    file: File
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
