// chrome-llm-summarizer/background/background.js

import createLogger from '../utils/logger.js';
import { MESSAGE_TYPES, ERROR_MESSAGES } from '../utils/constants.js';
import { summarizeContentWithLLM } from '../domain/llm_client.js';

const logger = createLogger('background/background');

logger.info('Background service worker started.');

// Use a Map to store pending requests/promises keyed by tabId
const pendingContentRequests = new Map();

// Listener for messages from other parts of the extension (e.g., popup, content scripts)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Log incoming message types, but avoid logging sensitive data or huge content here
    logger.info('Received message:', request.type, 'from sender:', sender.tab ? `Tab ${sender.tab.id}` : 'Extension');

    // Handle message to get page content from the content script
    if (request.type === MESSAGE_TYPES.GET_PAGE_CONTENT) {
        logger.debug(`Handling ${MESSAGE_TYPES.GET_PAGE_CONTENT} message.`);
        // Check if there's a pending request waiting for this content from this tab
        if (sender.tab?.id && pendingContentRequests.has(sender.tab.id)) {
            logger.info(`Received content response from content script for tab ${sender.tab.id}. Success: ${request.success}.`);
            const resolve = pendingContentRequests.get(sender.tab.id);
            pendingContentRequests.delete(sender.tab.id);
            resolve(request); // Resolve the promise in the message handler below
        } else {
             // This might happen if a previous cleanup failed or message was sent unexpectedly
             logger.warn(`Received ${MESSAGE_TYPES.GET_PAGE_CONTENT} message without a pending request or valid tab ID. Tab ID: ${sender.tab?.id}.`);
        }
        // No sendResponse here, as handling is asynchronous via promises.
        return false;
    }

    // Handle summarization request from the popup
    if (request.type === MESSAGE_TYPES.SUMMARIZE_CONTENT) {
        logger.info('Received summarization request from popup.');

        // Need the active tab to inject the content script
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.id) {
                logger.error('Could not get active tab ID.');
                // Send error back to popup
                chrome.runtime.sendMessage(sender.id, {
                    type: MESSAGE_TYPES.SUMMARY_RESULT,
                    success: false,
                    error: ERROR_MESSAGES.UNKNOWN_ERROR // Generic error for tab access
                });
                return;
            }

            const tabId = activeTab.id;
            const tabUrl = activeTab.url;
            logger.info(`Targeting active tab ID: ${tabId}, URL: ${tabUrl}`);

            // --- NEW: Check for restricted URLs ---
            if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://')) {
                logger.warn(`Cannot summarize content on restricted URL: ${tabUrl}`);
                 chrome.runtime.sendMessage(sender.id, {
                    type: MESSAGE_TYPES.SUMMARY_RESULT,
                    success: false,
                    error: `无法在 ${tabUrl} 页面上进行总结。请在普通网页上使用。`
                });
                return; // Stop processing
            }
             // Add other restricted schemes if necessary, e.g., file://
             // if (tabUrl.startsWith('file://')) { ... handle file URLs which require 'allow file access from extensions' }

            // --- END NEW ---

            try {
                // 1. Inject content script and get page content (using a promise to wait for response)
                logger.info(`Injecting content script into tab ${tabId}.`);
                // Create a promise and store its resolve function, keyed by tabId
                const contentPromise = new Promise((resolve) => {
                   pendingContentRequests.set(tabId, resolve);
                });

                // Execute the content script
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content_scripts/content.js'] // Path to your content script
                    // Note: Content scripts injected this way run in an isolated world.
                    // The function defined in content.js will send a message back.
                });
                 logger.info(`Content script injection requested for tab ${tabId}. Waiting for response via message.`);

                // Wait for the content script to send the content back via message
                // Add a timeout for waiting for the content script response
                const contentResponse = await Promise.race([
                    contentPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Content script response timed out.')), 15000) // 15 seconds timeout
                    )
                ]);
                logger.debug(`Content script response promise settled for tab ${tabId}.`);

                if (!contentResponse || !contentResponse.success) {
                    const extractionError = contentResponse?.error || ERROR_MESSAGES.CONTENT_EXTRACTION_FAILED;
                    logger.error(`Failed to receive content or content extraction failed message from content script for tab ${tabId}. Error: ${extractionError}.`);
                     chrome.runtime.sendMessage(sender.id, {
                        type: MESSAGE_TYPES.SUMMARY_RESULT,
                        success: false,
                        error: extractionError
                    });
                    return;
                }

                const pageContent = contentResponse.content;
                logger.info(`Page content successfully retrieved from tab ${tabId}. Length: ${pageContent.length}`);

                // 2. Call the LLM summarization function
                // Only proceed if extracted a non-empty content (optional, LLM API might handle empty)
                if (!pageContent || pageContent.trim().length === 0) {
                     logger.warn(`Extracted content is empty or only whitespace for tab ${tabId}. Cannot summarize.`);
                      chrome.runtime.sendMessage(sender.id, {
                        type: MESSAGE_TYPES.SUMMARY_RESULT,
                        success: false,
                        error: '无法提取页面内容进行总结（内容为空）。'
                    });
                     return;
                }

                logger.info('Calling summarizeContentWithLLM...');
                const summary = await summarizeContentWithLLM(pageContent);

                // 3. Send the summary back to the popup
                logger.info('Summarization successful. Sending result back to popup.');
                chrome.runtime.sendMessage(sender.id, {
                    type: MESSAGE_TYPES.SUMMARY_RESULT,
                    success: true,
                    summary: summary
                });

            } catch (error) {
                // Catch blocks should log the error immediately upon catching
                logger.errorWithStack('Error during summarization process.', error);
                // Send error back to popup
                chrome.runtime.sendMessage(sender.id, {
                    type: MESSAGE_TYPES.SUMMARY_RESULT,
                    success: false,
                    error: error.message || ERROR_MESSAGES.UNKNOWN_ERROR
                });
            } finally {
                 // Ensure pending request is cleaned up, even on error
                 if (pendingContentRequests.has(tabId)) {
                     pendingContentRequests.delete(tabId);
                     logger.debug(`Cleaned up pending content request entry for tab ${tabId}.`);
                 }
            }
        });

        // Return true to indicate that sendResponse will be called asynchronously
        // Note: Using async tabs.query makes synchronous sendResponse difficult.
        // We use chrome.runtime.sendMessage from within the async callback instead.
        // Returning true is still correct here because we are sending a response via message.
        return true;
    }

    // If the message type is not recognized
    logger.warn('Received message with unrecognized type:', request.type);
    // Return false for messages that are not handled asynchronously by sendResponse
    return false;
});

logger.info('Background script finished initial execution.');