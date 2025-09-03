import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { gateway } from '@ai-sdk/gateway';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// 로컬 LLM 설정
export const localLLM = createOpenAICompatible({
  name: 'localLLM',
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
});

const modelName = process.env.LLM_MODEL || 'qwen3:1.7b';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': localLLM(modelName),
        'chat-model-reasoning': localLLM(modelName),
        'title-model': localLLM(modelName),
        'artifact-model': localLLM(modelName),
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': wrapLanguageModel({
          model: localLLM(modelName),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'chat-model-reasoning': wrapLanguageModel({
          model: localLLM(modelName),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': wrapLanguageModel({
          model: localLLM(modelName),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'artifact-model': wrapLanguageModel({
          model: localLLM(modelName),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
      },
    });
