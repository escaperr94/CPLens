import type { PipelineResult, PipelineProgressCallback } from './pipeline';

export function runCPAnalysisPipeline(canvas: HTMLCanvasElement, onProgress?: PipelineProgressCallback): Promise<PipelineResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'));
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({data: message}) => {
      if (message.progress) onProgress?.(message.progress, message.percent);
      else { worker.terminate(); message.error ? reject(new Error(message.error)) : resolve(message.result); }
    };
    worker.onerror = (event) => { worker.terminate(); reject(new Error(event.message)); };
    worker.postMessage({ data, width: canvas.width, height: canvas.height }, [data.buffer]);
  });
}
