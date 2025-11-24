import React, { useState, useEffect } from 'react';
import { Note, NoteFont } from '../types';

interface NotesPanelProps {
  currentTopic?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ currentTopic }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedNotes = localStorage.getItem('learnn_notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('learnn_notes', JSON.stringify(notes));
  }, [notes]);

  const createNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      topic: currentTopic || 'New Study Session',
      content: '',
      timestamp: Date.now(),
      font: 'sans',
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setSearchQuery(''); // Clear search to show new note
  };

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (window.confirm('Are you sure you want to delete this note?')) {
      const updatedNotes = notes.filter((n) => n.id !== id);
      setNotes(updatedNotes);
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    }
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, ...updates, timestamp: Date.now() } : n))
    );
  };

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const filteredNotes = notes.filter(note => 
    note.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFontClass = (font?: NoteFont) => {
    switch (font) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      default: return 'font-sans';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Smart Notes
          </h2>
        </div>
        
        {/* Search Bar (Only shown in list view) */}
        {!activeNoteId && (
          <div className="relative mb-4">
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {!activeNoteId && (
          <button
            onClick={createNote}
            className="w-full text-lg font-bold bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-4 rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create New Note
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
        {activeNoteId && activeNote ? (
          <div className="flex flex-col h-full animate-fadeIn bg-white dark:bg-slate-800">
             {/* Note Navigation & Toolbar */}
             <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800 backdrop-blur-sm sticky top-0 z-10">
                <button 
                  onClick={() => setActiveNoteId(null)}
                  className="text-base font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  ← Back to List
                </button>
                
                <div className="flex items-center gap-2">
                  {/* Font Selector */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
                    <button 
                      onClick={() => updateNote(activeNote.id, { font: 'sans' })}
                      className={`px-3 py-1.5 rounded-md text-sm font-sans font-medium transition-all ${!activeNote.font || activeNote.font === 'sans' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      Sans
                    </button>
                    <button 
                      onClick={() => updateNote(activeNote.id, { font: 'serif' })}
                      className={`px-3 py-1.5 rounded-md text-sm font-serif font-medium transition-all ${activeNote.font === 'serif' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      Serif
                    </button>
                    <button 
                      onClick={() => updateNote(activeNote.id, { font: 'mono' })}
                      className={`px-3 py-1.5 rounded-md text-sm font-mono font-medium transition-all ${activeNote.font === 'mono' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                      Mono
                    </button>
                  </div>

                  {/* Delete Button (Editor View) */}
                  <button 
                    onClick={() => deleteNote(activeNote.id)}
                    className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Note"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
             </div>
             
             {/* Note Editor */}
             <div className="flex-1 p-8 flex flex-col space-y-6">
                <input 
                  className={`w-full font-bold text-3xl text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-0 placeholder-slate-300 dark:placeholder-slate-600 ${getFontClass(activeNote.font)}`}
                  value={activeNote.topic}
                  onChange={(e) => updateNote(activeNote.id, { topic: e.target.value })}
                  placeholder="Note Title"
                />
                <textarea
                  className={`w-full flex-1 resize-none text-lg text-slate-700 dark:text-slate-300 bg-transparent focus:outline-none placeholder-slate-300 dark:placeholder-slate-600 leading-relaxed custom-scrollbar ${getFontClass(activeNote.font)}`}
                  value={activeNote.content}
                  onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                  placeholder="Start typing your notes here..."
                />
             </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredNotes.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center h-64">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-xl font-bold text-slate-600 dark:text-slate-400">{searchQuery ? 'No matching notes' : 'No notes yet'}</p>
                <p className="text-base mt-2 max-w-xs mx-auto">{searchQuery ? 'Try a different search term to find what you need.' : 'Create a note to start capturing your verified knowledge.'}</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className="p-6 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer transition-all group border-l-4 border-transparent hover:border-indigo-500 mb-1 last:mb-0 relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-xl text-slate-800 dark:text-slate-200 truncate pr-4 ${getFontClass(note.font)}`}>{note.topic}</h3>
                    <button
                      onClick={(e) => deleteNote(note.id, e)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-2 md:p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 relative z-10"
                      title="Delete Note"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className={`text-base text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed ${getFontClass(note.font)}`}>
                    {note.content || "No content yet..."}
                  </p>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-600 mt-3 block uppercase tracking-wider">
                    {new Date(note.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};