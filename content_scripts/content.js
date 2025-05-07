// chrome-llm-summarizer/content_scripts/content.js

// Wrap the entire script in an IIFE to create a new scope on each injection
(() => {

    // --- Start: Inlined Dependencies ---

    /**
     * Simple logger utility wrapping console methods.
     * Adds context such as the module name.
     * Inlined for Content Scripts where imports are not natively supported when injected via executeScript.
     */
    const createLogger = (moduleName) => {
      const log = (level, ...args) => {
        const timestamp = new Date().toISOString();
        // Simple serialization for logging
        const message = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              // Limited depth stringify to avoid massive console output, handle potential circular references
              return JSON.stringify(arg, (key, value) => {
                 if (typeof value === 'object' && value !== null) {
                     // Simple check for circularity, can be made more robust
                     if (args.includes(value)) return '[Circular]';
                 }
                 return value;
              }, 2);
            } catch (e) {
              return String(arg) + ' (Stringify Error)'; // Fallback for complex objects
            }
          }
          return String(arg);
        }).join(' ');
        console[level](`[${timestamp}] [${level.toUpperCase()}] [${moduleName}] - ${message}`);
      };

      return {
        debug: (...args) => log('debug', ...args),
        info: (...args) => log('info', ...args),
        warn: (...args) => log('warn', ...args),
        error: (...args) => log('error', ...args),
        // Use console.error for errors, it often includes stack trace in browser consoles
        errorWithStack: (message, error) => console.error(`[${new Date().toISOString()}] [ERROR] [${moduleName}] - ${message}`, error)
      };
    };

    /**
     * Define constants used throughout the extension.
     * Inlined for Content Scripts.
     */
    const MESSAGE_TYPES = {
      GET_PAGE_CONTENT: 'getPageContent',
      SUMMARIZE_CONTENT: 'summarizeContent',
      SUMMARY_RESULT: 'summaryResult',
    };

    const ERROR_MESSAGES = {
      SETTINGS_MISSING: 'LLM API settings are missing. Please configure them in the options page.',
      CONTENT_EXTRACTION_FAILED: 'Failed to extract page content.',
      LLM_API_ERROR: 'An error occurred while calling the LLM API.',
      UNKNOWN_ERROR: 'An unknown error occurred.',
    };

    // --- End: Inlined Dependencies ---

    const logger = createLogger('content_scripts/content');

    logger.info('Content script injected and running.');

    // Function to safely extract text content from the page
    const extractPageContent = () => {
        logger.info('Attempting to extract page content.');
        let content = '';
        try {
            // Prefer innerText as it's closer to visible text for better summary relevance
            // Fallback to textContent if innerText is empty (e.g., for <pre> tags sometimes)
            // Further fallback to documentElement.textContent if body somehow fails
            if (document.body) {
                 content = document.body.innerText || document.body.textContent || '';
                 logger.debug(`Extracted from document.body. innerText length: ${document.body.innerText?.length}, textContent length: ${document.body.textContent?.length}, chosen content length: ${content.length}`);
            } else if (document.documentElement) {
                 content = document.documentElement.innerText || document.documentElement.textContent || '';
                 logger.debug(`Extracted from document.documentElement. content length: ${content.length}`);
            }

            // Basic filtering: remove excessive newlines and trim leading/trailing whitespace
            content = content.replace(/\n{2,}/g, '\n').trim();

            logger.info(`Content extraction finished. Final length: ${content.length}.`);
            // Log first and last part of content, useful for very large strings
            logger.debug('Extracted content (first 200 chars):', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
            if (content.length > 400) { // Also log the end for large content
                 logger.debug('Extracted content (last 200 chars):', '...' + content.substring(content.length - Math.min(200, content.length / 2))); // Log end, min 200 chars or half length if short
            }

            if (content.length === 0) {
                 logger.warn('Extracted content is empty.');
                 // Maybe refine extractPageContent to select specific elements or use alternative methods if needed for specific sites.
                 // For now, returning empty string is okay, background script might handle it (e.g., LLM might return empty summary).
                 // Or we could return null to explicitly indicate extraction failure on empty? Let's return content for now.
            }

            return content;
        } catch (error) {
            logger.errorWithStack('Error during page content extraction.', error);
            // Indicate extraction failure explicitly
            return null; // Or an empty string with appropriate error handling downstream
        }
    };

    // The main execution logic for this content script
    // It runs immediately once the script is injected
    (async () => {
        logger.debug('Content script main execution started within IIFE.');
        const pageContent = extractPageContent(); // This might return null on error

        if (pageContent !== null) { // Check if extraction was successful (did not return null)
            // Send the extracted content back to the sender (likely the background script)
            logger.info('Sending content extraction success message...');
            // Use chrome.runtime.sendMessage to communicate with the background script
            chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.GET_PAGE_CONTENT,
                success: true,
                content: pageContent
            }).then(() => {
                logger.info('Message GET_PAGE_CONTENT (success) sent.');
                // Note: The promise from sendMessage resolves when the message is sent,
                // not when the background script finishes processing or sends a reply.
                // The background script listens for this message and sends its own reply later.
            }).catch(error => {
                // Log error if sending message fails (e.g., background script not active or invalid message)
                 logger.errorWithStack('Failed to send success message with content.', error);
            });

        } else {
            // Send an error message back if extraction failed
            logger.warn('Page content extraction failed based on return value.');
             chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.GET_PAGE_CONTENT,
                success: false,
                error: ERROR_MESSAGES.CONTENT_EXTRACTION_FAILED
            }).then(() => {
                logger.info('Message GET_PAGE_CONTENT (failure) sent.');
            }).catch(error => {
                 logger.errorWithStack('Failed to send error message.', error);
            });
        }
        logger.debug('Content script main execution finished within IIFE.');
    })();

})(); // End of IIFE