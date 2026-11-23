/** Tailwind compilado para css/tailwind.css (npm run build:css). */
module.exports = {
  content: ['./index.html', './js/**/*.mjs'],
  // Os utilitários dark: seguem o tema escolhido no app (classe .dark no <html>)
  darkMode: 'class',
  theme: { extend: {} },
  plugins: []
};
