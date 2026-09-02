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

  window.addEventListener('load', () => {
    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
      const image = carousel.querySelector('.viz-image');
      const prefix = image.src.replace(/-\d{2}\.[^.]+$/, '');
      const extension = image.src.match(/\.[^.]+$/)[0];
      let current = 1;
      const showScreenshot = (step) => {
        current = ((current - 1 + step + 4) % 4) + 1;
        image.src = `${prefix}-${String(current).padStart(2, '0')}${extension}`;
        image.alt = image.alt.replace(/ screenshot \d+$/, ` screenshot ${current}`);
      };
      carousel.querySelector('.carousel-prev').addEventListener('click', () => showScreenshot(-1));
      carousel.querySelector('.carousel-next').addEventListener('click', () => showScreenshot(1));
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

    const contactModal = document.getElementById('contact-modal');
    const contactValue = document.getElementById('contact-value');
    const copyContact = document.getElementById('copy-contact');
    const copyStatus = document.querySelector('.copy-status');
    const closeContactModal = () => {
      contactModal.hidden = true;
      copyStatus.textContent = '';
    };

    document.querySelectorAll('.contact-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        contactValue.value = trigger.dataset.contact === 'email'
          ? 'DLicos8013@gmail.com'
          : '+63 962 782 4967';
        contactModal.hidden = false;
        contactValue.focus();
        contactValue.select();
      });
    });
    document.querySelector('.contact-modal-close').addEventListener('click', closeContactModal);
    contactModal.addEventListener('click', (event) => {
      if (event.target === contactModal) closeContactModal();
    });
    copyContact.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(contactValue.value);
        copyStatus.textContent = 'Copied to clipboard.';
      } catch (error) {
        contactValue.focus();
        contactValue.select();
        copyStatus.textContent = 'Select the detail and copy it manually.';
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !contactModal.hidden) closeContactModal();
    });
  });
