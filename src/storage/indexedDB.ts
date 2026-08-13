import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatSession, AppSettings } from '../types';

interface ObsidianAIOBDBSchema extends DBSchema {
  chats: {
    key: string;
    value: ChatSession;
    indexes: { 'updatedAt': number };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'ObsidianLocalAIDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ObsidianAIOBDBSchema>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ObsidianAIOBDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
};

export const storage = {
  async getSettings(): Promise<AppSettings> {
    const db = await getDB();
    const settings = await db.get('settings', 'app_settings');
    return settings || {
      obsidianApiUrl: 'https://127.0.0.1:27124',
      obsidianApiKey: '',
      selectedModelId: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    };
  },
  
  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await getDB();
    await db.put('settings', settings, 'app_settings');
  },

  async getChats(): Promise<ChatSession[]> {
    const db = await getDB();
    const tx = db.transaction('chats', 'readonly');
    const index = tx.store.index('updatedAt');
    const chats = await index.getAll();
    return chats.reverse(); // newest first
  },

  async getChat(id: string): Promise<ChatSession | undefined> {
    const db = await getDB();
    return await db.get('chats', id);
  },

  async saveChat(chat: ChatSession): Promise<void> {
    const db = await getDB();
    chat.updatedAt = Date.now();
    await db.put('chats', chat);
  },

  async deleteChat(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('chats', id);
  }
};
