import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from 'url';
import { describe, it, after, before } from "node:test";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, '../../dist/index.js');

describe('CLI Help Menu', () => {
  it('should display the help menu', async () => {
    const { stdout, stderr } = await execAsync(`node ${cliPath} --help`);
    
    assert.strictEqual(stderr, '', 'Expected no errors');
    assert.ok(stdout.includes('Usage: ayazmo [options] [command]'), 'Help menu should include usage information');
    assert.ok(stdout.includes('CLI to manage Ayazmo projects'), 'Help menu should include CLI description');
    assert.ok(stdout.includes('Options:'), 'Help menu should include options section');
    assert.ok(stdout.includes('Commands:'), 'Help menu should include commands section');
    assert.ok(stdout.includes('app:create'), 'Help menu should include app:create command');
    assert.ok(stdout.includes('migration:create'), 'Help menu should include migration:create command');
    assert.ok(stdout.includes('migration:up'), 'Help menu should include migration:up command');
    assert.ok(stdout.includes('migration:down'), 'Help menu should include migration:down command');
    assert.ok(stdout.includes('plugin:create'), 'Help menu should include plugin:create command');
    assert.ok(stdout.includes('install'), 'Help menu should include install command');
    assert.ok(stdout.includes('add'), 'Help menu should include add command');
    assert.ok(stdout.includes('plugin:install'), 'Help menu should include plugin:install command');
    assert.ok(stdout.includes('remove'), 'Help menu should include remove command');
  });
});