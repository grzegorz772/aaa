import React, { useState } from 'react';
import { Search as SearchIcon, FileText, Loader2 } from 'lucide-react';
import { obsidianService } from '../../services/obsidian';
import { SearchResult } from '../../types';

export function SearchUI() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError('');
    
    try {
      const data = await obsidianService.searchNotes(query);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-light text-[#E0E0E0] mb-6 flex items-center gap-3">
          <SearchIcon className="text-indigo-400" />
          Search Vault
        </h2>
        <form onSubmit={handleSearch} className="relative flex items-center">
          <div className="absolute left-4 text-[#8E9299]">
            {isSearching ? <Loader2 size={20} className="animate-spin" /> : <SearchIcon size={20} />}
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your vault..."
            className="w-full bg-[#151619] border border-[#2A2B2F] rounded-xl py-4 pl-12 pr-4 text-[#E0E0E0] focus:outline-none focus:border-indigo-500/50 transition-colors shadow-sm"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {error && <div className="text-red-400 text-sm">{error}</div>}
        
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((res, i) => (
              <div key={i} className="bg-[#1A1B1E] border border-[#2A2B2F] rounded-xl p-4 hover:border-[#3A3B3F] transition-colors cursor-pointer" onClick={() => obsidianService.openNote(res.path)}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-indigo-400" />
                  <span className="font-medium text-[#E0E0E0]">{res.filename}</span>
                  <span className="text-xs text-[#8E9299]">{res.path}</span>
                </div>
                <div className="text-sm text-[#8E9299] line-clamp-2 italic">
                  "...{res.snippet}..."
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isSearching && query && !error && (
            <div className="text-[#8E9299] text-sm text-center mt-12">No results found for "{query}"</div>
          )
        )}
      </div>
    </div>
  );
}
