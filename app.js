const STORAGE_KEY = "personal-timeline-events-v1";
const DAILY_STATUS_KEY = "personal-daily-status-v1";
const DAILY_NOTES_KEY = "personal-daily-notes-v1";
const DAILY_IMAGES_META_KEY = "personal-daily-images-meta-v1";
const IMAGE_DB_NAME = "personal-timeline-media-v1";
const IMAGE_STORE_NAME = "images";
const MAX_IMAGES_PER_DAY = 6;

const captureForm = document.querySelector("#capture-form");
const captureInput = document.querySelector("#capture-input");
const saveStatus = document.querySelector("#save-status");
const dailyForm = document.querySelector("#daily-form");
const dailyDate = document.querySelector("#daily-date");
const sleepTimeInput = document.querySelector("#sleep-time");
const wakeTimeInput = document.querySelector("#wake-time");
const stepsInput = document.querySelector("#steps");
const dailySaveStatus = document.querySelector("#daily-save-status");
const timelineDate = document.querySelector("#timeline-date");
const timelineList = document.querySelector("#timeline-list");
const timelineEmpty = document.querySelector("#timeline-empty");
const recordCount = document.querySelector("#record-count");
const calendarTitle = document.querySelector("#calendar-title");
const calendarGrid = document.querySelector("#calendar-grid");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");
const addEventButton = document.querySelector("#add-event-button");
const eventDialog = document.querySelector("#event-dialog");
const eventForm = document.querySelector("#event-form");
const eventDialogTitle = document.querySelector("#event-dialog-title");
const eventDialogDate = document.querySelector("#event-dialog-date");
const eventDialogClose = document.querySelector("#event-dialog-close");
const eventTimeInput = document.querySelector("#event-time");
const eventContentInput = document.querySelector("#event-content");
const editableEventFields = document.querySelector("#editable-event-fields");
const lockedEventMessage = document.querySelector("#locked-event-message");
const dialogStatus = document.querySelector("#dialog-status");
const deleteEventButton = document.querySelector("#delete-event-button");
const goDailyButton = document.querySelector("#go-daily-button");
const saveEventButton = document.querySelector("#save-event-button");
const dailyNoteInput = document.querySelector("#daily-note-input");
const noteSaveStatus = document.querySelector("#note-save-status");
const clearNoteButton = document.querySelector("#clear-note-button");
const dataButton = document.querySelector("#data-button");
const dataDialog = document.querySelector("#data-dialog");
const dataDialogClose = document.querySelector("#data-dialog-close");
const dataSummary = document.querySelector("#data-summary");
const exportJsonButton = document.querySelector("#export-json-button");
const exportCsvButton = document.querySelector("#export-csv-button");
const chooseBackupButton = document.querySelector("#choose-backup-button");
const backupFileInput = document.querySelector("#backup-file-input");
const importPreview = document.querySelector("#import-preview");
const importPreviewText = document.querySelector("#import-preview-text");
const confirmImportButton = document.querySelector("#confirm-import-button");
const dataStatus = document.querySelector("#data-status");
const addImageButton = document.querySelector("#add-image-button");
const noteImageInput = document.querySelector("#note-image-input");
const noteImageGrid = document.querySelector("#note-image-grid");
const noteDateLabel = document.querySelector("#note-date-label");
const timelineCarousel = document.querySelector("#timeline-carousel");
const timelinePage = document.querySelector("#timeline-page");
const timelineViewTrack = document.querySelector("#timeline-view-track");
const timelineView = document.querySelector("#timeline-view");
const noteView = document.querySelector("#note-view");
const showNoteButton = document.querySelector("#show-note-button");
const showTimelineButton = document.querySelector("#show-timeline-button");
const tabButtons = [...document.querySelectorAll(".tab-button")];
const pages = [...document.querySelectorAll(".page")];

const today = new Date();
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let editingEventId = null;
let deleteConfirmationPending = false;
let noteSaveTimer = null;
let clearNoteConfirmationPending = false;
let pendingImport = null;
let imageRenderToken = 0;
let activeImageUrls = [];
let timelineSubview = "timeline";
let swipeStartX = 0;
let swipeStartY = 0;
let swipePointerId = null;
let suppressTimelineClick = false;
let touchStartX = 0;
let touchStartY = 0;
let documentTouchSwipeActive = false;

const timelineDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const calendarTitleFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
});

const eventTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function readEvents() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(savedEvents) ? savedEvents : [];
  } catch (error) {
    console.error("读取本地记录失败：", error);
    return [];
  }
}

function writeEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function readDailyStatuses() {
  try {
    const savedStatuses = JSON.parse(localStorage.getItem(DAILY_STATUS_KEY) || "{}");
    return savedStatuses && typeof savedStatuses === "object" ? savedStatuses : {};
  } catch (error) {
    console.error("读取每日状态失败：", error);
    return {};
  }
}

function writeDailyStatuses(statuses) {
  localStorage.setItem(DAILY_STATUS_KEY, JSON.stringify(statuses));
}

function readDailyNotes() {
  try {
    const savedNotes = JSON.parse(localStorage.getItem(DAILY_NOTES_KEY) || "{}");
    return savedNotes && typeof savedNotes === "object" ? savedNotes : {};
  } catch (error) {
    console.error("读取当日备注失败：", error);
    return {};
  }
}

function writeDailyNotes(notes) {
  localStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(notes));
}

function readDailyImageMeta() {
  try {
    const savedMeta = JSON.parse(localStorage.getItem(DAILY_IMAGES_META_KEY) || "{}");
    return savedMeta && typeof savedMeta === "object" ? savedMeta : {};
  } catch (error) {
    console.error("读取图片备注信息失败：", error);
    return {};
  }
}

function writeDailyImageMeta(meta) {
  localStorage.setItem(DAILY_IMAGES_META_KEY, JSON.stringify(meta));
}

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function runImageTransaction(mode, operation) {
  const database = await openImageDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, mode);
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      let result;
      try {
        result = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.addEventListener("complete", () => resolve(result));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error || new Error("图片存储操作已取消")));
    });
  } finally {
    database.close();
  }
}

function putImageBlob(id, blob) {
  return runImageTransaction("readwrite", (store) => store.put({ id, blob }));
}

async function getImageBlob(id) {
  const database = await openImageDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, "readonly");
      const request = transaction.objectStore(IMAGE_STORE_NAME).get(id);
      request.addEventListener("success", () => resolve(request.result?.blob || null));
      request.addEventListener("error", () => reject(request.error));
    });
  } finally {
    database.close();
  }
}

function deleteImageBlob(id) {
  return runImageTransaction("readwrite", (store) => store.delete(id));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法处理这张图片"));
    }, type, quality);
  });
}

async function resizeImageFile(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  let source;
  let width;
  let height;
  let cleanup = () => {};

  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
    width = source.width;
    height = source.height;
    cleanup = () => source.close();
  } catch {
    const url = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => reject(new Error("无法读取这张图片")));
      image.src = url;
    });
    width = source.naturalWidth;
    height = source.naturalHeight;
    cleanup = () => URL.revokeObjectURL(url);
  }

  try {
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    context.drawImage(source, 0, 0, outputWidth, outputHeight);
    return await canvasToBlob(canvas, "image/jpeg", 0.82);
  } finally {
    cleanup();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(",");
  const type = header.match(/^data:([^;]+);base64$/)?.[1];
  if (!type || !encoded) throw new Error("备份中的图片格式不正确");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

async function createBackupPayload() {
  const imageMeta = readDailyImageMeta();
  const dailyImages = [];
  for (const [date, images] of Object.entries(imageMeta)) {
    for (const image of images) {
      const blob = await getImageBlob(image.id);
      if (!blob) continue;
      dailyImages.push({
        ...image,
        date,
        dataUrl: await blobToDataUrl(blob),
      });
    }
  }

  return {
    format: "personal-timeline-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    events: readEvents(),
    dailyStatuses: readDailyStatuses(),
    dailyNotes: readDailyNotes(),
    dailyImages,
  };
}

function getExportTimestamp() {
  const now = new Date();
  const date = getLocalDateKey(now);
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `${date}-${time}`;
}

function downloadFile(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function protectCsvValue(value) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function escapeCsvValue(value) {
  return `"${protectCsvValue(value).replaceAll('"', '""')}"`;
}

function createCsvContent() {
  const events = readEvents();
  const statuses = readDailyStatuses();
  const notes = readDailyNotes();
  const imageMeta = readDailyImageMeta();
  const dates = new Set([
    ...events.map((event) => event.date),
    ...Object.keys(statuses),
    ...Object.keys(notes),
    ...Object.keys(imageMeta),
  ]);
  const rows = [["日期", "经期状态", "时间", "内容", "标签", "来源", "当日备注", "图片数量"]];

  for (const date of [...dates].sort()) {
    const status = statuses[date];
    const statusLabel = status?.label || (status?.period === true ? "经期" : status?.period === false ? "非经期" : "");
    const dateLabel = statusLabel ? `${date}（${statusLabel}）` : date;
    const dateNote = notes[date]?.content || "";
    const imageCount = imageMeta[date]?.length || 0;
    const dateEvents = events
      .filter((event) => event.date === date)
      .sort((first, second) => (first.time || "").localeCompare(second.time || ""));

    if (dateEvents.length === 0) {
      rows.push([dateLabel, statusLabel, "", "", "", "", dateNote, imageCount]);
      continue;
    }

    dateEvents.forEach((event, index) => {
      const sourceLabel = event.source === "daily"
        ? "每日填写"
        : event.source === "manual"
          ? "手动记录"
          : "实时记录";
      rows.push([
        dateLabel,
        statusLabel,
        event.time || "",
        event.content || "",
        event.tag || "",
        sourceLabel,
        index === 0 ? dateNote : "",
        index === 0 ? imageCount : "",
      ]);
    });
  }

  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n")}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateBackup(rawBackup) {
  if (!isPlainObject(rawBackup) || rawBackup.format !== "personal-timeline-backup" || ![1, 2].includes(rawBackup.version)) {
    throw new Error("这不是本应用支持的备份文件");
  }

  if (!Array.isArray(rawBackup.events) || !isPlainObject(rawBackup.dailyStatuses) || !isPlainObject(rawBackup.dailyNotes)) {
    throw new Error("备份文件缺少事件、每日状态或备注数据");
  }

  const eventIds = new Set();
  const events = rawBackup.events.map((event) => {
    if (
      !isPlainObject(event)
      || typeof event.id !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)
      || !/^\d{2}:\d{2}$/.test(event.time)
      || typeof event.content !== "string"
    ) {
      throw new Error("备份中存在格式不正确的时间轴记录");
    }
    if (eventIds.has(event.id)) {
      throw new Error("备份中存在重复的记录编号");
    }
    eventIds.add(event.id);
    return { ...event };
  });

  const dailyStatuses = {};
  for (const [date, status] of Object.entries(rawBackup.dailyStatuses)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isPlainObject(status) || typeof status.period !== "boolean") {
      throw new Error("备份中存在格式不正确的每日状态");
    }
    dailyStatuses[date] = { ...status };
  }

  const dailyNotes = {};
  for (const [date, note] of Object.entries(rawBackup.dailyNotes)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isPlainObject(note) || typeof note.content !== "string") {
      throw new Error("备份中存在格式不正确的当日备注");
    }
    dailyNotes[date] = { ...note };
  }

  const dailyImages = [];
  if (rawBackup.version >= 2) {
    if (!Array.isArray(rawBackup.dailyImages)) {
      throw new Error("备份文件缺少图片数据");
    }
    const imageIds = new Set();
    for (const image of rawBackup.dailyImages) {
      if (
        !isPlainObject(image)
        || typeof image.id !== "string"
        || !/^\d{4}-\d{2}-\d{2}$/.test(image.date)
        || typeof image.dataUrl !== "string"
        || !image.dataUrl.startsWith("data:image/")
      ) {
        throw new Error("备份中存在格式不正确的图片备注");
      }
      if (imageIds.has(image.id)) throw new Error("备份中存在重复的图片编号");
      imageIds.add(image.id);
      dailyImages.push({ ...image });
    }
  }

  return { events, dailyStatuses, dailyNotes, dailyImages };
}

function prepareImport(backup) {
  const currentEvents = readEvents();
  const currentStatuses = readDailyStatuses();
  const currentNotes = readDailyNotes();
  const currentImageMeta = readDailyImageMeta();
  const currentImageIds = new Set(Object.values(currentImageMeta).flat().map((image) => image.id));
  const currentEventIds = new Set(currentEvents.map((event) => event.id));
  const eventsToAdd = backup.events.filter((event) => !currentEventIds.has(event.id));
  const statusesToAdd = Object.fromEntries(
    Object.entries(backup.dailyStatuses).filter(([date]) => !Object.prototype.hasOwnProperty.call(currentStatuses, date)),
  );
  const notesToAdd = Object.fromEntries(
    Object.entries(backup.dailyNotes).filter(([date]) => !Object.prototype.hasOwnProperty.call(currentNotes, date)),
  );
  const imageCountsByDate = new Map(
    Object.entries(currentImageMeta).map(([date, images]) => [date, images.length]),
  );
  const imagesToAdd = [];
  for (const image of backup.dailyImages) {
    if (currentImageIds.has(image.id)) continue;
    const currentCount = imageCountsByDate.get(image.date) || 0;
    if (currentCount >= MAX_IMAGES_PER_DAY) continue;
    imagesToAdd.push(image);
    imageCountsByDate.set(image.date, currentCount + 1);
  }

  return {
    eventsToAdd,
    statusesToAdd,
    notesToAdd,
    imagesToAdd,
    skippedEvents: backup.events.length - eventsToAdd.length,
    skippedStatuses: Object.keys(backup.dailyStatuses).length - Object.keys(statusesToAdd).length,
    skippedNotes: Object.keys(backup.dailyNotes).length - Object.keys(notesToAdd).length,
    skippedImages: backup.dailyImages.length - imagesToAdd.length,
  };
}

function refreshDataSummary() {
  const eventCount = readEvents().length;
  const statusCount = Object.keys(readDailyStatuses()).length;
  const noteCount = Object.values(readDailyNotes()).filter((note) => note?.content?.trim()).length;
  const imageCount = Object.values(readDailyImageMeta()).flat().length;
  dataSummary.textContent = `当前共有 ${eventCount} 条时间轴记录、${statusCount} 天每日状态、${noteCount} 天文字备注、${imageCount} 张图片。`;
}

function resetImportPreview() {
  pendingImport = null;
  importPreview.hidden = true;
  importPreviewText.textContent = "";
  dataStatus.textContent = "";
  backupFileInput.value = "";
}

function resetClearNoteConfirmation() {
  clearNoteConfirmationPending = false;
  clearNoteButton.classList.remove("is-confirming");
  clearNoteButton.textContent = "清空";
}

function loadDailyNote() {
  const dateKey = getLocalDateKey(selectedDate);
  const note = readDailyNotes()[dateKey];
  noteDateLabel.textContent = formatDisplayDate(selectedDate);
  noteDateLabel.dateTime = dateKey;
  dailyNoteInput.value = note?.content || "";
  clearNoteButton.hidden = !dailyNoteInput.value;
  noteSaveStatus.textContent = note?.content ? "已保存在本机" : "";
  resetClearNoteConfirmation();
  renderDailyImages();
}

function revokeActiveImageUrls() {
  for (const url of activeImageUrls) URL.revokeObjectURL(url);
  activeImageUrls = [];
}

async function renderDailyImages() {
  const token = ++imageRenderToken;
  const dateKey = getLocalDateKey(selectedDate);
  const images = readDailyImageMeta()[dateKey] || [];
  revokeActiveImageUrls();
  noteImageGrid.replaceChildren();
  addImageButton.disabled = images.length >= MAX_IMAGES_PER_DAY;

  if (images.length === 0) {
    updateTimelineCarouselHeight();
    return;
  }

  for (const imageMeta of images) {
    const blob = await getImageBlob(imageMeta.id);
    if (token !== imageRenderToken || dateKey !== getLocalDateKey(selectedDate)) return;
    if (!blob) continue;

    const url = URL.createObjectURL(blob);
    activeImageUrls.push(url);
    const item = document.createElement("div");
    item.className = "note-image-item";

    const image = document.createElement("img");
    image.src = url;
    image.alt = imageMeta.name ? `图片备注：${imageMeta.name}` : "图片备注";

    const removeButton = document.createElement("button");
    removeButton.className = "remove-image-button";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `删除图片 ${imageMeta.name || ""}`.trim());
    let confirming = false;
    removeButton.addEventListener("click", async () => {
      if (!confirming) {
        confirming = true;
        removeButton.textContent = "删";
        removeButton.setAttribute("aria-label", "再次点击确认删除图片");
        noteSaveStatus.textContent = "再次点击图片上的“删”确认删除";
        return;
      }

      try {
        await deleteImageBlob(imageMeta.id);
        const allMeta = readDailyImageMeta();
        allMeta[dateKey] = (allMeta[dateKey] || []).filter((itemMeta) => itemMeta.id !== imageMeta.id);
        if (allMeta[dateKey].length === 0) delete allMeta[dateKey];
        writeDailyImageMeta(allMeta);
        noteSaveStatus.textContent = "图片已删除";
        renderCalendar();
        renderDailyImages();
      } catch (error) {
        noteSaveStatus.textContent = error instanceof Error ? error.message : "图片删除失败";
      }
    });

    item.append(image, removeButton);
    noteImageGrid.append(item);
  }

  updateTimelineCarouselHeight();
}

function updateTimelineCarouselHeight() {
  const activePanel = timelineSubview === "note" ? noteView : timelineView;
  window.requestAnimationFrame(() => {
    timelineCarousel.style.height = `${activePanel.scrollHeight}px`;
  });
}

function setTimelineSubview(target, options = {}) {
  const nextSubview = target === "note" ? "note" : "timeline";
  const changed = timelineSubview !== nextSubview;
  timelineSubview = nextSubview;
  const showingNote = nextSubview === "note";

  timelineViewTrack.classList.toggle("is-showing-note", showingNote);
  timelinePage.classList.toggle("is-note-view", showingNote);
  timelineView.setAttribute("aria-hidden", String(showingNote));
  noteView.setAttribute("aria-hidden", String(!showingNote));
  timelineView.inert = showingNote;
  noteView.inert = !showingNote;
  updateTimelineCarouselHeight();

  if (changed && options.scroll !== false) {
    timelineCarousel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function saveDailyNote(dateKey, content) {
  const notes = readDailyNotes();
  const trimmedContent = content.trim();

  if (trimmedContent) {
    notes[dateKey] = {
      content,
      updatedAt: new Date().toISOString(),
    };
  } else {
    delete notes[dateKey];
  }

  writeDailyNotes(notes);
  renderCalendar();

  if (dateKey === getLocalDateKey(selectedDate)) {
    clearNoteButton.hidden = !trimmedContent;
    noteSaveStatus.textContent = trimmedContent ? "已自动保存" : "";
  }
}

function addLocalDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function findDailyEvent(events, metric, dateKey) {
  return events.find(
    (event) => event.source === "daily" && event.metric === metric && event.date === dateKey,
  );
}

function upsertDailyEvent(events, eventData) {
  const existingEvent = findDailyEvent(events, eventData.metric, eventData.date);
  const updatedAt = new Date().toISOString();

  if (existingEvent) {
    Object.assign(existingEvent, eventData, { updatedAt });
    return existingEvent;
  }

  const newEvent = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    ...eventData,
    source: "daily",
    createdAt: updatedAt,
    updatedAt,
  };
  events.push(newEvent);
  return newEvent;
}

function removeDailyEvent(events, metric, dateKey) {
  const eventIndex = events.findIndex(
    (event) => event.source === "daily" && event.metric === metric && event.date === dateKey,
  );
  if (eventIndex >= 0) events.splice(eventIndex, 1);
}

function loadDailyForm() {
  const currentDate = new Date();
  const currentDateKey = getLocalDateKey(currentDate);
  const yesterdayKey = getLocalDateKey(addLocalDays(currentDate, -1));
  const events = readEvents();
  const statuses = readDailyStatuses();
  const sleepEvent = findDailyEvent(events, "sleep", yesterdayKey);
  const wakeEvent = findDailyEvent(events, "wake", currentDateKey);
  const stepsEvent = findDailyEvent(events, "steps", yesterdayKey);

  dailyDate.textContent = formatDisplayDate(currentDate);
  dailyDate.dateTime = currentDateKey;
  sleepTimeInput.value = sleepEvent?.time || "";
  wakeTimeInput.value = wakeEvent?.time || "";
  stepsInput.value = stepsEvent?.value ?? "";

  const periodValue = statuses[currentDateKey]?.period;
  const periodInput = dailyForm.querySelector(
    `input[name="period"][value="${periodValue === true ? "yes" : "no"}"]`,
  );
  if (typeof periodValue === "boolean" && periodInput) {
    periodInput.checked = true;
  } else {
    for (const input of dailyForm.querySelectorAll('input[name="period"]')) {
      input.checked = false;
    }
  }
}

function createEvent(content) {
  const now = new Date();

  return {
    id: globalThis.crypto?.randomUUID?.() || `${now.getTime()}-${Math.random()}`,
    date: getLocalDateKey(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    content,
    type: "realtime",
    tag: "default",
    color: "default",
    source: "realtime",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function resetDeleteConfirmation() {
  deleteConfirmationPending = false;
  deleteEventButton.classList.remove("is-confirming");
  deleteEventButton.textContent = "删除记录";
  dialogStatus.textContent = "";
}

function openEventDialog(eventRecord = null) {
  editingEventId = eventRecord?.id || null;
  resetDeleteConfirmation();
  eventDialogDate.textContent = timelineDateFormatter.format(selectedDate);

  const isDailyRecord = eventRecord?.source === "daily";
  editableEventFields.hidden = isDailyRecord;
  lockedEventMessage.hidden = !isDailyRecord;
  goDailyButton.hidden = !isDailyRecord;
  saveEventButton.hidden = isDailyRecord;
  deleteEventButton.hidden = !eventRecord || isDailyRecord;

  if (isDailyRecord) {
    eventDialogTitle.textContent = eventRecord.content;
  } else if (eventRecord) {
    eventDialogTitle.textContent = "编辑记录";
    eventTimeInput.value = eventRecord.time || "";
    eventContentInput.value = eventRecord.content || "";
  } else {
    eventDialogTitle.textContent = "添加记录";
    eventTimeInput.value = isSameLocalDate(selectedDate, new Date()) ? getCurrentTimeValue() : "12:00";
    eventContentInput.value = "";
  }

  eventDialog.showModal();

  if (!isDailyRecord) {
    eventContentInput.focus();
  }
}

function closeEventDialog() {
  if (eventDialog.open) {
    eventDialog.close();
  }
}

function isSameLocalDate(first, second) {
  return getLocalDateKey(first) === getLocalDateKey(second);
}

function renderCalendar() {
  const events = readEvents();
  const statuses = readDailyStatuses();
  const notes = readDailyNotes();
  const imageMeta = readDailyImageMeta();
  const datesWithRecords = new Set(events.map((event) => event.date));
  const datesWithNotes = new Set(
    [
      ...Object.entries(notes)
      .filter(([, note]) => note?.content?.trim())
      .map(([dateKey]) => dateKey),
      ...Object.entries(imageMeta)
        .filter(([, images]) => Array.isArray(images) && images.length > 0)
        .map(([dateKey]) => dateKey),
    ],
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const leadingSpacers = (firstWeekday + 6) % 7;

  calendarTitle.textContent = calendarTitleFormatter.format(visibleMonth);
  calendarGrid.replaceChildren();

  for (let index = 0; index < leadingSpacers; index += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    spacer.setAttribute("aria-hidden", "true");
    calendarGrid.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = getLocalDateKey(date);
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.textContent = String(day);
    button.dataset.date = dateKey;
    button.setAttribute("aria-label", timelineDateFormatter.format(date));
    button.setAttribute("aria-pressed", String(isSameLocalDate(date, selectedDate)));
    button.classList.toggle("is-today", isSameLocalDate(date, today));
    button.classList.toggle("is-selected", isSameLocalDate(date, selectedDate));
    button.classList.toggle("has-records", datesWithRecords.has(dateKey));
    button.classList.toggle("has-note", datesWithNotes.has(dateKey));
    button.classList.toggle("is-period", statuses[dateKey]?.period === true);

    button.addEventListener("click", () => {
      selectedDate = date;
      setTimelineSubview("timeline", { scroll: false });
      renderCalendar();
      renderTimeline();
    });

    calendarGrid.append(button);
  }
}

function renderTimeline() {
  const selectedDateKey = getLocalDateKey(selectedDate);
  const selectedEvents = readEvents()
    .filter((event) => event.date === selectedDateKey)
    .sort((first, second) => {
      const timeComparison = (first.time || "").localeCompare(second.time || "");
      return timeComparison || first.createdAt.localeCompare(second.createdAt);
    });

  timelineDate.textContent = isSameLocalDate(selectedDate, today)
    ? `今天 · ${formatDisplayDate(selectedDate)}`
    : formatDisplayDate(selectedDate);
  recordCount.textContent = `${selectedEvents.length} 条`;
  timelineList.replaceChildren();
  timelineEmpty.hidden = selectedEvents.length > 0;

  const emptyTitle = timelineEmpty.querySelector(".empty-title");
  const emptyDescription = timelineEmpty.querySelector("p:last-child");
  emptyTitle.textContent = isSameLocalDate(selectedDate, today)
    ? "今天还没有记录"
    : "这一天还没有记录";
  emptyDescription.textContent = "";
  emptyDescription.hidden = true;

  for (const event of selectedEvents) {
    const item = document.createElement("li");
    item.className = "timeline-item";
    if (event.color === "blue" || event.color === "orange") {
      item.classList.add(`is-${event.color}`);
    }

    const eventButton = document.createElement("button");
    eventButton.className = "timeline-event-button";
    eventButton.type = "button";
    eventButton.setAttribute("aria-label", `${event.time} ${event.content}`);
    eventButton.addEventListener("click", () => openEventDialog(event));

    const time = document.createElement("time");
    time.className = "timeline-time";
    time.dateTime = `${event.date}T${event.time || "00:00"}:00`;
    time.textContent = event.time || eventTimeFormatter.format(new Date(event.createdAt));

    const marker = document.createElement("span");
    marker.className = "timeline-marker";
    marker.setAttribute("aria-hidden", "true");

    const contentWrap = document.createElement("span");
    contentWrap.className = "timeline-content-wrap";

    const content = document.createElement("span");
    content.className = "timeline-content";
    content.textContent = event.content;

    const source = document.createElement("small");
    source.className = "timeline-source";
    source.textContent = event.source === "daily"
      ? "每日填写"
      : event.source === "manual"
        ? "手动记录"
        : "实时记录";

    contentWrap.append(content, source);
    eventButton.append(time, marker, contentWrap);
    item.append(eventButton);
    timelineList.append(item);
  }

  loadDailyNote();
  updateTimelineCarouselHeight();
}

function switchPage(target) {
  for (const page of pages) {
    page.hidden = page.dataset.page !== target;
  }

  for (const button of tabButtons) {
    const isActive = button.dataset.target === target;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }

  if (target === "timeline") {
    renderCalendar();
    renderTimeline();
  }

  if (target === "daily") {
    loadDailyForm();
  }
}

function updateDeviceDate() {
  const now = new Date();
  dailyDate.textContent = formatDisplayDate(now);
  dailyDate.dateTime = getLocalDateKey(now);
}

function scheduleClockUpdate() {
  updateDeviceDate();
  const millisecondsUntilNextMinute = 60000 - (Date.now() % 60000);
  window.setTimeout(scheduleClockUpdate, millisecondsUntilNextMinute);
}

for (const button of tabButtons) {
  button.addEventListener("click", () => switchPage(button.dataset.target));
}

showNoteButton.addEventListener("click", () => setTimelineSubview("note"));
showTimelineButton.addEventListener("click", () => setTimelineSubview("timeline"));

function handleTimelineSwipe(deltaX, deltaY) {
  if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return false;

  if (deltaX < 0 && timelineSubview === "timeline") {
    suppressTimelineClick = true;
    window.setTimeout(() => { suppressTimelineClick = false; }, 500);
    setTimelineSubview("note");
    return true;
  }

  if (deltaX > 0 && timelineSubview === "note") {
    suppressTimelineClick = true;
    window.setTimeout(() => { suppressTimelineClick = false; }, 500);
    setTimelineSubview("timeline");
    return true;
  }

  return false;
}

function shouldTrackTimelineSwipe(target) {
  return !timelinePage.hidden && !target?.closest?.(".tab-bar, dialog");
}

document.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || !shouldTrackTimelineSwipe(event.target)) return;
  swipePointerId = event.pointerId;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
}, { capture: true });

document.addEventListener("pointerup", (event) => {
  if (event.pointerId !== swipePointerId) return;
  swipePointerId = null;
  handleTimelineSwipe(event.clientX - swipeStartX, event.clientY - swipeStartY);
}, { capture: true });

document.addEventListener("pointercancel", () => {
  swipePointerId = null;
}, { capture: true });

document.addEventListener("touchstart", (event) => {
  documentTouchSwipeActive = false;
  if (event.touches.length !== 1 || !shouldTrackTimelineSwipe(event.target)) return;
  documentTouchSwipeActive = true;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true, capture: true });

document.addEventListener("touchend", (event) => {
  if (!documentTouchSwipeActive || event.changedTouches.length !== 1 || timelinePage.hidden) return;
  documentTouchSwipeActive = false;
  handleTimelineSwipe(
    event.changedTouches[0].clientX - touchStartX,
    event.changedTouches[0].clientY - touchStartY,
  );
}, { passive: true, capture: true });

timelineCarousel.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary) return;
  swipePointerId = event.pointerId;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  timelineCarousel.setPointerCapture?.(event.pointerId);
}, { capture: true });

timelineCarousel.addEventListener("pointerup", (event) => {
  if (event.pointerId !== swipePointerId) return;
  swipePointerId = null;
  const deltaX = event.clientX - swipeStartX;
  const deltaY = event.clientY - swipeStartY;
  handleTimelineSwipe(deltaX, deltaY);
}, { capture: true });

timelineCarousel.addEventListener("pointercancel", () => {
  swipePointerId = null;
}, { capture: true });

timelineCarousel.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true, capture: true });

timelineCarousel.addEventListener("touchend", (event) => {
  if (event.changedTouches.length !== 1) return;
  handleTimelineSwipe(
    event.changedTouches[0].clientX - touchStartX,
    event.changedTouches[0].clientY - touchStartY,
  );
}, { passive: true, capture: true });

timelineCarousel.addEventListener("click", (event) => {
  if (!suppressTimelineClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressTimelineClick = false;
}, true);

window.addEventListener("resize", updateTimelineCarouselHeight);

captureForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const content = captureInput.value.trim();
  if (!content) {
    captureInput.focus();
    return;
  }

  const events = readEvents();
  const newEvent = createEvent(content);
  events.push(newEvent);
  writeEvents(events);

  const eventDate = new Date(newEvent.createdAt);
  selectedDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  visibleMonth = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);

  captureForm.reset();
  saveStatus.textContent = `已记录在 ${newEvent.time}`;
  renderCalendar();
  renderTimeline();
  captureInput.focus();

  window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 3000);
});

dailyForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(dailyForm);
  const sleepTime = String(formData.get("sleepTime") || "");
  const wakeTime = String(formData.get("wakeTime") || "");
  const stepsText = String(formData.get("steps") || "").trim();
  const periodValue = formData.get("period");
  const currentDate = new Date();
  const currentDateKey = getLocalDateKey(currentDate);
  const yesterdayKey = getLocalDateKey(addLocalDays(currentDate, -1));
  const events = readEvents();
  let savedItems = 0;

  if (sleepTime) {
    upsertDailyEvent(events, {
      metric: "sleep",
      date: yesterdayKey,
      time: sleepTime,
      content: "入睡",
      type: "sleep",
      tag: "blue",
      color: "blue",
      value: sleepTime,
    });
    savedItems += 1;
  } else {
    removeDailyEvent(events, "sleep", yesterdayKey);
  }

  if (wakeTime) {
    upsertDailyEvent(events, {
      metric: "wake",
      date: currentDateKey,
      time: wakeTime,
      content: "起床",
      type: "wake",
      tag: "blue",
      color: "blue",
      value: wakeTime,
    });
    savedItems += 1;
  } else {
    removeDailyEvent(events, "wake", currentDateKey);
  }

  if (stepsText) {
    const steps = Number(stepsText);
    upsertDailyEvent(events, {
      metric: "steps",
      date: yesterdayKey,
      time: "22:00",
      content: `${steps} 步`,
      type: "steps",
      tag: "orange",
      color: "orange",
      value: steps,
    });
    savedItems += 1;
  } else {
    removeDailyEvent(events, "steps", yesterdayKey);
  }

  writeEvents(events);

  if (periodValue === "yes" || periodValue === "no") {
    const period = periodValue === "yes";
    const statuses = readDailyStatuses();
    statuses[currentDateKey] = {
      period,
      label: period ? "经期" : "非经期",
      updatedAt: new Date().toISOString(),
    };
    writeDailyStatuses(statuses);
    savedItems += 1;
  }

  if (savedItems === 0) {
    dailySaveStatus.textContent = "先填一项再保存";
    return;
  }

  dailySaveStatus.textContent = "今日填写已保存";
  renderCalendar();
  renderTimeline();
  loadDailyForm();

  window.setTimeout(() => {
    dailySaveStatus.textContent = "";
  }, 3000);
});

previousMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

addEventButton.addEventListener("click", () => openEventDialog());

timelineEmpty.addEventListener("click", () => openEventDialog());

eventDialogClose.addEventListener("click", closeEventDialog);

eventDialog.addEventListener("close", () => {
  editingEventId = null;
  resetDeleteConfirmation();
  eventForm.reset();
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const time = eventTimeInput.value;
  const content = eventContentInput.value.trim();
  if (!time || !content) {
    dialogStatus.textContent = "请填写时间和内容";
    return;
  }

  const events = readEvents();
  const updatedAt = new Date().toISOString();

  if (editingEventId) {
    const existingEvent = events.find((item) => item.id === editingEventId);
    if (!existingEvent || existingEvent.source === "daily") {
      dialogStatus.textContent = "这条记录不能在这里修改";
      return;
    }

    existingEvent.time = time;
    existingEvent.content = content;
    existingEvent.updatedAt = updatedAt;
  } else {
    events.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      date: getLocalDateKey(selectedDate),
      time,
      content,
      type: "manual",
      tag: "default",
      color: "default",
      source: "manual",
      createdAt: updatedAt,
      updatedAt,
    });
  }

  writeEvents(events);
  closeEventDialog();
  renderCalendar();
  renderTimeline();
});

deleteEventButton.addEventListener("click", () => {
  if (!editingEventId) {
    return;
  }

  if (!deleteConfirmationPending) {
    deleteConfirmationPending = true;
    deleteEventButton.classList.add("is-confirming");
    deleteEventButton.textContent = "再次点击确认删除";
    dialogStatus.textContent = "删除后无法恢复";
    return;
  }

  const events = readEvents();
  const eventToDelete = events.find((item) => item.id === editingEventId);
  if (!eventToDelete || eventToDelete.source === "daily") {
    dialogStatus.textContent = "这条记录不能在这里删除";
    return;
  }

  writeEvents(events.filter((item) => item.id !== editingEventId));
  closeEventDialog();
  renderCalendar();
  renderTimeline();
});

goDailyButton.addEventListener("click", () => {
  closeEventDialog();
  switchPage("daily");
});

dailyNoteInput.addEventListener("input", () => {
  const dateKey = getLocalDateKey(selectedDate);
  const content = dailyNoteInput.value;
  resetClearNoteConfirmation();
  clearNoteButton.hidden = !content.trim();
  noteSaveStatus.textContent = "正在保存…";

  window.clearTimeout(noteSaveTimer);
  noteSaveTimer = window.setTimeout(() => {
    saveDailyNote(dateKey, content);
  }, 500);
});

clearNoteButton.addEventListener("click", () => {
  if (!clearNoteConfirmationPending) {
    clearNoteConfirmationPending = true;
    clearNoteButton.classList.add("is-confirming");
    clearNoteButton.textContent = "再次点击确认";
    noteSaveStatus.textContent = "清空后无法恢复";
    return;
  }

  window.clearTimeout(noteSaveTimer);
  const dateKey = getLocalDateKey(selectedDate);
  dailyNoteInput.value = "";
  saveDailyNote(dateKey, "");
  resetClearNoteConfirmation();
  clearNoteButton.hidden = true;
  noteSaveStatus.textContent = "备注已清空";
});

addImageButton.addEventListener("click", () => noteImageInput.click());

noteImageInput.addEventListener("change", async () => {
  const files = [...(noteImageInput.files || [])];
  noteImageInput.value = "";
  if (files.length === 0) return;

  const dateKey = getLocalDateKey(selectedDate);
  const allMeta = readDailyImageMeta();
  const currentImages = [...(allMeta[dateKey] || [])];
  const remainingSlots = MAX_IMAGES_PER_DAY - currentImages.length;
  if (remainingSlots <= 0) {
    noteSaveStatus.textContent = "这一天已经有 6 张图片";
    return;
  }

  const filesToAdd = files.slice(0, remainingSlots);
  noteSaveStatus.textContent = "正在处理图片…";
  let addedCount = 0;

  try {
    for (const file of filesToAdd) {
      const blob = await resizeImageFile(file);
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      await putImageBlob(id, blob);
      currentImages.push({
        id,
        name: file.name || "图片",
        type: blob.type,
        size: blob.size,
        createdAt: new Date().toISOString(),
      });
      allMeta[dateKey] = currentImages;
      writeDailyImageMeta(allMeta);
      addedCount += 1;
    }

    noteSaveStatus.textContent = files.length > filesToAdd.length
      ? `已添加 ${addedCount} 张；单日最多 6 张`
      : `已添加 ${addedCount} 张图片`;
    renderCalendar();
    if (dateKey === getLocalDateKey(selectedDate)) renderDailyImages();
  } catch (error) {
    noteSaveStatus.textContent = error instanceof Error ? error.message : "图片保存失败";
    if (addedCount > 0) {
      renderCalendar();
      if (dateKey === getLocalDateKey(selectedDate)) renderDailyImages();
    }
  }
});

dataButton.addEventListener("click", () => {
  refreshDataSummary();
  resetImportPreview();
  dataDialog.showModal();
});

dataDialogClose.addEventListener("click", () => dataDialog.close());

dataDialog.addEventListener("close", resetImportPreview);

exportJsonButton.addEventListener("click", async () => {
  dataStatus.textContent = "正在整理完整备份…";
  try {
    const backup = await createBackupPayload();
    const filename = `个人应用完整备份-${getExportTimestamp()}.json`;
    downloadFile(JSON.stringify(backup, null, 2), "application/json;charset=utf-8", filename);
    dataStatus.textContent = "完整备份已生成，请保存到安全的位置";
  } catch (error) {
    dataStatus.textContent = error instanceof Error ? error.message : "完整备份生成失败";
  }
});

exportCsvButton.addEventListener("click", () => {
  const filename = `个人应用时间轴-${getExportTimestamp()}.csv`;
  downloadFile(createCsvContent(), "text/csv;charset=utf-8", filename);
  dataStatus.textContent = "CSV 表格已生成";
});

chooseBackupButton.addEventListener("click", () => backupFileInput.click());

backupFileInput.addEventListener("change", async () => {
  pendingImport = null;
  importPreview.hidden = true;
  dataStatus.textContent = "";
  const file = backupFileInput.files?.[0];
  if (!file) {
    return;
  }

  try {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error("备份文件超过 50 MB，暂时无法导入");
    }
    const parsedBackup = JSON.parse(await file.text());
    const validatedBackup = validateBackup(parsedBackup);
    pendingImport = prepareImport(validatedBackup);
    const statusAddCount = Object.keys(pendingImport.statusesToAdd).length;
    const noteAddCount = Object.keys(pendingImport.notesToAdd).length;
    const imageAddCount = pendingImport.imagesToAdd.length;
    importPreviewText.textContent = `可新增 ${pendingImport.eventsToAdd.length} 条时间轴记录、${statusAddCount} 天每日状态、${noteAddCount} 天文字备注、${imageAddCount} 张图片；将跳过 ${pendingImport.skippedEvents + pendingImport.skippedStatuses + pendingImport.skippedNotes + pendingImport.skippedImages} 项当前已有数据。`;
    importPreview.hidden = false;
  } catch (error) {
    dataStatus.textContent = error instanceof Error ? error.message : "无法读取这个备份文件";
  }
});

confirmImportButton.addEventListener("click", async () => {
  if (!pendingImport) {
    dataStatus.textContent = "请先选择并检查备份文件";
    return;
  }

  const currentEvents = readEvents();
  const currentStatuses = readDailyStatuses();
  const currentNotes = readDailyNotes();
  const currentImageMeta = readDailyImageMeta();

  try {
    for (const image of pendingImport.imagesToAdd) {
      await putImageBlob(image.id, dataUrlToBlob(image.dataUrl));
      const dateImages = currentImageMeta[image.date] || [];
      dateImages.push({
        id: image.id,
        name: image.name || "备份图片",
        type: image.type || "image/jpeg",
        size: image.size || 0,
        createdAt: image.createdAt || new Date().toISOString(),
      });
      currentImageMeta[image.date] = dateImages;
    }

    writeEvents([...currentEvents, ...pendingImport.eventsToAdd]);
    writeDailyStatuses({ ...currentStatuses, ...pendingImport.statusesToAdd });
    writeDailyNotes({ ...currentNotes, ...pendingImport.notesToAdd });
    writeDailyImageMeta(currentImageMeta);
  } catch (error) {
    dataStatus.textContent = error instanceof Error ? error.message : "图片恢复失败，未完成合并";
    return;
  }

  const importedCount = pendingImport.eventsToAdd.length
    + Object.keys(pendingImport.statusesToAdd).length
    + Object.keys(pendingImport.notesToAdd).length
    + pendingImport.imagesToAdd.length;
  pendingImport = null;
  importPreview.hidden = true;
  backupFileInput.value = "";
  dataStatus.textContent = `备份合并完成，共新增 ${importedCount} 项`;
  refreshDataSummary();
  loadDailyForm();
  renderCalendar();
  renderTimeline();
});

scheduleClockUpdate();
loadDailyForm();
renderCalendar();
renderTimeline();
setTimelineSubview("timeline", { scroll: false });
switchPage("realtime");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20").catch((error) => {
      console.error("离线功能注册失败：", error);
    });
  });
}
