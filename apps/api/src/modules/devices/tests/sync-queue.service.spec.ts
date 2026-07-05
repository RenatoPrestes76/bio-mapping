import { SyncQueueService } from '../sync/sync-queue.service';
import { SyncPayloadDto } from '../sync/dto/sync-payload.dto';

function makeDto(overrides: Partial<SyncPayloadDto> = {}): SyncPayloadDto {
  return {
    deviceId: 'dev-1',
    sessionId: 'ses-1',
    dataType: 'heart_rate',
    data: { bpm: 72 },
    ...overrides,
  };
}

describe('SyncQueueService', () => {
  let service: SyncQueueService;

  beforeEach(() => {
    service = new SyncQueueService();
  });

  // ── enqueue ─────────────────────────────────────────────────────────────────

  describe('enqueue', () => {
    it('retorna id único', () => {
      const id1 = service.enqueue(makeDto());
      const id2 = service.enqueue(makeDto());
      expect(id1).not.toBe(id2);
    });

    it('usa timestamp do dto se fornecido', () => {
      const ts = '2026-01-15T10:00:00.000Z';
      const id = service.enqueue(makeDto({ timestamp: ts }));
      const pending = service.getPending();
      const entry = pending.find((e) => e.id === id)!;
      expect(entry.payload.timestamp).toEqual(new Date(ts));
    });

    it('usa timestamp atual se não fornecido', () => {
      const before = Date.now();
      const id = service.enqueue(makeDto());
      const after = Date.now();
      const entry = service.getPending().find((e) => e.id === id)!;
      expect(entry.payload.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(entry.payload.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('entrada começa com status pending e 0 attempts', () => {
      const id = service.enqueue(makeDto());
      const entry = service.getPending().find((e) => e.id === id)!;
      expect(entry.status).toBe('pending');
      expect(entry.attempts).toBe(0);
    });
  });

  // ── dequeue ─────────────────────────────────────────────────────────────────

  describe('dequeue', () => {
    it('retorna primeira entrada pending e muda status para processing', () => {
      const id = service.enqueue(makeDto());
      const entry = service.dequeue();
      expect(entry).toBeDefined();
      expect(entry!.id).toBe(id);
      expect(entry!.status).toBe('processing');
      expect(entry!.attempts).toBe(1);
    });

    it('retorna undefined se não há pendentes', () => {
      expect(service.dequeue()).toBeUndefined();
    });

    it('pula entradas já em processing', () => {
      const id1 = service.enqueue(makeDto());
      const id2 = service.enqueue(makeDto());
      service.dequeue(); // pega id1
      const entry = service.dequeue(); // deve pegar id2
      expect(entry!.id).toBe(id2);
    });
  });

  // ── markDone ────────────────────────────────────────────────────────────────

  describe('markDone', () => {
    it('remove entrada da fila', () => {
      const id = service.enqueue(makeDto());
      service.markDone(id);
      expect(service.getPending()).toHaveLength(0);
      expect(service.getStats().total).toBe(0);
    });

    it('ignora id inexistente sem erro', () => {
      expect(() => service.markDone('nonexistent')).not.toThrow();
    });
  });

  // ── markFailed ──────────────────────────────────────────────────────────────

  describe('markFailed', () => {
    it('muda status para failed e registra mensagem de erro', () => {
      const id = service.enqueue(makeDto());
      service.dequeue();
      service.markFailed(id, 'validation error');
      const failed = service.getFailed();
      expect(failed).toHaveLength(1);
      expect(failed[0].error).toBe('validation error');
    });
  });

  // ── retry ───────────────────────────────────────────────────────────────────

  describe('retry', () => {
    it('volta entrada failed para pending e retorna true', () => {
      const id = service.enqueue(makeDto());
      service.dequeue();
      service.markFailed(id, 'err');
      const result = service.retry(id);
      expect(result).toBe(true);
      expect(service.getPending().find((e) => e.id === id)).toBeDefined();
    });

    it('retorna false para id não-failed', () => {
      const id = service.enqueue(makeDto());
      expect(service.retry(id)).toBe(false);
    });

    it('retorna false para id inexistente', () => {
      expect(service.retry('ghost')).toBe(false);
    });
  });

  // ── getStats ────────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('contagem correta com estados mistos', () => {
      const id1 = service.enqueue(makeDto());
      const id2 = service.enqueue(makeDto());
      service.enqueue(makeDto());
      service.dequeue(); // id1 → processing
      service.markFailed(id1, 'err');
      service.dequeue(); // id2 → processing
      // estado: 1 pending, 1 processing, 1 failed
      const stats = service.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(3);
    });
  });

  // ── clear ───────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('esvazia fila e reseta contador', () => {
      service.enqueue(makeDto());
      service.enqueue(makeDto());
      service.clear();
      expect(service.getStats().total).toBe(0);
      const newId = service.enqueue(makeDto());
      expect(newId).toMatch(/^sq-1-/);
    });
  });
});
