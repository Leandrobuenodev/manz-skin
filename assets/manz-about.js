/* Keep merchant content readable if it outgrows the desktop composition. */
(() => {
  const page = document.body;
  if (!page.classList.contains('manz-about-page')) return;

  let frame;
  function checkComposition() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      page.classList.remove('manz-about-natural');
      if (!matchMedia('(min-width: 1200px) and (min-height: 820px)').matches) return;
      const content = document.querySelector('.manz-about');
      if (!content) return;
      const text = content.querySelectorAll('h1, h2, .rte, .manz-about__cta, .manz-about__hero-note');
      const outsideSection = [...text].some(element => {
        const section = element.closest('article, .manz-about__hero');
        if (!section) return false;
        const bounds = section.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1 ||
          box.left < -1 || box.right > innerWidth + 1;
      });
      if (outsideSection || document.documentElement.scrollHeight > innerHeight + 1) {
        page.classList.add('manz-about-natural');
      }
    });
  }

  window.addEventListener('resize', checkComposition, { passive: true });
  document.addEventListener('shopify:section:load', checkComposition);
  document.addEventListener('shopify:block:select', checkComposition);
  document.fonts.ready.then(checkComposition);
  window.addEventListener('load', checkComposition, { once: true });
  const content = document.querySelector('.manz-about');
  if (content) new MutationObserver(checkComposition).observe(content, { childList: true, subtree: true, characterData: true });
  checkComposition();
})();
