document.addEventListener('DOMContentLoaded', function() {
  const reloadButton = document.getElementById('reloadButton');
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

  // Add event listeners
  reloadButton.addEventListener('click', reloadAllTabs);
}); 