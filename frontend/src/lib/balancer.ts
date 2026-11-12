export interface UpstreamState {
  url: string;
  activeConnections: number;
  failures: number;
  unhealthyUntil: number;
  totalHandled: number;
}

interface BalancerRegistry {
  upstreams: UpstreamState[];
  rrCursor: number;
}

const g = globalThis as unknown as { __hryaarLb?: BalancerRegistry };

export function getBalancerRegistry(): BalancerRegistry {
  const raw =
    process.env.BACKEND_UPSTREAMS ||
    process.env.BACKEND_INTERNAL_URL ||
    'http://127.0.0.1:8001,http://127.0.0.1:8002';

  const urls = raw
    .split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (
    !g.__hryaarLb ||
    g.__hryaarLb.upstreams.map((u) => u.url).join(',') !== urls.join(',')
  ) {
    g.__hryaarLb = {
      upstreams: urls.map((url) => ({
        url,
        activeConnections: 0,
        failures: 0,
        unhealthyUntil: 0,
        totalHandled: 0,
      })),
      rrCursor: 0,
    };
  }
  return g.__hryaarLb;
}

export function pickHealthyUpstreams(reg: BalancerRegistry): UpstreamState[] {
  const now = Date.now();
  const healthy = reg.upstreams.filter((u) => u.unhealthyUntil <= now);
  const candidates = healthy.length > 0 ? [...healthy] : [...reg.upstreams];

  const offset = reg.rrCursor % candidates.length;
  reg.rrCursor = (reg.rrCursor + 1) % 1000000;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  rotated.sort((a, b) => a.activeConnections - b.activeConnections);
  return rotated;
}

export function getBalancerSnapshot() {
  const reg = getBalancerRegistry();
  const now = Date.now();
  return reg.upstreams.map((u) => ({
    url: u.url,
    active_connections: u.activeConnections,
    total_handled: u.totalHandled,
    healthy: u.unhealthyUntil <= now,
  }));
}

