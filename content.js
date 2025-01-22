console.log('Content script loaded for:', window.location.href);

// Track PiP window state
const pipWindowState = {
  windowId: 0,
  tabId: 0,
  icon: '',
  window: null
};

// Styles for the PiP window
const pipStyles = `
  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f5f5f5;
  }
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .loader {
    border: 5px solid #f3f3f3;
    border-radius: 50%;
    border-top: 5px solid #3498db;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
  }
  .loader-text {
    position: absolute;
    top: 60%;
    text-align: center;
    color: #3498db;
    font-family: Arial, sans-serif;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Create and setup loading spinner
function createLoader(pipWindow) {
  const loaderContainer = pipWindow.document.createElement('div');
  loaderContainer.style.position = 'relative';
  
  const loader = pipWindow.document.createElement('div');
  loader.className = 'loader';
  
  const loaderText = pipWindow.document.createElement('div');
  loaderText.className = 'loader-text';
  
  loaderContainer.appendChild(loader);
  loaderContainer.appendChild(loaderText);
  pipWindow.document.body.appendChild(loaderContainer);
  
  return loaderContainer;
}

// Setup PiP window styles
function setupPipWindowStyles(pipWindow) {
  const style = document.createElement('style');
  style.textContent = pipStyles;
  pipWindow.document.head.appendChild(style);
}

// Create and setup iframe
function createIframe(pipWindow, url) {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.id = 'companionWindow';
  iframe.title = 'Companion Window';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.setAttribute('sandbox', 'allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols allow-storage-access-by-user-activation');
  
  pipWindow.document.body.appendChild(iframe);
  
  return iframe;
}

async function togglePictureInPicture() {
  console.log('Attempting to open Picture-in-Picture window');
  try {
    const pipWindow = await window.documentPictureInPicture?.requestWindow({
      width: 400,
      height: 600
    });

    if (!pipWindow) {
      console.error("Could not create Picture-in-Picture window");
      return;
    }

    // Update PiP window state
    pipWindowState.window = pipWindow;
    pipWindowState.windowId = chrome.windows?.WINDOW_ID_CURRENT || 0;
    pipWindowState.tabId = chrome.tabs?.TAB_ID_NONE || 0;
    pipWindowState.icon = document.querySelector('link[rel="icon"]')?.href || '';

    console.log('PiP window created successfully');
    
    // Set up the PiP window styles
    setupPipWindowStyles(pipWindow);

    // Add loading spinner
    // const loader = createLoader(pipWindow);

    // Wait for rules to take effect (longer delay)
    // console.log('Waiting for network rules to take effect...');
    // await new Promise(resolve => setTimeout(resolve, 2000));

    // Remove loader
    // loader.remove();

    // Create and add iframe
    console.log('Adding iframe to PiP window');
    createIframe(pipWindow, window.location.href);

    // Handle window close
    pipWindow.addEventListener('pagehide', (event) => {
      console.log('PiP window closed');
      if (window.documentPictureInPicture.window) {
        window.documentPictureInPicture.window.close();
        // Reset PiP window state
        pipWindowState.window = null;
        pipWindowState.windowId = 0;
        pipWindowState.tabId = 0;
        pipWindowState.icon = '';
        // Clean up session rules
        chrome.runtime.sendMessage({ action: 'cleanupRules' });
      }
    });

  } catch (error) {
    console.error('Failed to enter Picture-in-Picture mode:', error);
    // Reset PiP window state on error
    pipWindowState.window = null;
    pipWindowState.windowId = 0;
    pipWindowState.tabId = 0;
    pipWindowState.icon = '';
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === 'openPiP') {
    console.log('Opening PiP window');
    togglePictureInPicture();
    sendResponse({ received: true });
  }
  return true; // Keep the message channel open for the async response
}); 