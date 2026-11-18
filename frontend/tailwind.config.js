export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F8F5', surface: '#FFFFFF', raised: '#F7FAF8', hairline: '#DDE8E1',
        leaf: { DEFAULT: '#187A47', deep: '#105E35', soft: '#E8F5ED' },
        gold: '#B7791F', sky: '#3777A8', danger: '#C53D42', warn: '#B66B16', ok: '#187A47',
        ink: { DEFAULT: '#173126', muted: '#617269', faint: '#86948C' },
      },
      fontFamily: { sans: ['"Noto Sans"', '"Noto Sans Devanagari"', 'Inter', 'system-ui', 'sans-serif'] },
      fontSize: {
        body: ['16px', { lineHeight: '24px' }], lead: ['18px', { lineHeight: '27px' }],
        action: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        display: ['30px', { lineHeight: '38px', fontWeight: '750' }],
      },
      borderRadius: { card: '18px', pill: '999px' }, spacing: { tap: '56px' },
      boxShadow: { card: '0 10px 30px rgba(26, 73, 47, 0.07)' },
    },
  },
  plugins: [],
};
