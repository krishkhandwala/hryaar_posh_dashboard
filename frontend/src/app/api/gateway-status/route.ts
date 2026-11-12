import { NextResponse } from 'next/server';
import { getBalancerSnapshot } from '@/lib/balancer';

export async function GET() {
  return NextResponse.json({
    gateway: 'HRYAAR-LeastConn-Gateway',
    algorithm: 'least_conn + round_robin_tiebreak',
    upstreams: getBalancerSnapshot(),
  });
}
