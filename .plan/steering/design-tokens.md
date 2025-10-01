# PharmaTrust Design Token System

## Quick Start: Minimal Token Set (Recommended)

Use this ultra-simple token set for all UIs (web + mobile). It maps directly to your color semantics and includes only the basics you need.

### CSS Custom Properties (Web)
```css
:root {
  /* Brand & Status Colors */
  --color-primary: #2E86AB;   /* Medical Blue */
  --color-success: #28A745;   /* Safety Green */
  --color-warning: #FFC107;   /* Warning Orange */
  --color-error: #DC3545;     /* Critical Red */
  --color-neutral: #6C757D;   /* Neutral Gray */

  /* Surfaces & Text */
  --bg: #ffffff;
  --bg-muted: #f5f5f5;
  --text: #212121;
  --text-muted: var(--color-neutral);

  /* Spacing (8px base) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radius & Shadow */
  --radius: 8px;
  --shadow: 0 4px 12px rgba(0,0,0,0.08);
}

/* Minimal component mappings */
.btn-primary { background: var(--color-primary); color: #fff; border-radius: var(--radius); padding: 10px 14px; }
.btn-success { background: var(--color-success); color: #fff; }
.btn-warning { background: var(--color-warning); color: #212121; }
.btn-error   { background: var(--color-error); color: #fff; }

.badge-good         { background: rgba(40,167,69,0.12); color: var(--color-success); }
.badge-compromised  { background: rgba(220,53,69,0.12); color: var(--color-error); }
.badge-unknown      { background: rgba(108,117,125,0.12); color: var(--color-neutral); }
```

### Tailwind (Web) — Minimal Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#2E86AB',
        success: '#28A745',
        warning: '#FFC107',
        error:   '#DC3545',
        neutral: '#6C757D'
      },
      borderRadius: { DEFAULT: '8px' }
    }
  }
}
```

### React Native (Mobile) — Minimal Tokens
```ts
// mobile/styles/tokens.ts
export const tokens = {
  colors: {
    primary: '#2E86AB',
    success: '#28A745',
    warning: '#FFC107',
    error:   '#DC3545',
    neutral: '#6C757D',
    bg: '#ffffff',
    text: '#212121'
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: 8
};
```

Tip: Prefer semantic usage (primary/success/warning/error/neutral). Only use raw hex if absolutely necessary.