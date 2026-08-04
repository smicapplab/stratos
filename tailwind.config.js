/** @type {import('tailwindcss').Config} */
const tagColors = ['blue', 'red', 'emerald', 'amber', 'purple', 'pink', 'zinc'];
const safelist = tagColors.flatMap(color => [
  `bg-${color}-500/10`,
  `text-${color}-600`,
  `dark:text-${color}-400`,
  `border-${color}-500/20`,
  `bg-${color}-500`,
  `text-${color}-700`,
  `dark:text-${color}-300`,
]);

export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  safelist,
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'rgb(var(--color-brand-primary) / <alpha-value>)',
          accent: 'rgb(var(--color-brand-accent) / <alpha-value>)',
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
