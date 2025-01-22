// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openInCompanionWindow",
    title: "Open in Companion Window",
    contexts: ["page"]
  });
});

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

// Clean up rules when extension is unloaded
chrome.runtime.onSuspend.addListener(async () => {
  await removeSessionRule();
});

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
  if (info.menuItemId === "openInCompanionWindow") {
    console.log('Context menu clicked - configuring network rules first');
    handleRules(tab.url, true);
    storeUrl(tab.url);
    console.log('Sending openPiP message to tab:', tab.id);
    chrome.tabs.sendMessage(tab.id, { action: 'openPiP' });
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