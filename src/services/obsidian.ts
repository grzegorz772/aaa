import { AppSettings, SearchResult, VaultNode } from '../types';

export class ObsidianService {
  private url: string = '';
  private key: string = '';
  private cachedVault: VaultNode[] | null = null;
  private vaultCacheTime: number = 0;

  constructor() {}

  updateConfig(settings: AppSettings) {
    this.url = settings.obsidianApiUrl.replace(/\/$/, '');
    this.key = settings.obsidianApiKey;
  }

  private async fetchApi(path: string, options: RequestInit = {}) {
    if (!this.url || !this.key) {
      throw new Error('Obsidian API URL or Key is missing.');
    }
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.key}`);
    
    // Ensure absolute URL
    const fullUrl = `${this.url}${path.startsWith('/') ? path : '/' + path}`;
    
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Obsidian API Error (${response.status}): ${text}`);
    }
    
    return response;
  }

  async checkConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.url || !this.key) {
      return { connected: false, message: 'Obsidian API URL or Key is not configured.' };
    }
    try {
      const res = await this.fetchApi('/');
      const data = await res.json();
      if (data && data.status === 'OK') {
        return { connected: true, message: 'Successfully connected to Obsidian Local REST API.' };
      }
      return { connected: false, message: `Obsidian responded with unexpected status: ${JSON.stringify(data)}` };
    } catch (e: any) {
      const isFetchFailed = e?.message?.includes('Failed to fetch') || e?.name === 'TypeError';
      const hint = isFetchFailed
        ? 'Could not connect to localhost. Ensure Obsidian is open with "Local REST API" plugin enabled. If in a web browser, open the desktop .exe app or accept self-signed HTTPS certificates.'
        : e.message || 'Unknown error connecting to Obsidian.';
      return { connected: false, message: hint };
    }
  }

  async listNotes(forceRefresh = false): Promise<VaultNode[]> {
    if (!forceRefresh && this.cachedVault && (Date.now() - this.vaultCacheTime) < 60000) {
      return this.cachedVault;
    }
    const res = await this.fetchApi('/vault/');
    const data = await res.json();
    
    // The Obsidian Local REST API typically returns an object where keys are paths and values are file stats, or a file tree.
    // Assuming standard format or simple mapping. If it's a flat list, we convert to tree or just use flat.
    // Usually /vault/ returns { files: [...], folders: [...] } or similar.
    // For safety, let's just return the raw data and let the tools handle it, or try to format.
    // Let's assume it returns a structure we can use.
    this.cachedVault = data;
    this.vaultCacheTime = Date.now();
    return data;
  }

  async readNote(path: string): Promise<string> {
    const res = await this.fetchApi(`/vault/${encodeURIComponent(path)}`);
    return await res.text();
  }

  async writeNote(path: string, content: string): Promise<void> {
    await this.fetchApi(`/vault/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown' },
      body: content
    });
  }

  async appendNote(path: string, content: string): Promise<void> {
    await this.fetchApi(`/vault/${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/markdown' },
      body: content
    });
  }

  async patchNote(path: string, options: any): Promise<void> {
    await this.fetchApi(`/vault/${encodeURIComponent(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
  }

  async deleteNote(path: string): Promise<void> {
    await this.fetchApi(`/vault/${encodeURIComponent(path)}`, {
      method: 'DELETE'
    });
  }

  async searchNotes(query: string): Promise<SearchResult[]> {
    const res = await this.fetchApi(`/search/simple/?query=${encodeURIComponent(query)}`, {
      method: 'POST'
    });
    const data = await res.json();
    return data;
  }

  async openNote(path: string): Promise<void> {
    await this.fetchApi(`/open/${encodeURIComponent(path)}`, {
      method: 'POST'
    });
  }
}

export const obsidianService = new ObsidianService();
