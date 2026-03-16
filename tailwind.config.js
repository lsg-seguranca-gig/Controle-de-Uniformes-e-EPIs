module.exports = {
  content: ["./index.html", "./api/**/*.js"],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a2e',
        surface: '#16213e',
        panel: '#0f3460',
        accent: '#e94560',
        mint: '#53d8a8',
        warn: '#f5a623',
        light: '#e8e8e8',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};