import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ja-JP',
  title: 'PallaSync Protocol',
  description: 'PallaSync Protocol specification',

  // GitHub Project Pages:
  // https://<owner>.github.io/PallaSync-Protocol/
  base: '/PallaSync-Protocol/',

  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: '仕様書', link: '/PALLASYNC-PROTOCOL' },
      { text: '命名移行', link: '/NAMING-MIGRATION' }
    ],

    sidebar: [
      {
        text: 'PallaSync Protocol',
        items: [
          { text: '概要', link: '/' },
          { text: '仕様書 1.0', link: '/PALLASYNC-PROTOCOL' },
          { text: '命名移行', link: '/NAMING-MIGRATION' }
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
