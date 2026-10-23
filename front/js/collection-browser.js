(() => {
    function mount({path, input, container, onData, onError}) {
        let items = [], page = 0, revision = 0, debounce;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'load-more-button'; button.textContent = 'Load more sets'; button.hidden = true;
        container.after(button);
        async function load(reset = true) {
            const current = ++revision;
            if (reset) { page = 0; items = []; }
            button.disabled = true;
            try {
                const query = new URLSearchParams({page:String(page), size:'24', q:input.value.trim()});
                const result = await AppClient.request(`${path()}?${query}`, {withMeta:true});
                if (current !== revision) return;
                items = reset ? result.data : [...items, ...result.data];
                page += 1; onData(items);
                button.hidden = !result.hasMore; button.textContent = 'Load more sets';
            } catch (error) {
                if (current !== revision) return;
                onError(error); button.hidden = false; button.textContent = 'Try again';
            } finally { if (current === revision) button.disabled = false; }
        }
        button.addEventListener('click', () => load(items.length === 0));
        input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => load(), 200); });
        load();
        return {reload:() => load()};
    }
    window.CollectionBrowser = {mount};
})();
