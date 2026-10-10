import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

export type CompanyId = "TCE" | "TECAIR";

export interface ExtendedPrismaClient extends PrismaClient {
  account: any;
  journalEntry: any;
  journalLine: any;
  [key: string]: any;
}

const tceUrl =
  process.env.DATABASE_URL_TCE ||
  process.env.DATABASE_URL ||
  "";

const tecairUrl =
  process.env.DATABASE_URL_TECAIR ||
  (process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/\/(neondb|hvac_erp)(\?|$)/, "/tecair$2")
    : "");

const createPrismaInstance = (url: string) => {
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  }) as ExtendedPrismaClient;
};

declare global {
  var prismaGlobalTCE: undefined | ExtendedPrismaClient;
  var prismaGlobalTECAIR: undefined | ExtendedPrismaClient;
}

export const prismaTCE: ExtendedPrismaClient =
  globalThis.prismaGlobalTCE ?? createPrismaInstance(tceUrl);
export const prismaTECAIR: ExtendedPrismaClient =
  globalThis.prismaGlobalTECAIR ?? createPrismaInstance(tecairUrl);

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobalTCE = prismaTCE;
  globalThis.prismaGlobalTECAIR = prismaTECAIR;
}

export const companyStorage = new AsyncLocalStorage<CompanyId>();

/**
 * Resolves active company context using AsyncLocalStorage, Request object,
 * or Next.js headers/cookies.
 */
export function getActiveCompany(req?: Request): CompanyId {
  // 1. Explicit AsyncLocalStorage context if set
  const store = companyStorage.getStore();
  if (store) return store;

  // 2. Request headers, cookies, or query parameters
  if (req) {
    try {
      const hCompany = req.headers.get("x-company-id") || req.headers.get("x-company");
      if (hCompany) {
        const upper = hCompany.toUpperCase();
        if (upper === "TECAIR" || upper === "TCE") return upper as CompanyId;
      }

      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/active_company=([^;]+)/i);
      if (match) {
        const val = match[1].trim().toUpperCase();
        if (val === "TECAIR" || val === "TCE") return val as CompanyId;
      }

      const url = new URL(req.url);
      const qCompany = url.searchParams.get("company");
      if (qCompany) {
        const upper = qCompany.toUpperCase();
        if (upper === "TECAIR" || upper === "TCE") return upper as CompanyId;
      }
    } catch (_) {}
  }

  // 3. Fallback to Next.js headers/cookies in App Router server context
  try {
    const { headers, cookies } = require("next/headers");
    const h = headers();
    const hCompany = h.get("x-company-id") || h.get("x-company");
    if (hCompany) {
      const upper = hCompany.toUpperCase();
      if (upper === "TECAIR" || upper === "TCE") return upper as CompanyId;
    }

    const c = cookies();
    const cCompany = c.get("active_company")?.value || c.get("company")?.value;
    if (cCompany) {
      const upper = cCompany.toUpperCase();
      if (upper === "TECAIR" || upper === "TCE") return upper as CompanyId;
    }
  } catch (_) {
    // Outside active request context (e.g. background job, CLI script, build)
  }

  return "TCE";
}

/**
 * Returns the PrismaClient instance for a specific company or the current context.
 */
export function getPrismaClient(company?: CompanyId | string): ExtendedPrismaClient {
  const target = (company ? company.toUpperCase() : getActiveCompany()) as CompanyId;
  return target === "TECAIR" ? prismaTECAIR : prismaTCE;
}

/**
 * Transparent proxy that forwards all database calls to the active company's database instance.
 * Existing code importing `prisma` continues to work with zero refactoring.
 */
const prismaProxy = new Proxy({} as ExtendedPrismaClient, {
  get(target, prop, receiver) {
    const client = getPrismaClient();
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

export default prismaProxy;
