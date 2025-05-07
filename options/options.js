// chrome-llm-summarizer/options/options.js

import createLogger from '../utils/logger.js';
import { getStorage, setStorage } from '../domain/storage.js';
import { STORAGE_KEYS, DEFAULT_PROMPT_TEMPLATE } from '../utils/constants.js';

const logger = createLogger('options/options');

// Function to display status messages
const showStatus = (message, isError = false) => {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = isError ? 'status error' : 'status success';
  statusElement.style.display = 'block';
};

// Load settings when the page loads
const loadSettings = async () => {
  logger.info('Attempting to load settings from storage.');
  try {
    const items = await getStorage([
      STORAGE_KEYS.API_KEY,
      STORAGE_KEYS.API_HOST,
      STORAGE_KEYS.MODEL_NAME,
      STORAGE_KEYS.PROMPT_TEMPLATE,
    ]);

    logger.info('Settings loaded:', items);

    document.getElementById('api-key').value = items[STORAGE_KEYS.API_KEY] || '';
    document.getElementById('api-host').value = items[STORAGE_KEYS.API_HOST] || '';
    document.getElementById('model-name').value = items[STORAGE_KEYS.MODEL_NAME] || '';
    // Use default template if none is saved
    document.getElementById('prompt-template').value = items[STORAGE_KEYS.PROMPT_TEMPLATE] || DEFAULT_PROMPT_TEMPLATE;

    logger.info('Settings successfully loaded into the form.');

  } catch (error) {
    logger.errorWithStack('Failed to load settings.', error);
    showStatus('加载设置失败: ' + error.message, true);
  }
};

// Save settings when the button is clicked
const saveSettings = async () => {
  logger.info('Attempting to save settings from the form.');
  const apiKey = document.getElementById('api-key').value.trim();
  const apiHost = document.getElementById('api-host').value.trim();
  const modelName = document.getElementById('model-name').value.trim();
  const promptTemplate = document.getElementById('prompt-template').value.trim();

  if (!apiKey || !apiHost || !modelName || !promptTemplate) {
      showStatus('所有字段均为必填项。', true);
      logger.warn('Attempted to save with missing fields.');
      return;
  }

  const settingsToSave = {
    [STORAGE_KEYS.API_KEY]: apiKey,
    [STORAGE_KEYS.API_HOST]: apiHost,
    [STORAGE_KEYS.MODEL_NAME]: modelName,
    [STORAGE_KEYS.PROMPT_TEMPLATE]: promptTemplate,
  };

  logger.info('Settings prepared for saving:', settingsToSave);

  try {
    await setStorage(settingsToSave);
    showStatus('设置已保存。');
    logger.info('Settings saved successfully.');
  } catch (error) {
    logger.errorWithStack('Failed to save settings.', error);
    showStatus('保存设置失败: ' + error.message, true);
  }
};

// Add event listener to the save button
document.addEventListener('DOMContentLoaded', () => {
  logger.info('Options page DOM fully loaded.');
  loadSettings();
  document.getElementById('save-button').addEventListener('click', saveSettings);
  logger.info('Event listener added to save button.');
});

logger.info('options.js script executed.'); // Indicating script loaded