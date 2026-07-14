import type { MetadataRoute } from 'next'

/**
 * Web app manifest. Single, non-localized document — uses the brand name and the
 * warm-paper theme of the shipped light theme. Icons reference the scalable
 * `app/icon.svg`; a full multi-size icon pack is deferred post-MVP.
 *
 * @returns {MetadataRoute.Manifest} The web app manifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lazy Lands',
    short_name: 'Lazy Lands',
    description: 'Campaign Companion for Dungeon Masters',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2ECE0',
    theme_color: '#F2ECE0',
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
    ],
  }
}
