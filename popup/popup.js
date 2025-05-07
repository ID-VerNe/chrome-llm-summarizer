// chrome-llm-summarizer/popup/popup.js

import createLogger from '../utils/logger.js';
import { MESSAGE_TYPES } from '../utils/constants.js';

const logger = createLogger('popup/popup');

// Get DOM elements
const summarizeButton = document.getElementById('summarize-button');
const loadingIndicator = document.getElementById('loading');
const resultContainer = document.getElementById('result-container');
const summaryOutput = document.getElementById('summary-output');
const errorOutput = document.getElementById('error-output');

// Function to show/hide elements
const showElement = (element) => { element.style.display = 'block'; };
const hideElement = (element) => { element.style.display = 'none'; };

// Initial state
hideElement(loadingIndicator);
hideElement(resultContainer); // Hide result container initially
hideElement(errorOutput); // Initially, always hide the error output
errorOutput.textContent = ''; // Clear previous error
summaryOutput.textContent = ''; // Clear previous summary

// Listener for messages from the background script (to receive the summary result)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    logger.info('Popup received message:', request.type);

    if (request.type === MESSAGE_TYPES.SUMMARY_RESULT) {
        logger.info('Received summary result from background.');
        hideElement(loadingIndicator);
        showElement(resultContainer);

        if (request.success) {
            logger.info('Summary successful. Displaying summary.');

            const markdownText = request.summary;
            const html = marked.parse(markdownText);
            const cleanHtml = DOMPurify.sanitize(html);

            errorOutput.textContent = ''; // Clear any previous error
            hideElement(errorOutput); // Hide error div if there is no error
            summaryOutput.innerHTML = cleanHtml
            summaryOutput.marked = true; // Optional: if you use a markdown renderer, flag it

        } else {
            logger.error('Summarization failed. Displaying error:', request.error);
            summaryOutput.textContent = ''; // Clear any previous summary
            errorOutput.textContent = `错误: ${request.error}`;
             showElement(errorOutput); // Now show this, even if it was previously cleared
        }
        return false; // Async nature handled
    }
    logger.warn('Popup received unrecognized message type:', request.type);
     return false;
});

// Event listener for the summarize button
summarizeButton.addEventListener('click', () => {
  logger.info('Summarize button clicked.');

  // Clear previous results and show loading
  hideElement(resultContainer);
  errorOutput.textContent = '';
  hideElement(errorOutput); // Also hide error output on re-summarization
  summaryOutput.textContent = '';
  showElement(loadingIndicator);

  // Send message to background script to trigger summarization
  logger.info('Sending summarizeContent message to background.');
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SUMMARIZE_CONTENT })
    .then(() => {
       logger.info('Message SUMMARIZE_CONTENT sent. Waiting for response...');
       // Response is handled by the chrome.runtime.onMessage listener above
    })
    .catch((error) => {
        logger.errorWithStack('Error sending message to background.', error);
        hideElement(loadingIndicator);
        showElement(resultContainer);
        errorOutput.textContent = `内部错误：无法启动总结进程: ${error.message}`;
        showElement(errorOutput); // Show if initial error starting process (e.g., background offline)
    });
});

logger.info('popup.js script executed.'); // Indicating script loaded