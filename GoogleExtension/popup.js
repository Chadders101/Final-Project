document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('view-storage').addEventListener('click', function() {
      chrome.storage.local.get(null, function(items) {
        console.log(items);
      });
    });
  
    // Add event listener for the clear data button
    document.getElementById('clear-storage').addEventListener('click', function() {
      chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
          console.error('Error clearing the storage:', chrome.runtime.lastError);
        } else {
          console.log('Storage cleared successfully');
        }
      });
    });
  });
  