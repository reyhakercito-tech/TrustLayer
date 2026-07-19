(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Paste your Google Apps Script "exec" URL here (see setup steps).
  const SHEET_ENDPOINT = 'https acabado en /exec';

  /* ---------- Nav blur on scroll ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 12) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Nav CTA scrolls to hero CTA ---------- */
  document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  });

  /* ---------- Generic accordion behaviour (top-level + FAQ) ---------- */
  function wireAccordion(itemSelector, triggerSelector) {
    document.querySelectorAll(itemSelector).forEach((item) => {
      const trigger = item.querySelector(triggerSelector);
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const isOpen = item.hasAttribute('data-open');
        if (isOpen) {
          item.removeAttribute('data-open');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          item.setAttribute('data-open', '');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  wireAccordion('.accordion-item', '.accordion-trigger');
  wireAccordion('.faq-item', '.faq-trigger');

  /* ---------- Waitlist inline form ---------- */
  const ctaWrap = document.getElementById('hero-cta');
  const ctaButton = document.getElementById('ctaButton');
  const waitlistForm = document.getElementById('waitlistForm');
  const waitlistCancel = document.getElementById('waitlistCancel');
  const waitlistEmail = document.getElementById('waitlistEmail');

  const STORAGE_KEY = 'trustlayer_waitlist_joined';
  const navCta = document.getElementById('navCta');

  function setJoinedState(customText = 'On the waitlist ✓') {
    ctaButton.textContent = customText;
    ctaButton.classList.add('joined');
    ctaButton.disabled = true;
    ctaWrap.classList.remove('open');
    ctaWrap.classList.add('success');

    if (navCta) {
      navCta.textContent = customText;
      navCta.classList.add('joined');
    }
  }

  // Returning visitor who already joined: skip straight to the joined state.
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
      setJoinedState();
    }
  } catch (err) {
    // localStorage unavailable (private mode, blocked cookies, etc.) — form still works, just won't persist.
  }

  ctaButton.addEventListener('click', () => {
    if (ctaButton.classList.contains('joined')) return;
    ctaWrap.classList.add('open');
    window.setTimeout(() => waitlistEmail.focus(), 350);
  });

  waitlistCancel.addEventListener('click', () => {
    ctaWrap.classList.remove('open');
  });

  waitlistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!waitlistEmail.checkValidity()) {
      waitlistEmail.focus();
      return;
    }

    const submitBtn = waitlistForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';
    }

    const payload = new URLSearchParams();
    payload.append('email', waitlistEmail.value.trim());

    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      body: payload
    })
    .then(response => response.json())
    .then(data => {
      try {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } catch (err) {}

      if (data.status === 'duplicate') {
        // En lugar de una alerta, cambiamos el botón visualmente
        setJoinedState('Already on the waitlist ✓');
      } else {
        setJoinedState('On the waitlist ✓');
      }
    })
    .catch((err) => {
      console.error(err);
      try {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } catch (e) {}
      setJoinedState();
    });
  });

  /* ---------- Signature verify-card loop ---------- */
  const verifyCard = document.querySelector('.verify-card');
  if (verifyCard) {
    const states = ['error', 'warning', 'verified'];
    if (prefersReducedMotion) {
      verifyCard.dataset.state = 'verified';
    } else {
      let i = 0;
      const cycle = () => {
        i = (i + 1) % states.length;
        verifyCard.dataset.state = states[i];
      };
      // first change happens after the hero settles, then loops
      window.setTimeout(() => {
        cycle();
        window.setInterval(cycle, 2600);
      }, 1600);
    }
  }

  /* ---------- Scroll reveal for sections ---------- */
  const revealTargets = document.querySelectorAll('.social-proof, .accordion-item, .footer');
  revealTargets.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in-view'));
  }
})();
