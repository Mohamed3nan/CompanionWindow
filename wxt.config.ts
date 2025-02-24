import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: "Companion Window | Always on Top",
    description: "Transform any webpage into a floating, always-on-top window for seamless multitasking and enhanced productivity",
    version: "1.5",
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
          default: "Alt+C"
        },
        description: "Toggle Companion Window"
      }
    },
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
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
      resources: ["pip.html", "pip.css", "pascoli.html"],
      matches: ["<all_urls>"]
    }]
  }
});
