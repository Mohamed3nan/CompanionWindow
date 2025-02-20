// console.log('Content script loaded for:', window.location.href);

// Track PiP window state
const pipWindowState = {
  windowId: 0,
  tabId: 0,
  icon: '',
  window: null,
  isMinimized: false,
  originalWidth: 400,
  originalHeight: 600
};

// Create and setup loading spinner
function createLoader(pipWindow) {
  const loaderContainer = pipWindow.document.createElement('div');
  
  const loader = pipWindow.document.createElement('div');
  loader.className = 'loader';
  
  const loaderText = pipWindow.document.createElement('div');
  loaderText.className = 'loader-text';
  
  loaderContainer.appendChild(loader);
  loaderContainer.appendChild(loaderText);
  pipWindow.document.body.appendChild(loaderContainer);
  
  return loaderContainer;
}

// Setup window controls
function setupWindowControls(pipWindow) {
  const dropdown = pipWindow.document.querySelector('.dropdown');
  const dotsButton = pipWindow.document.querySelector('.dots-button');
  const dropdownMenu = pipWindow.document.querySelector('.dropdown-menu');
  const minimizeButton = pipWindow.document.querySelector('.menu-item.minimize');
  const reloadButton = pipWindow.document.querySelector('.menu-item.reload');
  const overlay = pipWindow.document.querySelector('.minimized-overlay');
  const favicon = pipWindow.document.querySelector('.site-favicon');
  const siteTitle = pipWindow.document.querySelector('.site-title');

  // Function to update site info
  const updateSiteInfo = () => {
    const iframe = pipWindow.document.getElementById('companionWindow');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const url = new URL(iframe.src);
        
        // Get favicon - try direct page favicon first, then fallback to Google's service
        const faviconLink = iframeDoc.querySelector('link[rel="icon"]') || 
                           iframeDoc.querySelector('link[rel="shortcut icon"]');
        
        if (faviconLink && faviconLink.href) {
          favicon.src = faviconLink.href;
        } else {
          // Fallback to Google's favicon service
          favicon.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
        }

        // Get title
        siteTitle.textContent = iframeDoc.title || url.hostname || 'Untitled';
      } catch (e) {
        console.error('Error accessing iframe content:', e);
        // Still try to get favicon using Google's service if we have a URL
        try {
          const url = new URL(iframe.src);
          favicon.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
          siteTitle.textContent = url.hostname || 'Untitled';
        } catch (urlError) {
          console.error('Error parsing URL:', urlError);
        }
      }
    }
  };

  // Check initial window size
  const checkWindowSize = () => {
    const isSmall = pipWindow.innerWidth < 200 || pipWindow.innerHeight < 100;
    if (isSmall) {
      pipWindowState.isMinimized = true;
      overlay.classList.add('show');
      dropdown.classList.add('hide');
      updateSiteInfo();
    }
  };

  // Wait for iframe to load before checking size
  const iframe = pipWindow.document.getElementById('companionWindow');
  if (iframe) {
    iframe.addEventListener('load', () => {
      checkWindowSize();
      updateSiteInfo();
    });
  }

  // Function to restore window size
  const restoreWindow = () => {
    if (pipWindowState.isMinimized) {
      pipWindow.resizeTo(
        pipWindowState.originalWidth,
        pipWindowState.originalHeight
      );
      pipWindowState.isMinimized = false;
      overlay.classList.remove('show');
      dropdown.classList.remove('hide');
    }
  };

  // Handle overlay click to restore
  overlay.addEventListener('click', () => {
    restoreWindow();
  });

  // Toggle dropdown menu
  dotsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  pipWindow.document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !dotsButton.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });

  // Handle minimize action
  minimizeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!pipWindowState.isMinimized) {
      pipWindowState.originalWidth = pipWindow.innerWidth;
      pipWindowState.originalHeight = pipWindow.innerHeight;
      pipWindow.resizeTo(200, 100);
      pipWindowState.isMinimized = true;
      overlay.classList.add('show');
      dropdown.classList.add('hide');
      dropdownMenu.classList.remove('show');
      updateSiteInfo();
    } else {
      restoreWindow();
    }
  });

  // Handle window resize
  let resizeTimeout;
  pipWindow.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const isSmall = pipWindow.innerWidth < 200 || pipWindow.innerHeight < 100;
      if (isSmall && !pipWindowState.isMinimized) {
        pipWindowState.isMinimized = true;
        overlay.classList.add('show');
        dropdown.classList.add('hide');
        dropdownMenu.classList.remove('show');
        updateSiteInfo();
      } else if (!isSmall) {
        // Always remove overlay when window becomes large enough
        pipWindowState.isMinimized = false;
        overlay.classList.remove('show');
        dropdown.classList.remove('hide');
        dropdownMenu.classList.remove('show');
      }
    }, 100);
  });

  // Handle reload action
  reloadButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const iframe = pipWindow.document.getElementById('companionWindow');
    if (iframe) {
      iframe.src = iframe.src;
    }
    dropdownMenu.classList.remove('show');
  });

  // Handle keyboard shortcuts
  // pipWindow.document.addEventListener('keydown', (e) => {
  //   if (e.ctrlKey) {
  //     switch(e.key.toLowerCase()) {
  //       case 'm':
  //         e.preventDefault();
  //         minimizeButton.click();
  //         break;
  //       case 'r':
  //         e.preventDefault();
  //         reloadButton.click();
  //         break;
  //     }
  //   }
  // });
}

// Create and setup iframe
function createIframe(pipWindow, url) {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.id = 'companionWindow';
  iframe.title = 'Companion Window';
  
  pipWindow.document.body.appendChild(iframe);
  
  return iframe;
}

// Initialize floating button state
async function initializeFloatingButton(pipWindow) {
  try {
    const result = await chrome.storage.local.get(['floatingButtonEnabled']);
    const dropdown = pipWindow.document.querySelector('.dropdown');
    if (dropdown) {
      if (!result.floatingButtonEnabled) {
        dropdown.classList.add('hide');
      }
    }
  } catch (error) {
    console.error('Error getting floating button state:', error);
  }
}

// Toggle Picture-in-Picture window
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

    // Inject chrome API access
    pipWindow.chrome = chrome;

    // First load CSS
    const cssResponse = await fetch(chrome.runtime.getURL('pip.css'));
    const cssText = await cssResponse.text();
    
    // Load the HTML file
    const response = await fetch(chrome.runtime.getURL('pip.html'));
    const html = await response.text();
    
    // Insert initial content
    pipWindow.document.write(`
      <style>${cssText}</style>
      ${html}
    `);
    pipWindow.document.close();

    // Setup window controls first
    setupWindowControls(pipWindow);

    // Initialize floating button state
    await initializeFloatingButton(pipWindow);

    // Add loader after controls are setup
    const loaderContainer = createLoader(pipWindow);

    // Wait for iframe to be available
    const waitForIframe = () => {
      return new Promise((resolve) => {
        const iframe = pipWindow.document.getElementById('companionWindow');
        if (iframe) {
          resolve(iframe);
          return;
        }

        const observer = new MutationObserver(() => {
          const iframe = pipWindow.document.getElementById('companionWindow');
          if (iframe) {
            observer.disconnect();
            resolve(iframe);
          }
        });

        observer.observe(pipWindow.document.body, {
          childList: true,
          subtree: true
        });
      });
    };

    const iframe = await waitForIframe();

    // Set iframe URL and remove loader when iframe content loads
    const url = await getStoredUrl();
    if (url) {
      iframe.src = url;
      iframe.addEventListener('load', () => {
        if (loaderContainer) loaderContainer.remove();
      });
    } else {
      // If no URL, remove loader immediately
      if (loaderContainer) loaderContainer.remove();
    }

    // Handle window close
    pipWindow.addEventListener('pagehide', (event) => {
      console.log('PiP window closed');
      if (window.documentPictureInPicture.window) {
        window.documentPictureInPicture.window.close();
        // Clean up session rules
        chrome.runtime.sendMessage({ action: 'cleanupRules' });
      }
    });

  } catch (error) {
    console.error('Failed to enter Picture-in-Picture mode:', error);
  }
}

// Get stored URL
async function getStoredUrl() {
  try {
    const result = await chrome.storage.local.get(['lastUrl']);
    return result.lastUrl;
  } catch (error) {
    console.error('Error getting stored URL:', error);
    return null;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'checkPiPWindow') {
    const hasPiPWindow = window.documentPictureInPicture?.window != null;
    sendResponse({ hasPiPWindow });
  } else if (request.action === 'closePiP') {
    if (window.documentPictureInPicture?.window) {
      window.documentPictureInPicture.window.close();
      // Clean up session rules
      chrome.runtime.sendMessage({ action: 'cleanupRules' });
    }
    sendResponse({ success: true });
  } else if (request.action === 'openPiP') {
    console.log('Opening PiP window');
    togglePictureInPicture();
    sendResponse({ received: true });
  } else if (request.action === 'toggleFloatingButton') {
    if (window.documentPictureInPicture?.window) {
      const dropdown = window.documentPictureInPicture.window.document.querySelector('.dropdown');
      if (dropdown) {
        if (request.state) {
          dropdown.classList.remove('hide');
        } else {
          dropdown.classList.add('hide');
        }
      }
    }
    sendResponse({ received: true });
  }
  return true; // Keep the message channel open for the async response
}); 