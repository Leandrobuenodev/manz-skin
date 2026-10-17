(() => {
  const grid = document.querySelector('[data-soap-grid]');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.manz-soaps-preview-card'));
  const filter = document.querySelector('[data-soap-filter]');
  const sort = document.querySelector('[data-soap-sort]');
  const count = document.querySelector('[data-soap-count]');

  const render = () => {
    const filterValue = filter?.value ?? 'all';
    const sortValue = sort?.value ?? 'best';
    const visibleCards = cards.filter((card) => {
      return filterValue === 'all' || card.dataset.soapType === filterValue;
    });

    visibleCards.sort((first, second) => {
      if (sortValue === 'price-ascending') {
        return Number(first.dataset.price) - Number(second.dataset.price);
      }

      if (sortValue === 'price-descending') {
        return Number(second.dataset.price) - Number(first.dataset.price);
      }

      if (sortValue === 'title-ascending') {
        const firstTitle = first.querySelector('h3')?.textContent.trim() ?? '';
        const secondTitle = second.querySelector('h3')?.textContent.trim() ?? '';
        return firstTitle.localeCompare(secondTitle, 'pt-BR');
      }

      return Number(first.dataset.rank) - Number(second.dataset.rank);
    });

    cards.forEach((card) => {
      card.hidden = true;
    });

    visibleCards.forEach((card) => {
      card.hidden = false;
      grid.append(card);
    });

    if (count) {
      const productLabel = visibleCards.length === 1 ? 'sabonete' : 'sabonetes';
      count.textContent = `${visibleCards.length} ${productLabel}`;
    }
  };

  filter?.addEventListener('change', render);
  sort?.addEventListener('change', render);
  render();
})();
