'use strict';
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  sendResponse({});
  return true;
});