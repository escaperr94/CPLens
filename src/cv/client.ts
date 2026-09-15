import type { PipelineResult, PipelineProgressCallback } from './pipeline';

export function runCPAnalysisPipeline(canvas: HTMLCanvasElement, onProgress?: PipelineProgressCallback, signal?: AbortSignal): Promise<PipelineResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'));
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    if(signal?.aborted){reject(new DOMException('Analysis cancelled','AbortError'));return;}
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    const dispose=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
    const abort=()=>{dispose();reject(new DOMException('Analysis cancelled','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage = ({data: message}) => {
      if (message.progress) onProgress?.(message.progress, message.percent);
      else { dispose(); message.error ? reject(new Error(message.error)) : resolve(message.result); }
    };
    worker.onerror = (event) => { dispose(); reject(new Error(event.message)); };
    worker.postMessage({ data, width: canvas.width, height: canvas.height }, [data.buffer]);
  });
}
