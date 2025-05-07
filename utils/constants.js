// chrome-llm-summarizer/utils/constants.js

/**
 * Define constants used throughout the extension.
 */
export const STORAGE_KEYS = {
  API_KEY: 'llmApiKey',
  API_HOST: 'llmApiHost',
  MODEL_NAME: 'llmModelName',
  PROMPT_TEMPLATE: 'llmPromptTemplate',
};

export const DEFAULT_PROMPT_TEMPLATE = `请总结以下内容，限制在200字以内，并使用markdown列表形式呈现：

{{content}}`; // Placeholder for page content

export const MESSAGE_TYPES = {
  GET_PAGE_CONTENT: 'getPageContent',
  SUMMARIZE_CONTENT: 'summarizeContent',
  SUMMARY_RESULT: 'summaryResult', // Message sent from background to popup with result/error
};

export const ERROR_MESSAGES = {
  SETTINGS_MISSING: 'LLM API settings are missing. Please configure them in the options page.',
  CONTENT_EXTRACTION_FAILED: 'Failed to extract page content.',
  LLM_API_ERROR: 'An error occurred while calling the LLM API.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
};

export const PLACEHOLDER_CONTENT = '{{content}}'; // Consistent placeholder