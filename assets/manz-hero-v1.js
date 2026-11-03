/* Native carousel controller shared by the desktop and mobile Hero views. */
(() => {
  if (customElements.get('manz-hero')) return;

  const syncHomepage = () => {
    document.body.classList.toggle('manz-hero-page', Boolean(document.querySelector('[data-manz-hero]')));
  };

  class ManzHeroCarousel {
    constructor(root) {
      this.root = root;
      this.views = this.collectViews();
      this.controls = Array.from(root.querySelectorAll('[data-manz-carousel-previous], [data-manz-carousel-next]'));
      this.indicators = Array.from(root.querySelectorAll('[data-manz-carousel-indicator]'));
      this.activeView = null;
      this.track = null;
      this.slides = [];
      this.index = 0;
      this.timer = null;
      this.transitionWatchdog = null;
      this.hoverPaused = false;
      this.focusPaused = false;
      this.pointerInteraction = false;
      this.destroyed = false;
      this.ready = false;
      this.transitioning = false;
      this.pendingLoopReset = null;
      this.firstSlideClone = null;
      this.lastSlideClone = null;
      this.imagePromises = new WeakMap();
      this.interval = this.readDuration(root.dataset.manzCarouselInterval, 5000);
      this.duration = this.readDuration(root.dataset.manzCarouselDuration, 800);
      this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mobileBreakpoint = window.matchMedia('(max-width: 749px)');
      this.interactionTargets = [root];
      const header = document.querySelector('.manz-hero-page .section-header .header');
      if (header && !root.contains(header)) this.interactionTargets.push(header);

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
      this.onIndicatorClick = (event) => {
        const targetIndex = Number.parseInt(event.currentTarget.dataset.manzCarouselIndicator, 10);
        if (Number.isInteger(targetIndex)) this.navigateTo(targetIndex, true);
      };
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
        if (document.hidden) {
          this.stop();
          if (this.transitioning) this.settleTransition();
        } else {
          this.prepareNextSlide();
          this.schedule();
        }
      };
      this.onMotionPreferenceChange = () => {
        if (this.motionPreference.matches && this.transitioning) this.settleTransition();
        this.prepareNextSlide();
        this.schedule();
      };
      this.onBreakpointChange = () => this.activateView();
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
      this.indicators.forEach((indicator) => {
        indicator.addEventListener('click', this.onIndicatorClick);
        indicator.addEventListener('pointerdown', this.onControlPointerDown);
      });
      this.root.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('pointerup', this.onControlPointerEnd);
      window.addEventListener('pointercancel', this.onControlPointerEnd);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.addMediaListener(this.motionPreference, this.onMotionPreferenceChange);
      this.addMediaListener(this.mobileBreakpoint, this.onBreakpointChange);

      this.activateView();
    }

    collectViews() {
      const elements = Array.from(this.root.querySelectorAll('[data-manz-carousel-view]'));
      if (elements.length > 0) {
        return elements.map((element) => {
          const track = element.querySelector('[data-manz-carousel-track]');
          return {
            name: element.dataset.manzCarouselView,
            track,
            slides: track ? Array.from(track.querySelectorAll('[data-manz-carousel-slide]')) : []
          };
        }).filter((view) => view.track);
      }

      const track = this.root.querySelector('[data-manz-carousel-track]');
      return track ? [{ name: 'default', track, slides: Array.from(track.querySelectorAll('[data-manz-carousel-slide]')) }] : [];
    }

    addMediaListener(mediaQuery, listener) {
      if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', listener);
      else mediaQuery.addListener(listener);
    }

    removeMediaListener(mediaQuery, listener) {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', listener);
      else mediaQuery.removeListener(listener);
    }

    readDuration(value, fallback) {
      const duration = Number.parseInt(value, 10);
      return Number.isFinite(duration) && duration > 0 ? duration : fallback;
    }

    chooseView() {
      const mobileView = this.views.find((view) => view.name === 'mobile');
      const desktopView = this.views.find((view) => view.name === 'desktop');
      if (this.mobileBreakpoint.matches && mobileView) return mobileView;
      return desktopView || this.views[0] || null;
    }

    activateView() {
      const nextView = this.chooseView();
      if (!nextView || nextView === this.activeView) return;

      this.cleanupActiveView();
      this.activeView = nextView;
      this.track = nextView.track;
      this.slides = nextView.slides;
      this.index = 0;
      this.pendingLoopReset = null;
      this.transitioning = false;
      this.ready = false;
      this.controls.forEach((control) => { control.hidden = this.slides.length < 2; });
      this.setActiveSlide(0);

      if (this.slides.length < 2) {
        this.ready = true;
        return;
      }

      this.firstSlideClone = this.createSlideClone(this.slides[0]);
      this.track.append(this.firstSlideClone);
      this.track.addEventListener('transitionend', this.onTransitionEnd);
      this.ensureImageReady(this.slides[0]).then(() => {
        if (this.destroyed || this.activeView !== nextView) return;
        this.ready = true;
        this.prepareNextSlide();
        this.schedule();
      });
    }

    cleanupActiveView() {
      this.stop();
      this.clearTransitionWatchdog();
      if (!this.track) return;

      this.track.removeEventListener('transitionend', this.onTransitionEnd);
      if (this.firstSlideClone) this.firstSlideClone.remove();
      if (this.lastSlideClone) this.lastSlideClone.remove();
      this.firstSlideClone = null;
      this.lastSlideClone = null;
      this.pendingLoopReset = null;
      this.transitioning = false;
      this.ready = false;
      this.track.style.transitionDuration = '0ms';
      this.track.style.transform = 'translate3d(0, 0, 0)';
      void this.track.offsetWidth;
      this.track.style.removeProperty('transition-duration');
      this.track.style.removeProperty('transform');
      this.track = null;
      this.slides = [];
      this.activeView = null;
    }

    isPaused() {
      return this.destroyed
        || this.slides.length < 2
        || !this.ready
        || this.transitioning
        || this.hoverPaused
        || this.focusPaused
        || document.hidden
        || this.motionPreference.matches;
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
      const slideCount = this.slides.length;
      if (slideCount < 2) return;
      const targetIndex = (this.index + direction + slideCount) % slideCount;
      return this.navigateTo(targetIndex, manual);
    }

    async navigateTo(targetIndex, manual) {
      if (this.destroyed || !this.track || this.slides.length < 2 || this.transitioning || document.hidden) return;
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= this.slides.length) return;
      if (manual) this.focusPaused = false;
      if (targetIndex === this.index) {
        this.prepareNextSlide();
        this.schedule();
        return;
      }
      if (!manual && this.isPaused()) return;

      this.stop();
      const activeView = this.activeView;
      const slideCount = this.slides.length;
      const wrapsBackward = this.index === 0 && targetIndex === slideCount - 1;
      const wrapsForward = this.index === slideCount - 1 && targetIndex === 0;
      this.transitioning = true;

      await this.ensureImageReady(this.slides[targetIndex]);
      if (this.destroyed || this.activeView !== activeView || !this.transitioning) return;
      if (!manual && (this.hoverPaused || this.focusPaused || document.hidden || this.motionPreference.matches)) {
        this.transitioning = false;
        this.schedule();
        return;
      }

      this.index = targetIndex;
      this.setActiveSlide(targetIndex);
      if (this.motionPreference.matches) {
        this.resetTrackToIndex(targetIndex);
        this.transitioning = false;
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
        this.track.style.transitionDuration = `${this.duration}ms`;
        this.pendingLoopReset = 'last';
        this.track.style.transform = 'translate3d(0, 0, 0)';
      } else if (wrapsForward) {
        this.pendingLoopReset = 'first';
        this.track.style.transform = `translate3d(-${slideCount * 100}%, 0, 0)`;
      } else {
        this.pendingLoopReset = null;
        this.track.style.transform = this.transformForIndex(targetIndex);
      }
      this.startTransitionWatchdog();
    }

    startTransitionWatchdog() {
      this.clearTransitionWatchdog();
      this.transitionWatchdog = window.setTimeout(() => this.finishTransition(), this.duration + 120);
    }

    clearTransitionWatchdog() {
      if (this.transitionWatchdog !== null) window.clearTimeout(this.transitionWatchdog);
      this.transitionWatchdog = null;
    }

    finishTransition() {
      if (!this.transitioning || !this.track) return;
      const didLoopReset = this.pendingLoopReset !== null;
      if (this.pendingLoopReset === 'first') this.resetTrackToIndex(0);
      if (this.pendingLoopReset === 'last') {
        if (this.lastSlideClone) this.lastSlideClone.remove();
        this.lastSlideClone = null;
        this.resetTrackToIndex(this.slides.length - 1);
      }
      this.pendingLoopReset = null;
      this.clearTransitionWatchdog();
      this.transitioning = false;
      if (!didLoopReset) this.track.style.removeProperty('transition-duration');
      this.setActiveSlide(this.index);
      this.prepareNextSlide();
      this.schedule();
    }

    settleTransition() {
      if (!this.transitioning || !this.track) return;
      if (this.pendingLoopReset === 'first') this.resetTrackToIndex(0);
      else if (this.pendingLoopReset === 'last') {
        if (this.lastSlideClone) this.lastSlideClone.remove();
        this.lastSlideClone = null;
        this.resetTrackToIndex(this.slides.length - 1);
      } else {
        this.resetTrackToIndex(this.index);
      }
      this.pendingLoopReset = null;
      this.clearTransitionWatchdog();
      this.transitioning = false;
      this.setActiveSlide(this.index);
    }

    resetTrackToIndex(index) {
      if (!this.track) return;
      this.track.style.transitionDuration = '0ms';
      this.track.style.transform = this.transformForIndex(index);
      // Commit the no-transition reset before restoring the normal slide motion.
      void this.track.offsetWidth;
      this.track.style.removeProperty('transition-duration');
    }

    transformForIndex(index) {
      return index === 0 ? 'translate3d(0, 0, 0)' : `translate3d(-${index * 100}%, 0, 0)`;
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
      this.indicators.forEach((indicator, index) => {
        if (this.activeView?.name === 'mobile' && index === activeIndex) indicator.setAttribute('aria-current', 'true');
        else indicator.removeAttribute('aria-current');
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
        if (image.naturalWidth > 0 && typeof image.decode === 'function') await image.decode().catch(() => {});
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
      this.cleanupActiveView();
      this.interactionTargets.forEach((target) => {
        target.removeEventListener('mouseenter', this.onPointerEnter);
        target.removeEventListener('mouseleave', this.onPointerLeave);
        target.removeEventListener('focusin', this.onFocusIn);
        target.removeEventListener('focusout', this.onFocusOut);
      });
      this.controls.forEach((control) => {
        control.removeEventListener('click', control.hasAttribute('data-manz-carousel-previous') ? this.onPrevious : this.onNext);
        control.removeEventListener('pointerdown', this.onControlPointerDown);
      });
      this.indicators.forEach((indicator) => {
        indicator.removeEventListener('click', this.onIndicatorClick);
        indicator.removeEventListener('pointerdown', this.onControlPointerDown);
      });
      this.root.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('pointerup', this.onControlPointerEnd);
      window.removeEventListener('pointercancel', this.onControlPointerEnd);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.removeMediaListener(this.motionPreference, this.onMotionPreferenceChange);
      this.removeMediaListener(this.mobileBreakpoint, this.onBreakpointChange);
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
        if (this.carousel) this.carousel.destroy();
        this.carousel = null;
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
      queueMicrotask(syncHomepage);
    }
  }

  customElements.define('manz-hero', ManzHero);
})();
