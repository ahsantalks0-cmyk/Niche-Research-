'use strict';

/**
 * NRD · llmProviders.js — Multi-Provider LLM Registry & Adapters (P1.3c)
 * Supported Providers: Google Gemini, OpenAI, Anthropic, Groq.
 * 
 * STRICT HONESTY RULE: Every model returned comes strictly from a LIVE API call.
 * No hardcoded model lists presented as current, no fake models.
 */

const PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Generative AI models by Google DeepMind (Flash models eligible for free tier).',
    
    async fetchModels(apiKey) {
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('Gemini API key is required');
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
      const res = await fetch(url);
      if (!res.ok) {
        let errText = '';
        try {
          const json = await res.json();
          errText = json?.error?.message || res.statusText;
        } catch {
          errText = res.statusText;
        }
        throw new Error(`Google Gemini API error (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const rawModels = data?.models || [];
      const chatModels = rawModels
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => {
          const modelId = (m.name || '').replace(/^models\//, '');
          const isFlash = modelId.toLowerCase().includes('flash');
          return {
            id: modelId,
            name: m.displayName || modelId,
            description: m.description || '',
            isFreeTier: isFlash,
            isPaid: !isFlash,
            tierLabel: isFlash ? 'Free tier (limits apply)' : 'Paid',
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id));

      if (chatModels.length === 0) {
        throw new Error('Gemini API returned zero generateContent models.');
      }
      return chatModels;
    },

    buildChatRequest(modelId, messages, options = {}) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
      const systemMsg = messages.find((m) => m.role === 'system');
      const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

      const contents = nonSystemMsgs.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

      const body = { contents };
      if (systemMsg) {
        body.systemInstruction = {
          parts: [{ text: systemMsg.content || '' }],
        };
      }

      body.generationConfig = {};
      if (typeof options.temperature === 'number') body.generationConfig.temperature = options.temperature;
      if (typeof options.maxTokens === 'number') body.generationConfig.maxOutputTokens = options.maxTokens;
      if (options.jsonMode) body.generationConfig.responseMimeType = 'application/json';

      return {
        url,
        headers: { 'Content-Type': 'application/json' },
        queryParams: { key: options.apiKey },
        body,
      };
    },

    parseChatResponse(data) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = {
        promptTokens: data?.usageMetadata?.promptTokenCount || 0,
        completionTokens: data?.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data?.usageMetadata?.totalTokenCount || 0,
      };
      return { text, usage };
    },
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, and reasoning models by OpenAI.',
    
    async fetchModels(apiKey) {
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('OpenAI API key is required');
      }
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        let errText = '';
        try {
          const json = await res.json();
          errText = json?.error?.message || res.statusText;
        } catch {
          errText = res.statusText;
        }
        throw new Error(`OpenAI API error (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const rawModels = data?.data || [];
      const chatModels = rawModels
        .filter((m) => {
          const id = (m.id || '').toLowerCase();
          return id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3');
        })
        .map((m) => ({
          id: m.id,
          name: m.id,
          description: `OpenAI model ${m.id}`,
          isFreeTier: false,
          isPaid: true,
          tierLabel: 'Paid',
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      if (chatModels.length === 0) {
        throw new Error('OpenAI API returned zero chat-compatible models.');
      }
      return chatModels;
    },

    buildChatRequest(modelId, messages, options = {}) {
      const url = 'https://api.openai.com/v1/chat/completions';
      const body = {
        model: modelId,
        messages: messages.map((m) => ({ role: m.role, content: m.content || '' })),
      };

      if (typeof options.temperature === 'number') body.temperature = options.temperature;
      if (typeof options.maxTokens === 'number') body.max_tokens = options.maxTokens;
      if (options.jsonMode) body.response_format = { type: 'json_object' };

      return {
        url,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body,
      };
    },

    parseChatResponse(data) {
      const text = data?.choices?.[0]?.message?.content || '';
      const usage = {
        promptTokens: data?.usage?.prompt_tokens || 0,
        completionTokens: data?.usage?.completion_tokens || 0,
        totalTokens: data?.usage?.total_tokens || 0,
      };
      return { text, usage };
    },
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, and Haiku models by Anthropic.',
    
    async fetchModels(apiKey) {
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('Anthropic API key is required');
      }
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) {
        let errText = '';
        try {
          const json = await res.json();
          errText = json?.error?.message || res.statusText;
        } catch {
          errText = res.statusText;
        }
        throw new Error(`Anthropic API error (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const rawModels = data?.data || [];
      const chatModels = rawModels
        .filter((m) => (m.id || '').toLowerCase().includes('claude'))
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
          description: `Anthropic model ${m.id}`,
          isFreeTier: false,
          isPaid: true,
          tierLabel: 'Paid',
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      if (chatModels.length === 0) {
        throw new Error('Anthropic API returned zero Claude models.');
      }
      return chatModels;
    },

    buildChatRequest(modelId, messages, options = {}) {
      const url = 'https://api.anthropic.com/v1/messages';
      const systemMsg = messages.find((m) => m.role === 'system');
      const nonSystemMsgs = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content || '' }));

      const body = {
        model: modelId,
        messages: nonSystemMsgs,
        max_tokens: options.maxTokens || 1024,
      };

      if (systemMsg) body.system = systemMsg.content || '';
      if (typeof options.temperature === 'number') body.temperature = options.temperature;

      return {
        url,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': options.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      };
    },

    parseChatResponse(data) {
      const text = data?.content?.[0]?.text || '';
      const promptTokens = data?.usage?.input_tokens || 0;
      const completionTokens = data?.usage?.output_tokens || 0;
      const usage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
      return { text, usage };
    },
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LLaMA, Mixtral, and Gemma inference powered by Groq LPU.',
    
    async fetchModels(apiKey) {
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('Groq API key is required');
      }
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        let errText = '';
        try {
          const json = await res.json();
          errText = json?.error?.message || res.statusText;
        } catch {
          errText = res.statusText;
        }
        throw new Error(`Groq API error (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const rawModels = data?.data || [];
      const chatModels = rawModels
        .filter((m) => {
          const id = (m.id || '').toLowerCase();
          return !id.includes('whisper') && !id.includes('safetensors');
        })
        .map((m) => ({
          id: m.id,
          name: m.id,
          description: `Groq LPU model ${m.id}`,
          isFreeTier: true,
          isPaid: false,
          tierLabel: 'Free tier (limits apply)',
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      if (chatModels.length === 0) {
        throw new Error('Groq API returned zero chat models.');
      }
      return chatModels;
    },

    buildChatRequest(modelId, messages, options = {}) {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const body = {
        model: modelId,
        messages: messages.map((m) => ({ role: m.role, content: m.content || '' })),
      };

      if (typeof options.temperature === 'number') body.temperature = options.temperature;
      if (typeof options.maxTokens === 'number') body.max_tokens = options.maxTokens;
      if (options.jsonMode) body.response_format = { type: 'json_object' };

      return {
        url,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body,
      };
    },

    parseChatResponse(data) {
      const text = data?.choices?.[0]?.message?.content || '';
      const usage = {
        promptTokens: data?.usage?.prompt_tokens || 0,
        completionTokens: data?.usage?.completion_tokens || 0,
        totalTokens: data?.usage?.total_tokens || 0,
      };
      return { text, usage };
    },
  },
};

function getProvider(providerId) {
  if (!providerId) return null;
  return PROVIDERS[providerId.toLowerCase()] || null;
}

function listProviders() {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}

module.exports = {
  PROVIDERS,
  getProvider,
  listProviders,
};
