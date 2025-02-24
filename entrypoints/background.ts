import Mellowtel from "mellowtel";
import { storage } from "wxt/storage";

// Version management
async function handleVersioning() {
  const currentVersion = storage.defineItem<string>("local:currentVersion");
  const updateShown = storage.defineItem<boolean>("local:updateShown", { defaultValue: false });
  const newVersion = chrome.runtime.getManifest().version;
  const currentVersionValue = await currentVersion.getValue();

  if (newVersion !== currentVersionValue) {
    await currentVersion.setValue(newVersion);
    const updateShownValue = await updateShown.getValue();
    if (!updateShownValue) {
      //await chrome.runtime.openOptionsPage();
      await updateShown.setValue(true);
    }
  }
}

// Mellowtel initialization and management
async function initializeMellowtel() {
  const MELLOWTEL_API_KEY = import.meta.env.VITE_MELLOWTEL_API_KEY;
  const mellowtel = new Mellowtel(MELLOWTEL_API_KEY,  {
    disableLogs: false
});

  await mellowtel.initBackground();
  const hasOptedIn = await mellowtel.getOptInStatus();
  if (hasOptedIn) {
    await mellowtel.start();
  }
}

// Network rules management
async function getSessionRules() {
  try {
    return await chrome.declarativeNetRequest.getSessionRules()
  } catch (error) {
    console.error('Error getting session rules:', error)
    return []
  }
}

async function addSessionRule(domain: string) {
  console.log('Adding session rule for domain:', domain)
  try {
    const initiatorDomain = new URL(domain).hostname
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [{
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          responseHeaders: [
            { header: "x-frame-options", operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
            { header: "content-security-policy", operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
            { header: "content-security-policy-report-only", operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
          ],
          requestHeaders: [
            { header: "Sec-Fetch-Dest", operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: "document" },
            { header: "Sec-Fetch-Site", operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: "same-origin" },
            { header: "If-None-Match", operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE }
          ]
        },
        condition: {
          urlFilter: "*",
          initiatorDomains: [initiatorDomain]
        }
      }]
    })
    console.log('Network rules added successfully for domain:', initiatorDomain)
    console.log('Current session rules:', await getSessionRules())
  } catch (error) {
    console.error('Error adding network rules:', error)
  }
}

async function removeSessionRule() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getSessionRules()
    const ruleIds = existingRules.map(rule => rule.id)
    
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [],
      removeRuleIds: ruleIds
    })
  } catch (error) {
    console.error('Error removing rules:', error)
  }
}

async function handleRules(domain: string, shouldEnable: boolean) {
  // Always clean up existing rules first
  await removeSessionRule()

  // Add new rules if enabled
  if (shouldEnable) {
    await addSessionRule(domain)
  }
}

// URL Storage Management
function storeUrl(url: string) {
  try {
    chrome.storage.local.set({ lastUrl: url })
    console.log('URL stored successfully:', url)
  } catch (error) {
    console.error('Error storing URL:', error)
  }
}

// Setup context menus
function setupContextMenus() {
  chrome.contextMenus.create({
    id: "openInCompanionWindow",
    title: "Open in Companion Window",
    contexts: ["page"]
  })

  chrome.contextMenus.create({
    id: "options",
    title: "⚙️ Options",
    contexts: ["action"]
  })

  // Create Context menu toggle section under Options
  chrome.contextMenus.create({
    id: "contextMenuToggle",
    title: "Context Menu",
    parentId: "options",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "contextMenuOn",
    title: "On",
    type: "radio",
    checked: true,
    parentId: "contextMenuToggle",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "contextMenuOff",
    title: "Off",
    type: "radio",
    checked: false,
    parentId: "contextMenuToggle",
    contexts: ["action"]
  })

  // Create Floating Button toggle section under Options
  chrome.contextMenus.create({
    id: "floatingButtonToggle",
    title: "Floating Button",
    parentId: "options",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "floatingButtonOn",
    title: "On",
    type: "radio",
    checked: true,
    parentId: "floatingButtonToggle",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "floatingButtonOff",
    title: "Off",
    type: "radio",
    checked: false,
    parentId: "floatingButtonToggle",
    contexts: ["action"]
  })

  // Add keyboard shortcuts option
  chrome.contextMenus.create({
    id: "keyboardShortcuts",
    title: "⌨️ Keyboard Shortcuts",
    parentId: "options",
    contexts: ["action"]
  })

  // Add separator
  chrome.contextMenus.create({
    id: "separator1",
    type: "separator",
    contexts: ["action"]
  })

  // Create support menu
  chrome.contextMenus.create({
    id: "support",
    title: "❤️ Support",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "issues",
    title: "🤔 Issues and Suggestions",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "github",
    title: "🌐 GitHub",
    parentId: "issues",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "reportIssue",
    title: "🐛 Report Issue",
    parentId: "issues",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "donate",
    title: "☕ Buy me a coffee",
    parentId: "support",
    contexts: ["action"]
  })

  chrome.contextMenus.create({
    id: "review",
    title: "🌟 Leave a review",
    parentId: "support",
    contexts: ["action"]
  })
}

export default defineBackground({
  type: 'module',
  
  async main() {
    // Setup context menus and handle installation first
    chrome.runtime.onInstalled.addListener(async (details) => {
      handleVersioning()
      
      // Remove existing menus before creating new ones
      chrome.contextMenus.removeAll(() => {
        setupContextMenus()
      })
      
      // Set default values
      chrome.storage.local.set({
        floatingButtonEnabled: true
      })
      
      if (details.reason === 'install') {
        // Create a welcome tab
        chrome.tabs.create({
          url: chrome.runtime.getURL('/welcome.html'),
          active: true
        })
      }
    })

    // Initialize Mellowtel after installation handling
    await initializeMellowtel();

    // Handle messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Received message in background script:', request)
      if (request.action === 'cleanupRules') {
        removeSessionRule()
      }
    })

    // Clean up rules when extension is unloaded
    chrome.runtime.onSuspend.addListener(async () => {
      await removeSessionRule()
    })

    // Handle extension button click
    chrome.action.onClicked.addListener((tab) => {
      console.log('Extension button clicked for tab:', tab.id)
      if (tab.url) {
        handleRules(tab.url, true)
        storeUrl(tab.url)
        if (tab.id) {
          console.log('Sending openPiP message to tab:', tab.id)
          chrome.tabs.sendMessage(tab.id, { action: 'openPiP' })
        }
      }
    })

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (!tab?.id) return

      switch(info.menuItemId) {
        case "openInCompanionWindow":
          console.log('Context menu clicked - configuring network rules first')
          if (tab.url) {
            handleRules(tab.url, true)
            storeUrl(tab.url)
            console.log('Sending openPiP message to tab:', tab.id)
            chrome.tabs.sendMessage(tab.id, { action: 'openPiP' })
          }
          break
        case "contextMenuOn":
          chrome.contextMenus.update("openInCompanionWindow", { visible: true })
          chrome.contextMenus.update("contextMenuOn", { checked: true })
          chrome.contextMenus.update("contextMenuOff", { checked: false })
          break
        case "contextMenuOff":
          chrome.contextMenus.update("openInCompanionWindow", { visible: false })
          chrome.contextMenus.update("contextMenuOn", { checked: false })
          chrome.contextMenus.update("contextMenuOff", { checked: true })
          break
        case "floatingButtonOn":
          await chrome.storage.local.set({ floatingButtonEnabled: true })
          chrome.contextMenus.update("floatingButtonOn", { checked: true })
          chrome.contextMenus.update("floatingButtonOff", { checked: false })
          // Send message to all tabs to update floating button
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: 'toggleFloatingButton', state: true })
              }
            })
          })
          break
        case "floatingButtonOff":
          await chrome.storage.local.set({ floatingButtonEnabled: false })
          chrome.contextMenus.update("floatingButtonOn", { checked: false })
          chrome.contextMenus.update("floatingButtonOff", { checked: true })
          // Send message to all tabs to update floating button
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: 'toggleFloatingButton', state: false })
              }
            })
          })
          break
        case "keyboardShortcuts":
          chrome.tabs.create({ url: 'chrome://extensions/shortcuts#:~:text=Toggle%20Companion%20Window' })
          break
        case "github":
          chrome.tabs.create({ url: 'https://github.com/Mohamed3nan/CompanionWindow' })
          break
        case "reportIssue":
          chrome.tabs.create({ url: 'https://github.com/Mohamed3nan/CompanionWindow/issues' })
          break
        case "donate":
          chrome.tabs.create({ url: 'https://ko-fi.com/mohamed3nan' })
          break
        case "review":
          chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews` })
          break
      }
    })

    // Handle keyboard shortcuts with toggle functionality
    chrome.commands.onCommand.addListener(async (command) => {
      if (command === "toggle-companion-window") {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id && tab.url) {
          try {
            // Try to send a message to check if PiP window exists
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkPiPWindow' })
            if (response && response.hasPiPWindow) {
              // If PiP window exists, close it
              chrome.tabs.sendMessage(tab.id, { action: 'closePiP' })
            } else {
              // If no PiP window, open one
              handleRules(tab.url, true)
              storeUrl(tab.url)
              chrome.tabs.sendMessage(tab.id, { action: 'openPiP' })
            }
          } catch (error) {
            // If message fails (no receiver), assume no PiP window and open one
            handleRules(tab.url, true)
            storeUrl(tab.url)
            chrome.tabs.sendMessage(tab.id, { action: 'openPiP' })
          }
        }
      }
    })
  }
}) 