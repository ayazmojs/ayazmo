import { FastifyInstance, RouteOptions } from 'fastify';
import fs from 'fs';
import path from 'path';
import { isValidRoute } from '../utils/route-validator';

const PLUGIN_DIR = path.join(__dirname, '../plugins');

export async function loadAndRegisterPlugins(fastify: FastifyInstance) {
    const pluginDirs = fs.readdirSync(PLUGIN_DIR);

    for (const dir of pluginDirs) {
        const routesPath = path.join(PLUGIN_DIR, dir, 'routes.ts');
        if (fs.existsSync(routesPath)) {
            const routesModule = await import(routesPath);

            if (routesModule.default && Array.isArray(routesModule.default)) {
                routesModule.default.forEach((route: RouteOptions) => {
                    if (isValidRoute(route)) {
                        fastify.route(route);
                    } else {
                        console.error(`Invalid route detected in ${dir}`);
                    }
                });
            } else {
                console.error(`No default export (array of routes) found in ${routesPath}`);
            }
        } else {
            console.error(`Routes file not found in plugin directory: ${dir}`);
        }
    }
}
