export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface AppSettings {
  obsidianApiUrl: string;
  obsidianApiKey: string;
  selectedModelId: string;
  aiProvider?: 'webgpu' | 'gemini';
  geminiApiKey?: string;
  geminiModel?: string;
}

export interface VaultNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: VaultNode[];
}

export interface SearchResult {
  filename: string;
  path: string;
  snippet: string;
  score: number;
}
