/* Shared helpers for the offline demo */
window.LegalDemo = {
  readUser() {
    try {
      const stored = localStorage.getItem('legalAgentUser');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return { username: 'Jessie', displayName: 'Jessie', role: 'Administrator' };
  },
  requireLogin() {
    if (!localStorage.getItem('legalAgentUser')) {
      location.href = './login.html';
      return false;
    }
    return true;
  },
  logout() {
    localStorage.removeItem('legalAgentUser');
    location.href = './login.html';
  },
  initials(name) {
    const text = String(name || 'Guest').trim();
    const parts = text.split(/\s+/).filter(Boolean);
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : text.slice(0, 2).toUpperCase();
  },
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  async fetchWithTimeout(url, options = {}, timeoutMs = 1500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  },
  uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  },
  greeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  },

  /**
   * Keep conversation stream content clear of the floating bottom composer.
   * @param {Element|string|null} target stream element, a child node, or CSS selector
   * @param {{ behavior?: ScrollBehavior, force?: boolean }} [options]
   */
  revealConversationStream(target, options = {}) {
    const behavior = options.behavior || 'smooth';
    let focus = null;
    if (typeof target === 'string') focus = document.querySelector(target);
    else if (target && target.nodeType === 1) focus = target;
    else focus = document.querySelector('.content-card.is-conversation .cc-message-stream, .cc-conversation:not(.hidden) .cc-message-stream, .cc-message-stream');

    const stream = focus?.closest?.('.cc-message-stream') || (focus?.classList?.contains('cc-message-stream') ? focus : null);
    if (!stream || !stream.isConnected) return;

    const shell = stream.closest('.cc-conversation') || stream.parentElement;
    if (!shell || shell.offsetParent === null) return;

    const composer = shell.querySelector('.cc-composer-area');
    const inner = stream.querySelector('.cc-stream-inner') || stream;
    const space = Math.max(200, Math.ceil((composer?.getBoundingClientRect().height || 168) + 28));
    const spaceValue = `${space}px`;
    if (inner.style.getPropertyValue('--cc-composer-space') !== spaceValue) {
      inner.style.setProperty('--cc-composer-space', spaceValue);
    }
    stream.style.setProperty('--cc-composer-space', spaceValue);

    const rows = [...inner.querySelectorAll('.cc-assistant-row, .cc-user-row')].filter((row) => {
      if (row.classList.contains('hidden')) return false;
      const style = window.getComputedStyle(row);
      return style.display !== 'none' && style.visibility !== 'hidden' && row.getBoundingClientRect().height > 0;
    });
    const last = (focus && focus !== stream && rows.includes(focus) ? focus : null)
      || rows[rows.length - 1];
    if (!last) return;

    const streamRect = stream.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const composerTop = composer ? composer.getBoundingClientRect().top : streamRect.bottom;
    const safeBottom = composerTop - 12;
    const safeTop = streamRect.top + 10;
    const available = Math.max(120, safeBottom - safeTop);

    let delta = 0;
    if (lastRect.height <= available) {
      if (lastRect.bottom > safeBottom) delta = lastRect.bottom - safeBottom;
      else if (lastRect.top < safeTop) delta = lastRect.top - safeTop;
    } else if (lastRect.top < safeTop || lastRect.top > safeTop + 48) {
      // Tall result: pin its top into view so the generated block starts fully readable.
      delta = lastRect.top - safeTop;
    } else if (options.force && lastRect.bottom > safeBottom) {
      delta = Math.min(lastRect.bottom - safeBottom, lastRect.top - safeTop);
    }

    if (Math.abs(delta) < 2 && !options.force) return;
    const nextTop = Math.max(0, stream.scrollTop + delta);
    if (Math.abs(nextTop - stream.scrollTop) < 2) return;
    stream.scrollTo({ top: nextTop, behavior });
  },

  installConversationAutoScroll(root = document) {
    if (root.__ccAutoScrollInstalled) return;
    root.__ccAutoScrollInstalled = true;

    const timers = new WeakMap();
    const schedule = (stream, force) => {
      if (!stream) return;
      const prev = timers.get(stream);
      if (prev) cancelAnimationFrame(prev);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.revealConversationStream(stream, { behavior: force ? 'auto' : 'smooth', force: !!force });
        });
      });
      timers.set(stream, id);
    };

    const bindStream = (stream) => {
      if (!(stream instanceof Element) || stream.dataset.ccAutoScroll === '1') return;
      stream.dataset.ccAutoScroll = '1';

      const shell = stream.closest('.cc-conversation') || stream.parentElement;
      const composer = shell?.querySelector('.cc-composer-area');
      const mo = new MutationObserver(() => schedule(stream, false));
      mo.observe(stream, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'hidden']
      });

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => schedule(stream, false));
        ro.observe(stream);
        const inner = stream.querySelector('.cc-stream-inner');
        if (inner) ro.observe(inner);
        if (composer) ro.observe(composer);
      }

      schedule(stream, true);
    };

    const scan = () => {
      root.querySelectorAll('.cc-message-stream').forEach(bindStream);
    };

    scan();
    const rootMo = new MutationObserver(() => scan());
    rootMo.observe(root.body || root.documentElement || root, { childList: true, subtree: true });
    window.addEventListener('resize', () => {
      root.querySelectorAll('.cc-message-stream').forEach((stream) => schedule(stream, true));
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.LegalDemo.installConversationAutoScroll());
} else {
  window.LegalDemo.installConversationAutoScroll();
}
