# MiBarra — Access flow (welcome, sign in, sign up, guest)

These 8 screens are the entry flow for MiBarra. They join the 21 screens in the earlier `mibarra-design` handoff and use the same design tokens, fonts and conventions (see that README).

- `*.dc.html` files are design source: HTML with inline styles plus a small `class Component` script with sample data and interactions. They reference `./support.js` (the design canvas runtime), so they won't render on their own. Read them as source.
- `<a href="X.dc.html">` = navigate to screen X. `{{name}}` is filled in by `renderVals()`.
- Language: Spanish. Phone numbers use Honduras (+504).

## The flow

```
Welcome ──► Crear cuenta ───► SignUp ──► Home
        ├─► Ya tengo cuenta ─► SignIn ──► Home
        └─► Invitado ────────► Guest ───► Home
```

- **Guest is always one tap away:** the Welcome screen has its own guest button, and Sign in / Sign up both have "Omitir" (mobile, top right) or "Continuar como invitado" (web header + bottom links).
- **Switching between them:** Sign in ↔ Sign up link to each other, and Guest has "Mejor crear cuenta".
- **Destination after any path:** mobile `Main.dc.html`, web `WebHome.dc.html` (from the first handoff).

## Screens

### Mobile — `mobile/`, 390 × 844

| # | File | Screen | What it shows | Requirements |
|---|---|---|---|---|
| A1 | `Welcome.dc.html` | Welcome | Brand color screen, MiBarra logo, headline "Tu café, listo cuando llegas.", three benefits, buttons: Crear cuenta / Ya tengo cuenta / Continuar como invitado | ACC-02 |
| A2 | `SignIn.dc.html` | Sign in | Phone or email tabs (working), password with show/hide (working), remember-me, forgot password, Google/Apple, links to sign up and guest. Tweak `showError` shows the wrong-credentials state | ACC-03, ACC-05 (Full), ACC-08 (Full) |
| A3 | `SignUp.dc.html` | Sign up | Benefit chips, name, phone or email tabs, password + strength meter, terms checkbox that enables/disables the button (working), links to sign in and guest | ACC-01, NFR-15 |
| A4 | `Guest.dc.html` | Continue as guest | Name (required) + phone (optional, for WhatsApp), what guests can and can't do, note that the first order's stamp is kept if they sign up later | ACC-02, NOT-03 |

### Web — `web/`, fluid page designed at 1440 wide (stacks on phones)

| # | File | Screen | What it shows |
|---|---|---|---|
| WA1 | `WebWelcome.dc.html` | Welcome | Split layout: brand panel with headline on the left, three choice cards on the right (create account, sign in, guest) |
| WA2 | `WebSignIn.dc.html` | Sign in | Header with "Continuar como invitado", centered card with the same form and states as A2 |
| WA3 | `WebSignUp.dc.html` | Sign up | Benefits column + form card, same fields and behavior as A3 |
| WA4 | `WebGuest.dc.html` | Continue as guest | Name + phone form with two actions, side panel listing what guests can and can't do, stamp note |

## Implementation notes

- **Guest session:** create an anonymous session (e.g. Supabase anonymous sign-in) holding the name and optional phone. Orders work normally; stamps and history are not tied to an account.
- **Claiming the first stamp:** if a guest signs up later on the same device, link their anonymous orders to the new account and credit the stamp for the most recent collected order. This is a product decision worth confirming, and it isn't in the MVP plan yet.
- **When to show Welcome:** first launch only. Returning users with a saved session go straight to Home, and guests return to Home with their guest name.
- **Checkout for guests:** the existing `Login.dc.html` (sign up at checkout) should also offer "Continuar como invitado" that goes to the guest form, so the rule "never force registration" holds everywhere.
- **Validation:** check phone format (8 digits after +504), password minimum 8 characters, and the terms checkbox is required for sign-up. Guest name is required and phone is optional.

## Suggested Claude Code prompt

> Read `design/access/README.md` and the screens in `design/access/mobile` and `design/access/web`. Build the access flow for the MiBarra Expo app: Welcome → Sign in / Sign up / Continue as guest, all ending at the Home screen. Guests use an anonymous Supabase session with a name and optional phone. Match the layout, colors and Spanish copy in the files, and reuse the shared theme.
