// chrome-llm-summarizer/domain/llm_client.js

import createLogger from '../utils/logger.js';
import { getStorage } from './storage.js';
import { STORAGE_KEYS, ERROR_MESSAGES, PLACEHOLDER_CONTENT } from '../utils/constants.js';

const logger = createLogger('domain/llm_client');

// THIS SECTION IS ADAPTED FOR OPENAI CHAT COMPLETIONS API
// You MUST adjust this section based on the SPECIFIC LLM API you are using.
const makeApiRequest = async (apiHost, apiKey, modelName, promptText) => {
  logger.info('Attempting to make LLM API request (assuming OpenAI Chat Completions format). Host:', apiHost, 'Model:', modelName);
  logger.debug('Request Prompt (first 200 chars):', promptText.substring(0, 200) + (promptText.length > 200 ? '...' : ''));

  // For OpenAI Chat Completions, the standard endpoint is /v1/chat/completions
  // Assume apiHost is the base like "https://api.openai.com"
  const fullApiUrl = `${apiHost}/v1/chat/completions`; // Explicitly use OpenAI Chat Completions endpoint

  logger.info('LLM API full request URL:', fullApiUrl);

  // OpenAI Chat Completions API requires a 'messages' array in the body
  const requestBody = {
    model: modelName, // e.g., 'gpt-3.5-turbo'
    messages: [
      // You can optionally add a system message here to guide the model's behavior
      // { role: "system", content: "You are a helpful assistant that summarizes text concisely." },
      {
        role: "user",
        content: promptText // The entire prompt text including the page content substitution
      }
    ],
    // Add optional parameters like temperature, max_tokens etc.
    // max_tokens is important to control summary length. You could add a setting for this.
     max_tokens: 5000, // Example: Limit output to ~200 tokens (roughly corresponds to 200 Chinese characters)
     temperature: 0.7,
     // N.B.: The prompt template also asks for 200 characters. max_tokens controls tokens, not characters directly,
     // but setting it around the expected character count is a reasonable starting point.
  };
  logger.debug('OpenAI Request Body:', requestBody);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Set a timeout for the request (e.g., 60 seconds)

    const response = await fetch(fullApiUrl, { // Use the constructed full URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // OpenAI uses Authorization: Bearer header for API Key
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // Clear timeout if request completes

    logger.info('LLM API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text(); // Get error body for more details
       logger.error(`LLM API returned error status ${response.status}: ${errorBody}`);
      // Attempt to parse JSON error if possible
      try {
         const errorJson = JSON.parse(errorBody);
         // OpenAI error structure: { error: { message, type, param, code } }
         throw new Error(`${ERROR_MESSAGES.LLM_API_ERROR} Status: ${response.status}. Details: ${errorJson.error?.message || JSON.stringify(errorJson)}`);
      } catch (parseError) {
         // If parsing fails or no specific error message
         throw new Error(`${ERROR_MESSAGES.LLM_API_ERROR} Status: ${response.status}. Response: ${errorBody.substring(0, 200)}...`); // Log part of response to avoid huge logs
      }
    }

    const responseData = await response.json();
    logger.debug('LLM API raw response data:', responseData);

    // --- IMPORTANT: Extract summary based on OPENAI CHAT COMPLETIONS response structure ---
    // OpenAI Chat Completions response structure: { choices: [{ message: { content: "..." } }] }
    // Need to handle potential missing fields gracefully

    const summary = responseData.choices?.[0]?.message?.content || '';

    // Check if summary was extracted
    if (!summary) {
         // Log the response data to understand why summary wasn't found
         logger.error('LLM API response did not contain expected summary field in OpenAI format.');
         logger.debug('Raw response data missing OpenAI summary path:', responseData);
         throw new Error(`${ERROR_MESSAGES.LLM_API_ERROR} Invalid API response format or empty content in response.`);
    }

    logger.info('Successfully received summary from LLM API (first 100 chars):', summary.substring(0, 100) + '...');
    return summary;

  } catch (error) {
    if (error.name === 'AbortError') {
        logger.error('LLM API request timed out.');
        throw new Error(`${ERROR_MESSESAGES.LLM_API_ERROR} Request timed out.`);
    } else {
        logger.errorWithStack('Error during LLM API request.', error);
        // Check if it's already a specific error message we threw
        if (error.message.startsWith(ERROR_MESSAGES.LLM_API_ERROR)) {
             throw error; // Re-throw the specific error we created
        }
        throw new Error(`${ERROR_MESSAGES.LLM_API_ERROR} Network or unexpected issue: ${error.message}`);
    }
  }
};

/**
 * Orchestrates the summarization process: fetches settings, prepares prompt, calls API.
 * @param {string} pageContent - The text content of the webpage.
 * @returns {Promise<string>} - A promise that resolves with the summary text.
 */
export const summarizeContentWithLLM = async (pageContent) => {
  logger.info('Starting summarization process.');

  // 1. Load settings
  const settings = await getStorage([
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.API_HOST,
    STORAGE_KEYS.MODEL_NAME,
    STORAGE_KEYS.PROMPT_TEMPLATE,
  ]);

  // 2. Validate settings
  const {
    llmApiKey,
    llmApiHost,
    llmModelName,
    llmPromptTemplate
  } = settings;

  // Basic validation for required settings
  if (!llmApiKey || !llmApiHost || !llmModelName || !llmPromptTemplate) {
    logger.warn('LLM API settings are incomplete.');
    // Send a specific error that the popup can display
    throw new Error(ERROR_MESSAGES.SETTINGS_MISSING);
  }

  logger.info('Settings loaded successfully.');
  // Avoid logging API Key
  logger.debug('Loaded Settings (excluding API Key):', { llmApiHost, llmModelName, llmPromptTemplate });

  // 3. Prepare the prompt
  // Replace the placeholder {{content}} with the actual page content
  // Use split/join for robustness against potential issues with regex in some content
  const promptText = llmPromptTemplate.split(PLACEHOLDER_CONTENT).join(pageContent);
  logger.info(`Prompt prepared by replacing "${PLACEHOLDER_CONTENT}".`);
  logger.debug('Final Prompt (first 200 chars):', promptText.substring(0, 200) + (promptText.length > 200 ? '...' : ''));

  // 4. Call the LLM API
  logger.info('Calling makeApiRequest with prepared prompt.');
  const summary = await makeApiRequest(llmApiHost, llmApiKey, llmModelName, promptText);

  logger.info('Summarization process completed successfully.');
  return summary;
};