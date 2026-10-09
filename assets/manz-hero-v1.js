/* GSAP is scoped to a single entrance animation; content is visible without JS. */
(() => {
  if (customElements.get('manz-hero')) return;

  const syncHomepage = () => {
    document.body.classList.toggle('manz-hero-page', Boolean(document.querySelector('[data-manz-hero]')));
  };

  class ManzHero extends HTMLElement {
    connectedCallback() {
      syncHomepage();
      if (this.dataset.animate === 'false' || !window.gsap) return;

      this.motion = window.gsap.matchMedia();
      this.motion.add('(prefers-reduced-motion: no-preference)', () => {
        const image = this.querySelector('.manz-hero__image');
        const lines = this.querySelectorAll('.manz-hero__line-inner');
        const header = document.querySelector('.manz-hero-page .section-header .header');
        const timeline = window.gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
        let alive = true;

        if (image) {
          timeline.fromTo(image, { scale: 1.05 }, { scale: 1, duration: 1.9, ease: 'power2.out', clearProps: 'transform' }, 0);
        }
        if (header) {
          timeline.fromTo(header, { opacity: 0 }, { opacity: 1, duration: 0.8, clearProps: 'opacity' }, 0.15);
        }
        const eyebrow = this.querySelector('.manz-hero__eyebrow');
        if (eyebrow) {
          timeline.fromTo(eyebrow, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.7, clearProps: 'opacity,transform' }, 0.3);
        }
        timeline.fromTo(lines, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.12, clearProps: 'opacity,transform' }, 0.4);
        const caption = this.querySelector('.manz-hero__caption');
        if (caption) {
          timeline.fromTo(caption, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.7, clearProps: 'opacity,transform' }, 1.05);
        }

        // Give the local font and image a brief chance to decode before revealing.
        const ready = Promise.allSettled([
          document.fonts ? document.fonts.ready : Promise.resolve(),
          image && image.decode ? image.decode() : Promise.resolve(),
        ]);
        let startTimer;
        Promise.race([ready, new Promise((resolve) => { startTimer = setTimeout(resolve, 700); })]).then(() => {
          clearTimeout(startTimer);
          if (alive && this.isConnected) timeline.play();
        });

        return () => {
          alive = false;
          clearTimeout(startTimer);
        };
      });
    }

    disconnectedCallback() {
      if (this.motion) this.motion.revert();
      // Shopify replaces section elements during Theme Editor updates.
      queueMicrotask(syncHomepage);
    }
  }

  customElements.define('manz-hero', ManzHero);
})();
