/**
 * This file holds logic for parsing JSONL produced by:
 * opencode run --format json ...
 * OpenCode docs: `opencode run` supports `--format json` for raw JSON events.
 */

type EventType = "step_start" | "tool_use" | "text" | "step_finish" | "error";

interface EventBase {
  type: EventType;
  timestamp: number;
  sessionID?: string;
  part?: any; // look into typing this later
}

type Event = EventBase;

type Events = Event[];

const parseJsonl = (jsonl: string): Events => {
  const events: Events = [];
  for (const line of jsonl.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.type === "string")
        events.push(parsed as Event);
    } catch {
      // Intentionally blank: silently ignore non-json noise
    }
  }
  return events;
};

const firstSessionId = (events: Events): string | undefined => {
  for (const e of events) {
    if (e.sessionID) return e.sessionID;
    if (e.part?.sessionID) return e.part.sessionID;
  }
  return undefined;
};

export type { EventType, EventBase, Event, Events };

export { parseJsonl, firstSessionId };
