'use strict';

import background from './scripts/background';

const manifest = chrome.runtime.getManifest();
const isMonitoring = () => { return chrome.webRequest.onBeforeRequest.hasListener(background.requestHandler) }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TOGGLE_MONITORING') {
    if(isMonitoring()) {
      chrome.webRequest.onBeforeRequest.removeListener(background.requestHandler)
      chrome.action.setIcon({ path: manifest.action.default_icon });
    } else {
      chrome.webRequest.onBeforeRequest.addListener(background.requestHandler, {urls: ['<all_urls>']});
      chrome.action.setIcon({path: "icons/icon_128_play.png"});
    }
    sendResponse({isMonitoring: isMonitoring()});
  } else if(request.type === 'GET_MONITORING_STATUS') {
    sendResponse({isMonitoring: isMonitoring()});
  } else if (request.type === 'SYNC_DATA') {
    sendResponse({verificationInfos: background.canistersByInitiator, dataUpdated: background.dataUpdated});
    background.dataUpdated = false
  } else if (request.type === 'CREAR_DATA') {
    background.canistersByInitiator = {}
    console.log("Data cleared", background.canistersByInitiator)
    sendResponse({})
  }
  return true;
});

chrome.runtime.onInstalled.addListener(async() => {
  chrome.storage.local.set({canistersByInitiator: {}, cycleInfoByCanisterId: {}, metadataByCanisterId: {}})
})

chrome.runtime.onSuspend.addListener(() => {
  console.log("Background onSuspend...");
  chrome.webRequest.onBeforeRequest.removeListener(background.requestHandler)
  chrome.action.setIcon({ path: manifest.action.default_icon });
});
