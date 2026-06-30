const CATEGORIES_STORAGE_KEY = "categoriesConfig";

const DEFAULT_CATEGORIES_CONFIG = {
  items: [],
  selectedId: null,
};

function generateCategoryId() {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCategoriesConfig(config) {
  const items = Array.isArray(config?.items)
    ? config.items
        .filter((item) => item && typeof item.name === "string" && item.name.trim())
        .map((item) => ({
          id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : generateCategoryId(),
          name: item.name.trim(),
        }))
    : [];

  const itemIds = new Set(items.map((item) => item.id));
  const selectedId =
    typeof config?.selectedId === "string" && itemIds.has(config.selectedId) ? config.selectedId : null;

  return { items, selectedId };
}

async function getCategoriesConfig() {
  const stored = await chrome.storage.local.get(CATEGORIES_STORAGE_KEY);
  return normalizeCategoriesConfig(stored[CATEGORIES_STORAGE_KEY] || DEFAULT_CATEGORIES_CONFIG);
}

async function saveCategoriesConfig(config) {
  const normalized = normalizeCategoriesConfig(config);
  await chrome.storage.local.set({ [CATEGORIES_STORAGE_KEY]: normalized });
  return normalized;
}

async function addCategory(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Category name is required.");
  }

  const config = await getCategoriesConfig();
  const duplicate = config.items.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
  if (duplicate) {
    throw new Error("A category with this name already exists.");
  }

  const newItem = { id: generateCategoryId(), name: trimmed };
  const updated = {
    items: [...config.items, newItem],
    selectedId: config.selectedId,
  };

  return saveCategoriesConfig(updated);
}

async function removeCategory(id) {
  const config = await getCategoriesConfig();
  const updated = {
    items: config.items.filter((item) => item.id !== id),
    selectedId: config.selectedId === id ? null : config.selectedId,
  };

  return saveCategoriesConfig(updated);
}

async function setSelectedCategoryId(id) {
  const config = await getCategoriesConfig();
  const itemIds = new Set(config.items.map((item) => item.id));
  const selectedId = id && itemIds.has(id) ? id : null;

  return saveCategoriesConfig({
    items: config.items,
    selectedId,
  });
}

function getCategoryById(config, id) {
  return config.items.find((item) => item.id === id) || null;
}
