// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const reloadButton = document.getElementById('reloadButton');
    
    if (!reloadButton) {
        console.error('Reload button not found');
        return;
    }

    reloadButton.addEventListener('click', async () => {
        try {
            if (!chrome?.runtime?.sendMessage) {
                throw new Error('Chrome runtime API not available');
            }

            reloadButton.textContent = 'Reloading...';
            reloadButton.disabled = true;

            await chrome.runtime.sendMessage({ action: 'reloadAllTabs' });
            
            setTimeout(() => {
                reloadButton.textContent = 'Tabs Reloaded!';
            }, 1000);
        } catch (error) {
            console.error('Failed to reload tabs:', error);
            reloadButton.textContent = 'Error - Please try again';
            reloadButton.disabled = false;
        }
    });
}); 