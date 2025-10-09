// @ts-check
// @type JSDoc annotations allow editor autocompletion and type checking
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'QIANPRO Docs Template',
  tagline: 'Minimal Docusaurus setup with downloads',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // 部署到正式環境時請改成實際網址
  url: 'https://docs.example.com',
  // 若掛在子路徑（例如 /docs/）記得同步調整 baseUrl
  baseUrl: '/',

  organizationName: '<your-account>', // TODO: 換成你的 GitHub 帳號
  projectName: '<your-repo>', // TODO: 換成你的 Repo 名稱

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

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
        title: 'QIANPRO Docs',
        logo: {
          alt: 'QIANPRO Docs Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: '文件',
          },
          {to: '/docs/downloads', label: '下載範例', position: 'left'},
          {
            href: 'https://github.com/<your-account>/<your-repo>',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: '快速開始',
                to: '/docs/intro',
              },
              {
                label: '下載範例',
                to: '/docs/downloads',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              },
              {
                label: 'Discord',
                href: 'https://discordapp.com/invite/docusaurus',
              },
              {
                label: 'X',
                href: 'https://x.com/docusaurus',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/<your-account>/<your-repo>',
              },
            ],
          },
        ],
        copyright: `Copyright (c) ${new Date().getFullYear()} QIANPRO Docs Template. Built with Docusaurus.`, 
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
