import type { Greeting } from './types';

export async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    const body: { code?: string } | null = await response.json().catch(() => null);
    throw new Error(body?.code || `HTTP ${response.status}`);
  }
  return response;
}

export async function loadGreeting(): Promise<Greeting> {
  const response = await request('/greeting');
  return (await response.json()) as Greeting;
}
