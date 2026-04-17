// @ts-check
// @type JSDoc annotations allow editor autocompletion and type checking
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '千鉑科技 Wiki',
  tagline: '內部知識庫 · 工作流程 · 技術文件',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // 部署到正式環境時請改成實際網址
  url: 'https://wiki.qianpro.shop',
  // 若掛在子路徑（例如 /docs/）記得同步調整 baseUrl
  baseUrl: '/',

  organizationName: '<your-account>', // TODO: 換成你的 GitHub 帳號
  projectName: '<your-repo>', // TODO: 換成你的 Repo 名稱

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/<your-account>/<your-repo>/tree/main/minimal-docs-site/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/<your-account>/<your-repo>/tree/main/minimal-docs-site/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: '千鉑科技 Wiki',
        logo: {
          alt: 'QIANPRO Logo',
          src: 'img/qianpro-icon.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: '文件',
          },
          {
            href: 'https://qianpro.shop',
            label: '官網',
            position: 'right',
          },
          {
            href: 'https://github.com/QIANPRO-Technology/QIANPRO-wiki',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '文件',
            items: [
              {
                label: '快速開始',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: '資源',
            items: [
              {
                label: '千鉑科技官網',
                href: 'https://qianpro.shop',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/QIANPRO-Technology',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} 千鉑科技 QIANPRO. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
