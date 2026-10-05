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
  const dashboardModalImagePlaceholder = document.querySelector('.dashboard-modal-image-placeholder');
  const dashboardModalViewport = document.querySelector('.dashboard-modal-viewport');
  const dashboardModalTitle = document.getElementById('dashboard-modal-title');
  const dashboardModalTools = document.querySelector('.dashboard-modal-tools');
  const dashboardModalLiveLink = document.querySelector('.dashboard-modal-live-link');
  const dashboardModalClose = document.querySelector('.dashboard-modal-close');
  const dashboardModalPrev = document.querySelector('.dashboard-modal-prev');
  const dashboardModalNext = document.querySelector('.dashboard-modal-next');
  const dashboardModalPagination = document.querySelector('.dashboard-modal-pagination');
  const reportFontDialog = document.getElementById('report-font-dialog');
  const reportFontCancel = document.querySelector('.report-font-cancel');
  const reportFontContinue = document.querySelector('.report-font-continue');
  let activeDashboardNavigate = null;
  let activeDashboardNavigateTo = null;
  let dashboardModalReturnFocus = null;
  let dashboardZoom = 1;
  let dashboardPanX = 0;
  let dashboardPanY = 0;
  let dashboardDrag = null;
  let pendingReportUrl = '';
  let reportDialogReturnFocus = null;
  const closeReportFontDialog = () => {
    if (!reportFontDialog) return;
    reportFontDialog.hidden = true;
    if (dashboardModal?.hidden && document.getElementById('cert-modal')?.hidden !== false) {
      document.body.classList.remove('modal-open');
    }
    reportDialogReturnFocus?.focus();
    reportDialogReturnFocus = null;
    pendingReportUrl = '';
  };
  const clampDashboardPan = () => {
    if (!dashboardModalViewport) return;
    const maxX = dashboardModalViewport.clientWidth * (dashboardZoom - 1) / 2;
    const maxY = dashboardModalViewport.clientHeight * (dashboardZoom - 1) / 2;
    dashboardPanX = Math.max(-maxX, Math.min(maxX, dashboardPanX));
    dashboardPanY = Math.max(-maxY, Math.min(maxY, dashboardPanY));
  };
  const renderDashboardTransform = () => {
    if (!dashboardModalImage) return;
    dashboardModalImage.style.transform =
      `translate(calc(-50% + ${dashboardPanX}px), calc(-50% + ${dashboardPanY}px)) scale(${dashboardZoom})`;
    dashboardModalViewport?.classList.toggle('is-zoomed', dashboardZoom > 1);
  };
  const resetDashboardTransform = () => {
    dashboardZoom = 1;
    dashboardPanX = 0;
    dashboardPanY = 0;
    renderDashboardTransform();
  };
  const updateDashboardPagination = (container, current) => {
    container?.querySelectorAll('.dashboard-pagination-dot').forEach((dot, index) => {
      const isCurrent = index + 1 === current;
      dot.classList.toggle('is-current', isCurrent);
      dot.setAttribute('aria-current', String(isCurrent));
    });
  };
  const closeDashboardModal = () => {
    if (!dashboardModal) return;
    dashboardModal.hidden = true;
    document.body.classList.remove('modal-open');
    dashboardModalReturnFocus?.focus();
    activeDashboardNavigate = null;
    activeDashboardNavigateTo = null;
    dashboardModalPagination?.replaceChildren();
    resetDashboardTransform();
  };

  window.addEventListener('load', () => {
    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
      const image = carousel.querySelector('.viz-image');
      const imagePlaceholder = carousel.querySelector('.dashboard-image-placeholder');
      const prev = carousel.querySelector('.carousel-prev');
      const next = carousel.querySelector('.carousel-next');
      const expand = carousel.querySelector('.dashboard-expand');
      const cardPagination = carousel.querySelector('.dashboard-card-pagination');
      const projectCard = carousel.closest('.project-card');
      const screenshotCount = Number(carousel.dataset.screenshots || '1');
      let showScreenshot = null;
      let goToScreenshot = null;
      let currentScreenshot = 1;

      if (!image) return;

      const setImageAvailability = (available) => {
        image.hidden = !available;
        if (imagePlaceholder) imagePlaceholder.hidden = available;
      };
      image.addEventListener('load', () => setImageAvailability(true));
      image.addEventListener('error', () => setImageAvailability(false));
      if (image.complete) setImageAvailability(image.naturalWidth > 0);

      if (screenshotCount <= 1) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
      } else {
        const prefix = image.getAttribute('src').replace(/-\d{2}\.[^.]+$/, '');
        const extension = image.getAttribute('src').match(/\.[^.]+$/)[0];
        goToScreenshot = (screenshot) => {
          currentScreenshot = screenshot;
          setImageAvailability(false);
          image.src = `${prefix}-${String(currentScreenshot).padStart(2, '0')}${extension}`;
          image.alt = image.alt.replace(/ screenshot \d+$/, ` screenshot ${currentScreenshot}`);
          updateDashboardPagination(cardPagination, currentScreenshot);
          if (activeDashboardNavigate === showScreenshot && dashboardModalImage) {
            dashboardModalImage.hidden = true;
            if (dashboardModalImagePlaceholder) dashboardModalImagePlaceholder.hidden = false;
            dashboardModalImage.src = image.src;
            dashboardModalImage.alt = image.alt;
            updateDashboardPagination(dashboardModalPagination, currentScreenshot);
            resetDashboardTransform();
          }
        };
        showScreenshot = (step) => {
          goToScreenshot(((currentScreenshot - 1 + step + screenshotCount) % screenshotCount) + 1);
        };
        if (prev) prev.hidden = false;
        if (next) next.hidden = false;
        prev?.addEventListener('click', () => showScreenshot(-1));
        next?.addEventListener('click', () => showScreenshot(1));
      }
      if (cardPagination) {
        cardPagination.replaceChildren();
        for (let screenshot = 1; screenshot <= screenshotCount; screenshot += 1) {
          const dot = document.createElement('button');
          dot.className = 'dashboard-pagination-dot';
          dot.type = 'button';
          dot.setAttribute('aria-label', `Show screenshot ${screenshot} of ${screenshotCount}`);
          dot.addEventListener('click', () => goToScreenshot?.(screenshot));
          cardPagination.append(dot);
        }
        updateDashboardPagination(cardPagination, currentScreenshot);
      }

      const openPreview = (trigger) => {
        if (!dashboardModal || !dashboardModalImage) return;
        activeDashboardNavigate = showScreenshot;
        activeDashboardNavigateTo = goToScreenshot;
        dashboardModalReturnFocus = trigger;
        dashboardModalImage.hidden = true;
        if (dashboardModalImagePlaceholder) dashboardModalImagePlaceholder.hidden = false;
        dashboardModalImage.src = image.currentSrc || image.src;
        dashboardModalImage.alt = image.alt;
        const projectTitle = projectCard?.querySelector('.project-body h3')?.textContent.trim() || image.alt;
        const projectTools = [...(projectCard?.querySelectorAll('.project-tags span') || [])]
          .map((tag) => tag.textContent.trim())
          .filter(Boolean);
        const reportLink = projectCard?.querySelector('.project-link[href^="https://"], .project-link[href^="http://"]');
        if (dashboardModalTitle) dashboardModalTitle.textContent = projectTitle;
        if (dashboardModalTools) dashboardModalTools.textContent = projectTools.length
          ? `Tools: ${projectTools.join(' · ')}`
          : '';
        if (dashboardModalLiveLink) {
          dashboardModalLiveLink.hidden = !reportLink;
          dashboardModalLiveLink.href = reportLink?.href || '';
        }
        if (dashboardModalPagination) {
          dashboardModalPagination.replaceChildren();
          for (let screenshot = 1; screenshot <= screenshotCount; screenshot += 1) {
            const dot = document.createElement('button');
            dot.className = 'dashboard-pagination-dot';
            dot.type = 'button';
            dot.setAttribute('aria-label', `Show screenshot ${screenshot} of ${screenshotCount}`);
            dot.addEventListener('click', () => activeDashboardNavigateTo?.(screenshot));
            dashboardModalPagination.append(dot);
          }
          updateDashboardPagination(dashboardModalPagination, currentScreenshot);
        }
        resetDashboardTransform();
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
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a.project-link[href^="https://app.powerbi.com/"], a.dashboard-modal-live-link');
      if (!link) return;
      event.preventDefault();
      if (!reportFontDialog) return;
      pendingReportUrl = link.href;
      reportDialogReturnFocus = link;
      reportFontDialog.hidden = false;
      document.body.classList.add('modal-open');
      reportFontCancel?.focus();
    });
    reportFontCancel?.addEventListener('click', closeReportFontDialog);
    reportFontContinue?.addEventListener('click', () => {
      if (!pendingReportUrl) return;
      window.open(pendingReportUrl, '_blank', 'noopener');
      closeReportFontDialog();
    });
    reportFontDialog?.addEventListener('click', (event) => {
      if (event.target === reportFontDialog) closeReportFontDialog();
    });
    dashboardModalPrev?.addEventListener('click', () => activeDashboardNavigate?.(-1));
    dashboardModalNext?.addEventListener('click', () => activeDashboardNavigate?.(1));
    dashboardModalImage?.addEventListener('load', () => {
      dashboardModalImage.hidden = false;
      if (dashboardModalImagePlaceholder) dashboardModalImagePlaceholder.hidden = true;
    });
    dashboardModalImage?.addEventListener('error', () => {
      dashboardModalImage.hidden = true;
      if (dashboardModalImagePlaceholder) dashboardModalImagePlaceholder.hidden = false;
    });
    dashboardModalViewport?.addEventListener('wheel', (event) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      const previousZoom = dashboardZoom;
      dashboardZoom = Math.max(1, Math.min(4, dashboardZoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)));
      if (dashboardZoom === 1) {
        dashboardPanX = 0;
        dashboardPanY = 0;
      } else {
        const bounds = dashboardModalViewport.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left - bounds.width / 2;
        const pointerY = event.clientY - bounds.top - bounds.height / 2;
        const zoomRatio = dashboardZoom / previousZoom;
        dashboardPanX = pointerX - (pointerX - dashboardPanX) * zoomRatio;
        dashboardPanY = pointerY - (pointerY - dashboardPanY) * zoomRatio;
        clampDashboardPan();
      }
      renderDashboardTransform();
    }, { passive: false });
    dashboardModalViewport?.addEventListener('pointerdown', (event) => {
      if (dashboardZoom <= 1 || event.button !== 0) return;
      dashboardDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      dashboardModalViewport.classList.add('is-dragging');
      dashboardModalViewport.setPointerCapture(event.pointerId);
    });
    dashboardModalViewport?.addEventListener('pointermove', (event) => {
      if (!dashboardDrag || dashboardDrag.pointerId !== event.pointerId) return;
      dashboardPanX += event.clientX - dashboardDrag.x;
      dashboardPanY += event.clientY - dashboardDrag.y;
      clampDashboardPan();
      dashboardDrag.x = event.clientX;
      dashboardDrag.y = event.clientY;
      renderDashboardTransform();
    });
    const endDashboardDrag = (event) => {
      if (!dashboardDrag || dashboardDrag.pointerId !== event.pointerId) return;
      dashboardDrag = null;
      dashboardModalViewport?.classList.remove('is-dragging');
    };
    dashboardModalViewport?.addEventListener('pointerup', endDashboardDrag);
    dashboardModalViewport?.addEventListener('pointercancel', endDashboardDrag);

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
    if (event.key === 'Escape' && reportFontDialog && !reportFontDialog.hidden) {
      closeReportFontDialog();
      return;
    }
    if (!dashboardModal || dashboardModal.hidden) return;
    if (event.key === 'Escape') closeDashboardModal();
    if (event.key === 'ArrowLeft') activeDashboardNavigate?.(-1);
    if (event.key === 'ArrowRight') activeDashboardNavigate?.(1);
  });
