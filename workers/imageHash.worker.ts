
// Visual Similarity Worker (Perceptual Hash)
// Uses "Average Hash" (aHash) algorithm on 16x16 thumbnail

self.onmessage = async (e: MessageEvent<{ id: number; file: File }>) => {
    const { id, file } = e.data;

    try {
        // 1. Create Bitmap (Resize to 16x16 directly for speed)
        const bitmap = await createImageBitmap(file, {
            resizeWidth: 16,
            resizeHeight: 16,
            resizeQuality: 'medium'
        });

        // 2. Draw to OffscreenCanvas to get pixel data
        const canvas = new OffscreenCanvas(16, 16);
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('Could not get canvas context');

        // Force scale to 16x16 regardless of input bitmap size
        ctx.drawImage(bitmap, 0, 0, 16, 16);
        const imageData = ctx.getImageData(0, 0, 16, 16);
        const pixels = imageData.data; // R, G, B, A

        // 3. Calculate Average Brightness
        let totalBrightness = 0;
        const brightnessValues: number[] = [];

        for (let i = 0; i < pixels.length; i += 4) {
            // Simple grayscale: (R + G + B) / 3
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            brightnessValues.push(avg);
            totalBrightness += avg;
        }

        const meanBrightness = totalBrightness / brightnessValues.length;

        // 4. Generate Hash (1 if >= mean, 0 if < mean)
        const hashBits = brightnessValues.map(v => (v >= meanBrightness ? '1' : '0')).join('');

        // Convert binary string to Hex for compact storage
        const hashHex = BigInt('0b' + hashBits).toString(16);

        // Prefix with 'v-' to indicate visual hash
        self.postMessage({ id, hash: `v-${hashHex}` });

    } catch (error) {
        // Fallback: If it fails (e.g. corrupt image), return error or maybe try exact hash?
        // For now, return error so main thread can fallback
        self.postMessage({ id, error: (error as Error).message });
    }
};
