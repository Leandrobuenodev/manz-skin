/* Native carousel only; the Hero content stays in its final position on load. */
(() => {
  if (customElements.get('manz-hero')) return;

  const syncHomepage = () => {
    document.body.classList.toggle('manz-hero-page', Boolean(document.querySelector('[data-manz-hero]')));
  };

  class ManzHeroCarousel {
    constructor(root) {
      this.root = root;
      this.track = root.querySelector('[data-manz-carousel-track]');
      this.slides = this.track
        ? Array.from(this.track.querySelectorAll('[data-manz-carousel-slide]'))
        : [];
      this.controls = Array.from(root.querySelectorAll('[data-manz-carousel-previous], [data-manz-carousel-next]'));
      this.index = 0;
      this.timer = null;
      this.hoverPaused = false;
      this.focusPaused = false;
      this.pointerInteraction = false;
      this.destroyed = false;
      this.ready = false;
      this.transitioning = false;
      this.pendingLoopReset = null;
      this.lastSlideClone = null;
      this.imagePromises = new WeakMap();
      this.interval = this.readDuration(root.dataset.manzCarouselInterval, 5000);
      this.duration = this.readDuration(root.dataset.manzCarouselDuration, 800);
      this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.interactionTargets = [root];
      const header = document.querySelector('.manz-hero-page .section-header .header');
      if (header && !root.contains(header)) this.interactionTargets.push(header);

      if (!this.track || this.slides.length < 2) {
        this.controls.forEach((control) => { control.hidden = true; });
        return;
      }
      this.controls.forEach((control) => { control.hidden = false; });

      this.firstSlideClone = this.createSlideClone(this.slides[0]);
      this.track.append(this.firstSlideClone);
      this.setActiveSlide(0);

      this.onPointerEnter = () => {
        this.hoverPaused = true;
        this.stop();
      };
      this.onPointerLeave = () => {
        this.hoverPaused = false;
        this.prepareNextSlide();
        this.schedule();
      };
      this.onFocusIn = () => {
        if (this.pointerInteraction) return;
        this.focusPaused = true;
        this.stop();
      };
      this.onFocusOut = (event) => {
        const stillWithinHero = this.interactionTargets.some((target) => target.contains(event.relatedTarget));
        if (!stillWithinHero) {
          this.focusPaused = false;
          this.prepareNextSlide();
          this.schedule();
        }
      };
      this.onControlPointerDown = () => {
        this.pointerInteraction = true;
        this.focusPaused = false;
        this.stop();
      };
      this.onControlPointerEnd = () => {
        this.pointerInteraction = false;
      };
      this.onPrevious = () => this.navigate(-1, true);
      this.onNext = () => this.navigate(1, true);
      this.onKeyDown = (event) => {
        const control = event.target.closest?.('[data-manz-carousel-previous], [data-manz-carousel-next]');
        if (!control || !this.root.contains(control)) return;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this.navigate(-1, true);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          this.navigate(1, true);
        }
      };
      this.onVisibilityChange = () => {
        if (document.hidden) this.stop();
        else {
          this.prepareNextSlide();
          this.schedule();
        }
      };
      this.onMotionPreferenceChange = () => {
        if (this.motionPreference.matches && this.transitioning) this.settleTransition();
        this.prepareNextSlide();
        this.schedule();
      };
      this.onTransitionEnd = (event) => {
        if (!this.transitioning || event.target !== this.track || event.propertyName !== 'transform') return;
        this.finishTransition();
      };

      this.interactionTargets.forEach((target) => {
        target.addEventListener('mouseenter', this.onPointerEnter);
        target.addEventListener('mouseleave', this.onPointerLeave);
        target.addEventListener('focusin', this.onFocusIn);
        target.addEventListener('focusout', this.onFocusOut);
      });
      this.controls.forEach((control) => {
        control.addEventListener('click', control.hasAttribute('data-manz-carousel-previous') ? this.onPrevious : this.onNext);
        control.addEventListener('pointerdown', this.onControlPointerDown);
      });
      this.root.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('pointerup', this.onControlPointerEnd);
      window.addEventListener('pointercancel', this.onControlPointerEnd);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.track.addEventListener('transitionend', this.onTransitionEnd);
      if (this.motionPreference.addEventListener) {
        this.motionPreference.addEventListener('change', this.onMotionPreferenceChange);
      } else {
        this.motionPreference.addListener(this.onMotionPreferenceChange);
      }

      this.ensureImageReady(this.slides[0]).then(() => {
        if (this.destroyed) return;
        this.ready = true;
        this.prepareNextSlide();
        this.schedule();
      });
    }

    readDuration(value, fallback) {
      const duration = Number.parseInt(value, 10);
      return Number.isFinite(duration) && duration > 0 ? duration : fallback;
    }

    isPaused() {
      return this.destroyed
        || this.slides.length < 2
        || !this.ready
        || this.transitioning
        || this.hoverPaused
        || this.focusPaused
        || document.hidden;
    }

    schedule() {
      this.stop();
      if (this.isPaused()) return;
      this.timer = window.setTimeout(() => {
        this.timer = null;
        this.navigate(1, false);
      }, this.interval);
    }

    stop() {
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = null;
    }

    async navigate(direction, manual) {
      if (this.destroyed || !this.ready || this.transitioning || document.hidden) return;
      if (!manual && this.isPaused()) return;

      this.stop();
      const slideCount = this.slides.length;
      const targetIndex = (this.index + direction + slideCount) % slideCount;
      const wrapsBackward = direction < 0 && this.index === 0;
      const wrapsForward = direction > 0 && this.index === slideCount - 1;
      this.transitioning = true;

      await this.ensureImageReady(this.slides[targetIndex]);
      if (this.destroyed) return;
      if (!manual && (this.hoverPaused || this.focusPaused || document.hidden)) {
        this.transitioning = false;
        this.schedule();
        return;
      }

      this.index = targetIndex;
      this.setActiveSlide(targetIndex);
      if (this.motionPreference.matches) {
        this.pendingLoopReset = null;
        this.track.style.transitionDuration = '0ms';
        this.track.style.transform = this.transformForIndex(targetIndex);
        this.transitioning = false;
        this.restoreTransitionDuration();
        this.prepareNextSlide();
        this.schedule();
        return;
      }

      this.track.style.transitionDuration = `${this.duration}ms`;
      if (wrapsBackward) {
        this.lastSlideClone = this.createSlideClone(this.slides[slideCount - 1]);
        this.track.prepend(this.lastSlideClone);
        this.track.style.transitionDuration = '0ms';
        this.track.style.transform = 'translate3d(-100%, 0, 0)';
        void this.track.offsetWidth;
        this.pendingLoopReset = 'last';
        this.track.style.transitionDuration = `${this.duration}ms`;
        this.track.style.transform = 'translate3d(0, 0, 0)';
      } else if (wrapsForward) {
        this.pendingLoopReset = 'first';
        this.track.style.transform = `translate3d(-${slideCount * 100}%, 0, 0)`;
      } else {
        this.pendingLoopReset = null;
        this.track.style.transform = this.transformForIndex(targetIndex);
      }
    }

    finishTransition() {
      const didLoopReset = this.pendingLoopReset !== null;
      if (this.pendingLoopReset === 'first') this.resetTrackToIndex(0);
      if (this.pendingLoopReset === 'last') {
        if (this.lastSlideClone) this.lastSlideClone.remove();
        this.lastSlideClone = null;
        this.resetTrackToIndex(this.slides.length - 1);
      }
      this.pendingLoopReset = null;
      this.transitioning = false;
      if (!didLoopReset) this.track.style.removeProperty('transition-duration');
      this.setActiveSlide(this.index);
      this.prepareNextSlide();
      this.schedule();
    }

    settleTransition() {
      if (this.pendingLoopReset === 'first') this.resetTrackToIndex(0);
      if (this.pendingLoopReset === 'last') {
        if (this.lastSlideClone) this.lastSlideClone.remove();
        this.lastSlideClone = null;
        this.resetTrackToIndex(this.slides.length - 1);
      }
      if (!this.pendingLoopReset) this.resetTrackToIndex(this.index);
      this.pendingLoopReset = null;
      this.transitioning = false;
      this.setActiveSlide(this.index);
    }

    resetTrackToIndex(index) {
      this.track.style.transitionDuration = '0ms';
      this.track.style.transform = this.transformForIndex(index);
      this.restoreTransitionDuration();
    }

    transformForIndex(index) {
      const offset = index === 0 ? '0' : `-${index * 100}%`;
      return `translate3d(${offset}, 0, 0)`;
    }

    restoreTransitionDuration() {
      window.requestAnimationFrame(() => {
        if (!this.destroyed && this.track) this.track.style.removeProperty('transition-duration');
      });
    }

    createSlideClone(slide) {
      const clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('data-shopify-editor-block');
      clone.removeAttribute('data-shopify-editor-block-id');
      clone.querySelectorAll('img').forEach((image) => {
        image.alt = '';
        image.loading = 'eager';
        image.removeAttribute('fetchpriority');
      });
      return clone;
    }

    setActiveSlide(activeIndex) {
      this.slides.forEach((slide, index) => {
        if (index === activeIndex) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', 'true');
      });
      if (this.firstSlideClone) this.firstSlideClone.setAttribute('aria-hidden', 'true');
      if (this.lastSlideClone) this.lastSlideClone.setAttribute('aria-hidden', 'true');
    }

    ensureImageReady(slide) {
      const image = slide && slide.querySelector('img');
      if (!image) return Promise.resolve();

      const existingPromise = this.imagePromises.get(image);
      if (existingPromise) return existingPromise;

      const readyPromise = (async () => {
        image.loading = 'eager';
        if (!image.complete) {
          await new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          });
        }
        if (image.naturalWidth > 0 && typeof image.decode === 'function') {
          await image.decode().catch(() => {});
        }
      })();

      this.imagePromises.set(image, readyPromise);
      return readyPromise;
    }

    prepareNextSlide() {
      if (this.isPaused()) return;
      const nextIndex = (this.index + 1) % this.slides.length;
      this.ensureImageReady(this.slides[nextIndex]).catch(() => {});
    }

    destroy() {
      this.destroyed = true;
      this.stop();
      if (this.onPointerEnter) {
        this.interactionTargets.forEach((target) => {
          target.removeEventListener('mouseenter', this.onPointerEnter);
          target.removeEventListener('mouseleave', this.onPointerLeave);
          target.removeEventListener('focusin', this.onFocusIn);
          target.removeEventListener('focusout', this.onFocusOut);
        });
      }
      this.controls.forEach((control) => {
        control.removeEventListener('click', control.hasAttribute('data-manz-carousel-previous') ? this.onPrevious : this.onNext);
        control.removeEventListener('pointerdown', this.onControlPointerDown);
      });
      if (this.root && this.onKeyDown) this.root.removeEventListener('keydown', this.onKeyDown);
      if (this.onControlPointerEnd) {
        window.removeEventListener('pointerup', this.onControlPointerEnd);
        window.removeEventListener('pointercancel', this.onControlPointerEnd);
      }
      if (this.onVisibilityChange) document.removeEventListener('visibilitychange', this.onVisibilityChange);
      if (this.track && this.onTransitionEnd) this.track.removeEventListener('transitionend', this.onTransitionEnd);
      if (this.onMotionPreferenceChange) {
        if (this.motionPreference.removeEventListener) {
          this.motionPreference.removeEventListener('change', this.onMotionPreferenceChange);
        } else {
          this.motionPreference.removeListener(this.onMotionPreferenceChange);
        }
      }
      if (this.firstSlideClone) this.firstSlideClone.remove();
      if (this.lastSlideClone) this.lastSlideClone.remove();
      if (this.track) {
        this.track.style.removeProperty('transform');
        this.track.style.removeProperty('transition-duration');
      }
    }
  }

  class ManzHero extends HTMLElement {
    connectedCallback() {
      syncHomepage();
      if (this.hasAttribute('data-manz-carousel') && !this.carousel) {
        this.carousel = new ManzHeroCarousel(this);
      }
      this.onEditorSectionLoad = (event) => {
        if (event.target !== this && !event.target.contains?.(this)) return;
        if (this.carousel) this.carousel.destroy();
        this.carousel = new ManzHeroCarousel(this);
      };
      this.onEditorSectionUnload = (event) => {
        if (event.target !== this && !event.target.contains?.(this)) return;
        if (this.carousel) {
          this.carousel.destroy();
          this.carousel = null;
        }
      };
      document.addEventListener('shopify:section:load', this.onEditorSectionLoad);
      document.addEventListener('shopify:section:unload', this.onEditorSectionUnload);
    }

    disconnectedCallback() {
      document.removeEventListener('shopify:section:load', this.onEditorSectionLoad);
      document.removeEventListener('shopify:section:unload', this.onEditorSectionUnload);
      if (this.carousel) {
        this.carousel.destroy();
        this.carousel = null;
      }
      // Shopify replaces section elements during Theme Editor updates.
      queueMicrotask(syncHomepage);
    }
  }

  customElements.define('manz-hero', ManzHero);
})();
