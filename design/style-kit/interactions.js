/*
  yongzu style kit — interactions.js
  Extracted from the "조용주" self-introduction site.

  Plain vanilla JS, no build step, no dependencies. Exposes a few
  small factory functions on `window.StyleKit`. Each one is
  self-contained — call only the ones your markup uses.

    StyleKit.createHoverReveal(listEl)
      Wires up .reveal rows inside listEl (see theme.css §3): hover
      opens after a short delay (desktop, fine pointer only), click
      pins/unpins, focus opens, blur/leave closes. Only one
      unpinned row is open at a time.

    StyleKit.createAccordion(detailsEl)
      Wires up a single <details class="accordion-block"> (see
      theme.css §4) to slide-open/close with a height+opacity+blur
      WAAPI animation instead of the native instant toggle. Waits a
      tick + fonts.ready before measuring target height, so a late
      font swap or first-paint layout settle can't leave the
      animation short and the reveal from "popping" at the end.

    StyleKit.createDrawer({trigger, panel, closeBtn})
      Wires up a <dialog class="drawer"> (see theme.css §6) that
      slides in from the right with a blurring backdrop. `trigger`
      opens it, `closeBtn` / Escape / outside-click / backdrop-click
      close it.

    StyleKit.createSearchDropdown({shell, input, options})
      Shows `options` while `input` is focused/clicked, hides it on
      outside click/blur (theme.css §5).

  All animated paths respect prefers-reduced-motion (skip straight to
  the end state).
*/
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const settle = () => new Promise(r => setTimeout(r, 0));

  function createHoverReveal(listEl, { hoverDelay = 180, closeDelay = 150 } = {}) {
    if (!listEl) return;
    const states = [];
    listEl.querySelectorAll(':scope .reveal').forEach(details => {
      const summary = details.querySelector(':scope>.reveal-trigger');
      const content = details.querySelector(':scope>.reveal-content');
      if (!summary || !content) return;
      const s = { details, summary, pinned: false, wanted: false, hovered: false, timer: 0, animation: null };
      states.push(s);
      s.setOpen = open => {
        if (open === s.wanted) return;
        s.wanted = open;
        const style = details.open ? getComputedStyle(content) : null;
        const fromOpacity = style ? style.opacity : '0';
        const fromTransform = style ? style.transform : 'translateX(20px)';
        s.animation?.cancel();
        if (open) {
          states.forEach(other => { if (other !== s && other.wanted && !other.pinned) other.setOpen(false); });
          details.open = true;
        }
        if (reduce.matches || !content.animate) { details.open = open; return; }
        const anim = content.animate(
          [{ opacity: fromOpacity, transform: fromTransform },
           { opacity: open ? 1 : 0, transform: open ? 'translateX(0)' : 'translateX(20px)' }],
          { duration: open ? 340 : 240, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
        );
        s.animation = anim;
        anim.onfinish = () => { details.open = s.wanted; anim.cancel(); s.animation = null; };
      };
      const scheduleClose = () => {
        clearTimeout(s.timer);
        s.timer = setTimeout(() => {
          if (!s.pinned && !s.hovered && !details.contains(document.activeElement)) s.setOpen(false);
        }, closeDelay);
      };
      summary.addEventListener('click', e => {
        e.preventDefault();
        clearTimeout(s.timer);
        s.pinned = !s.pinned;
        s.setOpen(s.pinned);
      });
      details.addEventListener('pointerenter', e => {
        if (e.pointerType !== 'mouse' || !fine.matches) return;
        s.hovered = true;
        clearTimeout(s.timer);
        s.timer = setTimeout(() => s.setOpen(true), hoverDelay);
      });
      details.addEventListener('pointerleave', e => {
        if (e.pointerType === 'mouse') { s.hovered = false; scheduleClose(); }
      });
      summary.addEventListener('focus', () => { if (summary.matches(':focus-visible')) s.setOpen(true); });
      details.addEventListener('focusout', scheduleClose);
    });
    return {
      closeAll: () => states.forEach(s => { clearTimeout(s.timer); s.pinned = false; s.setOpen(false); }),
    };
  }

  function createAccordion(details, { openDuration = 380, closeDuration = 280 } = {}) {
    if (!details) return;
    const summary = details.querySelector(':scope>.accordion-trigger') || details.querySelector(':scope>summary');
    const content = details.querySelector(':scope>.accordion-content') || details.querySelector(':scope>.content');
    if (!summary || !content) return;
    let anim = null;
    summary.addEventListener('click', async e => {
      e.preventDefault();
      if (reduce.matches) { details.open = !details.open; return; }
      anim?.cancel();
      if (!details.open) {
        details.open = true;
        await Promise.all([fontsReady, settle()]);
        const target = content.scrollHeight;
        anim = content.animate(
          [{ height: '0px', opacity: 0, filter: 'blur(8px)' },
           { height: target + 'px', opacity: 1, filter: 'blur(0px)' }],
          { duration: openDuration, easing: 'cubic-bezier(.22,1,.36,1)' }
        );
        anim.onfinish = anim.oncancel = () => { content.style.height = ''; content.style.filter = ''; anim = null; };
      } else {
        const start = content.scrollHeight;
        anim = content.animate(
          [{ height: start + 'px', opacity: 1, filter: 'blur(0px)' },
           { height: '0px', opacity: 0, filter: 'blur(8px)' }],
          { duration: closeDuration, easing: 'cubic-bezier(.22,1,.36,1)' }
        );
        anim.onfinish = () => { details.open = false; content.style.height = ''; content.style.filter = ''; anim = null; };
        anim.oncancel = () => { content.style.height = ''; content.style.filter = ''; anim = null; };
      }
    });
  }

  function createDrawer({ trigger, panel, closeBtn }) {
    if (!trigger || !panel) return;
    function open() {
      panel.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      if (reduce.matches) { panel.classList.add('open'); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
    }
    function close() {
      if (!panel.open) return;
      if (reduce.matches) { panel.classList.remove('open'); panel.close(); return; }
      if (!panel.classList.contains('open')) { panel.close(); return; }
      panel.classList.remove('open');
      const onEnd = e => { if (e.target !== panel) return; panel.removeEventListener('transitionend', onEnd); panel.close(); };
      panel.addEventListener('transitionend', onEnd);
    }
    trigger.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    panel.addEventListener('cancel', e => { e.preventDefault(); close(); });
    panel.addEventListener('close', () => { panel.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); });
    panel.addEventListener('click', e => {
      const r = panel.getBoundingClientRect();
      if (e.target === panel && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) close();
    });
    return { open, close };
  }

  function createSearchDropdown({ shell, input, options }) {
    if (!shell || !input || !options) return;
    function show(open) {
      options.hidden = !open;
      input.setAttribute('aria-expanded', String(open));
    }
    input.addEventListener('focus', () => show(true));
    input.addEventListener('click', () => show(true));
    document.addEventListener('pointerdown', e => { if (!shell.contains(e.target)) show(false); });
    shell.addEventListener('focusout', e => { if (!shell.contains(e.relatedTarget)) show(false); });
    return { show };
  }

  window.StyleKit = { createHoverReveal, createAccordion, createDrawer, createSearchDropdown };
})();
