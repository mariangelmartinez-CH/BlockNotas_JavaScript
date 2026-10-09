const STORAGE_KEY = "markdown-notes";

function deriveTitle(content) {
  if (typeof content !== "string" || content.trim() === "") {
    return "Sin título";
  }

  const firstLine = content.trim().split("\n", 1)[0].trim();
  return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine;
}

function deriveExcerpt(content, maxLength = 100) {
  if (typeof content !== "string" || content.trim() === "") {
    return "";
  }

  const cleanContent = content.trim();
  return cleanContent.length > maxLength
    ? `${cleanContent.slice(0, maxLength)}...`
    : cleanContent;
}

function createNote(content, title) {
  if (typeof content !== "string" || content.trim() === "") {
    return null;
  }

  const trimmedContent = content.trim();
  const timestamp = Date.now();
  const noteTitle =
    typeof title === "string" && title.trim() !== ""
      ? title.trim()
      : deriveTitle(trimmedContent);

  return {
    id: timestamp,
    content: trimmedContent,
    title: noteTitle,
    excerpt: deriveExcerpt(trimmedContent),
    createdAt: timestamp,
    updatedAt: timestamp,
    favorite: false,
  };
}

function getLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function saveToStorage(notes, storage = getLocalStorage()) {
  if (!Array.isArray(notes) || !storage) {
    return false;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

function loadFromStorage(storage = getLocalStorage()) {
  if (!storage) {
    return [];
  }

  try {
    const savedNotes = storage.getItem(STORAGE_KEY);
    if (savedNotes === null) {
      return [];
    }

    const parsedNotes = JSON.parse(savedNotes);
    return Array.isArray(parsedNotes) ? parsedNotes : [];
  } catch {
    return [];
  }
}

function createNotesStore(storage = getLocalStorage()) {
  let notes = loadFromStorage(storage);

  function persistNotes() {
    saveToStorage(notes, storage);
  }

  function addNote(content, title) {
    const note = createNote(content, title);
    if (note === null) {
      return { success: false, message: "El contenido no puede estar vacío" };
    }

    notes.push(note);
    persistNotes();
    return { success: true, note: { ...note } };
  }

  function getAllNotes() {
    return notes.map((note) => ({ ...note }));
  }

  function getNoteById(noteId) {
    const note = notes.find((item) => item.id === noteId);
    return note === undefined ? null : { ...note };
  }

  function updateNote(noteId, updates) {
    if (
      noteId === undefined ||
      noteId === null ||
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      return { success: false, message: "ID o actualización inválidos" };
    }

    const note = notes.find((item) => item.id === noteId);
    if (note === undefined) {
      return { success: false, message: "Nota no encontrada" };
    }

    let hasChanges = false;

    if (Object.hasOwn(updates, "content")) {
      if (
        typeof updates.content !== "string" ||
        updates.content.trim() === ""
      ) {
        return { success: false, message: "El contenido no puede estar vacío" };
      }

      note.content = updates.content.trim();
      note.title = deriveTitle(note.content);
      note.excerpt = deriveExcerpt(note.content);
      hasChanges = true;
    }

    if (typeof updates.title === "string" && updates.title.trim() !== "") {
      note.title = updates.title.trim();
      hasChanges = true;
    }

    if (typeof updates.favorite === "boolean") {
      note.favorite = updates.favorite;
      hasChanges = true;
    }

    if (hasChanges) {
      note.updatedAt = Date.now();
      persistNotes();
    }

    return { success: true, note: { ...note } };
  }

  function deleteNote(noteId) {
    if (noteId === undefined || noteId === null) {
      return { success: false, message: "ID inválido" };
    }

    const initialLength = notes.length;
    notes = notes.filter((note) => note.id !== noteId);

    if (notes.length === initialLength) {
      return { success: false, message: "Nota no encontrada" };
    }

    persistNotes();
    return { success: true, message: "Nota eliminada exitosamente" };
  }

  function searchNotes(query) {
    if (typeof query !== "string" || query.trim() === "") {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    return notes
      .filter((note) =>
        `${note.title}\n${note.content}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .map((note) => ({ ...note }));
  }

  function getNotesOrderedByDate() {
    return getAllNotes().sort(
      (first, second) => second.updatedAt - first.updatedAt,
    );
  }

  function getFavoriteNotes() {
    return notes.filter((note) => note.favorite).map((note) => ({ ...note }));
  }

  function getNotesCount() {
    return notes.length;
  }

  return {
    addNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteNote,
    searchNotes,
    getNotesOrderedByDate,
    getFavoriteNotes,
    getNotesCount,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STORAGE_KEY,
    deriveTitle,
    deriveExcerpt,
    createNote,
    saveToStorage,
    loadFromStorage,
    createNotesStore,
  };
}

if (typeof document !== "undefined") {
  const notesStore = createNotesStore();
  let currentNoteId = null;

  const elements = {
    message: document.querySelector("#message"),
    noteList: document.querySelector("#note-list"),
    search: document.querySelector("#note-search"),
    editorSection: document.querySelector("#editor-section"),
    previewSection: document.querySelector("#preview-section"),
    title: document.querySelector("#note-title"),
    editor: document.querySelector("#note-content"),
    preview: document.querySelector("#preview-container"),
    saveButton: document.querySelector("#save-note-button"),
    newButton: document.querySelector("#new-note-button"),
    deleteButton: document.querySelector("#delete-note-button"),
    favoriteButton: document.querySelector("#favorite-note-button"),
  };

  function showMessage(text, type) {
    elements.message.textContent = text;
    elements.message.className = type ? `message ${type}` : "message";
  }

  function showEditorAndPreview() {
    elements.editorSection.hidden = false;
    elements.previewSection.hidden = false;
  }

  function hideEditorAndPreview() {
    elements.editorSection.hidden = true;
    elements.previewSection.hidden = true;
  }

  function renderNoteList(notes) {
    elements.noteList.replaceChildren();

    if (notes.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-message";
      emptyState.textContent = elements.search.value.trim()
        ? "No se encontraron notas."
        : "No hay notas todavía. Crea una para empezar.";
      elements.noteList.appendChild(emptyState);
      return;
    }

    notes.forEach((note) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "note-item";
      item.dataset.id = String(note.id);
      item.setAttribute("aria-pressed", String(String(note.id) === String(currentNoteId)));

      const title = document.createElement("h3");
      title.textContent = note.title || deriveTitle(note.content);

      const excerpt = document.createElement("p");
      excerpt.className = "note-excerpt";
      excerpt.textContent = note.excerpt || deriveExcerpt(note.content);

      const date = document.createElement("time");
      date.className = "note-date";
      date.dateTime = new Date(note.updatedAt).toISOString();
      date.textContent = new Date(note.updatedAt).toLocaleString();

      item.append(title, excerpt, date);
      elements.noteList.appendChild(item);
    });
  }

  function renderMarkdownPreview(content) {
    if (!content.trim()) {
      elements.preview.innerHTML = '<p class="preview-empty">La vista previa aparecerá aquí.</p>';
      return;
    }

    const renderedMarkdown = marked.parse(content);
    elements.preview.innerHTML = DOMPurify.sanitize(renderedMarkdown);
  }

  function renderEditor(note) {
    elements.title.value =
      note && note.title !== deriveTitle(note.content) ? note.title : "";
    elements.editor.value = note ? note.content : "";
    elements.deleteButton.disabled = !note;
    elements.favoriteButton.disabled = !note;
    elements.favoriteButton.setAttribute(
      "aria-pressed",
      String(Boolean(note && note.favorite)),
    );
    elements.favoriteButton.textContent = note && note.favorite
      ? "Quitar favorito"
      : "Marcar favorita";
    renderMarkdownPreview(elements.editor.value);
    showEditorAndPreview();
    elements.editor.focus();
  }

  function refreshNoteList() {
    const query = elements.search.value.trim();
    const notes = query
      ? notesStore.searchNotes(query)
      : notesStore.getNotesOrderedByDate();
    renderNoteList(notes);
  }

  function selectNote(noteId) {
    const note = notesStore.getNoteById(Number(noteId));
    if (!note) {
      return;
    }

    currentNoteId = note.id;
    renderEditor(note);
    refreshNoteList();
    showMessage("Nota abierta", "success");
  }

  elements.newButton.addEventListener("click", () => {
    currentNoteId = null;
    renderEditor(null);
    refreshNoteList();
    showMessage("Nueva nota", "success");
  });

  elements.noteList.addEventListener("click", (event) => {
    const item = event.target.closest(".note-item");
    if (item) {
      selectNote(item.dataset.id);
    }
  });

  elements.search.addEventListener("input", refreshNoteList);
  elements.editor.addEventListener("input", () => {
    renderMarkdownPreview(elements.editor.value);
  });

  elements.saveButton.addEventListener("click", () => {
    const content = elements.editor.value;
    const title = elements.title.value.trim();

    if (!content.trim()) {
      showMessage("Escribe algo antes de guardar la nota.", "error");
      elements.editor.focus();
      return;
    }

    const result = currentNoteId === null
      ? notesStore.addNote(content, title || undefined)
      : notesStore.updateNote(currentNoteId, {
          content,
          ...(title ? { title } : {}),
        });

    if (!result.success) {
      showMessage(result.message, "error");
      return;
    }

    currentNoteId = result.note.id;
    renderEditor(result.note);
    refreshNoteList();
    showMessage("Nota guardada", "success");
  });

  elements.favoriteButton.addEventListener("click", () => {
    if (currentNoteId === null) {
      return;
    }

    const note = notesStore.getNoteById(currentNoteId);
    const result = notesStore.updateNote(currentNoteId, {
      favorite: !note.favorite,
    });

    if (result.success) {
      renderEditor(result.note);
      refreshNoteList();
      showMessage("Favorito actualizado", "success");
    }
  });

  elements.deleteButton.addEventListener("click", () => {
    if (currentNoteId === null) {
      return;
    }

    const result = notesStore.deleteNote(currentNoteId);
    if (!result.success) {
      showMessage(result.message, "error");
      return;
    }

    currentNoteId = null;
    renderNoteList(notesStore.getNotesOrderedByDate());
    hideEditorAndPreview();
    showMessage(result.message, "success");
  });

  elements.editor.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();
      elements.saveButton.click();
    }
  });

  refreshNoteList();
  hideEditorAndPreview();
}
