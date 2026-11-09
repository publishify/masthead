/** MCP tools offered by the server. None of them changes the text or decides for the author. */
export const TOOLS = [
  "save_book",
  "next_step",
  "submit_result",
  "read_report",
  "delete_data",
] as const;

export type ToolName = (typeof TOOLS)[number];
