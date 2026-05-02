/**
 * Async Document Analysis - Test Component
 * 
 * Versión simplificada para probar el job queue sin romper el código existente
 */

import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createAnalysisJob, pollJobUntilComplete, type JobStatus } from '@/lib/jobQueue';
import { useClient } from '@/contexts/ClientContext';

export function AsyncDocumentTest() {
  const { clientId, clientName } = useClient();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file || !clientId) return;

    try {
      setStatus('uploading');
      setError('');

      // Crear job
      const job = await createAnalysisJob(file, clientId);
      console.log('Job created:', job);

      setStatus('processing');
      setJobStatus({
        jobId: job.jobId,
        status: 'queued',
        progress: 0,
        message: job.message,
        fileName: job.fileName,
        createdAt: job.createdAt,
        updatedAt: job.createdAt,
        estimatedTimeLeft: job.estimatedTime
      });

      // Polling hasta completar
      const finalStatus = await pollJobUntilComplete(
        job.jobId,
        (status) => {
          console.log('Job progress:', status);
          setJobStatus(status);
        },
        2000  // Poll cada 2 segundos
      );

      console.log('Job completed:', finalStatus);
      setStatus('completed');
      setJobStatus(finalStatus);

    } catch (err: any) {
      console.error('Error:', err);
      setStatus('error');
      setError(err.message || 'Error desconocido');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Async Job Queue Test
          </h1>
          <p className="text-gray-600 mb-8">
            Cliente: <strong>{clientName}</strong> ({clientId})
          </p>

          {/* File Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Archivo: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || status === 'uploading' || status === 'processing'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'idle' && <Upload className="w-5 h-5" />}
            {status === 'uploading' && 'Creando job...'}
            {status === 'processing' && 'Procesando...'}
            {status === 'idle' && 'Analizar con Job Queue'}
            {status === 'completed' && 'Completado ✓'}
            {status === 'error' && 'Error'}
          </button>

          {/* Job Status */}
          {jobStatus && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Estado del Job</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Job ID:</span>
                  <span className="text-sm font-mono">{jobStatus.jobId}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <span className={`text-sm font-semibold ${
                    jobStatus.status === 'completed' ? 'text-green-600' :
                    jobStatus.status === 'failed' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {jobStatus.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progreso:</span>
                  <span className="text-sm font-semibold">{jobStatus.progress}%</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mensaje:</span>
                  <span className="text-sm">{jobStatus.message}</span>
                </div>

                {jobStatus.estimatedTimeLeft !== undefined && jobStatus.estimatedTimeLeft > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tiempo restante:</span>
                    <span className="text-sm">{jobStatus.estimatedTimeLeft}s</span>
                  </div>
                )}

                {jobStatus.processingTimeMs && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tiempo procesamiento:</span>
                    <span className="text-sm">{(jobStatus.processingTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </div>

              {/* Result */}
              {jobStatus.result && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Resultado
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Executive Brief:</h5>
                      <p className="text-sm text-gray-600">{jobStatus.result.executiveBrief}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Análisis:</h5>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{jobStatus.result.analysis}</p>
                    </div>

                    {jobStatus.result.benchmarks && jobStatus.result.benchmarks.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Benchmarks:</h5>
                        <div className="space-y-2">
                          {jobStatus.result.benchmarks.map((b, i) => (
                            <div key={i} className="bg-white p-3 rounded border border-gray-200">
                              <div className="flex justify-between items-start">
                                <span className="text-sm font-medium">{b.metric}</span>
                                <span className="text-sm text-indigo-600">{b.value}</span>
                              </div>
                              {b.source && (
                                <p className="text-xs text-gray-500 mt-1">Fuente: {b.source}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
