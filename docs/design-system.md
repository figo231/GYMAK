# GYMAK design system (volt + ember, dark only)

Default look is `html.ath.pro-ui`. `?ui=classic` is the emergency opt-out. `?accent=volt|ember|blue|red|purple|gold|teal` previews accents.

- Font: GymakSans (IBM Plex Sans Arabic, self-hosted woff2 in public/plex-*.woff2). No system or web fonts.
- Colors: background near-black (#07080a), cards `.glass` (#101217, 1px soft border), ember accent #ff6a13 / #ff8a3d, text white, secondary text var(--text-secondary).
- Radius: cards 18-22px, buttons and chips 12-16px, pills fully round.
- Spacing: 12px between cards, 14px card padding, 390px wide mobile first.
- Buttons: `.btn.btn-primary` is the ember gradient. Secondary buttons are transparent with a soft border. The global `a.btn` rule wins over single-class styles, so new selectors go under `html.ath.pro-ui` and may need `!important`.
- Toggles: `.switch` (knob moves right when on).
- New CSS lives in src/styles/athletic.css. Check every screen at 390px in dark before committing.
- Rules: Arabic (Egyptian) copy, Latin digits for numbers, dates use the local day (src/lib/dateKey.js), no emoji in UI text (they render as boxes in some fonts), nothing is deleted without an undo or a confirm.
