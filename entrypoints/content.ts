import { storage } from "wxt/storage";


declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options: { width: number; height: number }) => Promise<Window>
      window?: Window | null
    }
  }
}


// Define storage items
const extLastUrl = storage.defineItem<string>("local:extLastUrl");
const extFloatingButtonEnabled = storage.defineItem<boolean>("local:extFloatingButtonEnabled", { defaultValue: true });

// Track PiP window state
interface PipWindowState {
  windowId: number
  tabId: number
  icon: string
  window: Window | null
  isMinimized: boolean
  originalWidth: number
  originalHeight: number
}

const pipWindowState: PipWindowState = {
  windowId: 0,
  tabId: 0,
  icon: '',
  window: null,
  isMinimized: false,
  originalWidth: 400,
  originalHeight: 600
}

// Create and setup loading spinner
function createLoader(pipWindow: Window) {
  const loaderContainer = pipWindow.document.createElement('div')
  
  const loader = pipWindow.document.createElement('div')
  loader.className = 'loader'
  
  const loaderText = pipWindow.document.createElement('div')
  loaderText.className = 'loader-text'
  
  loaderContainer.appendChild(loader)
  loaderContainer.appendChild(loaderText)
  pipWindow.document.body.appendChild(loaderContainer)
  
  return loaderContainer
}

// Setup window controls
function setupWindowControls(pipWindow: Window) {
  const dropdown = pipWindow.document.querySelector('.dropdown')
  const dotsButton = pipWindow.document.querySelector('.dots-button')
  const minimizeButton = pipWindow.document.querySelector('.menu-item.minimize')
  const reloadButton = pipWindow.document.querySelector('.menu-item.reload')
  const overlay = pipWindow.document.querySelector('.minimized-overlay')
  const favicon = pipWindow.document.querySelector('.site-favicon') as HTMLImageElement
  const siteTitle = pipWindow.document.querySelector('.site-title')

  if (!dropdown || !dotsButton || !minimizeButton || !reloadButton || !overlay || !favicon || !siteTitle) {
    console.error('Required elements not found')
    return
  }

  // Function to update site info
  const updateSiteInfo = () => {
    const iframe = pipWindow.document.getElementById('companionWindow') as HTMLIFrameElement
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        
        // Check if iframe.src is a valid URL before constructing URL object
        if (!iframe.src || iframe.src === 'about:blank') {
          // Handle empty or invalid URL
          favicon.src = chrome.runtime.getURL('/icon/48.png') // Use extension icon as fallback
          siteTitle.textContent = ''
          return
        }
        
        const url = new URL(iframe.src)
        
        // Get favicon - try direct page favicon first, then fallback to Google's service
        const faviconLink = iframeDoc?.querySelector('link[rel="icon"]') || 
                         iframeDoc?.querySelector('link[rel="shortcut icon"]')
        
        if (faviconLink && 'href' in faviconLink && faviconLink.href) {
          favicon.src = (faviconLink as HTMLLinkElement).href
        } else {
          // Fallback to Google's favicon service
          favicon.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
        }

        // Get title
        siteTitle.textContent = iframeDoc?.title || url.hostname || ''
      } catch (e) {
        console.error('Error accessing iframe content:', e)
        // Still try to get favicon using Google's service if we have a URL
        try {
          // Additional validation before creating URL
          if (!iframe.src || iframe.src === 'about:blank') {
            favicon.src = chrome.runtime.getURL('/icon/48.png') // Use extension icon as fallback
            siteTitle.textContent = ''
            return
          }
          
          const url = new URL(iframe.src)
          favicon.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
          siteTitle.textContent = url.hostname || ''
        } catch (urlError) {
          console.error('Error parsing URL:', urlError)
          // Use fallbacks when URL parsing fails
          favicon.src = chrome.runtime.getURL('/icon/48.png')
          siteTitle.textContent = ''
        }
      }
    }
  }

  // Define constants for minimum window dimensions
  const MIN_WIDTH = 250
  const MIN_HEIGHT = 75

  // Check initial window size
  const checkWindowSize = () => {
    // Use the same constants for consistency
    const isSmall = pipWindow.innerWidth < MIN_WIDTH && pipWindow.innerHeight < MIN_HEIGHT
    if (isSmall) {
      pipWindowState.isMinimized = true
      overlay.classList.add('show')
      dropdown.classList.add('hide')
      updateSiteInfo()
    }
  }

  // Wait for iframe to load before checking size
  const iframe = pipWindow.document.getElementById('companionWindow')
  if (iframe) {
    iframe.addEventListener('load', () => {
      checkWindowSize()
      updateSiteInfo()
    })
  }

  // Function to restore window size
  const restoreWindow = () => {
    if (pipWindowState.isMinimized) {
      pipWindow.resizeTo(
        pipWindowState.originalWidth,
        pipWindowState.originalHeight
      )
      pipWindowState.isMinimized = false
      overlay.classList.remove('show')
      dropdown.classList.remove('hide')
    }
  }

  // Handle overlay click to restore
  overlay.addEventListener('click', () => {
    restoreWindow()
  })


  // Handle minimize action
  minimizeButton.addEventListener('click', (event) => {
    event.stopPropagation()
    // No need to uncheck the dropdown toggle as we're using hover now
    
    if (!pipWindowState.isMinimized) {
      pipWindowState.originalWidth = pipWindow.innerWidth
      pipWindowState.originalHeight = pipWindow.innerHeight
      // Use MIN_WIDTH and MIN_HEIGHT constants for consistency
      pipWindow.resizeTo(MIN_WIDTH - 50, MIN_HEIGHT - 5)
      pipWindowState.isMinimized = true
      overlay.classList.add('show')
      dropdown.classList.add('hide')
      updateSiteInfo()
    } else {
      restoreWindow()
    }
  })

  // Handle window resize
  let resizeTimeout: ReturnType<typeof setTimeout>
  pipWindow.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      // Use the same constants for consistency
      const isSmall = pipWindow.innerWidth < MIN_WIDTH && pipWindow.innerHeight < MIN_HEIGHT
      console.log('Window resize:', { 
        width: pipWindow.innerWidth, 
        height: pipWindow.innerHeight, 
        isSmall, 
        wasMinimized: pipWindowState.isMinimized,
        overlayShown: overlay.classList.contains('show')
      })
      
      if (isSmall) {
        // Window is small, add blur if not already minimized
        if (!pipWindowState.isMinimized) {
          console.log('Adding blur overlay - window became small')
          pipWindowState.isMinimized = true
          overlay.classList.add('show')
          dropdown.classList.add('hide')
          updateSiteInfo()
        }
      } else {
        // Window is large enough, remove blur if it was minimized
        if (pipWindowState.isMinimized || overlay.classList.contains('show')) {
          console.log('Removing blur overlay - window became large')
          pipWindowState.isMinimized = false
          overlay.classList.remove('show')
          dropdown.classList.remove('hide')
        }
      }
    }, 100)
  })

  // Handle reload action
  reloadButton.addEventListener('click', (event) => {
    event.stopPropagation()
    // Uncheck the dropdown toggle
    const dropdownToggle = pipWindow.document.getElementById('dropdown-toggle') as HTMLInputElement
    if (dropdownToggle) dropdownToggle.checked = false
    
    const iframe = pipWindow.document.getElementById('companionWindow') as HTMLIFrameElement
    if (iframe) {
      iframe.src = iframe.src
    }
  })
}

// Create and setup iframe
function createIframe(pipWindow: Window, url: string) {
  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.id = 'companionWindow'
  iframe.title = 'Companion Window'
  
  pipWindow.document.body.appendChild(iframe)
  
  return iframe
}

// Initialize floating button state
async function initializeFloatingButton(pipWindow: Window) {
  try {
    const isEnabled = await extFloatingButtonEnabled.getValue();
    const dropdown = pipWindow.document.querySelector('.dropdown');
    if (dropdown) {
      if (!isEnabled) {
        dropdown.classList.add('hide');
      }
    }
  } catch (error) {
    console.error('Error getting floating button state:', error);
  }
}

// Toggle Picture-in-Picture window
async function togglePictureInPicture() {
  console.log('Attempting to open Picture-in-Picture window')
  try {
    const pipWindow = await window.documentPictureInPicture?.requestWindow({
      width: 400,
      height: 600
    })

    if (!pipWindow) {
      console.error("Could not create Picture-in-Picture window")
      return
    }

    // Inject chrome API access
    ;(pipWindow as any).chrome = chrome

    // First load CSS
    const cssResponse = await fetch(chrome.runtime.getURL('/pip.css'))
    const cssText = await cssResponse.text()
    
    // Load the HTML file
    const response = await fetch(chrome.runtime.getURL('/pip.html'))
    const html = await response.text()
    
    // Insert initial content
    pipWindow.document.write(`
      <style>${cssText}</style>
      ${html}
    `)
    pipWindow.document.close()

    // Setup window controls first
    setupWindowControls(pipWindow)

    // Initialize floating button state
    await initializeFloatingButton(pipWindow)

    // Add loader after controls are setup
    const loaderContainer = createLoader(pipWindow)

    // Wait for iframe to be available
    const waitForIframe = () => {
      return new Promise<HTMLIFrameElement>((resolve) => {
        const iframe = pipWindow.document.getElementById('companionWindow') as HTMLIFrameElement
        if (iframe) {
          resolve(iframe)
          return
        }

        const observer = new MutationObserver(() => {
          const iframe = pipWindow.document.getElementById('companionWindow') as HTMLIFrameElement
          if (iframe) {
            observer.disconnect()
            resolve(iframe)
          }
        })

        observer.observe(pipWindow.document.body, {
          childList: true,
          subtree: true
        })
      })
    }

    const iframe = await waitForIframe()

    // Set iframe URL and remove loader when iframe content loads
    const url = await getStoredUrl()
    if (url) {
      iframe.src = url
      iframe.addEventListener('load', () => {
        if (loaderContainer) loaderContainer.remove()
      })
    } else {
      // If no URL, remove loader immediately
      if (loaderContainer) loaderContainer.remove()
    }

    // Handle window close
    pipWindow.addEventListener('pagehide', (event) => {
      console.log('PiP window closed')
      const docPiP = window.documentPictureInPicture
      if (docPiP?.window) {
        docPiP.window.close()
        // Clean up session rules
        chrome.runtime.sendMessage({ action: 'cleanupRules' })
      }
    })

  } catch (error) {
    console.error('Failed to enter Picture-in-Picture mode:', error)
  }
}

// Get stored URL
async function getStoredUrl(): Promise<string | null> {
  try {
    return await extLastUrl.getValue() || null;
  } catch (error) {
    console.error('Error getting stored URL:', error);
    return null;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main(ctx) {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request)
      
      if (request.action === 'checkPiPWindow') {
        const hasPiPWindow = window.documentPictureInPicture?.window != null
        sendResponse({ hasPiPWindow })
      } else if (request.action === 'closePiP') {
        const docPiP = window.documentPictureInPicture
        if (docPiP?.window) {
          docPiP.window.close()
          // Clean up session rules
          chrome.runtime.sendMessage({ action: 'cleanupRules' })
        }
        sendResponse({ success: true })
      } else if (request.action === 'openPiP') {
        console.log('Opening PiP window')
        togglePictureInPicture()
        sendResponse({ received: true })
      } else if (request.action === 'toggleFloatingButton') {
        const docPiP = window.documentPictureInPicture
        if (docPiP?.window) {
          const dropdown = docPiP.window.document.querySelector('.dropdown')
          if (dropdown) {
            if (request.state) {
              dropdown.classList.remove('hide')
            } else {
              dropdown.classList.add('hide')
            }
          }
        }
        sendResponse({ received: true })
      }
      return true // Keep the message channel open for the async response
    })
  }
})