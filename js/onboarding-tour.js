/**
 * Shared Youdao-style spotlight onboarding tour.
 * Usage:
 *   const host = LegalOnboarding.createModeHost({ getMode, setMode, closeModals, tours });
 *   host.autoStart(); // first visit per mode
 *   host.startCurrent(true); // restart from help
 */
(function (global) {
  const ROOT_ID = 'legal-onboarding-root';

  function readForceQuery() {
    try {
      const params = new URLSearchParams(location.search || '');
      return params.get('tour') === '1' || params.get('ob') === '1';
    } catch (_) {
      return false;
    }
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key) === '1';
    } catch (_) {
      return false;
    }
  }

  function storageSet(key) {
    try {
      localStorage.setItem(key, '1');
    } catch (_) {}
  }

  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'ob-tour-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Onboarding tour');
    root.hidden = true;
    root.innerHTML = `
      <div class="ob-tour-hole" data-ob-hole></div>
      <div class="ob-tour-tip" data-ob-tip data-placement="right">
        <h3 class="ob-tour-title" data-ob-title></h3>
        <p class="ob-tour-desc" data-ob-desc></p>
        <div class="ob-tour-actions">
          <button type="button" class="ob-tour-btn skip" data-ob-skip>Skip</button>
          <button type="button" class="ob-tour-btn next" data-ob-next>Next</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function computeLayout(el, preferred) {
    const pad = 8;
    const rect = el.getBoundingClientRect();
    const hole = {
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
      height: Math.min(window.innerHeight - 16, rect.height + pad * 2)
    };

    const tipW = Math.min(300, window.innerWidth - 32);
    const tipH = 168;
    const gap = 16;
    let placement = preferred || 'right';
    let top = hole.top;
    let left = hole.left + hole.width + gap;

    if (placement === 'right' && left + tipW > window.innerWidth - 12) placement = 'left';
    if (placement === 'left') left = hole.left - tipW - gap;
    if (placement === 'left' && left < 12) placement = 'bottom';
    if (placement === 'bottom') {
      top = hole.top + hole.height + gap;
      left = Math.min(Math.max(12, hole.left), window.innerWidth - tipW - 12);
    }
    if (placement === 'top') {
      top = hole.top - tipH - gap;
      left = Math.min(Math.max(12, hole.left), window.innerWidth - tipW - 12);
    }
    if (placement === 'right') {
      top = Math.min(Math.max(12, hole.top), window.innerHeight - tipH - 12);
      left = Math.min(hole.left + hole.width + gap, window.innerWidth - tipW - 12);
    }
    if (placement === 'left') {
      top = Math.min(Math.max(12, hole.top), window.innerHeight - tipH - 12);
      left = Math.max(12, hole.left - tipW - gap);
    }
    if (top + tipH > window.innerHeight - 12) top = Math.max(12, window.innerHeight - tipH - 12);
    if (top < 12) top = 12;

    const arrowTop = Math.min(Math.max(16, hole.top + hole.height / 2 - top - 6), tipH - 28);
    const arrowLeft = Math.min(Math.max(18, hole.left + hole.width / 2 - left - 6), tipW - 28);
    return { hole, tip: { top, left, placement, arrowTop, arrowLeft } };
  }

  function createModeHost(options) {
    const {
      getMode,
      setMode,
      closeModals,
      tours,
      delay = 600,
      modeWatch
    } = options;

    const root = ensureRoot();
    const holeEl = root.querySelector('[data-ob-hole]');
    const tipEl = root.querySelector('[data-ob-tip]');
    const titleEl = root.querySelector('[data-ob-title]');
    const descEl = root.querySelector('[data-ob-desc]');
    const skipBtn = root.querySelector('[data-ob-skip]');
    const nextBtn = root.querySelector('[data-ob-next]');

    let activeMode = null;
    let stepIndex = 0;
    let visible = false;
    let layoutTries = 0;
    let starting = false;
    let suppressModeWatch = false;

    function currentTour() {
      return tours[activeMode] || null;
    }

    function currentSteps() {
      const tour = currentTour();
      if (!tour) return [];
      return typeof tour.steps === 'function' ? tour.steps() : tour.steps || [];
    }

    function isTourDone(mode) {
      const tour = tours[mode];
      if (!tour) return true;
      return storageGet(tour.storageKey);
    }

    function shouldAutoStart(mode) {
      if (readForceQuery()) return true;
      return !isTourDone(mode);
    }

    function applyLayout(layout) {
      const { hole, tip } = layout;
      holeEl.style.top = `${hole.top}px`;
      holeEl.style.left = `${hole.left}px`;
      holeEl.style.width = `${hole.width}px`;
      holeEl.style.height = `${hole.height}px`;
      tipEl.style.top = `${tip.top}px`;
      tipEl.style.left = `${tip.left}px`;
      tipEl.style.setProperty('--ob-arrow-top', `${tip.arrowTop}px`);
      tipEl.style.setProperty('--ob-arrow-left', `${tip.arrowLeft}px`);
      tipEl.setAttribute('data-placement', tip.placement);
    }

    function renderCopy() {
      const steps = currentSteps();
      const step = steps[stepIndex] || steps[0];
      if (!step) return;
      const total = steps.length;
      titleEl.textContent = `${step.title} ${stepIndex + 1}/${total}`;
      descEl.textContent = step.desc || '';
      nextBtn.textContent = stepIndex >= total - 1 ? 'Done' : 'Next';
    }

    function layout() {
      if (!visible) return;
      const steps = currentSteps();
      const step = steps[stepIndex];
      if (!step) return;
      const el = document.querySelector(step.selector);
      if (!el || el.getBoundingClientRect().width < 2) {
        if (layoutTries < 24) {
          layoutTries += 1;
          setTimeout(layout, 80);
        }
        return;
      }
      layoutTries = 0;
      try {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (_) {}
      applyLayout(computeLayout(el, step.placement));
      renderCopy();
    }

    function hide() {
      visible = false;
      root.hidden = true;
      document.body.classList.remove('ob-tour-lock');
    }

    function finish(markComplete) {
      const tour = currentTour();
      hide();
      if (markComplete && tour) storageSet(tour.storageKey);
      activeMode = null;
      stepIndex = 0;
    }

    async function goStep(index) {
      const steps = currentSteps();
      if (!steps.length) return;
      stepIndex = Math.max(0, Math.min(index, steps.length - 1));
      layoutTries = 0;
      const step = steps[stepIndex];
      if (step && step.ensurePage && typeof setMode === 'function') {
        const modeNow = typeof getMode === 'function' ? getMode() : activeMode;
        if (modeNow !== step.ensurePage) {
          suppressModeWatch = true;
          try {
            await Promise.resolve(setMode(step.ensurePage));
            lastMode = step.ensurePage;
          } finally {
            suppressModeWatch = false;
          }
        }
      }
      renderCopy();
      requestAnimationFrame(() => requestAnimationFrame(layout));
    }

    async function start(mode, force) {
      const target = mode || (typeof getMode === 'function' ? getMode() : null);
      if (!target || !tours[target]) return;
      if (!force && !shouldAutoStart(target)) return;
      if (starting) return;
      starting = true;
      suppressModeWatch = true;
      try {
        if (typeof closeModals === 'function') closeModals();
        if (typeof setMode === 'function') await Promise.resolve(setMode(target));
        lastMode = target;
        activeMode = target;
        stepIndex = 0;
        layoutTries = 0;
        applyLayout({
          hole: { top: 0, left: 0, width: 0, height: 0 },
          tip: { top: 24, left: 24, placement: 'right', arrowTop: 22, arrowLeft: 24 }
        });
        renderCopy();
        visible = true;
        root.hidden = false;
        document.body.classList.add('ob-tour-lock');
        await goStep(0);
      } finally {
        suppressModeWatch = false;
        starting = false;
      }
    }

    function startCurrent(force) {
      const mode = typeof getMode === 'function' ? getMode() : Object.keys(tours)[0];
      return start(mode, !!force);
    }

    function next() {
      const steps = currentSteps();
      if (!steps.length) return;
      if (stepIndex >= steps.length - 1) {
        finish(true);
        return;
      }
      goStep(stepIndex + 1);
    }

    function skip() {
      finish(true);
    }

    function onResize() {
      if (visible) layout();
    }

    skipBtn.addEventListener('click', skip);
    nextBtn.addEventListener('click', next);
    window.addEventListener('resize', onResize);

    let lastMode = typeof getMode === 'function' ? getMode() : null;
    let modeTimer = null;

    function maybeAutoStartMode(mode) {
      if (!mode || !tours[mode]) return;
      if (!shouldAutoStart(mode)) return;
      if (visible && activeMode === mode) return;
      clearTimeout(modeTimer);
      modeTimer = setTimeout(() => start(mode, false), delay);
    }

    function onModeMaybeChanged() {
      if (suppressModeWatch || starting) {
        lastMode = typeof getMode === 'function' ? getMode() : lastMode;
        return;
      }
      const mode = typeof getMode === 'function' ? getMode() : null;
      if (!mode || mode === lastMode) return;
      lastMode = mode;
      if (visible) finish(false);
      maybeAutoStartMode(mode);
    }

    if (typeof modeWatch === 'function') {
      modeWatch(onModeMaybeChanged);
    }

    function autoStart() {
      const mode = typeof getMode === 'function' ? getMode() : Object.keys(tours)[0];
      lastMode = mode;
      clearTimeout(modeTimer);
      modeTimer = setTimeout(() => start(mode, false), delay);
    }

    function destroy() {
      clearTimeout(modeTimer);
      window.removeEventListener('resize', onResize);
      finish(false);
    }

    return {
      start,
      startCurrent,
      autoStart,
      next,
      skip,
      destroy,
      isVisible: () => visible
    };
  }

  global.LegalOnboarding = {
    createModeHost,
    readForceQuery
  };
})(window);
