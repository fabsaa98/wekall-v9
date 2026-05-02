/**
 * Job Queue Client - Executive Insights Async Processing
 * 
 * Handles async document analysis using background job queue
 */

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  estimatedTimeLeft?: number;
  result?: {
    analysis: string;
    executiveBrief: string;
    benchmarks: Array<{ metric: string; value: string; source: string }>;
  };
  error?: string;
  completedAt?: string;
  processingTimeMs?: number;
}

export interface CreateJobRequest {
  fileName: string;
  fileContent: string;  // base64
  clientId: string;
}

export interface CreateJobResponse {
  jobId: string;
  status: string;
  fileName: string;
  progress: number;
  message: string;
  estimatedTime: number;
  createdAt: string;
}

/**
 * Crea un nuevo job de análisis
 */
export async function createAnalysisJob(
  file: File,
  clientId: string
): Promise<CreateJobResponse> {
  // Convert file to base64
  const base64 = await fileToBase64(file);

  const response = await fetch('/api/jobs/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileContent: base64,
      clientId
    } as CreateJobRequest)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create job');
  }

  return await response.json();
}

/**
 * Consulta el estado de un job
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get job status');
  }

  return await response.json();
}

/**
 * Polling automático hasta que el job termine
 * 
 * @param jobId ID del job
 * @param onProgress Callback cuando hay actualizaciones de progreso
 * @param intervalMs Intervalo de polling en milisegundos (default: 2000)
 * @returns Promise que resuelve cuando el job está completed o failed
 */
export async function pollJobUntilComplete(
  jobId: string,
  onProgress?: (status: JobStatus) => void,
  intervalMs: number = 2000
): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);

        // Notificar progreso
        if (onProgress) {
          onProgress(status);
        }

        // Terminado con éxito
        if (status.status === 'completed') {
          clearInterval(interval);
          resolve(status);
        }

        // Terminado con error
        if (status.status === 'failed') {
          clearInterval(interval);
          reject(new Error(status.error || 'Job failed'));
        }

        // Continuar polling si está queued o processing
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
}

/**
 * Helper: convierte File a base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
