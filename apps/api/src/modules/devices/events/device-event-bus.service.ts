import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DeviceEventType, DeviceEvent } from './device-events';

type EventHandler<T = DeviceEvent> = (payload: T) => void;

// Internal event bus for device lifecycle events.
// Prepares integration with WebSocket gateway (Sprint 7+).
@Injectable()
export class DeviceEventBusService {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger(DeviceEventBusService.name);

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<T extends DeviceEvent>(event: DeviceEventType, payload: T): void {
    this.logger.debug(`Event emitted: ${event} — ${JSON.stringify(payload)}`);
    this.emitter.emit(event, payload);
  }

  on<T extends DeviceEvent>(event: DeviceEventType, handler: EventHandler<T>): void {
    this.emitter.on(event, handler as EventHandler);
  }

  once<T extends DeviceEvent>(event: DeviceEventType, handler: EventHandler<T>): void {
    this.emitter.once(event, handler as EventHandler);
  }

  off<T extends DeviceEvent>(event: DeviceEventType, handler: EventHandler<T>): void {
    this.emitter.off(event, handler as EventHandler);
  }

  listenerCount(event: DeviceEventType): number {
    return this.emitter.listenerCount(event);
  }

  removeAllListeners(event?: DeviceEventType): void {
    if (event !== undefined) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}
