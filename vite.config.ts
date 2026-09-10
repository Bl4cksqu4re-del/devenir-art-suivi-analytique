import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // En dev, on sert à la racine ; le build (utilisé pour GitHub Pages) est
  // servi sous /devenir-art-suivi-analytique/ — le manifest PWA utilise des
  // chemins relatifs donc il s'adapte automatiquement aux deux cas.
  base: command === 'serve' ? '/' : '/devenir-art-suivi-analytique/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg', 'reference-budget.json'],
      manifest: {
        name: "devenir·art — Suivi analytique",
        short_name: 'Suivi devenir·art',
        description: "Suivi budgétaire analytique de devenir·art (Prévisionnel/Réalisé par action) — pilotage interne, hors comptabilité officielle.",
        lang: 'fr',
        start_url: '.',
        display: 'standalone',
        background_color: '#fafaf8',
        theme_color: '#2f6f4e',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,ico}'],
      },
    }),
  ],
}))
