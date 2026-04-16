import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { PROVIDER_MODELS } from '@/types';

// Groq uses an OpenAI-compatible endpoint
const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY ?? '',
  baseURL: 'https://api.groq.com/openai/v1',
});

export function getLanguageModel(modelId: string): any {
  const modelInfo = PROVIDER_MODELS.find(m => m.id === modelId);
  if (!modelInfo) throw new Error(`Unknown model: ${modelId}`);

  switch (modelInfo.provider) {
    case 'openai':
      return openai(modelId);
    case 'anthropic':
      return anthropic(modelId);
    case 'google':
      return google(modelId);
    case 'groq':
      return groq(modelId);
    default:
      throw new Error(`Unknown provider: ${modelInfo.provider}`);
  }
}

export function getEmbeddingModel() {
  // Always use OpenAI for embeddings (most cost-effective & consistent)
  return openai.embedding('text-embedding-3-small');
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = PROVIDER_MODELS.find(m => m.id === modelId);
  if (!model) return 0;
  return (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;
}
