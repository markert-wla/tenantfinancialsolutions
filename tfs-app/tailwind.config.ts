import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tfs: {
          teal:        '#1D9E75',
          'teal-dark': '#158A63',
          'teal-light':'#E8F7F2',
          navy:        '#1A2B4A',
          'navy-light':'#2C3E6B',
          slate:       '#6B7E8F',
          gold:        '#F5C842',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
