/**
 * Client-side LLM access. Everything goes through /api/llm on the same origin; the browser never sees a key.
 * If the proxy is not configured, the provider marks itself unavailable and every call resolves null,
 * so the game runs exactly as before.
 */
import { validateGeneratedCard, type GenCardRequest, type GeneratedCard } from './gencard';
import { validatePolicy, type PolicyProposal, type PolicyRequest } from './policy';
import { validateHistory, validatePapers, validateVoxPop, type HistoryBook, type HistoryRequest, type LlmRequest, type Papers, type PapersRequest, type VoxPop, type VoxPopRequest } from './schemas';

export interface LlmProvider {
  readonly available: () => Promise<boolean>;
  papers(req: PapersRequest): Promise<Papers | null>;
  voxPop(req: VoxPopRequest): Promise<VoxPop | null>;
  history(req: HistoryRequest): Promise<HistoryBook | null>;
  policy(req: PolicyRequest): Promise<PolicyProposal | null>;
  card(req: GenCardRequest): Promise<GeneratedCard | null>;
}

export const NullProvider: LlmProvider = {
  available: async () => false,
  papers: async () => null,
  voxPop: async () => null,
  history: async () => null,
  policy: async () => null,
  card: async () => null,
};

const CLIENT_TIMEOUT_MS = 45_000;

class RemoteProvider implements LlmProvider {
  private status: 'unknown' | 'up' | 'down' = 'unknown';
  private probe: Promise<boolean> | null = null;
  private inflight = new Map<string, Promise<unknown>>();

  available = (): Promise<boolean> => {
    if (this.status === 'up') return Promise.resolve(true);
    if (this.status === 'down') return Promise.resolve(false);
    if (!this.probe) {
      this.probe = fetch('/api/health', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { llm: false }))
        .then((j: { llm?: boolean }) => {
          this.status = j.llm ? 'up' : 'down';
          return this.status === 'up';
        })
        .catch(() => {
          this.status = 'down';
          return false;
        });
    }
    return this.probe;
  };

  private async call<T>(req: LlmRequest, validate: (x: unknown) => T | null): Promise<T | null> {
    if (!(await this.available())) return null;
    const body = JSON.stringify(req);
    // de-duplicate identical concurrent requests (e.g. double clicks)
    const existing = this.inflight.get(body);
    if (existing) return existing as Promise<T | null>;
    const p = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
      try {
        const res = await fetch('/api/llm', { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: ctrl.signal });
        if (res.status === 503) {
          this.status = 'down';
          return null;
        }
        if (!res.ok) return null;
        return validate(await res.json());
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
        this.inflight.delete(body);
      }
    })();
    this.inflight.set(body, p);
    return p;
  }

  papers = (req: PapersRequest) => this.call(req, validatePapers);
  voxPop = (req: VoxPopRequest) => this.call(req, validateVoxPop);
  history = (req: HistoryRequest) => this.call(req, validateHistory);
  policy = (req: PolicyRequest) => this.call(req, validatePolicy);
  card = (req: GenCardRequest) => this.call(req, validateGeneratedCard);
}

export const llm: LlmProvider = import.meta.env.VITE_LLM === 'off' ? NullProvider : new RemoteProvider();
