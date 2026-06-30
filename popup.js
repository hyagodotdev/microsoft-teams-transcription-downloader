const statusEl = document.getElementById("status");
const meetingTitleEl = document.getElementById("meeting-title");
const meetingDateEl = document.getElementById("meeting-date");
const pageNoticeEl = document.getElementById("page-notice");
const pageNoticeTextEl = document.getElementById("page-notice-text");
const popupReadyEl = document.getElementById("popup-ready");
const settingsModalEl = document.getElementById("settings-modal");
const settingsBackdropEl = document.getElementById("settings-backdrop");
const settingsFormEl = document.getElementById("settings-form");
const settingsStatusEl = document.getElementById("settings-status");
const webhookUrlEl = document.getElementById("webhook-url");
const webhookMethodEl = document.getElementById("webhook-method");
const webhookHeadersEl = document.getElementById("webhook-headers");
const btnSendApiEl = document.getElementById("btn-send-api");
const categorySelectEl = document.getElementById("category-select");
const categoriesModalEl = document.getElementById("categories-modal");
const categoriesBackdropEl = document.getElementById("categories-backdrop");
const categoryAddFormEl = document.getElementById("category-add-form");
const categoryNameInputEl = document.getElementById("category-name-input");
const categoriesListEl = document.getElementById("categories-list");
const categoriesEmptyEl = document.getElementById("categories-empty");
const categoriesStatusEl = document.getElementById("categories-status");

const TRANSCRIPT_PAGE_MESSAGE =
  "Open this extension on the Teams meeting recording page with the transcript panel visible to collect and download it.";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#0f766e";
}

function setSettingsStatus(message, isError = false) {
  settingsStatusEl.textContent = message;
  settingsStatusEl.classList.toggle("is-error", isError);
}

function setCategoriesStatus(message, isError = false) {
  categoriesStatusEl.textContent = message;
  categoriesStatusEl.classList.toggle("is-error", isError);
}

async function openSettingsModal() {
  const config = await getWebhookConfig();
  webhookUrlEl.value = config.url;
  webhookMethodEl.value = config.method;
  webhookHeadersEl.value = formatHeadersJson(config.headers);
  setSettingsStatus("");
  settingsModalEl.classList.add("is-open");
  webhookUrlEl.focus();
}

function closeSettingsModal() {
  settingsModalEl.classList.remove("is-open");
  setSettingsStatus("");
}

function wireSettingsUi() {
  document.getElementById("btn-settings").addEventListener("click", () => {
    openSettingsModal();
  });

  document.getElementById("btn-settings-cancel").addEventListener("click", () => {
    closeSettingsModal();
  });

  settingsBackdropEl.addEventListener("click", () => {
    closeSettingsModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (categoriesModalEl.classList.contains("is-open")) {
      closeCategoriesModal();
      return;
    }

    if (settingsModalEl.classList.contains("is-open")) {
      closeSettingsModal();
    }
  });

  settingsFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const headers = parseHeadersJson(webhookHeadersEl.value);
      const saved = await saveWebhookConfig({
        url: webhookUrlEl.value,
        method: webhookMethodEl.value,
        headers,
      });

      webhookUrlEl.value = saved.url;
      webhookMethodEl.value = saved.method;
      webhookHeadersEl.value = formatHeadersJson(saved.headers);
      setSettingsStatus("Settings saved.");
      await updateApiButtonState();
      window.setTimeout(() => {
        closeSettingsModal();
      }, 500);
    } catch (error) {
      setSettingsStatus(error.message || "Could not save settings.", true);
    }
  });
}

async function updateApiButtonState() {
  const config = await getWebhookConfig();
  const categories = await getCategoriesConfig();
  const hasApi = Boolean(config.url);
  const hasCategory = Boolean(categories.selectedId);

  btnSendApiEl.disabled = !hasApi || !hasCategory;

  if (!hasApi) {
    btnSendApiEl.title = "Configure API settings to enable";
  } else if (!hasCategory) {
    btnSendApiEl.title = "Select a category to enable";
  } else {
    btnSendApiEl.title = "Send transcript to configured API";
  }
}

async function populateCategorySelect() {
  const config = await getCategoriesConfig();
  const currentValue = config.selectedId || "";

  categorySelectEl.innerHTML = '<option value="">Select a category...</option>';

  for (const item of config.items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    categorySelectEl.appendChild(option);
  }

  categorySelectEl.value = currentValue;
}

function renderCategoriesList(items) {
  categoriesListEl.innerHTML = "";

  for (const item of items) {
    const listItem = document.createElement("li");
    listItem.className = "categories-list__item";

    const name = document.createElement("span");
    name.className = "categories-list__name";
    name.textContent = item.name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "categories-list__remove";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove category ${item.name}`);
    removeButton.addEventListener("click", async () => {
      try {
        await removeCategory(item.id);
        setCategoriesStatus(`"${item.name}" removed.`);
        await refreshCategoriesUi();
      } catch (error) {
        setCategoriesStatus(error.message || "Could not remove category.", true);
      }
    });

    listItem.append(name, removeButton);
    categoriesListEl.appendChild(listItem);
  }

  const isEmpty = items.length === 0;
  categoriesEmptyEl.hidden = !isEmpty;
  categoriesListEl.hidden = isEmpty;
}

async function refreshCategoriesUi() {
  const config = await getCategoriesConfig();
  renderCategoriesList(config.items);
  await populateCategorySelect();
  await updateApiButtonState();
}

async function openCategoriesModal() {
  const config = await getCategoriesConfig();
  renderCategoriesList(config.items);
  setCategoriesStatus("");
  categoriesModalEl.classList.add("is-open");
  categoryNameInputEl.focus();
}

function closeCategoriesModal() {
  categoriesModalEl.classList.remove("is-open");
  setCategoriesStatus("");
}

function wireCategoriesUi() {
  document.getElementById("btn-categories").addEventListener("click", () => {
    openCategoriesModal();
  });

  document.getElementById("btn-categories-close").addEventListener("click", () => {
    closeCategoriesModal();
  });

  categoriesBackdropEl.addEventListener("click", () => {
    closeCategoriesModal();
  });

  categoryAddFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const name = categoryNameInputEl.value;
      await addCategory(name);
      categoryNameInputEl.value = "";
      setCategoriesStatus("Category added.");
      await refreshCategoriesUi();
      categoryNameInputEl.focus();
    } catch (error) {
      setCategoriesStatus(error.message || "Could not add category.", true);
    }
  });

  categorySelectEl.addEventListener("change", async () => {
    await setSelectedCategoryId(categorySelectEl.value || null);
    await updateApiButtonState();
  });
}

async function collectTranscriptFromActiveTab() {
  const tab = await getCurrentTab();
  if (!tab?.id) {
    throw new Error("Could not access the active tab.");
  }

  const metadataPromise = fetchMeetingMetadata(tab.id);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: collectTranscriptOnPage,
  });

  const metadata = await metadataPromise;
  updateMeetingInfo(metadata);

  if (result?.error === "no_transcript") {
    return { error: "no_transcript" };
  }

  if (!result?.entries || result.entries.length === 0) {
    return { error: "no_entries" };
  }

  return { metadata, entries: result.entries };
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function sanitizeFilenamePart(value, maxLength = 80) {
  return (value || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const dmy = value.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const ptMonths = {
    janeiro: "01",
    fevereiro: "02",
    marco: "03",
    março: "03",
    abril: "04",
    maio: "05",
    junho: "06",
    julho: "07",
    agosto: "08",
    setembro: "09",
    outubro: "10",
    novembro: "11",
    dezembro: "12",
  };
  const ptDate = value.match(/(\d{1,2})\s+de\s+(\p{L}+)\s+de\s+(\d{4})/iu);
  if (ptDate) {
    const month = ptMonths[ptDate[2].toLowerCase()];
    if (month) {
      return `${ptDate[3]}-${month}-${ptDate[1].padStart(2, "0")}`;
    }
  }

  return sanitizeFilenamePart(value, 10).replace(/\s/g, "_");
}

function toApiDate(value) {
  const iso = toIsoDate(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
}

function updateMeetingInfo(metadata) {
  const title = metadata?.title?.trim();
  const displayDate = formatDisplayDate(metadata?.date);

  meetingTitleEl.textContent = title || "Not available";
  meetingTitleEl.classList.toggle("is-muted", !title);

  if (displayDate) {
    meetingDateEl.textContent = displayDate;
    meetingDateEl.hidden = false;
  } else {
    meetingDateEl.textContent = "";
    meetingDateEl.hidden = true;
  }
}

function isTranscriptViewOnPage() {
  return Boolean(document.querySelector('[id^="sub-entry-"], [id^="entry-"]'));
}

function showInvalidPage(message) {
  pageNoticeTextEl.textContent = message;
  pageNoticeEl.hidden = false;
  popupReadyEl.hidden = true;
}

function showTranscriptPage() {
  pageNoticeEl.hidden = true;
  popupReadyEl.hidden = false;
}

async function checkTranscriptView(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: isTranscriptViewOnPage,
  });
  return Boolean(result);
}

function extractMeetingMetadataOnPage() {
  const metadata = { title: "", date: "", duration: "" };

  const titleSelectors = [
    "h1",
    '[data-tid="call-title"]',
    '[data-tid="meeting-title"]',
    '[data-tid="title"]',
    '[class*="meetingTitle" i]',
    '[class*="recordingTitle" i]',
    'header [role="heading"]',
  ];

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    const text = element?.textContent?.replace(/\s+/g, " ").trim();
    if (text && text.length > 1 && text.length < 300) {
      metadata.title = text;
      break;
    }
  }

  if (!metadata.title) {
    metadata.title = document.title
      .replace(/\s*[|\-–]\s*Microsoft Teams.*$/i, "")
      .replace(/\s*[|\-–]\s*Teams.*$/i, "")
      .trim();
  }

  const videoDateElement = document.querySelector('[data-automationid="aboutVideoBasicInfoDate"]');
  if (videoDateElement) {
    metadata.date = videoDateElement.textContent?.replace(/\s+/g, " ").trim() || "";
  }

  if (!metadata.date) {
    const timeElement = document.querySelector("time[datetime]");
    if (timeElement) {
      metadata.date = timeElement.getAttribute("datetime") || timeElement.textContent?.trim() || "";
    }
  }

  if (!metadata.date) {
    const dateSelectors = [
      '[data-tid="recording-date"]',
      '[data-tid="meeting-date"]',
      '[class*="recordingDate" i]',
      '[class*="meetingDate" i]',
      '[class*="callDate" i]',
    ];

    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      const datetime = element?.getAttribute("datetime");
      const text = element?.textContent?.replace(/\s+/g, " ").trim();
      if (datetime || text) {
        metadata.date = datetime || text;
        break;
      }
    }
  }

  const durationSelectors = [
    '[data-tid="recording-duration"]',
    '[class*="recordingDuration" i]',
    '[class*="duration" i]',
  ];

  for (const selector of durationSelectors) {
    const element = document.querySelector(selector);
    const text = element?.textContent?.replace(/\s+/g, " ").trim();
    if (text && /\d/.test(text) && /(min|sec|hour|hora|h\b|m\b|s\b)/i.test(text)) {
      metadata.duration = text;
      break;
    }
  }

  return metadata;
}

async function fetchMeetingMetadata(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractMeetingMetadataOnPage,
  });
  return result;
}

async function initializePopup() {
  pageNoticeEl.hidden = true;
  popupReadyEl.hidden = true;
  setStatus("");

  try {
    const tab = await getCurrentTab();
    if (!tab?.id) {
      showInvalidPage("Could not access the active tab.");
      return;
    }

    const hasTranscriptView = await checkTranscriptView(tab.id);
    if (!hasTranscriptView) {
      showInvalidPage(TRANSCRIPT_PAGE_MESSAGE);
      return;
    }

    showTranscriptPage();
    meetingTitleEl.textContent = "Loading...";
    meetingTitleEl.classList.remove("is-muted");
    meetingDateEl.textContent = "";
    meetingDateEl.hidden = true;

    const metadata = await fetchMeetingMetadata(tab.id);
    updateMeetingInfo(metadata);
    await populateCategorySelect();
    await updateApiButtonState();
  } catch {
    showInvalidPage(
      "Could not read this page. Open a Teams meeting recording with the transcript panel visible."
    );
  }
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return value;
}

function buildFilename(metadata, extension) {
  const title = sanitizeFilenamePart(metadata.title) || "meeting";
  const date = toIsoDate(metadata.date) || "unknown-date";
  return `${title}_${date}.${extension}`;
}

function formatTxtLines(entries) {
  return entries.map((item) => `[${item.time}] - [${item.speaker}] : ${item.text}`);
}

function buildTranscriptContent(metadata, entries) {
  const header = ["Meeting: " + (metadata.title || "Unknown meeting")];

  if (metadata.date) {
    header.push("Date: " + metadata.date);
  }
  if (metadata.duration) {
    header.push("Duration: " + metadata.duration);
  }

  header.push("", "---", "");
  return header.join("\n") + formatTxtLines(entries).join("\n");
}

function groupSpeakerTurns(entries) {
  const turns = [];

  for (const entry of entries) {
    const last = turns[turns.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.text = `${last.text} ${entry.text}`.trim();
    } else {
      turns.push({
        speaker: entry.speaker,
        time: entry.time,
        text: entry.text,
      });
    }
  }

  return turns;
}

function escapeMarkdownInline(value) {
  return (value || "").replace(/([\\`*_[\]])/g, "\\$1");
}

function buildMarkdownContent(metadata, entries) {
  const parts = [`# ${metadata.title || "Unknown meeting"}`, "", "## Meeting details", ""];

  const displayDate = formatDisplayDate(metadata.date);
  if (displayDate) {
    parts.push(`- **Date:** ${displayDate}`);
  }
  if (metadata.duration) {
    parts.push(`- **Duration:** ${metadata.duration}`);
  }

  parts.push("", "## Transcript", "");

  const turns = groupSpeakerTurns(entries);
  for (const turn of turns) {
    const speaker = escapeMarkdownInline(turn.speaker);
    parts.push(`### ${speaker} *(${turn.time})*`, "", turn.text, "");
  }

  return parts.join("\n").trimEnd() + "\n";
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function collectTranscriptOnPage() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const toMmSs = (raw) => {
    const compactMatch = raw.match(/\b(\d{1,2}:\d{2})\b/);
    if (compactMatch) {
      return compactMatch[1];
    }

    const minuteMatch = raw.match(/(\d+)\s*(?:minuto(?:s)?|minute(?:s)?)/i);
    const secondMatch = raw.match(/(\d+)\s*(?:segundo(?:s)?|second(?:s)?)/i);

    if (!minuteMatch && !secondMatch) {
      return "";
    }

    const minutes = Number(minuteMatch?.[1] || 0);
    const seconds = Number(secondMatch?.[1] || 0);
    return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
  };

  const parseSpeakerFromAria = (raw) => {
    const clean = (raw || "").trim();
    if (!clean) {
      return "";
    }
    return clean
      .replace(/\s*\d+\s*(?:minuto(?:s)?|minute(?:s)?).*/i, "")
      .replace(/\s*\d{1,2}:\d{2}.*$/, "")
      .trim();
  };

  const findTranscriptScroller = () => {
    const selectors = [
      '[data-testid="scroll-to-target-targeted-focus-zone"]',
      '[data-tid="transcript-content"]',
      '[role="log"]',
      '[class*="transcript" i][class*="scroll" i]',
      '[class*="Transcript" i]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.scrollHeight > element.clientHeight + 40) {
        return element;
      }
    }

    const firstEntry = document.querySelector('[id^="entry-"], [id^="sub-entry-"]');
    let node = firstEntry;

    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const canScroll =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight + 40;

      if (canScroll) {
        return node;
      }
      node = node.parentElement;
    }

    return (
      document.querySelector('[data-testid="scroll-to-target-targeted-focus-zone"]') ||
      document.scrollingElement ||
      document.body
    );
  };

  const transcriptScroller = findTranscriptScroller();
  const hasTranscriptNodes = document.querySelector('[id^="sub-entry-"], [id^="entry-"]');

  if (!hasTranscriptNodes) {
    return { error: "no_transcript", entries: [] };
  }

  const entriesMap = new Map();

  const toSeconds = (mmss) => {
    const match = mmss.match(/^(\d+):(\d{2})$/);
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const shouldIgnoreText = (text) => {
    if (/\b(começou|parou|started|stopped|has started|has stopped)\b.*\btranscri/i.test(text)) {
      return true;
    }
    if (text.length <= 1) {
      return true;
    }
    return false;
  };

  const collectVisibleEntries = () => {
    const rightColumns = document.querySelectorAll('[id^="rightColumn-"]');

    rightColumns.forEach((column) => {
      const header = column.querySelector('[id^="itemHeader-"]');
      const speakerFromHeader =
        header?.querySelector('[class*="itemDisplayName"]')?.textContent?.trim() || "";
      const timeFromHeader =
        header?.querySelector('[id^="Header-timestamp-"]')?.textContent?.trim() || "";

      const textNodes = column.querySelectorAll('[id^="sub-entry-"]');
      textNodes.forEach((textNode) => {
        const text = textNode.textContent?.replace(/\s+/g, " ").trim() || "";
        if (!text || shouldIgnoreText(text)) {
          return;
        }

        const entry = textNode.closest('[id^="entry-"]');
        const ariaLabel = entry?.getAttribute("aria-label") || "";
        const speakerFromAria = parseSpeakerFromAria(ariaLabel);
        const timeFromAria = toMmSs(ariaLabel);
        let speaker = speakerFromAria || speakerFromHeader;
        let time = timeFromAria || timeFromHeader;

        if (!speaker) {
          speaker = "Unknown speaker";
        }
        if (!time) {
          time = "00:00";
        }

        const subEntryId = textNode.id || "";
        const entryId = entry?.id || "";
        const idFromSub = Number((subEntryId.match(/sub-entry-(\d+)/) || [])[1]);
        const idFromEntry = Number((entryId.match(/entry-(\d+)/) || [])[1]);
        const seq = Number.isFinite(idFromSub)
          ? idFromSub
          : Number.isFinite(idFromEntry)
            ? idFromEntry
            : null;
        const key = `${subEntryId || entryId || "no-id"}|${time}|${speaker}|${text}`;

        if (!entriesMap.has(key)) {
          entriesMap.set(key, { seq, time, speaker, text });
        }
      });
    });
  };

  const waitForStabilize = async (previousCount, targetTop) => {
    let stableReads = 0;
    let lastSignature = "";

    for (let i = 0; i < 16; i += 1) {
      await wait(180);

      if (transcriptScroller.scrollTop + 2 < targetTop) {
        transcriptScroller.scrollTop = targetTop;
      }

      collectVisibleEntries();
      const signature = `${entriesMap.size}|${Math.floor(transcriptScroller.scrollTop)}|${transcriptScroller.scrollHeight}`;

      if (entriesMap.size > previousCount) {
        return;
      }

      if (signature === lastSignature) {
        stableReads += 1;
      } else {
        stableReads = 0;
        lastSignature = signature;
      }

      if (stableReads >= 3) {
        return;
      }
    }
  };

  const scrollAndCollectAll = async () => {
    transcriptScroller.scrollTop = 0;
    await wait(220);

    let iterations = 0;
    let roundsWithoutNewEntries = 0;
    let furthestTop = 0;
    const step = Math.max(200, Math.floor(transcriptScroller.clientHeight * 0.85));

    collectVisibleEntries();

    while (iterations < 1400 && roundsWithoutNewEntries < 10) {
      const beforeCount = entriesMap.size;
      const maxTop = Math.max(0, transcriptScroller.scrollHeight - transcriptScroller.clientHeight);
      const nextTop = Math.min(maxTop, furthestTop + step);
      transcriptScroller.scrollTop = nextTop;
      furthestTop = Math.max(furthestTop, nextTop);

      await waitForStabilize(beforeCount, furthestTop);

      const currentCount = entriesMap.size;
      const updatedMaxTop = Math.max(0, transcriptScroller.scrollHeight - transcriptScroller.clientHeight);
      const reachedBottom = furthestTop >= updatedMaxTop - 2;
      const didNotMove = nextTop >= maxTop - 2;

      if (currentCount === beforeCount) {
        roundsWithoutNewEntries += 1;
      } else {
        roundsWithoutNewEntries = 0;
      }

      if (reachedBottom && (didNotMove || roundsWithoutNewEntries >= 4)) {
        break;
      }

      iterations += 1;
    }
  };

  await scrollAndCollectAll();

  const countAfterFirstPass = entriesMap.size;
  transcriptScroller.scrollTop = 0;
  await wait(300);
  await scrollAndCollectAll();

  const entries = Array.from(entriesMap.values()).sort((a, b) => {
    if (a.seq !== null && b.seq !== null) {
      return a.seq - b.seq;
    }
    if (a.seq !== null) {
      return -1;
    }
    if (b.seq !== null) {
      return 1;
    }
    return toSeconds(a.time) - toSeconds(b.time);
  });

  return {
    error: null,
    entries,
    stats: {
      firstPassCount: countAfterFirstPass,
      finalCount: entries.length,
    },
  };
}

async function runDownload(format) {
  setStatus("Collecting transcript...");

  try {
    const collected = await collectTranscriptFromActiveTab();

    if (collected.error === "no_transcript") {
      setStatus("No transcript found. Open the recording transcript and try again.", true);
      return;
    }

    if (collected.error === "no_entries") {
      setStatus("No speech entries found on this page.", true);
      return;
    }

    const { metadata, entries } = collected;
    const lineCount = entries.length;
    const extension = format === "md" ? "md" : "txt";
    const content =
      format === "md" ? buildMarkdownContent(metadata, entries) : buildTranscriptContent(metadata, entries);
    const filename = buildFilename(metadata, extension);
    const mimeType = format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";

    downloadFile(content, filename, mimeType);

    const label = format === "md" ? "entries" : "lines";
    setStatus(`Transcript downloaded (${lineCount} ${label}).`);
  } catch (error) {
    setStatus("Failed to collect or download the transcript.", true);
  }
}

async function runSendToApi() {
  if (btnSendApiEl.disabled) {
    return;
  }

  setStatus("Collecting transcript...");

  try {
    const webhookConfig = await getWebhookConfig();
    if (!webhookConfig.url) {
      setStatus("Configure API settings before sending.", true);
      await updateApiButtonState();
      return;
    }

    const categoriesConfig = await getCategoriesConfig();
    const selectedCategory = getCategoryById(categoriesConfig, categoriesConfig.selectedId);
    if (!selectedCategory) {
      setStatus("Select a category before sending.", true);
      await updateApiButtonState();
      return;
    }

    const collected = await collectTranscriptFromActiveTab();

    if (collected.error === "no_transcript") {
      setStatus("No transcript found. Open the recording transcript and try again.", true);
      return;
    }

    if (collected.error === "no_entries") {
      setStatus("No speech entries found on this page.", true);
      return;
    }

    const { metadata, entries } = collected;
    const content = buildMarkdownContent(metadata, entries);
    const filename = buildFilename(metadata, "md");

    setStatus("Sending to API...");

    await sendTranscriptToWebhook(webhookConfig, {
      format: "md",
      filename,
      metadata: {
        title: metadata.title || "",
        date: toApiDate(metadata.date),
        duration: metadata.duration || "",
      },
      entryCount: entries.length,
      content,
      category: {
        id: selectedCategory.id,
        name: selectedCategory.name,
      },
    });

    setStatus(`Transcript sent to API (${entries.length} entries).`);
  } catch (error) {
    setStatus(error.message || "Failed to send transcript to API.", true);
  }
}

document.getElementById("btn-download-txt").addEventListener("click", () => {
  runDownload("txt");
});

document.getElementById("btn-download-md").addEventListener("click", () => {
  runDownload("md");
});

document.getElementById("btn-send-api").addEventListener("click", () => {
  runSendToApi();
});

wireSettingsUi();
wireCategoriesUi();
closeSettingsModal();
closeCategoriesModal();
initializePopup();
