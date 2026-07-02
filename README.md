# Mainstreet Modern — Web Design Studio Site

A bold, warm, premium **Americana** marketing site for **Mainstreet Modern Web Design**.
Fully static — no frameworks, no build step — just clean HTML, CSS, and vanilla JavaScript.
It loads instantly, never breaks, and hosts anywhere for free.

> **Aesthetic — "Built on Main Street":** deep roasted ink, one loud marigold gold,
> warm cream paper, and a single deep-rust accent. Vintage fat-face display type,
> a hand-animated shop sign, and motion on everything that deserves it.

---

## Look & feel

| | |
|---|---|
| **Palette** | ink `#1A110B` · espresso `#2F1E16` · walnut `#3C261E` · marigold `#F5AE35` · cream `#F4ECD9` · parchment `#FAF5E9` · rust `#8A2E1D` (accent) |
| **Display font** | [Rozha One](https://fonts.google.com/specimen/Rozha+One) (Google Fonts) — high-contrast vintage display serif |
| **Body font** | [Satoshi](https://www.fontshare.com/fonts/satoshi) (Fontshare) — modern grotesque |

### Signature motion (all vanilla JS + CSS, all `prefers-reduced-motion`-safe)

- **Animated shop-sign hero** — the logo rebuilt as SVG + live type: the bracket slides in,
  the sign drops and swings on its chains (give it a hover to push it again), the wordmark
  letters rise. Parallax drifts it away as you scroll.
- **Rise stack** — the statement, marigold, and Recent Looks panels pin and envelop each other.
- **Scroll-jacked Recent Looks** — once the cream panel has risen to fill the screen, it pins and
  vertical scrolling drives the portfolio cards left→right (a progress rail tracks it); when the
  last card lands, the page releases and continues. Desktop + fine-pointer only — touch, keyboard,
  and reduced-motion get a normal swipeable/arrow carousel. Tune the feel via the panel's
  `min-height` (`.stack__panel--work.is-jack`, default `300vh`) in `site.css`.
- **Scroll-scrubbed manifesto** — pinned section where the words ignite one by one as you scroll,
  with gold italic emphasis.
- **Services ledger** — editorial numbered rows; a little illustrated "peek" card chases the
  cursor and swaps scenes per service.
- **Stacking process cards** — the four steps deal onto each other like a deck, earlier cards
  sinking and dimming.
- **Animated Main Street scene** — blinking windows, flickering OPEN neon, rippling awning,
  drifting clouds, chimney smoke, waving pennants, a cat with a swaying tail, and a tiny
  swinging MM sign.
- Plus: intro loader (once per session), page-wipe transitions between pages, custom cursor
  (dot + trailing ring), magnetic buttons, marquee band, count-up stats, word-rise headlines,
  giant footer wordmark with letter-lift hover.

---

## Pages

| File | What's on it |
|------|--------------|
| `index.html`   | Sign hero, rise-stack statement, work carousel, scrub manifesto + stats, marquee, services ledger, process stack, storefront CTA |
| `pricing.html` | Three pricing tiers, care plan, add-ons, FAQ accordion |
| `about.html`   | Story, manifesto, values |
| `contact.html` | Contact form (with validation), details, hours |

Shared assets:
- `assets/css/site.css` — the whole design system + page components
- `assets/js/site.js` — loader, wipes, cursor, scrub, carousel, form, accordion, everything
- `assets/img/favicon.svg` — the "M" mark

> The old `assets/img/logo-mainstreet.jpg` is no longer used — the hero logo is now drawn
> in SVG + real text, so it's crisp at any size and works on any background. If you get a
> transparent PNG later you can still swap it in, but you may not need to.

---

## Preview it locally

Open `index.html` in a browser, or run a tiny server in this folder:

```bash
python -m http.server 4321
# visit http://localhost:4321
```

---

## Things you'll want to change

Everything is plain text — open the `.html` files and edit. Most common spots:

1. **Your email** — `daviskapela@gmail.com` (search-and-replace across all four pages).
2. **Phone, hours, location** — in `contact.html`.
3. **Prices** — in `pricing.html` (the three `.tier` cards + add-ons).
4. **Portfolio** — the first two "Recent looks" cards point at your live Vercel projects;
   swap the placeholder cards for real ones as you launch more.
5. **Social links** — footer Instagram/Facebook links currently point to `#`.
6. **Your photo** — `about.html` uses an illustrated placeholder. To use a real photo,
   replace the `<svg>` inside `.portrait` with `<img src="assets/img/you.jpg" alt="Davis" />`.

---

## Make the contact form actually send

Right now the form **validates and shows a success message** but doesn't deliver mail yet
(a static site can't send email on its own). Two free options:

**Formspree (any host):** make a form at [formspree.io](https://formspree.io), then in
`contact.html` replace `action="REPLACE_WITH_FORMSPREE_ENDPOINT"` with your endpoint
(e.g. `action="https://formspree.io/f/abcd1234"`). The JS auto-detects the live endpoint.

**Netlify:** add `netlify` and `name="contact"` to the `<form>` tag.

---

## Put it online (free)

Static site — drag-and-drop deploys work:
- **Netlify** — drop this folder on [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel / Cloudflare Pages / GitHub Pages** — point at this folder

Then connect a custom domain (e.g. `mainstreetmodern.com`) in the host's dashboard.

---

## Build notes

- **Accessible:** semantic HTML, labeled controls, keyboard-friendly menu and ledger rows,
  full `prefers-reduced-motion` support (every animation switches off when requested).
- **Responsive:** great from a 320px phone to a wide desktop. Pinned/sticky effects fall
  back to simple stacked sections on small screens.
- **Fast:** one CSS file, one JS file, all illustrations are inline SVG.
- **Robust:** progressively enhanced — content is fully there even if JS doesn't load.
- The **intro loader** shows once per browser session; the **page wipe** covers navigations
  after that.
