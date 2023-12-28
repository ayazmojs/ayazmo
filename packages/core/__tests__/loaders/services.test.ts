// __tests__/loaders/services.test.ts
import { describe, it, expect, vi } from 'vitest';
import { loadServices } from '../../src/loaders/services';
import * as fs from 'fs';
import path from 'path';
import { asFunction } from 'awilix';
import { listFilesInDirectory } from '@ayazmo/utils';

// Mock the modules
vi.mock('fs');
vi.mock('path');
vi.mock('@ayazmo/utils', () => ({
  listFilesInDirectory: vi.fn()
}));
vi.mock('awilix', () => ({
  asFunction: vi.fn()
}));

describe('loadServices', () => {
  const pluginsDir = '/fake/pluginsDir';
  const fakeFastifyInstance = {
    log: {
      info: vi.fn(),
      error: vi.fn()
    }
  };
  const fakeDiContainer = {
    register: vi.fn()
  };

  it('should log an info message and return early if the plugins directory does not exist', async () => {
    // Set up mocks
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await loadServices(pluginsDir, fakeFastifyInstance as any, fakeDiContainer as any);

    expect(fakeFastifyInstance.log.info).toHaveBeenCalledWith('Plugins directory not found, skipping plugin loading.');
    expect(fs.readdirSync).not.toHaveBeenCalled();
  });
});
