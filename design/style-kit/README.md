# yongzu style kit

Style and interaction patterns extracted from the [조용주](https://yongzu.github.io) self-introduction site, packaged so they can be dropped into another project.

## Files

- `theme.css` — design tokens (colors, type, easing, shadow) as CSS custom properties on `:root`, plus the component classes.
- `interactions.js` — vanilla JS (no build step, no dependencies) exposing `window.StyleKit` factory functions for the parts that need JS: hover-reveal rows, the slide+blur accordion, the drawer, and the search dropdown.
- `example.html` — a minimal working demo of every pattern. Open it directly in a browser.

## Quick start

```html
<link rel="stylesheet" href="theme.css">
...
<script src="interactions.js"></script>
<script>
  StyleKit.createHoverReveal(document.querySelector('.reveal-list'));
  document.querySelectorAll('.accordion-block').forEach(StyleKit.createAccordion);
  StyleKit.createDrawer({ trigger, panel, closeBtn });
  StyleKit.createSearchDropdown({ shell, input, options });
</script>
```

Each pattern's markup shape is documented as a comment directly above its rules in `theme.css`.

## Re-skinning

Everything visual is a CSS custom property on `:root` in `theme.css` §1 — colors, font sizes, easing curves, shadow. Override them after the `<link>` (or edit in place) rather than touching the component rules.

## Font

The original site self-hosts Pretendard as a base64 `@font-face` so the page makes zero external requests. That embed is site-specific (large, one font weight) so it's not included here — `theme.css` just references `var(--font-sans)` with a system-font fallback chain. See the commented `@font-face` template at the bottom of `theme.css` if you want the same self-hosted approach; otherwise Pretendard is also available via public CDN (e.g. jsDelivr).

## Notes

- The accordion (`createAccordion`) measures the open target height a tick after `details.open = true` (and after `document.fonts.ready`), not immediately — this is what fixes a real bug in the source site where a first-time open could clip content and then snap it visible once the true layout settled.
- All animated interactions check `prefers-reduced-motion` and fall back to an instant toggle.
