import React, { useState, useEffect } from 'react';
import { obsidianService } from '../../services/obsidian';
import { VaultNode } from '../../types';
import { File, Folder, ChevronRight, ChevronDown, Edit3, Save, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function VaultExplorer() {
  const [vaultTree, setVaultTree] = useState<VaultNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadVault();
  }, []);

  async function loadVault() {
    setLoading(true);
    try {
      const data: any = await obsidianService.listNotes(true);
      // Obsidian API returns a list of files or tree. 
      // Assuming it returns an object with "files" as flat array of paths for simplicity, 
      // or we handle building tree if it's flat.
      // If it returns a tree natively, great. Let's assume it returns { files: string[] } based on common implementations, or just an array of strings.
      
      let paths = [];
      if (Array.isArray(data)) paths = data;
      else if (data.files) paths = data.files;
      else paths = Object.keys(data);
      
      // build tree
      const root: VaultNode = { name: 'Vault', path: '', type: 'folder', children: [] };
      
      paths.forEach((p: string | any) => {
         const pathStr = typeof p === 'string' ? p : p.path;
         if (!pathStr || pathStr.endsWith('/')) return;
         
         const parts = pathStr.split('/');
         let current = root;
         for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            
            let child = current.children?.find(c => c.name === part);
            if (!child) {
               child = {
                 name: part,
                 path: parts.slice(0, i + 1).join('/'),
                 type: isFile ? 'file' : 'folder',
                 children: isFile ? undefined : []
               };
               current.children?.push(child);
            }
            current = child;
         }
      });
      
      setVaultTree(root);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectFile(path: string) {
    setSelectedFile(path);
    setIsEditing(false);
    try {
      const content = await obsidianService.readNote(path);
      setFileContent(content);
      setEditContent(content);
    } catch (e) {
      setFileContent('Error loading file.');
    }
  }

  async function handleSave() {
    if (!selectedFile) return;
    try {
      await obsidianService.writeNote(selectedFile, editContent);
      setFileContent(editContent);
      setIsEditing(false);
    } catch (e) {
      alert("Failed to save");
    }
  }

  async function handleOpenInObsidian() {
    if (!selectedFile) return;
    try {
      await obsidianService.openNote(selectedFile);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex h-full bg-[#151619]">
      <div className="w-64 border-r border-[#2A2B2F] flex flex-col bg-[#1A1B1E]">
        <div className="p-3 flex items-center justify-between border-b border-[#2A2B2F]">
          <span className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Vault</span>
          <button onClick={loadVault} className="text-[#8E9299] hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {vaultTree ? <TreeNode node={vaultTree} onSelectFile={handleSelectFile} /> : <div className="text-xs text-[#8E9299] p-2">Loading...</div>}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col bg-[#151619]">
        {selectedFile ? (
          <>
            <div className="h-12 border-b border-[#2A2B2F] flex items-center justify-between px-4 bg-[#1A1B1E]">
               <div className="text-sm font-medium text-[#E0E0E0]">{selectedFile}</div>
               <div className="flex gap-2">
                 <button onClick={handleOpenInObsidian} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#202124] rounded transition-colors" title="Open in Obsidian">
                   <ExternalLink size={16} />
                 </button>
                 {isEditing ? (
                   <>
                     <button onClick={() => setIsEditing(false)} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#202124] rounded transition-colors" title="Preview">
                       <Eye size={16} />
                     </button>
                     <button onClick={handleSave} className="p-1.5 text-green-400 hover:text-green-300 hover:bg-[#202124] rounded transition-colors" title="Save">
                       <Save size={16} />
                     </button>
                   </>
                 ) : (
                   <button onClick={() => setIsEditing(true)} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#202124] rounded transition-colors" title="Edit">
                     <Edit3 size={16} />
                   </button>
                 )}
               </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {isEditing ? (
                <textarea
                  className="w-full h-full bg-transparent text-[#E0E0E0] resize-none outline-none font-mono text-sm leading-relaxed"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <div className="markdown-body text-[#E0E0E0] prose prose-invert max-w-none">
                  <ReactMarkdown>{fileContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#8E9299] text-sm">
            Select a file to view
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, onSelectFile }: { node: VaultNode, onSelectFile: (path: string) => void }) {
  const [expanded, setExpanded] = useState(node.name === 'Vault');

  if (node.type === 'file') {
    return (
      <div 
        className="flex items-center gap-2 py-1 px-2 hover:bg-[#202124] rounded cursor-pointer text-sm text-[#E0E0E0]"
        onClick={() => onSelectFile(node.path)}
      >
        <File size={14} className="text-[#8E9299] shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div className="select-none">
      <div 
        className="flex items-center gap-1 py-1 px-1 hover:bg-[#202124] rounded cursor-pointer text-sm text-[#E0E0E0]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-4 flex justify-center shrink-0">
          {expanded ? <ChevronDown size={14} className="text-[#8E9299]"/> : <ChevronRight size={14} className="text-[#8E9299]"/>}
        </div>
        <Folder size={14} className="text-indigo-400 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
      {expanded && node.children && (
        <div className="ml-3 pl-2 border-l border-[#2A2B2F]">
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} onSelectFile={onSelectFile} />
          ))}
        </div>
      )}
    </div>
  );
}
