import { describe, expect, it } from 'vitest';
import { createStoreBackend } from './IndexedDbBackend';

const keyForTest = (_store: string, value: unknown) => (value as { id: string }).id;
const failedDatabase = (message: string) => ({ transaction: () => { throw new Error(message); } }) as unknown as IDBDatabase;

describe('IndexedDB backend failures', () => {
  it('marks an open fallback as degraded while retaining only the current memory data', async () => {
    const backend = createStoreBackend(keyForTest, async () => ({ fallbackMessage: 'simulated open failure' }));

    await backend.put('queue', { id: 'current-queue' });

    expect(await backend.values('queue')).toEqual([{ id: 'current-queue' }]);
    expect(backend.getStatus()).toEqual({ mode: 'degraded', message: 'simulated open failure' });
  });

  it('rejects a read failure instead of returning an empty result', async () => {
    const backend = createStoreBackend(keyForTest, async () => ({ database: failedDatabase('simulated read failure') }));

    await expect(backend.values('queue')).rejects.toThrow('simulated read failure');

    expect(backend.getStatus()).toEqual({ mode: 'degraded', message: 'Local data could not be read. simulated read failure' });
  });

  it('rejects a write failure without falling back to a destructive replacement', async () => {
    const backend = createStoreBackend(keyForTest, async () => ({ database: failedDatabase('simulated write failure') }));

    await expect(backend.replace('queue', [{ id: 'replacement' }])).rejects.toThrow('simulated write failure');

    expect(backend.getStatus()).toEqual({ mode: 'degraded', message: 'Local data could not be saved. simulated write failure' });
  });
});
