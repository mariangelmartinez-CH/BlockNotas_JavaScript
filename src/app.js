function deriveTitle(content) {
	if (typeof content !== 'string' || content.trim() === '') {
		return 'Sin título';
	}

	const firstLine = content.trim().split('\n', 1)[0].trim();
	return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine;
}

function deriveExcerpt(content, maxLength = 100) {
	if (typeof content !== 'string' || content.trim() === '') {
		return '';
	}

	const cleanContent = content.trim();
	return cleanContent.length > maxLength
		? `${cleanContent.slice(0, maxLength)}...`
		: cleanContent;
}

function createNote(content, title) {
	if (typeof content !== 'string' || content.trim() === '') {
		return null;
	}

	const trimmedContent = content.trim();
	const timestamp = Date.now();
	const noteTitle =
		typeof title === 'string' && title.trim() !== ''
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

function createNotesStore() {
	let notes = [];

	function addNote(content, title) {
		const note = createNote(content, title);
		if (note === null) {
			return { success: false, message: 'El contenido no puede estar vacío' };
		}

		notes.push(note);
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
			typeof updates !== 'object' ||
			Array.isArray(updates)
		) {
			return { success: false, message: 'ID o actualización inválidos' };
		}

		const note = notes.find((item) => item.id === noteId);
		if (note === undefined) {
			return { success: false, message: 'Nota no encontrada' };
		}

		let hasChanges = false;

		if (Object.hasOwn(updates, 'content')) {
			if (typeof updates.content !== 'string' || updates.content.trim() === '') {
				return { success: false, message: 'El contenido no puede estar vacío' };
			}

			note.content = updates.content.trim();
			note.title = deriveTitle(note.content);
			note.excerpt = deriveExcerpt(note.content);
			hasChanges = true;
		}

		if (typeof updates.title === 'string' && updates.title.trim() !== '') {
			note.title = updates.title.trim();
			hasChanges = true;
		}

		if (typeof updates.favorite === 'boolean') {
			note.favorite = updates.favorite;
			hasChanges = true;
		}

		if (hasChanges) {
			note.updatedAt = Date.now();
		}

		return { success: true, note: { ...note } };
	}

	function deleteNote(noteId) {
		if (noteId === undefined || noteId === null) {
			return { success: false, message: 'ID inválido' };
		}

		const initialLength = notes.length;
		notes = notes.filter((note) => note.id !== noteId);

		if (notes.length === initialLength) {
			return { success: false, message: 'Nota no encontrada' };
		}

		return { success: true, message: 'Nota eliminada exitosamente' };
	}

	function searchNotes(query) {
		if (typeof query !== 'string' || query.trim() === '') {
			return [];
		}

		const normalizedQuery = query.trim().toLowerCase();
		return notes
			.filter((note) =>
				`${note.title}\n${note.content}`.toLowerCase().includes(normalizedQuery),
			)
			.map((note) => ({ ...note }));
	}

	function getNotesOrderedByDate() {
		return getAllNotes().sort((first, second) => second.updatedAt - first.updatedAt);
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

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		deriveTitle,
		deriveExcerpt,
		createNote,
		createNotesStore,
	};
}
