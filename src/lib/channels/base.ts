import type { ChannelHealth } from '@/lib/types';

export interface Channel {
  id: string;
  canHandle(url: string): boolean;
  check(): Promise<{ status: ChannelHealth; message: string }>;
  collect(query: string): Promise<{ title: string; content: string; url: string }>;
}
