export interface IUnitOfWork {
  withTransaction<T>(work: () => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('IUnitOfWork');
