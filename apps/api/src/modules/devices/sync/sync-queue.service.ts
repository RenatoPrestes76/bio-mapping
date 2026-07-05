import { Injectable, Logger } from '@nestjs/common';
import { SyncPayloadDto, ProcessedSyncPayload } from './dto/sync-payload.dto';

export interface SyncQueueEntry {
  id: string;
  payload: ProcessedSyncPayload;
  attempts: number;
  enqueuedAt: Date;
  lastAttemptAt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

// In-memory sync queue — decouples device data reception from DB persistence.
// Flow: Device → Driver → SyncQueue → Validator → ClinicalService → DB
// Replace with BullMQ/Redis for production-grade throughput.
@Injectable()
export class SyncQueueService {
  private readonly logger = new Logger(SyncQueueService.name);
  private readonly queue: Map<string, SyncQueueEntry> = new Map();
  private entryCounter = 0;

  enqueue(dto: SyncPayloadDto): string {
    const id = `sq-${++this.entryCounter}-${Date.now()}`;
    const entry: SyncQueueEntry = {
      id,
      payload: {
        deviceId: dto.deviceId,
        sessionId: dto.sessionId,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        dataType: dto.dataType,
        data: dto.data,
        processedAt: new Date(),
      },
      attempts: 0,
      enqueuedAt: new Date(),
      status: 'pending',
    };
    this.queue.set(id, entry);
    this.logger.debug(`Enqueued sync payload ${id} from device ${dto.deviceId} (type: ${dto.dataType})`);
    return id;
  }

  dequeue(): SyncQueueEntry | undefined {
    for (const entry of this.queue.values()) {
      if (entry.status === 'pending') {
        entry.status = 'processing';
        entry.lastAttemptAt = new Date();
        entry.attempts++;
        return entry;
      }
    }
    return undefined;
  }

  markDone(id: string): void {
    const entry = this.queue.get(id);
    if (entry) {
      entry.status = 'done';
      this.queue.delete(id);
    }
  }

  markFailed(id: string, error: string): void {
    const entry = this.queue.get(id);
    if (entry) {
      entry.status = 'failed';
      entry.error = error;
    }
  }

  retry(id: string): boolean {
    const entry = this.queue.get(id);
    if (entry && entry.status === 'failed') {
      entry.status = 'pending';
      entry.error = undefined;
      return true;
    }
    return false;
  }

  getPending(): SyncQueueEntry[] {
    return [...this.queue.values()].filter((e) => e.status === 'pending');
  }

  getFailed(): SyncQueueEntry[] {
    return [...this.queue.values()].filter((e) => e.status === 'failed');
  }

  getStats() {
    const entries = [...this.queue.values()];
    return {
      total: entries.length,
      pending: entries.filter((e) => e.status === 'pending').length,
      processing: entries.filter((e) => e.status === 'processing').length,
      failed: entries.filter((e) => e.status === 'failed').length,
    };
  }

  clear(): void {
    this.queue.clear();
    this.entryCounter = 0;
  }
}
