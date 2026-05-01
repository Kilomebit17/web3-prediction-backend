import { Injectable } from '@nestjs/common';
import type { IEventBus, EventHandler } from '@pred/application';
import type { DomainEvent } from '@pred/domain';

@Injectable()
export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.constructor.name);
    if (!handlers || handlers.size === 0) return;
    const promises = Array.from(handlers).map((handler) => handler(event));
    await Promise.all(promises);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    const promises = events.map((event) => this.publish(event));
    await Promise.all(promises);
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler as EventHandler);
  }
}
