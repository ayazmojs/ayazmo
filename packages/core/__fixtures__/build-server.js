import { config } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from 'url';
import { Server } from '../src/server.js'
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'fatal',
  transport: {
    target: 'pino-pretty',
  },
})

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine the environment and construct the filename
const environment = process.env.NODE_ENV || "test";
const envPath = path.resolve(path.join(__dirname, '__fixtures__'), `.env.${environment}`);

// Check if the environment-specific file exists
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config(); // Load the default .env file
}

export default function buildServer(configPath) {
  const server = new Server({ configPath: configPath ?? path.resolve(path.join(__dirname, 'ayazmo.config.js')), logger })
  return server
}

export {
  __dirname
}