export const obsidianTools = [
  {
    type: "function" as const,
    function: {
      name: "list_notes",
      description: "List all notes and folders in the Obsidian vault. Use this to understand the vault structure. Do not call this repeatedly unless instructed.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "read_note",
      description: "Read the full markdown content of a specific note.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the note, e.g., 'Folder/Note.md'"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "write_note",
      description: "Create or overwrite a note with new markdown content.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the note to write, e.g., 'Folder/Note.md'"
          },
          content: {
            type: "string",
            description: "The full markdown content to write to the file."
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "append_note",
      description: "Append content to the end of an existing note.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the note"
          },
          content: {
            type: "string",
            description: "The text to append"
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "patch_note",
      description: "Patch an existing note (e.g. modify headings, blocks, or frontmatter).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the note"
          },
          operation: {
            type: "string",
            enum: ["replace", "append", "prepend", "delete"],
            description: "The operation to perform"
          },
          target: {
            type: "string",
            description: "The heading, block reference, or 'frontmatter' to target"
          },
          content: {
            type: "string",
            description: "Content to patch (if applicable)"
          }
        },
        required: ["path", "operation", "target"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "delete_note",
      description: "Delete a note from the vault. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the note to delete"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_notes",
      description: "Search the vault for notes containing specific text. Prefer this over listing and reading everything.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query text"
          }
        },
        required: ["query"]
      }
    }
  }
];
