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

  /* ---------- Dark mode toggle ----------
     The initial theme (saved choice, or system preference as a
     fallback) is already applied by the inline script in <head> —
     this only has to handle the user actually flipping it.

     Built on the native View Transitions API instead of a hand-
     rolled overlay: document.startViewTransition() has the browser
     capture the whole page as-is, run the callback below (which
     just flips data-theme), then capture the page again in its new
     state — both as plain images, composited by the GPU. Every real
     element's new color is already baked into that second snapshot,
     so there's no separate transition to desync from the reveal;
     wherever the wipe has reached is, by construction, already the
     right color underneath it.
     The reveal itself (see ::view-transition-new(root) in
     style.css) is a clip-path circle grown from the toggle's exact
     screen position out past the farthest corner — light→dark
     reads as dark spreading out of the button, dark→light reads as
     that same dark snapshot's circle collapsing back into it as
     the light one takes over beneath. One rule, both directions.
     Browsers without support (and reduced-motion) just flip
     instantly — no overlay, no fallback fade, nothing left over
     from the old system to clean up. */
  const THEME_KEY = 'trustlayer_theme';
  const themeToggle = document.getElementById('themeToggle');
  const supportsViewTransitions = typeof document.startViewTransition === 'function';

  function syncThemeToggleA11y(theme) {
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function persistTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      // localStorage unavailable — theme still applies for this visit, just won't persist.
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeToggleA11y(theme);
    persistTheme(theme);

    // El logo del nav ya cambia solo por CSS (data-theme). El favicon
    // no puede resolverse con CSS, así que se actualiza aquí, en el
    // mismo punto donde cambia todo lo demás ligado al tema.
    const favicon = document.getElementById('favicon');
    if (favicon) favicon.href = theme === 'dark' ? 'assets/Logo_Dark.svg' : 'assets/Logo_Light.svg';
  }

  if (themeToggle) {
    syncThemeToggleA11y(document.documentElement.getAttribute('data-theme') || 'light');

    let animating = false;

    themeToggle.addEventListener('click', () => {
      if (animating) return;
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';

      // No snapshot pair to wipe between under reduced motion, or on
      // a browser that doesn't support the API yet — just flip.
      if (prefersReducedMotion || !supportsViewTransitions) {
        applyTheme(next);
        return;
      }

      const root = document.documentElement;
      const rect = themeToggle.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      const maxRadius = Math.hypot(
        Math.max(originX, window.innerWidth - originX),
        Math.max(originY, window.innerHeight - originY)
      ) + 40;

      // Read by the @keyframes in style.css — the click point and
      // the distance the circle needs to travel to clear every
      // corner of the current viewport.
      root.style.setProperty('--reveal-x', `${originX}px`);
      root.style.setProperty('--reveal-y', `${originY}px`);
      root.style.setProperty('--reveal-r', `${maxRadius}px`);

      animating = true;
      // Arms the ::view-transition-new(root) animation in style.css
      // for the duration of this one transition only.
      root.classList.add('theme-transitioning');

      const transition = document.startViewTransition(() => {
        applyTheme(next);
      });

      // .finished settles after the animation completes (and also
      // if the transition is skipped/aborted for any reason), so
      // this is the one place that needs to clean up either way.
      transition.finished.finally(() => {
        root.classList.remove('theme-transitioning');
        animating = false;
      });
    });
  }

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
    const scanBar = codeEl.querySelector('.demo-scan-bar');
    const neutralLines = codeLines.filter((l) =>
      !l.classList.contains('d-line-warning') &&
      !l.classList.contains('d-line-success') &&
      !l.classList.contains('d-line-flaggable')
    );
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

    // The button is only visually reachable once the demo is done
    // (opacity/pointer-events are gated on .is-done in CSS) — keep
    // its keyboard reachability in sync with that instead of leaving
    // it permanently out of the tab order.
    function setReplayFocusable(focusable) {
      if (focusable) {
        demoReplay.removeAttribute('tabindex');
      } else {
        demoReplay.setAttribute('tabindex', '-1');
      }
    }

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

    // Ends a sweep cleanly: the band fades out while it's still
    // parked at the bottom of its pass (the keyframe's forwards
    // fill keeps it there), and only once it's fully invisible does
    // the animation itself get torn down and reset. That order is
    // what stops it from ever visibly snapping back to the top.
    function endScan(onFaded) {
      codeEl.classList.add('is-scan-done');
      scanBar.classList.remove('is-warning', 'is-error');
      after(520, () => {
        codeEl.classList.remove('is-checking', 'is-scan-done');
        onFaded && onFaded();
      });
    }

    // The scan bar sweeps once, at a fixed pace, top to bottom — a
    // single continuous pass, not a per-line loop. Every line gets
    // one brief, quiet lift in brightness the moment the light
    // passes over it — proportional to where it actually sits in
    // the block, not a flat interval. The three lines TrustLayer
    // has something to say about settle into a persistent color
    // instead: green (confirmed), amber (contradicts the docs), red
    // (not documented) — and for those two, the light itself warms
    // to that same color just ahead of the line, so the finding
    // reads as something the sweep discovered. The red finding
    // still gets real weight: the line turns red, then a genuine
    // pause, then the notice underneath.
    function scanLines(onDone) {
      codeEl.classList.add('is-checking');
      codeLines.forEach((l) => l.classList.remove('d-checked', 'is-lit'));
      verdictWarningRow.classList.remove('is-shown');
      verdictRow.classList.remove('is-shown');

      const successLine = codeEl.querySelector('.d-line-success');
      const errorLine = codeEl.querySelector('.d-line-flaggable');

      // Proportional to each neutral line's actual position in the
      // 2.4s sweep (index+0.5 of 9 total lines) — the same math the
      // amber/green/red moments below already use.
      const NEUTRAL_TIMES = [133, 400, 933, 1200, 2000, 2267];
      neutralLines.forEach((line, i) => {
        const t = NEUTRAL_TIMES[i];
        if (t == null) return;
        after(t, () => {
          line.classList.add('is-lit');
          after(420, () => line.classList.remove('is-lit'));
        });
      });

      after(500, () => scanBar.classList.add('is-warning'));   // the light warms before it reaches the line
      after(670, () => {
        warningLine && warningLine.classList.add('d-checked');
        after(260, () => verdictWarningRow.classList.add('is-shown'));   // the amber finding: exists, but contradicts the docs
      });
      after(950, () => scanBar.classList.remove('is-warning'));
      after(1470, () => successLine && successLine.classList.add('d-checked'));
      after(1580, () => scanBar.classList.add('is-error'));     // warms to red ahead of the flagged line too
      after(1730, () => {
        errorLine && errorLine.classList.add('d-checked');
        after(450, () => {                          // the pause that gives the finding weight
          verdictRow.classList.add('is-shown');     // grows in above the amber row and pushes it down — both stay up together
          endScan(onDone);
        });
      });
    }

    // Re-runs the same scan bar over the corrected block. It's the
    // same sweep as state 2, just restarted — proof the "verified"
    // badge is a second check, not a rubber stamp on the fix.
    function rescan(onDone) {
      codeEl.classList.remove('is-checking', 'is-scan-done');
      void codeEl.offsetWidth;               // force a reflow so the keyframe animation replays
      codeEl.classList.add('is-checking');
      after(2400, () => endScan(onDone));
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
      codeEl.classList.remove('is-checking', 'is-scan-done');
      scanBar.classList.remove('is-warning', 'is-error');
      codeLines.forEach((l) => l.classList.remove('d-checked', 'is-lit'));
      flagFold.classList.remove('is-collapsed');
      imageTag.textContent = ORIGINAL_TAG;
      codeCursor.classList.remove('is-visible');
      verdictWarningRow.classList.remove('is-shown');
      verdictRow.classList.remove('is-shown');
      verdictSuccessRow.classList.remove('is-shown');
      demoWindow.classList.remove('is-rechecking', 'is-done');
      contextLine.textContent = QUESTION_TEXT;
      contextLine.classList.remove('is-meta');
      promptEl.textContent = '';
      setReplayFocusable(false);

      // The lines' write-in (lineIn) is a CSS keyframe animation tied
      // to a selector match that's already true by the time a replay
      // happens (the code view is still .is-active from the previous
      // cycle) — so just clearing state above leaves every line
      // sitting at its finished opacity:1 position and the animation
      // never fires again. Briefly clearing animation inline, forcing
      // a reflow, then handing control back to the stylesheet is what
      // makes the browser treat it as a brand new animation, so the
      // "typing" effect genuinely replays instead of the lines just
      // appearing pre-written.
      codeLines.forEach((l) => { l.style.animation = 'none'; });
      void codeEl.offsetWidth; // force reflow
      codeLines.forEach((l) => { l.style.animation = ''; });
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
        setReplayFocusable(true);
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
    } else {
      run();
      demoReplay.addEventListener('click', () => run());
      window.addEventListener('resize', () => setFlowStep(Number(demoWindow.dataset.phase)));

      // setTimeout doesn't pause in a backgrounded tab — it throttles
      // and batches instead, so returning to the tab could previously
      // fire several queued phase changes at once and leave two states
      // visually overlapping. The instant the tab goes to background,
      // cancel every pending timer AND snap the window back to a
      // clean baseline (not just stop scheduling more changes) — so
      // there's nothing left mid-transition to resume badly. The
      // instant it's visible again, start clean from the top.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clearTimers();
          window.clearTimeout(idleTimer);
          resetAll();
        } else {
          run();
        }
      });
    }

    /* ---------- Glass sheen: a soft light that follows the cursor ----------
       Purely decorative, so it gets the same treatment as every other
       cosmetic motion on this page: skipped outright under reduced
       motion rather than just sped up. Position updates are batched
       through requestAnimationFrame so a fast mouse move never writes
       to the DOM more than once per paint. */
    const sheen = document.getElementById('demoSheen');
    if (sheen && !prefersReducedMotion) {
      let sheenFrame = null;
      let pendingX = 50;
      let pendingY = 38;

      const paintSheen = () => {
        sheenFrame = null;
        demoWindow.style.setProperty('--sheen-x', `${pendingX}%`);
        demoWindow.style.setProperty('--sheen-y', `${pendingY}%`);
      };

      demoWindow.addEventListener('mousemove', (e) => {
        const rect = demoWindow.getBoundingClientRect();
        pendingX = ((e.clientX - rect.left) / rect.width) * 100;
        pendingY = ((e.clientY - rect.top) / rect.height) * 100;
        if (sheenFrame === null) sheenFrame = requestAnimationFrame(paintSheen);
      });

      demoWindow.addEventListener('mouseenter', () => demoWindow.classList.add('is-hovering'));
      demoWindow.addEventListener('mouseleave', () => demoWindow.classList.remove('is-hovering'));
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
