export type LogLevel = "INFO" | "WARN" | "ERROR" | "FATAL";
export type LogModule = "CORE" | "FINANCE" | "SALES" | "INVENTORY" | "AUTH" | "HRM" | "SUPPORT" | "DATABASE" | "EMAIL";

export interface DevLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: LogModule;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

// Circular in-memory buffer to keep runtime memory lean while retaining recent traces
const MAX_LOGS = 500;
const globalLogs: DevLogEntry[] = [
  {
    id: "init-" + Date.now(),
    timestamp: new Date().toISOString(),
    level: "INFO",
    module: "CORE",
    message: "TCE ERP Developer Tracing Engine initialized",
    metadata: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  },
];

export function logDevEvent(
  level: LogLevel,
  module: LogModule,
  message: string,
  extra?: { stack?: string; metadata?: Record<string, any> }
): DevLogEntry {
  const entry: DevLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    stack: extra?.stack,
    metadata: extra?.metadata,
  };

  globalLogs.unshift(entry);

  // Evict oldest entries if over capacity
  if (globalLogs.length > MAX_LOGS) {
    globalLogs.length = MAX_LOGS;
  }

  // Also log to stdout for server runtime output
  const prefix = `[DEV-LOGGER][${entry.level}][${entry.module}]`;
  if (entry.level === "ERROR" || entry.level === "FATAL") {
    console.error(`${prefix} ${message}`, extra?.stack || "", extra?.metadata || "");
  } else if (entry.level === "WARN") {
    console.warn(`${prefix} ${message}`, extra?.metadata || "");
  }

  return entry;
}

export function getDevLogs(filter?: {
  level?: string;
  module?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { logs: DevLogEntry[]; total: number } {
  let filtered = [...globalLogs];

  if (filter?.level && filter.level !== "ALL") {
    filtered = filtered.filter((l) => l.level === filter.level);
  }

  if (filter?.module && filter.module !== "ALL") {
    filtered = filtered.filter((l) => l.module === filter.module);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        (l.stack && l.stack.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const offset = filter?.offset || 0;
  const limit = filter?.limit || 100;

  const logs = filtered.slice(offset, offset + limit);

  return { logs, total };
}

export function clearDevLogs(): void {
  globalLogs.length = 0;
  globalLogs.push({
    id: "flushed-" + Date.now(),
    timestamp: new Date().toISOString(),
    level: "INFO",
    module: "CORE",
    message: "Developer log buffer flushed by developer",
  });
}
