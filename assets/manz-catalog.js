(() => {
  const selector = '[data-manz-catalog-results]';
  if (!document.querySelector(selector)) return;
  let pending;

  // Render the entire real collection and its pagination, then replace only its results.
  async function loadResults(url, { push = true, focus = 'category' } = {}) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    document.querySelector(selector)?.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(url.href, {
        credentials: 'same-origin', headers: { Accept: 'text/html' }, signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = html.querySelector(selector);
      if (!next) throw new Error('Collection catalog region missing');
      if (controller !== pending) return;
      const replacement = document.importNode(next, true);
      document.querySelector(selector).replaceWith(replacement);
      replacement.setAttribute('aria-busy', 'false');
      if (push) history.pushState({ manzCatalog: true }, '', url.href);
      if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(replacement);
      const target = focus === 'sort'
        ? replacement.querySelector('[data-catalog-sort]')
        : replacement.querySelector('[data-catalog-category][aria-current]');
      target?.focus({ preventScroll: true });
    } catch (error) {
      if (error.name !== 'AbortError') location.assign(url.href);
    }
  }

  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest(`${selector} [data-catalog-category], ${selector} .pagination a[href]`);
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    const sort = document.querySelector(`${selector} [data-catalog-sort]`)?.value;
    if (sort) url.searchParams.set('sort_by', sort);
    if (link.hasAttribute('data-catalog-category')) url.searchParams.delete('page');
    const all = link.closest(selector).querySelector('.manz-catalog-categories a');
    if (url.pathname !== new URL(all.href).pathname) url.searchParams.set('view', 'catalogo');
    event.preventDefault();
    loadResults(url);
  });

  function sortResults(form) {
    const url = new URL(form.action, location.href);
    const params = new URLSearchParams(new FormData(form));
    if (params.get('sort_by') === '') params.delete('sort_by');
    url.search = params.toString();
    loadResults(url, { focus: 'sort' });
  }
  document.addEventListener('change', event => {
    if (event.target.matches(`${selector} [data-catalog-sort]`)) sortResults(event.target.form);
  });
  document.addEventListener('submit', event => {
    if (!event.target.matches(`${selector} .manz-catalog-sort`)) return;
    event.preventDefault();
    sortResults(event.target);
  });
  window.addEventListener('popstate', () => loadResults(new URL(location.href), { push: false }));
})();
