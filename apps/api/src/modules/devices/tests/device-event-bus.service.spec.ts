import { DeviceEventBusService } from '../events/device-event-bus.service';
import { DeviceEventType } from '../events/device-events';

describe('DeviceEventBusService', () => {
  let service: DeviceEventBusService;

  beforeEach(() => {
    service = new DeviceEventBusService();
  });

  afterEach(() => {
    service.removeAllListeners();
  });

  describe('emit / on', () => {
    it('entrega payload ao handler registrado', () => {
      const handler = jest.fn();
      service.on(DeviceEventType.DEVICE_CONNECTED, handler);
      const payload = { deviceId: 'dev-1', sessionId: 'ses-1', timestamp: new Date() };
      service.emit(DeviceEventType.DEVICE_CONNECTED, payload);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('entrega evento ao handler correto (não dispara handlers de outros eventos)', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      service.on(DeviceEventType.DEVICE_CONNECTED, h1);
      service.on(DeviceEventType.DEVICE_DISCONNECTED, h2);
      service.emit(DeviceEventType.DEVICE_CONNECTED, { deviceId: 'd', sessionId: 's', timestamp: new Date() });
      expect(h1).toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });

    it('suporta múltiplos handlers para o mesmo evento', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      service.on(DeviceEventType.DEVICE_ERROR, h1);
      service.on(DeviceEventType.DEVICE_ERROR, h2);
      service.emit(DeviceEventType.DEVICE_ERROR, { deviceId: 'd', error: 'fail', timestamp: new Date() });
      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('dispara handler apenas na primeira emissão', () => {
      const handler = jest.fn();
      service.once(DeviceEventType.DEVICE_DISCOVERED, handler);
      const payload = { macAddress: 'AA:BB', name: 'Dev', connectionType: 'BLE', timestamp: new Date() };
      service.emit(DeviceEventType.DEVICE_DISCOVERED, payload);
      service.emit(DeviceEventType.DEVICE_DISCOVERED, payload);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('remove handler registrado com on', () => {
      const handler = jest.fn();
      service.on(DeviceEventType.DEVICE_BATTERY_CHANGED, handler);
      service.off(DeviceEventType.DEVICE_BATTERY_CHANGED, handler);
      service.emit(DeviceEventType.DEVICE_BATTERY_CHANGED, { deviceId: 'd', batteryLevel: 80, timestamp: new Date() });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('retorna 0 quando não há handlers', () => {
      expect(service.listenerCount(DeviceEventType.DEVICE_LOST)).toBe(0);
    });

    it('retorna contagem correta após adicionar handlers', () => {
      service.on(DeviceEventType.DEVICE_LOST, jest.fn());
      service.on(DeviceEventType.DEVICE_LOST, jest.fn());
      expect(service.listenerCount(DeviceEventType.DEVICE_LOST)).toBe(2);
    });
  });

  describe('removeAllListeners', () => {
    it('remove todos os handlers de um evento específico', () => {
      service.on(DeviceEventType.DEVICE_CONNECTED, jest.fn());
      service.on(DeviceEventType.DEVICE_CONNECTED, jest.fn());
      service.removeAllListeners(DeviceEventType.DEVICE_CONNECTED);
      expect(service.listenerCount(DeviceEventType.DEVICE_CONNECTED)).toBe(0);
    });

    it('remove todos os handlers de todos os eventos quando chamado sem args', () => {
      service.on(DeviceEventType.DEVICE_CONNECTED, jest.fn());
      service.on(DeviceEventType.DEVICE_DISCONNECTED, jest.fn());
      service.removeAllListeners();
      expect(service.listenerCount(DeviceEventType.DEVICE_CONNECTED)).toBe(0);
      expect(service.listenerCount(DeviceEventType.DEVICE_DISCONNECTED)).toBe(0);
    });
  });

  describe('todos os tipos de eventos', () => {
    const events = [
      DeviceEventType.DEVICE_CONNECTED,
      DeviceEventType.DEVICE_DISCONNECTED,
      DeviceEventType.DEVICE_DISCOVERED,
      DeviceEventType.DEVICE_LOST,
      DeviceEventType.DEVICE_BATTERY_CHANGED,
      DeviceEventType.DEVICE_ERROR,
    ];

    for (const event of events) {
      it(`emite e recebe ${event}`, () => {
        const handler = jest.fn();
        service.on(event, handler);
        service.emit(event, { timestamp: new Date() } as any);
        expect(handler).toHaveBeenCalled();
      });
    }
  });
});
