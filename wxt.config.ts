import { defineConfig } from 'wxt';
import removeConsole from 'vite-plugin-remove-console';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/i18n/module'],
  extensionApi: 'chrome',
  manifest: {
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    version: "2.5",
    default_locale: "en",
    permissions: [
      "activeTab",
      "declarativeNetRequestWithHostAccess",
      "contextMenus",
      "storage"
    ],
    host_permissions: ["<all_urls>"],
    commands: {
      "toggle-companion-window": {
        suggested_key: {
          default: "Alt+C",
          mac: "Alt+C"
        },
        description: "__MSG_toggleCompanionWindow__"
      }
    },
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self' 'wasm-unsafe-eval'; worker-src 'self' 'wasm-unsafe-eval';"
    },
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "128": "icon/128.png"
    },
    action: {
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png"
      }
    },
    web_accessible_resources: [{
      resources: ["icon/*", "pip.html", "pip.css"],
      matches: ["<all_urls>"]
    }]
  },
  vite: (configEnv) => ({
    plugins:
      configEnv.mode === 'production'
        ? [removeConsole({ includes: ['log'] })]
        : [],
  }),
});
