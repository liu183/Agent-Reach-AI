/**
 * ReAct Agent Type Definitions
 * Autonomous web browsing agent with Observe → Think → Act → Reflect loop
 */

// ===== Agent Action Types =====

export type ActionType =
  | 'navigate'       // Go to a new URL
  | 'click_link'     // Click a link (extract href and navigate)
  | 'fill_form'      // Fill and submit a form
  | 'extract'        // Extract specific data from current page
  | 'scroll'         // Scroll to load more content
  | 'search'         // Search for something on the page
  | 'wait'           // Wait for dynamic content (e.g., SPA)
  | 'think'          // Pure reasoning / planning step
  | 'complete'       // Task is done, provide final answer
  | 'error';         // An error occurred

export interface AgentAction {
  type: ActionType;
  reasoning: string;     // Why this action?
  target?: string;       // URL for navigate, link text for click_link, etc.
  data?: Record<string, string>;  // Form fields for fill_form
  query?: string;        // Search query
  extract?: string;      // What to extract (for extract action)
  summary?: string;      // Final summary (for complete action)
}

// ===== Agent Step (emitted to frontend via SSE) =====

export type PhaseType = 'observe' | 'think' | 'act' | 'reflect';

export interface AgentStep {
  turn: number;
  phase: PhaseType;
  message: string;
  progress: number;
  action?: AgentAction;
  observation?: string;
  url?: string;
  title?: string;
}

// ===== Agent State =====

export interface PageSnapshot {
  url: string;
  title: string;
  content: string;        // Simplified text content
  links: LinkInfo[];      // Extracted links
  forms: FormInfo[];      // Extracted forms
  contentLength: number;
}

export interface LinkInfo {
  text: string;
  href: string;
  index: number;
}

export interface FormInfo {
  action: string;
  method: string;
  inputs: FormFieldInfo[];
  submitText?: string;
  index: number;
}

export interface FormFieldInfo {
  name: string;
  type: string;       // text, email, password, textarea, select, checkbox, etc.
  label?: string;
  placeholder?: string;
  required: boolean;
  value?: string;
  options?: string[];  // For select elements
}

// ===== Agent History (for multi-turn context) =====

export interface AgentTurn {
  turn: number;
  observation: string;
  thinking: string;
  action: AgentAction;
  result: string;
}

// ===== Agent Configuration =====

export interface AgentConfig {
  maxTurns: number;
  maxContentLength: number;  // Max chars to send to LLM per page
  verbose: boolean;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxTurns: 15,
  maxContentLength: 30000,
  verbose: true,
};

// ===== SSE Event Types =====

export interface SSEProgressEvent {
  type: 'progress';
  data: AgentStep;
}

export interface SSEDoneEvent {
  type: 'done';
  data: {
    status: 'completed' | 'error';
    progress: number;
    title?: string;
    summary?: string;
    turnsUsed: number;
  };
}

export interface SSEErrorEvent {
  type: 'error';
  data: {
    status: 'error';
    message: string;
  };
}
