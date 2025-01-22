// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openInCompanionWindow",
    title: "Open in Companion Window",
    contexts: ["page"]
  });
});

// Network rules management
async function addSessionRule(domain) {
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
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openInCompanionWindow") {
    console.log('Context menu clicked - configuring network rules first');
    handleRules(tab.url, true);
    console.log('Sending openPiP message to tab:', tab.id);
    chrome.tabs.sendMessage(tab.id, { action: 'openPiP' });
  }
});

// Handle extension button click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension button clicked for tab:', tab.id);
  handleRules(tab.url, true);
  console.log('Sending openPiP message to tab:', tab.id);
  chrome.tabs.sendMessage(tab.id, { action: 'openPiP' });
}); 