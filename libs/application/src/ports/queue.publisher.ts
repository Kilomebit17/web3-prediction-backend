export interface IQueuePublisher {
  scheduleBetResolution(betId: string, delaySeconds: number): Promise<void>;
}

export const QUEUE_PUBLISHER = Symbol('IQueuePublisher');
