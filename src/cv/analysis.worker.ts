import { analyzePixels } from './pipeline';
self.onmessage = async ({data}) => {
  try {
    const result = await analyzePixels(data.data, data.width, data.height, (progress, percent) => self.postMessage({progress, percent}), data.options);
    self.postMessage({result});
  } catch (error) { self.postMessage({error: String(error)}); }
};
