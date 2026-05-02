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
          teal:          '#1D9E75',
          'teal-dark':   '#158A63',
          'teal-button': '#107A58',
          'teal-light':  '#E8F7F2',
          navy:          '#1A2B4A',
          'navy-light':  '#2C3E6B',
          slate:         '#50647A',
          gold:          '#F5C842',
          purple:        '#5B2D8E',
          'purple-dark': '#4A2478',
          'purple-light':'#F0E8F9',
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
