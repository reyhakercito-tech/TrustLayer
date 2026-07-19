(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Paste your Google Apps Script "exec" URL here (see setup steps).
  const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxxd5hani_La71DSZ6jgm4CDnE6uq_JNpbhThRdqlYtDU9_hT0WS-_c5vRUQzCGw9cK/exec';

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

  /* ---------- Signature demo: one window, four states ----------
     This sequence IS the product explanation. The code block is
     the SAME element from state 1 through state 4 — it never gets
     torn down and rebuilt, it just mutates in place (dims, checks,
     loses a line). The only real "swap" in the whole sequence is
     the detour out to the prompt view and back, and even that is
     staged as a handoff rather than a flat crossfade. */
  const demoWindow = document.getElementById('demoWindow');

  if (demoWindow) {
    const demoLabel = document.getElementById('demoLabel');
    const demoReplay = document.getElementById('demoReplay');
    const demoFlow = document.getElementById('demoFlow');
    const demoFlowBar = document.getElementById('demoFlowBar');
    const flowSteps = Array.from(demoFlow.querySelectorAll('.demo-flow-step'));
    const viewCode = document.getElementById('demoViewCode');
    const viewPrompt = document.getElementById('demoViewPrompt');
    const contextLine = document.getElementById('demoContextLine');
    const codeEl = document.getElementById('demoCode');
    const codeLines = Array.from(codeEl.querySelectorAll('.d-line'));
    const flagFold = document.getElementById('demoFlagFold');
    const verdict = document.getElementById('demoVerdict');
    const verifiedBadge = document.getElementById('demoVerifiedBadge');
    const promptEl = document.getElementById('demoPrompt');

    const QUESTION_TEXT = 'Generate a Docker Compose configuration for Immich.';
    const META_TEXT = '→ corrected prompt sent back to the assistant';

    const LABELS = {
      1: 'AI assistant',
      2: 'TrustLayer — checking',
      3: 'TrustLayer — corrected prompt',
      4: 'AI assistant — verified',
    };

    const PROMPT_TEXT =
      'TrustLayer flagged IMMICH_CACHE_MODE — it isn\u2019t a documented Immich environment variable. Regenerate the Docker Compose file without it, using only variables listed in the official docs.';

    let timers = [];
    let idleTimer = null;
    const clearTimers = () => { timers.forEach((t) => window.clearTimeout(t)); timers = []; };
    const after = (ms, fn) => { timers.push(window.setTimeout(fn, ms)); };

    // Moves the underline beneath the active flow word — the only
    // "arrow" this diagram needs.
    function setFlowStep(step) {
      flowSteps.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.step) === step));
      const target = flowSteps[step - 1];
      const containerRect = demoFlow.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      demoFlowBar.style.width = `${targetRect.width}px`;
      demoFlowBar.style.transform = `translateX(${targetRect.left - containerRect.left}px)`;
    }

    // Updates the chrome (dot color, label, flow position) without
    // touching which view is visible — used whenever a state change
    // doesn't require swapping views at all (state 1 → state 2).
    function setPhase(n) {
      demoWindow.dataset.phase = String(n);
      demoLabel.textContent = LABELS[n];
      setFlowStep(n);
    }

    // Types the corrected-prompt sentence in natural word bursts —
    // deliberately not a per-character typewriter, closer to how a
    // generated answer actually streams in.
    function typePrompt(onDone) {
      const words = PROMPT_TEXT.split(' ');
      promptEl.textContent = '';
      const cursor = document.createElement('span');
      cursor.className = 'demo-prompt-cursor';
      promptEl.appendChild(cursor);

      let i = 0;
      const step = () => {
        if (i >= words.length) { cursor.remove(); onDone && onDone(); return; }
        const chunk = words.slice(i, i + (Math.random() > 0.6 ? 2 : 1)).join(' ') + ' ';
        cursor.insertAdjacentText('beforebegin', chunk);
        i += chunk.trim().split(' ').length;
        after(45 + Math.random() * 55, step);
      };
      step();
    }

    // Checks each line of the code in sequence — calm, one at a
    // time, ending on the single line that doesn't match the docs.
    function scanLines(onDone) {
      codeEl.classList.add('is-checking');
      codeLines.forEach((l) => l.classList.remove('d-checked'));

      let i = 0;
      const step = () => {
        if (i >= codeLines.length) { after(300, () => { verdict.classList.add('is-shown'); onDone && onDone(); }); return; }
        codeLines[i].classList.add('d-checked');
        i += 1;
        after(130, step);
      };
      after(300, step);
    }

    // The fix lands as an in-place mutation of the same block:
    // the flagged line retracts, the error tag gives way to the
    // verified one. Nothing here is a new screen.
    function applyFix() {
      flagFold.classList.add('is-collapsed');
      verdict.classList.remove('is-shown');
      after(350, () => verifiedBadge.classList.add('is-shown'));
    }

    // Swaps views as a two-step handoff (outgoing settles away,
    // then the incoming one arrives) instead of a flat crossfade —
    // used only for the one real detour in the sequence.
    function handoff(outgoing, incoming, gap, onDone) {
      outgoing.classList.remove('is-active');
      after(gap, () => { incoming.classList.add('is-active'); onDone && onDone(); });
    }

    function resetAll() {
      viewPrompt.classList.remove('is-active');
      viewCode.classList.add('is-active');
      codeEl.classList.remove('is-checking');
      codeLines.forEach((l) => l.classList.remove('d-checked'));
      flagFold.classList.remove('is-collapsed');
      verdict.classList.remove('is-shown');
      verifiedBadge.classList.remove('is-shown');
      contextLine.textContent = QUESTION_TEXT;
      contextLine.classList.remove('is-meta');
      promptEl.textContent = '';
    }

    function run() {
      clearTimers();
      window.clearTimeout(idleTimer);
      resetAll();

      setPhase(1);                                  // state 1 — the assistant answers, and it gets to sit there
      after(4100, () => {
        setPhase(2);                                // state 2 — TrustLayer checks it, same block, same window
        scanLines();
      });
      after(7700, () => {
        setPhase(3);
        handoff(viewCode, viewPrompt, 200, () => {   // state 3 — the one real detour
          after(150, () => typePrompt());
        });
      });
      after(11300, () => {
        setPhase(4);
        contextLine.textContent = META_TEXT;
        contextLine.classList.add('is-meta');
        handoff(viewPrompt, viewCode, 200, () => {   // state 4 — back to the same window, now correct
          applyFix();
        });
      });
      after(13500, () => {
        demoWindow.classList.add('is-done');
        scheduleIdleReplay();
      });
    }

    function scheduleIdleReplay() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(run, 30000);
    }

    if (prefersReducedMotion) {
      // Skip the sequence entirely — land on the calm, finished
      // state so it can just be read.
      resetAll();
      codeEl.classList.add('is-checking');
      codeLines.forEach((l) => l.classList.add('d-checked'));
      flagFold.classList.add('is-collapsed');
      verifiedBadge.classList.add('is-shown');
      contextLine.textContent = META_TEXT;
      contextLine.classList.add('is-meta');
      setPhase(4);
      demoWindow.classList.add('is-done');
    } else {
      run();
      demoWindow.addEventListener('click', () => { if (demoWindow.classList.contains('is-done')) run(); });
      demoReplay.addEventListener('click', (e) => { e.stopPropagation(); run(); });
      window.addEventListener('resize', () => setFlowStep(Number(demoWindow.dataset.phase)));
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
