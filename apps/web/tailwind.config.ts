import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          emerald: '#10b981',
          sky: '#0ea5e9',
          slate: '#1e293b',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(16, 185, 129, 0.2), 0 40px 80px -40px rgba(16, 185, 129, 0.5)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
