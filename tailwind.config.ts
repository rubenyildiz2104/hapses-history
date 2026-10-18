import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        heritage: {
          50: '#fbfaf7',
          100: '#f5f3ec',
          200: '#eae4d5',
          300: '#dcd1b9',
          400: '#c5b493',
          500: '#a8946e',
          600: '#8c7755',
          700: '#705e43',
          800: '#5c4d39',
          900: '#4d4031',
          950: '#2a2219',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
