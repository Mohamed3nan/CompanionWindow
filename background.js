// Network rules management
async function getSessionRules() {
  try {
    return await chrome.declarativeNetRequest.getSessionRules();
  } catch (error) {
    console.error('Error getting session rules:', error);
    return [];
  }
}

async function addSessionRule(domain) {
  console.log('Adding session rule for domain:', domain);
  try {
    const initiatorDomain = new URL(domain).hostname;
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [{
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "content-security-policy-report-only", operation: "remove" },
          ],
          requestHeaders: [
            { header: "Sec-Fetch-Dest", operation: "set", value: "document" },
            { header: "Sec-Fetch-Site", operation: "set", value: "same-origin" },
            { header: "If-None-Match", operation: "remove" }
          ]
        },
        condition: {
          urlFilter: "*",
          initiatorDomains: [initiatorDomain]
        }
      }]
    });
    console.log('Network rules added successfully for domain:', initiatorDomain);
    console.log('Current session rules:', await getSessionRules());
  } catch (error) {
    console.error('Error adding network rules:', error);
  }
}

async function removeSessionRule() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getSessionRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [],
      removeRuleIds: ruleIds
    });
  } catch (error) {
    console.error('Error removing rules:', error);
  }
}

async function handleRules(domain, shouldEnable) {

  // Always clean up existing rules first
  await removeSessionRule();

  // Add new rules if enabled
  if (shouldEnable) {
    await addSessionRule(domain);
  }
}


// Create context menu items
async function setupContextMenus() {
  // Create main context menu item
  chrome.contextMenus.create({
    id: "openInCompanionWindow",
    title: "Open in Companion Window",
    contexts: ["page"]
  });

  // Create Context menu toggle section
  chrome.contextMenus.create({
    id: "contextMenuToggle",
    title: "Context menu",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "contextMenuOn",
    title: "On",
    type: "radio",
    checked: true,
    parentId: "contextMenuToggle",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "contextMenuOff",
    title: "Off",
    type: "radio",
    checked: false,
    parentId: "contextMenuToggle",
    contexts: ["action"]
  });

  // Add separator
  chrome.contextMenus.create({
    id: "separator1",
    type: "separator",
    contexts: ["action"]
  });

  // Create support menu
  chrome.contextMenus.create({
    id: "support",
    title: "❤️ Support",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "issues",
    title: "🤔 Issues and Suggestions",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "github",
    title: "🌐 GitHub",
    parentId: "issues",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "reportIssue",
    title: "🐛 Report Issue",
    parentId: "issues",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "donate",
    title: "☕ Buy me a coffee",
    parentId: "support",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "review",
    title: "🌟 Leave a review",
    parentId: "support",
    contexts: ["action"]
  });
}



// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message in background script:', request);
  if (request.action === 'cleanupRules') {
    removeSessionRule();
  }
});


// URL Storage Management
function storeUrl(url) {
  try {
    chrome.storage.local.set({ lastUrl: url });
    console.log('URL stored successfully:', url);
  } catch (error) {
    console.error('Error storing URL:', error);
  }
}


// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch(info.menuItemId) {
    case "openInCompanionWindow":
      console.log('Context menu clicked - configuring network rules first');
      handleRules(tab.url, true);
      storeUrl(tab.url);
      console.log('Sending openPiP message to tab:', tab.id);
      chrome.tabs.sendMessage(tab.id, { action: 'openPiP' });
      break;
    case "contextMenuOn":
      chrome.contextMenus.update("openInCompanionWindow", { visible: true });
      chrome.contextMenus.update("contextMenuOn", { checked: true });
      chrome.contextMenus.update("contextMenuOff", { checked: false });
      break;
    case "contextMenuOff":
      chrome.contextMenus.update("openInCompanionWindow", { visible: false });
      chrome.contextMenus.update("contextMenuOn", { checked: false });
      chrome.contextMenus.update("contextMenuOff", { checked: true });
      break;
    case "review":
      chrome.tabs.create({ 
        url: `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews`
      });
      break;
    case "donate":
      chrome.tabs.create({ 
        url: "https://ko-fi.com/mohamed3nan"
      });
      break;
    case "github":
      chrome.tabs.create({ 
        url: "https://github.com/Mohamed3nan/CompanionWindow"
      });
      break;
    case "reportIssue":
      chrome.tabs.create({ 
        url: "https://github.com/Mohamed3nan/CompanionWindow/issues"
      });
      break;
  }
});


// Handle extension button click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension button clicked for tab:', tab.id);
  handleRules(tab.url, true);
  storeUrl(tab.url);
  console.log('Sending openPiP message to tab:', tab.id);
  chrome.tabs.sendMessage(tab.id, { action: 'openPiP' });
}); 


// Clean up rules when extension is unloaded
chrome.runtime.onSuspend.addListener(async () => {
  await removeSessionRule();
});


// Initialize context menus
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});