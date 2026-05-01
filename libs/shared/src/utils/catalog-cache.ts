export class CatalogCache<T> {
  private data: T | null = null;
  private fetchedAt = 0;
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(): T | null {
    if (this.data === null) return null;
    if (Date.now() - this.fetchedAt > this.ttlMs) {
      this.data = null;
      return null;
    }
    return this.data;
  }

  set(data: T): void {
    this.data = data;
    this.fetchedAt = Date.now();
  }

  invalidate(): void {
    this.data = null;
    this.fetchedAt = 0;
  }
}
