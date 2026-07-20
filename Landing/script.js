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
    const warningLine = codeEl.querySelector('.d-line-warning');
    const imageTag = document.getElementById('demoImageTag');
    const codeCursor = document.getElementById('demoCodeCursor');
    const verdictWarningRow = document.getElementById('demoVerdictWarningRow');
    const verdictRow = document.getElementById('demoVerdictRow');
    const verdictSuccessRow = document.getElementById('demoVerdictSuccessRow');
    const promptEl = document.getElementById('demoPrompt');

    const QUESTION_TEXT = 'Generate a Docker Compose configuration for Immich.';
    const META_TEXT = '→ corrected prompt sent back to the assistant';
    const ORIGINAL_TAG = 'ghcr.io/immich-app/immich-server:release';
    const PINNED_TAG = 'ghcr.io/immich-app/immich-server:v1.118.0';

    const LABELS = {
      1: 'AI assistant',
      2: 'TrustLayer — checking',
      3: 'TrustLayer — corrected prompt',
      4: 'AI assistant — verified',
    };

    const PROMPT_TEXT =
      'TrustLayer flagged two issues: IMMICH_CACHE_MODE isn\u2019t a documented Immich environment variable, and the \u2019:release\u2019 image tag contradicts the docs\u2019 guidance to pin an explicit version. Regenerate the Docker Compose file without the invalid variable, with a pinned image tag, using only what the official docs list.';

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
    // generated answer actually streams in. Mostly single words with
    // an occasional two-word burst, and a slower, less regular pace
    // than a flat interval — closer to how tokens actually arrive.
    function typePrompt(onDone) {
      const words = PROMPT_TEXT.split(' ');
      promptEl.textContent = '';
      const cursor = document.createElement('span');
      cursor.className = 'demo-prompt-cursor';
      promptEl.appendChild(cursor);

      let i = 0;
      const step = () => {
        if (i >= words.length) { cursor.remove(); onDone && onDone(); return; }
        const chunk = words.slice(i, i + (Math.random() > 0.78 ? 2 : 1)).join(' ') + ' ';
        cursor.insertAdjacentText('beforebegin', chunk);
        i += chunk.trim().split(' ').length;
        after(70 + Math.random() * 85, step);
      };
      step();
    }

    // The scan bar sweeps once, at a fixed pace, top to bottom — a
    // single continuous pass, not a per-line loop. While it travels,
    // nothing happens. Only the three lines TrustLayer has something
    // to say about change color, at the moment the bar reaches them:
    // green (confirmed), amber (contradicts the docs), red (not
    // documented). The red finding gets real weight — the line turns
    // red, then there's a genuine pause before the notice underneath
    // appears, instead of both landing in the same instant.
    function scanLines(onDone) {
      codeEl.classList.add('is-checking');
      codeLines.forEach((l) => l.classList.remove('d-checked'));
      verdictWarningRow.classList.remove('is-shown');
      verdictRow.classList.remove('is-shown');

      const successLine = codeEl.querySelector('.d-line-success');
      const errorLine = codeEl.querySelector('.d-line-flaggable');

      after(670, () => {
        warningLine && warningLine.classList.add('d-checked');
        after(260, () => verdictWarningRow.classList.add('is-shown'));   // the amber finding: exists, but contradicts the docs
      });
      after(1470, () => successLine && successLine.classList.add('d-checked'));
      after(1730, () => {
        errorLine && errorLine.classList.add('d-checked');
        after(450, () => {                          // the pause that gives the finding weight
          verdictRow.classList.add('is-shown');     // grows in above the amber row and pushes it down — both stay up together
          codeEl.classList.remove('is-checking');   // sweep's done its pass — fade the bar out, don't leave it parked
          onDone && onDone();
        });
      });
    }

    // Re-runs the same scan bar over the corrected block. It's the
    // same sweep as state 2, just restarted — proof the "verified"
    // badge is a second check, not a rubber stamp on the fix.
    function rescan(onDone) {
      codeEl.classList.remove('is-checking');
      void codeEl.offsetWidth;               // force a reflow so the keyframe animation replays
      codeEl.classList.add('is-checking');
      after(2400, () => {
        codeEl.classList.remove('is-checking'); // second pass is done too — bar fades out before the verified badge lands
        onDone && onDone();
      });
    }

    // The fix lands as an in-place mutation of the same block: the
    // flagged line retracts, the image tag gets pinned, both findings
    // clear — then TrustLayer actually re-scans the result before the
    // verified badge appears, rather than just asserting it's fixed.
    function applyFix() {
      flagFold.classList.add('is-collapsed');
      verdictRow.classList.remove('is-shown');       // safety net — normally already cleared before the phase-3 handoff
      verdictWarningRow.classList.remove('is-shown'); // (see run()) so nothing is left mid-fade to flash back into view here
      imageTag.textContent = PINNED_TAG;
      warningLine && warningLine.classList.remove('d-checked');
      after(500, () => {
        rescan(() => {
          demoWindow.classList.remove('is-rechecking');
          demoLabel.textContent = LABELS[4];
          verdictSuccessRow.classList.add('is-shown');
        });
      });
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
      imageTag.textContent = ORIGINAL_TAG;
      codeCursor.classList.remove('is-visible');
      verdictWarningRow.classList.remove('is-shown');
      verdictRow.classList.remove('is-shown');
      verdictSuccessRow.classList.remove('is-shown');
      demoWindow.classList.remove('is-rechecking');
      contextLine.textContent = QUESTION_TEXT;
      contextLine.classList.remove('is-meta');
      promptEl.textContent = '';
    }

    function run() {
      clearTimers();
      window.clearTimeout(idleTimer);
      resetAll();

      // Every gap below is deliberate: the assistant needs a beat to
      // "think" before it writes, and every state needs a genuine
      // pause after it settles so the sequence reads at the speed a
      // person actually reads, not the speed an animation plays.

      setPhase(1);                                    // state 1 — thinks, writes (staggered, not uniform), then sits
      after(3200, () => codeCursor.classList.add('is-visible')); // a brief live-cursor beat once the last line lands
      after(5600, () => {                              // ≈0.75s think + ≈2.4s writing + ≈2.5s to actually read it
        setPhase(2);                                   // state 2 — TrustLayer checks it, same block, same window
        codeCursor.classList.remove('is-visible');
        scanLines();
      });
      after(10800, () => {                             // ≈2.5s scanning (amber finding, then red) + pause to read it
        setPhase(3);
        verdictRow.classList.remove('is-shown');        // clear both findings now, while they fade out together with
        verdictWarningRow.classList.remove('is-shown'); // the code view itself — nothing left lingering to flash later
        handoff(viewCode, viewPrompt, 250, () => {      // state 3 — the one real detour
          after(400, () => typePrompt());               // a small beat before it starts "writing" the fix
        });
      });
      after(16000, () => {                             // ≈2.5s typing + ≈2.7s pause to read the corrected prompt
        setPhase(4);
        demoWindow.classList.add('is-rechecking');      // dot goes violet again — this is a real second pass
        demoLabel.textContent = 'TrustLayer — re-verifying';
        contextLine.textContent = META_TEXT;
        contextLine.classList.add('is-meta');
        handoff(viewPrompt, viewCode, 250, () => {      // state 4 — back to the same window, now corrected
          applyFix();                                   // ≈0.5s settle + ≈2.4s re-scan before it's declared clean
        });
      });
      after(20200, () => {                              // a hold on the verified result before it's "done"
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
      codeLines.forEach((l) => l.classList.add('d-checked'));
      warningLine && warningLine.classList.remove('d-checked'); // already fixed in this end state
      imageTag.textContent = PINNED_TAG;
      flagFold.classList.add('is-collapsed');
      verdictSuccessRow.classList.add('is-shown');
      contextLine.textContent = META_TEXT;
      contextLine.classList.add('is-meta');
      setPhase(4);
      demoWindow.classList.add('is-done');
    } else {
      run();
      demoWindow.addEventListener('click', () => { if (demoWindow.classList.contains('is-done')) run(); });
      demoReplay.addEventListener('click', (e) => { e.stopPropagation(); run(); });
      window.addEventListener('resize', () => setFlowStep(Number(demoWindow.dataset.phase)));

      // setTimeout doesn't pause in a backgrounded tab — it throttles
      // and batches instead, so returning to the tab could previously
      // fire several queued phase changes at once and leave two states
      // visually overlapping. Cancel everything the instant the tab
      // goes to background, and start clean the instant it comes back,
      // rather than trying to resume mid-sequence.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clearTimers();
          window.clearTimeout(idleTimer);
        } else {
          run();
        }
      });
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
