import { NextRequest, NextResponse } from 'next/server';
import { getBalancerRegistry, pickHealthyUpstreams } from '@/lib/balancer';

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const reg = getBalancerRegistry();
  const { path } = await context.params;
  const joinedPath = path.join('/');
  const search = req.nextUrl.search || '';

  const bodyBuffer =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await req.arrayBuffer();

  const candidates = pickHealthyUpstreams(reg);
  let lastError: unknown = null;

  for (const upstream of candidates) {
    const targetUrl = `${upstream.url}/api/v1/${joinedPath}${search}`;
    const forwardHeaders = new Headers();
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!['host', 'connection', 'content-length'].includes(lower)) {
        forwardHeaders.set(key, value);
      }
    });
    if (!forwardHeaders.has('x-forwarded-for')) {
      forwardHeaders.set('x-forwarded-for', '127.0.0.1');
    }
    forwardHeaders.set('x-forwarded-host', req.headers.get('host') || 'localhost:3001');

    upstream.activeConnections += 1;
    try {
      const res = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: bodyBuffer,
        redirect: 'manual',
      });

      if ([502, 503, 504].includes(res.status) && candidates.length > 1) {
        upstream.failures += 1;
        upstream.unhealthyUntil = Date.now() + 10_000;
        continue;
      }

      upstream.failures = 0;
      upstream.unhealthyUntil = 0;
      upstream.totalHandled += 1;

      const respHeaders = new Headers();
      res.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (!['transfer-encoding', 'connection', 'content-encoding'].includes(lower)) {
          respHeaders.set(key, value);
        }
      });
      respHeaders.set('X-Load-Balancer', 'HRYAAR-LeastConn-Gateway');
      respHeaders.set('X-Upstream-Target', upstream.url);

      const respBody = await res.arrayBuffer();
      return new NextResponse(respBody, {
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      lastError = err;
      upstream.failures += 1;
      upstream.unhealthyUntil = Date.now() + 10_000;
    } finally {
      upstream.activeConnections = Math.max(0, upstream.activeConnections - 1);
    }
  }

  return NextResponse.json(
    {
      detail: 'All backend upstream cluster nodes are currently unreachable.',
      error: lastError instanceof Error ? lastError.message : 'Upstream connection failed',
    },
    { status: 502 }
  );
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
