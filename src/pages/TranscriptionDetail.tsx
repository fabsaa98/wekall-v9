import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkle, PhoneIncoming, PhoneOutgoing, Download, Clock, Calendar, ArrowLeft, Play, ThumbsUp, ThumbsDown, Copy, Check } from '@phosphor-icons/react';
import { SentimentBadge } from '@/components/SentimentBadge';
import { TagPill } from '@/components/TagPill';
import { TranscriptBubble } from '@/components/TranscriptBubble';
import { useTranscription, useDeleteTag, useUpdateTranscription } from '@/hooks/useTranscriptions';
import { EditableField } from '@/components/EditableField';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const callTypeLabels: Record<string, string> = {
  sale: 'Venta', support: 'Soporte', collection: 'Cobranza',
  informational: 'Informativa', complaint: 'Queja', other: 'Otro',
};

const resultLabels: Record<string, { label: string; classes: string }> = {
  resolved: { label: 'Resuelta', classes: 'bg-wk-green/10 text-wk-green-dark' },
  pending: { label: 'Pendiente', classes: 'bg-wk-yellow/10 text-wk-yellow-dark' },
  escalated: { label: 'Escalada', classes: 'bg-wk-red/10 text-wk-red' },
  no_contact: { label: 'Sin contacto', classes: 'bg-secondary text-muted-foreground' },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded bg-secondary" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5 h-96" />
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 h-32" />
          <div className="rounded-lg border border-border bg-card p-4 h-48" />
        </div>
      </div>
    </div>
  );
}

export default function TranscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: transcription, isLoading, isError } = useTranscription(id!);
  const deleteTag = useDeleteTag(id!);
  const updateTranscription = useUpdateTranscription(id!);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !transcription) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-foreground">Transcripción no encontrada</p>
        <Link to="/transcriptions" className="mt-4 text-sm text-primary hover:underline">Volver a transcripciones</Link>
      </div>
    );
  }

  const t = transcription;
  const res = resultLabels[t.classification.result];

  const handleDeleteTag = (tagId: string, label: string) => {
    deleteTag.mutate(tagId, {
      onSuccess: () => toast.success(`Etiqueta "${label}" eliminada`),
      onError: () => toast.error('No se pudo eliminar la etiqueta'),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3 flex-1">
          <Link to="/transcriptions" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary shrink-0">
            <ArrowLeft size={20} weight="light" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {t.agent.name} → {t.client.name}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <SentimentBadge sentiment={t.classification.sentiment} />
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {callTypeLabels[t.classification.callType]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${res.classes}`}>{res.label}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={12} weight="light" />
                {format(new Date(t.startedAt), "d MMM yyyy, HH:mm", { locale: es })}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} weight="light" />
                {formatDuration(t.duration)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Feedback */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5 bg-card">
            <span className="text-[10px] text-muted-foreground mr-0.5">¿Correcta?</span>
            <button onClick={() => setFeedback('up')} title="Correcta"
              className={`rounded p-1 transition-colors ${feedback === 'up' ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}>
              <ThumbsUp size={13} weight={feedback === 'up' ? 'fill' : 'light'} />
            </button>
            <button onClick={() => setFeedback('down')} title="Incorrecta"
              className={`rounded p-1 transition-colors ${feedback === 'down' ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}>
              <ThumbsDown size={13} weight={feedback === 'down' ? 'fill' : 'light'} />
            </button>
          </div>
          {/* Copiar */}
          <button
            onClick={() => {
              const text = t.transcript?.map((s: {speaker: string; text: string}) => `[${s.speaker}] ${s.text}`).join('\n') || '';
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Copiar transcripción"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground hover:bg-secondary"
          >
            {copied ? <Check size={14} weight="bold" className="text-green-500" /> : <Copy size={14} weight="light" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button onClick={() => toast.success('PDF descargado')} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground hover:bg-secondary">
            <Download size={14} weight="light" /> PDF
          </button>
          <button onClick={() => toast.success('CSV descargado')} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground hover:bg-secondary">
            <Download size={14} weight="light" /> CSV
          </button>
        </div>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Transcript */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5 shadow-wk-sm flex flex-col" style={{ maxHeight: 'min(calc(100vh - 180px), 800px)' }}>
          <h3 className="text-base font-medium text-card-foreground mb-4">Transcripción</h3>
          <div className="overflow-y-auto pr-2 flex-1">
            {t.transcript.map((seg, i) => (
              <TranscriptBubble key={i} segment={seg} agentName={`${t.agent.name} - ${t.agent.role}`} clientName={t.client.name} />
            ))}
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-wk-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkle size={16} weight="light" className="text-primary" />
              <h4 className="text-sm font-medium text-card-foreground">Resumen AI</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.summary}</p>
          </div>

          {/* Classification */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-wk-sm">
            <h4 className="text-sm font-medium text-card-foreground mb-3">Clasificación AI</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sentimiento</span>
                <SentimentBadge sentiment={t.classification.sentiment} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tipo</span>
                <span className="text-xs font-medium text-card-foreground">{callTypeLabels[t.classification.callType]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tema</span>
                <span className="text-xs font-medium text-card-foreground">{t.classification.mainTopic}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Resultado</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${res.classes}`}>{res.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Confianza</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${t.classification.confidence * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{Math.round(t.classification.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-wk-sm">
            <h4 className="text-sm font-medium text-card-foreground mb-3">Etiquetas</h4>
            <div className="mb-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Sparkle size={10} weight="light" className="text-primary" /> Automáticas (AI)</p>
              <div className="flex flex-wrap gap-1.5">
                {t.tags.filter(tag => tag.source === 'ai').map(tag => (
                  <TagPill key={tag.id} label={tag.label} source="ai" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Manuales</p>
              <div className="flex flex-wrap gap-1.5">
                {t.tags.filter(tag => tag.source === 'manual').map(tag => (
                  <TagPill key={tag.id} label={tag.label} source="manual" onRemove={() => handleDeleteTag(tag.id, tag.label)} />
                ))}
                <button onClick={() => toast.info('Agregar etiqueta')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary">+ Agregar</button>
              </div>
            </div>
          </div>

          {/* Call Details */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-wk-sm">
            <h4 className="text-sm font-medium text-card-foreground mb-3">Detalles de la llamada</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Agente</span>
                <EditableField
                  value={t.agent.name}
                  onSave={v => updateTranscription.mutate({ agentName: v })}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cliente</span>
                <EditableField
                  value={t.client.name}
                  onSave={v => updateTranscription.mutate({ clientName: v })}
                />
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span className="text-card-foreground">{t.client.phone}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Dirección</span>
                <span className="flex items-center gap-1 text-card-foreground">
                  {t.direction === 'inbound' ? <><PhoneIncoming size={12} className="text-wk-green" /> Entrante</> : <><PhoneOutgoing size={12} className="text-wk-blue" /> Saliente</>}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duración</span><span className="text-card-foreground">{formatDuration(t.duration)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span className="text-card-foreground">{format(new Date(t.startedAt), "d 'de' MMMM yyyy", { locale: es })}</span></div>
              {t.audioUrl ? (
                <audio controls className="mt-2 w-full rounded-lg" preload="metadata">
                  <source src={t.audioUrl} type="audio/mpeg" />
                  Tu navegador no soporta reproducción de audio.
                </audio>
              ) : (
                <a
                  href={`/api/transcriptions/${t.id}/audio`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-card-foreground hover:bg-secondary"
                  onClick={async (e) => {
                    e.preventDefault();
                    const res = await fetch(`/api/transcriptions/${t.id}/audio`);
                    if (res.status === 404) { alert('Audio no disponible para esta llamada'); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audio.play();
                  }}
                >
                  <Play size={14} weight="light" /> Reproducir audio
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
