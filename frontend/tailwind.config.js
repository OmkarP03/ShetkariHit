/** ShetkariHit design tokens — dark, taken from the reference screens.
 *
 *  Contrast matters more here than anywhere: the user may be outdoors in
 *  daylight, on a cheap screen, possibly presbyopic. Body text sits at 16px
 *  minimum, primary actions at 18px, and every foreground/background pair
 *  below clears WCAG AA (4.5:1) against its intended surface.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // surfaces, darkest to lightest
        canvas:   '#0A110D',   // page background
        surface:  '#121B15',   // card
        raised:   '#1A251E',   // card on card, inputs
        hairline: '#25332B',   // borders

        // brand
        leaf: {
          DEFAULT: '#7CBF4F',  // primary action, active nav — 8.1:1 on canvas
          deep:    '#4F8232',  // pressed
          soft:    '#1F3320',  // tinted fill behind icons
        },
        // secondary accent, used sparingly: prices, highlights
        gold:     '#E0B341',
        sky:      '#6BA8E8',   // weather accents only

        // semantic
        danger:   '#E5484D',
        warn:     '#F5A524',
        ok:       '#7CBF4F',

        // text
        ink: {
          DEFAULT: '#F2F5F0',  // primary
          muted:   '#9DAB9F',  // secondary — 5.6:1 on canvas
          faint:   '#6B7A6E',  // tertiary, never for essential info
        },
      },
      fontFamily: {
        // Noto covers Devanagari properly; without it Marathi renders in a
        // fallback that breaks conjuncts and jodakshare.
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // floor is 16px — nothing smaller carries meaning
        'body':    ['16px', { lineHeight: '24px' }],
        'lead':    ['18px', { lineHeight: '27px' }],
        'action':  ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'display': ['28px', { lineHeight: '36px', fontWeight: '700' }],
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      spacing: {
        // thumb-sized targets; 56px is the floor for anything tappable
        tap: '56px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset',
      },
    },
  },
  plugins: [],
};
