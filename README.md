# Chrome LLM Summarizer

This Chrome extension allows you to quickly summarize the content of any webpage using a Large Language Model (LLM) API.  You can customize the prompt and settings via an options page.

## Features

*   **Summarize Webpages:** Extracts text from the current webpage and sends it to an LLM API for summarization.
*   **Customizable Prompts:** Specify a custom prompt template, with the `{{content}}` placeholder.
*   **Configurable LLM Settings:** Allows users to configure the API key, API host, and model name used for summarization in the option page.
*   **Error Handling:** Displays descriptive error messages if summarization fails.
*   **Clean User Interface:** Simple popup UI to trigger the summarization process.

## Installation

1.  Download the code from this repository as ZIP, and extract it.

2.  Open Chrome browser

3.  Go to `chrome://extensions/` or click the extension menu to open the extension manage page.

4.  Enable "Developer mode" in the top right corner.

5.  Click "Load unpacked" and select the `chrome-llm-summarizer` directory.

## Usage

1.  Click the extension icon in the Chrome toolbar
2.  Click the "Summarize Current Page" button. The summary will be displayed in the popup. In the loading stage, you shall also see "正在获取内容并总结...".

### Configuration

1.  Right-click the extension icon on the Chrome toolbar.

2.  Choose "Options" to open the options page.

3.  Configure the following required settings: (all required text input)
    *   **API Key:** Your LLM service API secret key.
    *   **API Host/Endpoint:** the base address for the LLM API service. For OpenAI services, you just need to fill in `https://api.openai.com`. Do **NOT** add the path of the actual service. The exact required path part will be added automatically.
    *   **Model Name:** The specific model, like `gpt-3.5-turbo`.
    *   **总结提示语模板:** Please keep the `{{content}}` as placeholder of specific content.

4.  Click "Save Setting" to save.

## File Structure

```
chrome-llm-summarizer/
├── manifest.json            # Extension manifest file
├── options/                 # Options page
│   ├── options.html         # Options UI
│   ├── options.js           # Options logic
│   └── options.css          # Optional CSS
├── popup/                   # Popup page
│   ├── popup.html           # Popup UI
│   ├── popup.js             # Popup logic
│   └── popup.css            # Optional CSS
├── content_scripts/         # Content script
│   └── content.js           # Extracts content from page
├── background/              # Background service worker
│   └── background.js        # Orchestrates summarization process
├── domain/                  # Domain logic
│   ├── llm_client.js        # LLM API client
│   └── storage.js           # Chrome Storage wrapper
└── utils/                   # Utilities
    ├── logger.js            # Logging utility
    └── constants.js         # Constants
```

## Key Components

*   `manifest.json`: Configures extension metadata, permissions, and entry points.
*   `background/background.js`: Background service worker that manages message flow, calls content scripts, and interacts with the LLM API.
*   `content_scripts/content.js`: Injects into web pages and extracts content.
*   `domain/llm_client.js`: Interacts with the LLM API (e.g., OpenAI Chat Completions).  **Important:** This file may need to be modified to suit different LLM APIs.
*   `options/`: Configuration page where users can set their API key, endpoint, and prompt template.
*   `popup/`: User interface that triggers the summary and shows the result.
*   `utils/`: Contains `logger.js` that records detailed log information for problem analysis.

## Configuration

The extension uses `chrome.storage.sync` to store configurations.  You must configure the following settings within the options page:

*   **API Key:** A valid API key for your chosen LLM service.
*   **API Host/Endpoint:** The base URL to the LLM API service (e.g. `https://api.openai.com`). *Do NOT append the service path*, as the specific service path has already been included in the program.
*   **Model Name:**  The specific LLM model to use (e.g., `gpt-3.5-turbo`).
*   **Prompt Template:**  A prompt that describes the summarization task.  The extension replaces the `{{content}}` placeholder in your template with the page content.

## Troubleshooting

*   **Error Messages:** The extension displays some kind of error message, when the LLM cannot respond as normally.
*   **Check Settings:** Ensure your configurations are correct, and the API key is valid .
*    **API Key Balance Checking:** Ensure that your API key has sufficient balance.
*   **Service Worker Logs:** To view detailed logs:
    1.  Go to `chrome://extensions/`.
    2.  Find "chrome-llm-summarizer".
    3.  Click "details", and find "Service Worker", click the link besides that.
*   **Rate Limits:** Check the response status code is 429, which is caused by requests over limited. Try later.
*   **`chrome://` / `chrome-extension://` pages:** The extension cannot run in these restricted pages.

## Important Notes for LLM API

*   **LLM API Adaption:** The `domain/llm_client.js` requires adjustments for different LLM APIs, like POST request and response parsing.
*   **API Endpoints:** For OpenAI Chat Completions API, the complete endpoint URL must be `https://api.openai.com/v1/chat/completions`. However, the settings page only requires `https://api.openai.com` for the “API Host/Endpoint" field.

## Permissions

The extension requests the following permissions:

*   `activeTab`: To access the active tab's URL and inject content scripts.
*   `storage`: To store and retrieve user settings.
*   `scripting`: To inject content scripts into web pages.
*   `host_permissions`: Requires broader access than declared permissions. To allow access to all web pages.

## License

[MIT](LICENSE)