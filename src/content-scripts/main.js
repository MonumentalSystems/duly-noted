/**
 * Main Content Script
 * Entry point for all content scripts. Initializes modules and handles communication with the extension.
 * Loaded after namespace.js, element-inspector.js, element-selector.js, console-interceptor.js
 */

class ContentScriptCoordinator {
  constructor() {
    this.elementInspector = new window.DulyNoted.ElementInspector();
    this.elementSelector = new window.DulyNoted.ElementSelector();
    this.consoleInterceptor = new window.DulyNoted.ConsoleInterceptor();
    this.webClipper = new window.DulyNoted.WebClipper();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) {
      return;
    }

    this.elementInspector.init();
    this.elementSelector.init();
    this.consoleInterceptor.init();

    this.setupMessageListener();

    this.isInitialized = true;

    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_INITIALIZED'
    }).catch(() => {});
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'PING':
          sendResponse({ success: true, initialized: this.isInitialized });
          return true;

        case 'INSPECT_ELEMENT':
          this.elementInspector.inspect(message.elementId)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true;

        case 'GET_ELEMENT_INFO':
          this.elementInspector.getElementInfo(message.selector)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true;

        case 'START_ELEMENT_SELECTION':
          this.elementSelector.enable();
          sendResponse({ success: true });
          return true;

        case 'STOP_ELEMENT_SELECTION':
          this.elementSelector.disable();
          sendResponse({ success: true });
          return true;

        case 'HIGHLIGHT_ELEMENT':
          this.elementSelector.highlightElement(message.selector);
          sendResponse({ success: true });
          return true;

        case 'REMOVE_HIGHLIGHT':
          this.elementSelector.removeHighlight();
          sendResponse({ success: true });
          return true;

        case 'START_CONSOLE_MONITORING':
          this.consoleInterceptor.startMonitoring();
          sendResponse({ success: true });
          return true;

        case 'STOP_CONSOLE_MONITORING':
          this.consoleInterceptor.stopMonitoring();
          sendResponse({ success: true });
          return true;

        case 'GET_CONSOLE_LOGS':
          const logs = this.consoleInterceptor.getLogs(message.filter);
          sendResponse({ success: true, logs });
          return true;

        case 'CLEAR_CONSOLE_LOGS':
          this.consoleInterceptor.clearLogs();
          sendResponse({ success: true });
          return true;

        case 'CAPTURE_WEB_PAGE':
          try {
            sendResponse({ success: true, data: this.webClipper.capture() });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          return true;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    });
  }
}

const coordinator = new ContentScriptCoordinator();
coordinator.init();

window.DulyNoted.coordinator = coordinator;
