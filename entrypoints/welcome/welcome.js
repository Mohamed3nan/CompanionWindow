document.addEventListener('DOMContentLoaded', function() {
  const reloadButton = document.getElementById('reloadButton');
  const mellowtelToggle = document.getElementById('mellowtel-toggle');
  const optStatus = document.getElementById('opt-status');
  const reviewLink = document.getElementById('review-link');

  // Set up review link
  reviewLink.href = `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews`;

  async function reloadAllTabs() {
    try {
      reloadButton.textContent = 'Refreshing...';
      reloadButton.disabled = true;

      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && !tab.url?.startsWith('chrome://')) {
          await chrome.tabs.reload(tab.id);
        }
      }

      setTimeout(() => {
        reloadButton.textContent = 'Tabs Refreshed!';
      }, 1000);
    } catch (error) {
      console.error('Error reloading tabs:', error);
      reloadButton.textContent = 'Error - Try Again';
      reloadButton.disabled = false;
    }
  }


  async function updateOptStatus() {
    try {
      const hasOptedIn = await chrome.runtime.sendMessage({ action: 'getMellowtelStatus' });
      mellowtelToggle.checked = hasOptedIn;
      optStatus.textContent = hasOptedIn ? 'Supporter 🫡 (Opted in)' : 'Not Supporting 🫥 (Opted out)';
      
      const statusIndicator = document.getElementById('status-indicator');
      if (hasOptedIn) {
        statusIndicator.classList.add('status-opted-in');
        statusIndicator.classList.remove('status-opted-out');
      } else {
        statusIndicator.classList.add('status-opted-out');
        statusIndicator.classList.remove('status-opted-in');
      }
    } catch (error) {
      console.error('Error checking Mellowtel status:', error);
      optStatus.textContent = 'Error';
    }
  }

  async function handleMellowtelToggle(event) {
    try {
      await chrome.runtime.sendMessage({ 
        action: 'toggleMellowtel',
        state: event.target.checked 
      });
      updateOptStatus();
    } catch (error) {
      console.error('Error toggling Mellowtel:', error);
      event.target.checked = !event.target.checked;
      updateOptStatus();
    }
  }


  // Add event listeners
  reloadButton.addEventListener('click', reloadAllTabs);
  mellowtelToggle.addEventListener('change', handleMellowtelToggle);

  // Initial status check
  updateOptStatus();
}); 