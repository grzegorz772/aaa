import { GoogleGenAI } from '@google/genai';
import { obsidianTools } from '../tools/obsidianTools';
import { obsidianService } from './obsidian';
import { ChatMessage } from '../types';

const MAX_TOOL_CALLS = 10;

export interface AgentContext {
  messages: ChatMessage[];
  onUpdate: (messages: ChatMessage[]) => void;
  onStatusChange: (status: string) => void;
}

export async function runGeminiAgent(
  apiKey: string,
  modelName: string,
  context: AgentContext
) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please enter your API key in Settings.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const functionDeclarations = obsidianTools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));

  let iterations = 0;

  while (iterations < MAX_TOOL_CALLS) {
    iterations++;

    // Format prompt from conversation history
    const historyText = context.messages
      .map((m) => {
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') {
          if (m.tool_calls) {
            return `Assistant Call Tools: ${JSON.stringify(m.tool_calls)}\n${m.content}`;
          }
          return `Assistant: ${m.content}`;
        }
        if (m.role === 'tool') return `Tool Output (${m.tool_call_id}): ${m.content}`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    context.onStatusChange('Gemini AI is thinking...');

    try {
      const response = await ai.models.generateContent({
        model: modelName || 'gemini-3.6-flash',
        contents: historyText,
        config: {
          systemInstruction:
            'You are OBSIDIAN LOCAL AI, an intelligent desktop assistant powered by Google Gemini. You manage an Obsidian vault using tools. Use search_notes when looking for notes.',
          tools: [{ functionDeclarations: functionDeclarations as any }],
        },
      });

      const toolCalls = response.functionCalls;
      const textResponse = response.text || '';

      if (toolCalls && toolCalls.length > 0) {
        const formattedToolCalls = toolCalls.map((tc, idx) => ({
          id: `gemini-call-${Date.now()}-${idx}`,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args || {}),
          },
        }));

        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: textResponse,
          timestamp: Date.now(),
          tool_calls: formattedToolCalls,
        };

        context.messages.push(aiMessage);
        context.onUpdate([...context.messages]);

        context.onStatusChange('Executing tools...');

        for (const tc of formattedToolCalls) {
          const funcName = tc.function.name;
          const args = JSON.parse(tc.function.arguments);
          let toolResult = '';

          context.onStatusChange(`Executing ${funcName}...`);

          try {
            switch (funcName) {
              case 'list_notes':
                const vault = await obsidianService.listNotes();
                toolResult = JSON.stringify(vault).substring(0, 5000);
                break;
              case 'read_note':
                toolResult = await obsidianService.readNote(args.path);
                break;
              case 'write_note':
                await obsidianService.writeNote(args.path, args.content);
                toolResult = `Successfully wrote to ${args.path}`;
                break;
              case 'append_note':
                await obsidianService.appendNote(args.path, args.content);
                toolResult = `Successfully appended to ${args.path}`;
                break;
              case 'patch_note':
                await obsidianService.patchNote(args.path, {
                  operation: args.operation,
                  target: args.target,
                  content: args.content,
                });
                toolResult = `Successfully patched ${args.path}`;
                break;
              case 'delete_note':
                toolResult = `Requires manual confirmation. Cannot delete directly via tool without UI intervention.`;
                break;
              case 'search_notes':
                const searchResults = await obsidianService.searchNotes(args.query);
                toolResult = JSON.stringify(searchResults);
                break;
              default:
                toolResult = `Unknown tool: ${funcName}`;
            }
          } catch (err: any) {
            toolResult = `Error executing ${funcName}: ${err.message}`;
          }

          const toolMessage: ChatMessage = {
            id: `${Date.now()}-${tc.id}`,
            role: 'tool',
            content: toolResult,
            tool_call_id: tc.id,
            timestamp: Date.now(),
          };

          context.messages.push(toolMessage);
        }

        context.onUpdate([...context.messages]);
        // Loop again to give Gemini the tool execution results
      } else {
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: textResponse,
          timestamp: Date.now(),
        };

        context.messages.push(aiMessage);
        context.onUpdate([...context.messages]);
        context.onStatusChange('Done');
        break;
      }
    } catch (err: any) {
      context.onStatusChange(`Gemini Error: ${err.message}`);
      console.error('Gemini AI Error:', err);
      break;
    }
  }
}
