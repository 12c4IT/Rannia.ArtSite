// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Static brochure site (Stage 1). No SSR adapter.
  output: 'static',
  // Placeholder until branding/domain is decided — used by @astrojs/sitemap
  // and any absolute-URL generation. Swap before deploy.
  site: 'https://example.com',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap()]
});