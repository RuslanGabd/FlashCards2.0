(() => {
    const key = 'words-up-editor-draft';
    function read(storageKey, fallback) {
        try { return JSON.parse(localStorage.getItem(storageKey)) ?? fallback; } catch { return fallback; }
    }
    function readArray(storageKey) {
        const value = read(storageKey, []);
        return Array.isArray(value) ? value : [];
    }
    function readObject(storageKey) {
        const value = read(storageKey, {});
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }
    function get(storageKey) {
        try { return localStorage.getItem(storageKey); } catch { return null; }
    }
    function write(storageKey, value) {
        try { localStorage.setItem(storageKey, JSON.stringify(value)); }
        catch { throw new Error('Browser storage is full or unavailable. Save online or remove unused local sets.'); }
    }
    function load(fallbackCards) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('new')) {
            localStorage.removeItem(key);
            localStorage.removeItem('words-up-current-local-set-id');
            localStorage.removeItem('words-up-current-remote-set-id');
            for (const name of ['new', 'setId', 'localSetId']) url.searchParams.delete(name);
            history.replaceState(null, '', url.pathname + url.search + url.hash);
            return { cards: [{term:'',definition:''},{term:'',definition:''}], diagram:null,
                meta:{title:'',description:'',isPublic:true,language:'en'} };
        }
        const draft = readObject(key);
        const context = draft.context || {
            remoteSetId:get('words-up-current-remote-set-id'),
            localSetId:get('words-up-current-local-set-id'),
        };
        return { cards: Array.isArray(draft.cards) ? draft.cards : fallbackCards.map(card => ({...card})),
            diagram: draft.diagram || null,
            context: {
                remoteSetId:/^[1-9]\d*$/.test(String(context.remoteSetId || '')) ? String(context.remoteSetId) : null,
                localSetId:typeof context.localSetId === 'string' && context.localSetId ? context.localSetId : null,
            },
            meta: { title:draft.meta?.title || '', description:draft.meta?.description || '',
                isPublic:draft.meta?.isPublic !== false, language:draft.meta?.language === 'fr' ? 'fr' : 'en' } };
    }
    window.DraftStore = { read, readArray, readObject, write, load, key };
})();
