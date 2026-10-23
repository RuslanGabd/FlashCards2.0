(() => {
    async function read(file) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
            throw new Error('Choose a PNG, JPEG or WebP image smaller than 5 MB.');
        const url = URL.createObjectURL(file);
        try {
            const image = new Image();
            await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('This image could not be opened.')); image.src = url; });
            if (image.naturalWidth * image.naturalHeight > 16000000) throw new Error('Use an image smaller than 16 megapixels.');
            const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d');
            context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            for (const quality of [.85, .7, .55, .4]) {
                const data = canvas.toDataURL('image/jpeg', quality);
                if (data.length <= 290000) return data;
            }
            throw new Error('This image is too detailed. Choose a smaller image.');
        } finally { URL.revokeObjectURL(url); }
    }
    window.AppImages = { read };
})();
