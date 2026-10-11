import { defineConfig } from 'vitepress'
import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineConfig({
  lang: 'ja-JP',
  title: 'PallaSync Protocol',
  description: 'PallaSync Protocol 3.0仕様書とリレー運用者のプライバシー開示要件',

  // GitHub Project Pages:
  // https://<owner>.github.io/PallaSync-Protocol/
  base: '/PallaSync-Protocol/',

  lastUpdated: true,
  cleanUrls: true,

  async buildEnd({ srcDir, outDir }) {
    // Publish the canonical schema without maintaining a second source copy.
    await copyFile(join(srcDir, 'privacy.schema.json'), join(outDir, 'privacy.schema.json'))
  },

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: '仕様書 3.0', link: '/v3.0' },
      { text: 'プライバシー開示要件', link: '/privacy' },
      { text: '命名移行', link: '/NAMING-MIGRATION' },
      { text: 'Palleria', link: 'https://yunfi.f5.si/Palleria/' },
    ],

    sidebar: [
      {
        text: 'PallaSync Protocol',
        items: [
          { text: '概要', link: '/' },
          { text: 'PallaSync Protocol 3.0', link: '/v3.0' },
          { text: 'プライバシー開示要件', link: '/privacy' },
          { text: '命名移行', link: '/NAMING-MIGRATION' }
        ]
      },
      {
        text: '過去の仕様',
        collapsed: true,
        items: [
          { text: 'PallaSync Protocol 2.1', link: '/v2.1' },
          { text: 'PallaSync Protocol 2.0', link: '/v2' },
          { text: 'PallaSync Protocol 1.0', link: '/v1' }
        ]
      }
    ],

    outline: {
      level: [2, 4],
      label: 'ページ内目次'
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ'
    },

    lastUpdated: {
      text: '最終更新'
    },

    search: {
      provider: 'local'
    }
  }
})
