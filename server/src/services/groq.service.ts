import axios from 'axios';
import prisma from '../utils/prisma';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Core Groq API call wrapper with JSON enforcement
 */
export async function callGroq(
  messages: GroqMessage[],
  maxTokens = 1024,
  temperature = 0.2
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  try {
    const response = await axios.post<GroqResponse>(
      GROQ_API_URL,
      {
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0]?.message?.content ?? '{}';
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('[Groq] API error:', error.response?.data ?? error.message);
      throw new Error(`Groq API error: ${error.response?.status} ${error.message}`);
    }
    throw error;
  }
}

/**
 * Safe JSON parse with fallback
 */
export function parseJsonSafe<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('[Groq] Failed to parse JSON:', text.slice(0, 200));
    return fallback;
  }
}

/**
 * Call Groq and auto-parse JSON
 */
export async function callGroqJSON<T>(
  systemPrompt: string,
  userContent: string,
  fallback: T,
  maxTokens = 1024,
  meta?: { leadId?: string; agentName?: string }
): Promise<T> {
  const raw = await callGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    maxTokens
  );

  if (meta?.leadId && meta?.agentName) {
    // Non-blocking log
    prisma.promptLog.create({
      data: {
        leadId: meta.leadId,
        agentName: meta.agentName,
        prompt: `System: ${systemPrompt}\nUser: ${userContent}`,
        response: raw,
      }
    }).catch(err => console.error('[PromptLog] Failed to log:', err.message));
  }

  return parseJsonSafe<T>(raw, fallback);
}
