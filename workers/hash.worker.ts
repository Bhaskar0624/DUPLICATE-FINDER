
self.onmessage = async (e: MessageEvent<{ id: number; file: File }>) => {
    const { id, file } = e.data;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        self.postMessage({ id, hash });
    } catch (error) {
        self.postMessage({ id, error: (error as Error).message });
    }
};
