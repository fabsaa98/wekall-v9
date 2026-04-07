import { useState, useRef } from 'react';
import { CloudArrowUp, FileAudio, CheckCircle, Clock, Warning, Spinner } from '@phosphor-icons/react';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface UploadJob {
  jobId: string;
  fileName: string;
  status: JobStatus;
  transcriptionId?: string;
  error?: string;
}

const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/flac', 'audio/mp4', 'audio/webm'];
const MAX_SIZE_MB = 100;

export default function UploadRecording() {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateJob = (jobId: string, patch: Partial<UploadJob>) => {
    setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, ...patch } : j));
  };

  const pollJob = async (jobId: string, fileName: string) => {
    const maxAttempts = 60; // 5 min max
    let attempts = 0;
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/audio/jobs/${jobId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          updateJob(jobId, { status: 'completed', transcriptionId: data.transcriptionId });
          return;
        } else if (data.status === 'failed') {
          updateJob(jobId, { status: 'failed', error: data.error || 'Error procesando audio' });
          return;
        }
      } catch {}
      attempts++;
    }
    updateJob(jobId, { status: 'failed', error: 'Timeout — el procesamiento tardó demasiado' });
  };

  const uploadFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|flac|mp4|webm)$/i)) {
      alert(`Formato no soportado: ${file.name}\nFormatos válidos: MP3, WAV, OGG, M4A, FLAC`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Archivo muy grande: ${file.name}\nMáximo ${MAX_SIZE_MB}MB`);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setJobs(prev => [...prev, { jobId: tempId, fileName: file.name, status: 'uploading' }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/audio/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al subir');

      setJobs(prev => prev.map(j =>
        j.jobId === tempId ? { ...j, jobId: data.jobId, status: 'processing' } : j
      ));
      pollJob(data.jobId, file.name);
    } catch (err) {
      setJobs(prev => prev.map(j =>
        j.jobId === tempId ? { ...j, status: 'failed', error: String(err) } : j
      ));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const statusConfig: Record<JobStatus, { icon: React.ReactNode; label: string; classes: string }> = {
    idle: { icon: null, label: '', classes: '' },
    uploading: { icon: <Spinner size={16} className="animate-spin" />, label: 'Subiendo...', classes: 'text-blue-500' },
    processing: { icon: <Clock size={16} className="animate-pulse" />, label: 'Transcribiendo con Whisper...', classes: 'text-sky-500' },
    completed: { icon: <CheckCircle size={16} />, label: 'Completado', classes: 'text-green-600' },
    failed: { icon: <Warning size={16} />, label: 'Error', classes: 'text-red-500' },
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Subir Grabaciones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube archivos de audio para transcripción automática con Whisper + análisis con IA.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }
        `}
      >
        <CloudArrowUp size={48} className="mx-auto mb-4 text-muted-foreground" weight="light" />
        <p className="text-sm font-medium text-foreground">
          Arrastra archivos aquí o <span className="text-primary">haz clic para seleccionar</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          MP3, WAV, OGG, M4A, FLAC · Máx {MAX_SIZE_MB}MB por archivo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Jobs list */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Archivos</h2>
          {jobs.map((job) => {
            const cfg = statusConfig[job.status];
            return (
              <div key={job.jobId} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <FileAudio size={20} className="text-muted-foreground shrink-0" weight="light" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{job.fileName}</p>
                  {job.error && <p className="text-xs text-red-500 mt-0.5">{job.error}</p>}
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${cfg.classes}`}>
                  {cfg.icon}
                  <span>{cfg.label}</span>
                </div>
                {job.status === 'completed' && job.transcriptionId && (
                  <a
                    href={`/transcriptions/${job.transcriptionId}`}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Ver →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-secondary/50 border border-border p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">¿Cómo funciona?</p>
        <p>1. Sube el archivo de audio de la grabación</p>
        <p>2. Whisper (local, GPU M4) transcribe el audio automáticamente</p>
        <p>3. Claude analiza la transcripción: resumen, sentimiento, tipo de llamada</p>
        <p>4. La llamada aparece en el listado de transcripciones</p>
      </div>
    </div>
  );
}
