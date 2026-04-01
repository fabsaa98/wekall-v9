import { useState, useRef, useEffect } from 'react';
import { PencilSimple, Check, X } from '@phosphor-icons/react';

interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

export function EditableField({ value, onSave, placeholder = 'Sin datos' }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    if (draft.trim() !== value) onSave(draft.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          className="text-xs border border-primary rounded px-1.5 py-0.5 bg-background text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
          placeholder={placeholder}
        />
        <button onClick={handleSave} className="text-green-500 hover:text-green-600 p-0.5">
          <Check size={12} weight="bold" />
        </button>
        <button onClick={handleCancel} className="text-muted-foreground hover:text-card-foreground p-0.5">
          <X size={12} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-card-foreground">{value || placeholder}</span>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-0.5"
        title="Editar"
      >
        <PencilSimple size={11} weight="light" />
      </button>
    </div>
  );
}
