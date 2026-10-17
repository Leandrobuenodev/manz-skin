(() => {
  const previewRoutes = {
    home: '/local-preview/hero-v2/',
    soaps: '/local-preview/soaps/',
    about: '/local-preview/quem-somos/'
  };

  const pendingDescriptions = {
    'all-products': 'O catálogo completo ainda não tem uma prévia HTML local. Os templates Liquid não são renderizados pelo servidor estático.',
    'product-details': 'As páginas individuais de produto ainda não têm prévia HTML local. Os templates Liquid não são renderizados pelo servidor estático.',
    accessories: 'A página local de acessórios ainda está pendente.',
    treatments: 'A página local de tratamentos ainda está pendente.',
    tracking: 'A página de rastreamento existe no tema Liquid, mas ainda não tem prévia renderizada neste servidor estático.',
    'privacy-policy': 'A política de privacidade é conteúdo nativo da Shopify e não tem prévia local. O conteúdo arquivado contém campos pendentes e não foi duplicado aqui.',
    'refund-policy': 'A política de devolução e trocas é conteúdo nativo da Shopify e não tem prévia local.',
    'shipping-policy': 'A política de frete é conteúdo nativo da Shopify e não tem prévia local; o inventário registra campos pendentes de revisão.',
    'terms-of-service': 'Os termos são conteúdo nativo da Shopify e não têm prévia local. Nenhum texto legal foi copiado para esta demonstração.',
    'personal-data': 'A página de dados pessoais depende de uma página e de um formulário Shopify; não existe uma prévia local segura.'
  };

  const status = document.createElement('div');
  status.className = 'local-preview-status';
  status.id = 'LocalPreviewStatus';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  document.body.append(status);

  document.querySelectorAll('[data-local-route]').forEach((link) => {
    const route = link.dataset.localRoute;
    if (previewRoutes[route]) {
      link.href = previewRoutes[route];
      return;
    }
    link.href = '#local-preview-pending';
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('title', 'Prévia local pendente');
    link.dataset.localPreviewPending = 'true';
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-local-preview-pending="true"]');
    if (!link) return;
    event.preventDefault();
    const destination = link.dataset.localRoute;
    status.textContent = `Prévia pendente — ${pendingDescriptions[destination] || 'este destino ainda não está disponível localmente.'}`;
    status.hidden = false;
    window.clearTimeout(status.hideTimer);
    status.hideTimer = window.setTimeout(() => { status.hidden = true; }, 8000);
  });
})();
