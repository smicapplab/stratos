import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Stratos Manual",
  description: "User guide for Stratos",
  base: "/manual/",
  outDir: ".vitepress/dist",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/01-getting-started.md' },
      { text: 'Projects', link: '/02-projects-and-boards.md' }
    ],
    sidebar: [
      {
        text: 'User Manual',
        items: [
          { text: '1. Getting Started', link: '/01-getting-started.md' },
          { text: '2. Projects & Boards', link: '/02-projects-and-boards.md' },
          { text: '3. Managing Tasks', link: '/03-managing-tasks.md' },
          { text: '4. Staying Updated', link: '/04-staying-updated.md' },
          { text: '5. Reports & Calendar', link: '/05-reports-and-calendar.md' },
          { text: '6. MCP Integrations', link: '/06-mcp-integration.md' },
          { text: '7. Keyboard Shortcuts', link: '/07-keyboard-shortcuts.md' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
