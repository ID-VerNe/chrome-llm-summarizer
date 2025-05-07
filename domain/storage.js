// chrome-llm-summarizer/domain/storage.js

import createLogger from '../utils/logger.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const logger = createLogger('domain/storage');

/**
 * Saves multiple key-value pairs to Chrome Sync Storage.
 * @param {object} data - An object containing key-value pairs to save (e.g., { key1: value1, key2: value2 }).
 * @returns {Promise<void>}
 */
export const setStorage = async (data) => {
  logger.info('Attempting to save data to storage:', Object.keys(data));
  try {
    await chrome.storage.sync.set(data);
    logger.info('Data saved successfully to storage.');
  } catch (error) {
    logger.errorWithStack('Failed to save data to storage.', error);
    throw new Error('Failed to save settings.');
  }
};

/**
 * Retrieves multiple values from Chrome Sync Storage.
 * @param {string|string[]|object|null} keys - A key string or array of key strings to retrieve, or an object to default to. Defaults to all items if null.
 * @returns {Promise<object>} - A promise that resolves with an object containing the retrieved key-value pairs.
 */
export const getStorage = async (keys) => {
  logger.info('Attempting to get data from storage for keys:', keys === null ? 'all' : keys);
  try {
    const result = await chrome.storage.sync.get(keys);
    logger.info('Data retrieved successfully from storage:', result);
    return result;
  } catch (error) {
    logger.errorWithStack('Failed to get data from storage.', error);
    throw new Error('Failed to retrieve settings.');
  }
};