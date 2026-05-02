// Scale-H US-EI-013: Comment Section
// 01 de mayo de 2026

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send } from 'lucide-react';
import { addCommentToInsight, type Comment } from '@/lib/executiveInsights';

interface CommentSectionProps {
  docId: string;
  comments?: { notes: Comment[] };
  currentUser: string;
  onCommentAdded: (newComments: { notes: Comment[] }) => void;
}

export function CommentSection({ docId, comments, currentUser, onCommentAdded }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const success = await addCommentToInsight(docId, currentUser, newComment.trim());

    if (success) {
      const updatedComments = {
        notes: [
          ...(comments?.notes || []),
          {
            author: currentUser,
            text: newComment.trim(),
            created_at: new Date().toISOString(),
          },
        ],
      };
      onCommentAdded(updatedComments);
      setNewComment('');
    } else {
      alert('Error al agregar comentario. Intenta nuevamente.');
    }

    setSubmitting(false);
  };

  const notes = comments?.notes || [];

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <MessageSquare size={18} className="text-primary" />
        Notas ({notes.length})
      </h3>

      {/* Existing comments */}
      {notes.length > 0 && (
        <div className="space-y-3 mb-4">
          {notes.map((note, i) => (
            <div key={i} className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm text-foreground leading-relaxed">{note.text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="font-semibold">{note.author}</span> •{' '}
                {new Date(note.created_at).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add new comment */}
      <div className="flex gap-2">
        <Input
          placeholder="Agregar nota o comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={submitting}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || submitting}>
          <Send size={14} className="mr-1" />
          {submitting ? 'Enviando...' : 'Agregar'}
        </Button>
      </div>

      {notes.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          No hay notas aún. Agrega la primera para registrar decisiones o recordatorios.
        </p>
      )}
    </div>
  );
}
