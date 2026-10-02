/* ============================================================================
   SCRIPT.JS — five small, independent behaviors. Nothing here depends on
   a framework or build step; it's plain DOM APIs so it's easy to trace.

   1. Footer year          4. Scroll-reveal (sections/cards/chips fade in)
   2. Hero bar chart        5. Cursor-tilt on the hero dashboard mock
      (grow-in + idle pulse, stat count-up)
   3. Smooth in-page scroll for nav links

   All motion here respects prefers-reduced-motion — see the query at the
   bottom of styles.css, plus an explicit JS check before the tilt effect.
   ============================================================================ */

  document.getElementById('year').textContent = new Date().getFullYear();

  const dashboardModal = document.getElementById('dashboard-modal');
  const dashboardModalImage = document.getElementById('dashboard-modal-image');
  const dashboardModalClose = document.querySelector('.dashboard-modal-close');
  const dashboardModalPrev = document.querySelector('.dashboard-modal-prev');
  const dashboardModalNext = document.querySelector('.dashboard-modal-next');
  let activeDashboardNavigate = null;
  let dashboardModalReturnFocus = null;
  const closeDashboardModal = () => {
    if (!dashboardModal) return;
    dashboardModal.hidden = true;
    document.body.classList.remove('modal-open');
    dashboardModalReturnFocus?.focus();
    activeDashboardNavigate = null;
  };

  window.addEventListener('load', () => {
    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
      const image = carousel.querySelector('.viz-image');
      const prev = carousel.querySelector('.carousel-prev');
      const next = carousel.querySelector('.carousel-next');
      const expand = carousel.querySelector('.dashboard-expand');
      const screenshotCount = Number(carousel.dataset.screenshots || '1');
      let showScreenshot = null;

      if (!image) return;

      if (screenshotCount <= 1) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
      } else {
        const prefix = image.getAttribute('src').replace(/-\d{2}\.[^.]+$/, '');
        const extension = image.getAttribute('src').match(/\.[^.]+$/)[0];
        let current = 1;
        showScreenshot = (step) => {
          current = ((current - 1 + step + screenshotCount) % screenshotCount) + 1;
          image.src = `${prefix}-${String(current).padStart(2, '0')}${extension}`;
          image.alt = image.alt.replace(/ screenshot \d+$/, ` screenshot ${current}`);
          if (activeDashboardNavigate === showScreenshot && dashboardModalImage) {
            dashboardModalImage.src = image.src;
            dashboardModalImage.alt = image.alt;
          }
        };
        if (prev) prev.hidden = false;
        if (next) next.hidden = false;
        prev?.addEventListener('click', () => showScreenshot(-1));
        next?.addEventListener('click', () => showScreenshot(1));
      }

      const openPreview = (trigger) => {
        if (!dashboardModal || !dashboardModalImage) return;
        activeDashboardNavigate = showScreenshot;
        dashboardModalReturnFocus = trigger;
        dashboardModalImage.src = image.src;
        dashboardModalImage.alt = image.alt;
        if (dashboardModalPrev) dashboardModalPrev.hidden = screenshotCount <= 1;
        if (dashboardModalNext) dashboardModalNext.hidden = screenshotCount <= 1;
        dashboardModal.hidden = false;
        document.body.classList.add('modal-open');
        dashboardModalClose?.focus();
      };
      expand?.addEventListener('click', () => openPreview(expand));
      image.setAttribute('role', 'button');
      image.setAttribute('tabindex', '0');
      image.setAttribute('aria-label', `Enlarge ${image.alt}`);
      image.addEventListener('click', () => openPreview(image));
      image.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPreview(image);
        }
      });
    });

    document.querySelectorAll('.projects').forEach((projects) => {
      projects.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        const card = projects.querySelector('.project-card');
        if (!card) return;
        const styles = getComputedStyle(projects);
        const gap = parseFloat(styles.columnGap || styles.gap || '0');
        const distance = card.getBoundingClientRect().width + gap;
        projects.scrollBy({ left: event.deltaY > 0 ? distance : -distance, behavior: 'smooth' });
      }, { passive: false });
    });

    if (dashboardModalClose && dashboardModal) {
      dashboardModalClose.addEventListener('click', closeDashboardModal);
      dashboardModal.addEventListener('click', (event) => {
        if (event.target === dashboardModal) closeDashboardModal();
      });
    }
    dashboardModalPrev?.addEventListener('click', () => activeDashboardNavigate?.(-1));
    dashboardModalNext?.addEventListener('click', () => activeDashboardNavigate?.(1));

    document.querySelectorAll('.stat .num[data-target]').forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const prefix = el.dataset.prefix || '';
      const textNode = el.firstChild;
      const duration = 1300;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        textNode.textContent = prefix + (target * eased).toFixed(decimals);
        if (progress < 1) requestAnimationFrame(tick);
        else textNode.textContent = prefix + target.toFixed(decimals);
      }
      requestAnimationFrame(tick);
    });

    let parallaxFrame = null;
    window.addEventListener('scroll', () => {
      if (parallaxFrame !== null) return;
      parallaxFrame = requestAnimationFrame(() => {
        document.body.style.setProperty('--scroll-y', `${window.scrollY}px`);
        parallaxFrame = null;
      });
    }, { passive: true });

    const menuToggle = document.querySelector('.nav-menu-toggle');
    const siteMenu = document.getElementById('site-menu');
    if (menuToggle && siteMenu) {
      let menuScrollPosition = 0;
      const closeMenu = (restoreScrollPosition) => {
        menuToggle.setAttribute('aria-expanded', 'false');
        siteMenu.classList.remove('is-open');
        document.body.classList.remove('menu-open');
        if (restoreScrollPosition) window.scrollTo({ top: menuScrollPosition, behavior: 'smooth' });
      };
      menuToggle.addEventListener('click', () => {
        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        if (!isOpen) menuScrollPosition = window.scrollY;
        menuToggle.setAttribute('aria-expanded', String(!isOpen));
        siteMenu.classList.toggle('is-open', !isOpen);
        document.body.classList.toggle('menu-open', !isOpen);
      });
      siteMenu.addEventListener('click', (event) => {
        if (event.target === siteMenu) closeMenu(true);
      });
      document.addEventListener('click', (event) => {
        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        if (isOpen && !siteMenu.contains(event.target) && !menuToggle.contains(event.target)) {
          closeMenu(true);
        }
      });
      siteMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          closeMenu(false);
        });
      });
    }
  });

  const revealTargets = document.querySelectorAll(
    '.sec-head, .project-card, .chip, .impact-row, .contact-panel'
  );
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 6) * 60 + 'ms';
  });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach((el) => revealObserver.observe(el));

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const certModal = document.getElementById('cert-modal');
  const certModalImage = document.getElementById('cert-modal-image');
  const certModalClose = document.querySelector('.cert-modal-close');
  const closeCertModal = () => {
    if (!certModal) return;
    certModal.hidden = true;
    document.body.classList.remove('modal-open');
  };

  document.querySelectorAll('.certification-item').forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      const previewImage = item.querySelector('img');
      if (!previewImage || !certModal || !certModalImage) return;
      certModalImage.src = previewImage.src;
      certModalImage.alt = previewImage.alt;
      certModal.hidden = false;
      document.body.classList.add('modal-open');
    });
  });

  if (certModalClose && certModal) {
    certModalClose.addEventListener('click', closeCertModal);
    certModal.addEventListener('click', (event) => {
      if (event.target === certModal) closeCertModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && certModal && !certModal.hidden) closeCertModal();
    if (!dashboardModal || dashboardModal.hidden) return;
    if (event.key === 'Escape') closeDashboardModal();
    if (event.key === 'ArrowLeft') activeDashboardNavigate?.(-1);
    if (event.key === 'ArrowRight') activeDashboardNavigate?.(1);
  });
