(() => {
    const params = new URLSearchParams(location.search);
    const query = new URLSearchParams();
    for (const key of ['setId', 'localSetId']) if (params.has(key)) query.set(key, params.get(key));
    if (!query.size) return;
    const pages = new Set(['flashcards.html', 'typing.html', 'practice.html', 'match.html', 'edit-set.html']);
    document.querySelectorAll('a[href]').forEach(link => {
        const url = new URL(link.href);
        if (url.origin !== location.origin || !pages.has(url.pathname.split('/').pop()) || url.searchParams.has('new')) return;
        for (const [key, value] of query) url.searchParams.set(key, value);
        link.href = url.pathname + url.search + url.hash;
    });
})();
