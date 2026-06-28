const WEBHOOK_STORAGE_KEY = "webhookConfig";

const DEFAULT_WEBHOOK_CONFIG = {
  url: "",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

const ALLOWED_HTTP_METHODS = ["POST", "PUT", "PATCH"];

function formatHeadersJson(headers) {
  return JSON.stringify(headers || {}, null, 2);
}

function parseHeadersJson(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Headers must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Headers must be a JSON object.");
  }

  const headers = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.trim()) {
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(`Header "${key}" must be a string value.`);
    }
    headers[key] = value;
  }

  return headers;
}

function normalizeWebhookConfig(config) {
  const method = (config?.method || DEFAULT_WEBHOOK_CONFIG.method).toUpperCase();
  return {
    url: (config?.url || "").trim(),
    method: ALLOWED_HTTP_METHODS.includes(method) ? method : DEFAULT_WEBHOOK_CONFIG.method,
    headers: config?.headers && typeof config.headers === "object" ? config.headers : DEFAULT_WEBHOOK_CONFIG.headers,
  };
}

async function getWebhookConfig() {
  const stored = await chrome.storage.local.get(WEBHOOK_STORAGE_KEY);
  return normalizeWebhookConfig(stored[WEBHOOK_STORAGE_KEY] || DEFAULT_WEBHOOK_CONFIG);
}

async function saveWebhookConfig(config) {
  const normalized = normalizeWebhookConfig(config);
  await chrome.storage.local.set({ [WEBHOOK_STORAGE_KEY]: normalized });
  return normalized;
}

async function sendTranscriptToWebhook(config, payload) {
  const normalized = normalizeWebhookConfig(config);
  if (!normalized.url) {
    return { skipped: true };
  }

  const requestOptions = {
    method: normalized.method,
    headers: { ...normalized.headers },
    body: JSON.stringify(payload),
  };

  const response = await fetch(normalized.url, requestOptions);
  if (!response.ok) {
    throw new Error(`Webhook request failed (${response.status}).`);
  }

  return { ok: true };
}
