import assert from "node:assert";
import { describe, it, after, before } from "node:test";
import path from 'node:path';
import buildServer from "../__fixtures__/build-server.js";
import { AyazmoError } from "@ayazmo/utils";
import { getTestHost } from "../__fixtures__/helpers/get-test-host.js";

let server;
let fastifyInstance;
let authToken = 'user-token';
let adminAuthToken = 'admin-token';
let host;

describe("core: testing the server", () => {
  before(async () => {
    server = buildServer();
    await server.loadDiContainer();
    await server.loadConfig();
    fastifyInstance = server.getServerInstance();

    const authProviderHandler = (type = 'user') => async (request, reply) => {
      // check the Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw AyazmoError({
          statusCode: 401,
          message: 'Unauthenticated',
          code: 'UNAUTHENTICATED'
        });
      }

      // extract the token from the Authorization header
      const token = authHeader.split(' ')[1];

      // check if the token is valid
      if ((type === 'user' && token !== authToken) || (type === 'admin' && token !== adminAuthToken)) {
        throw AyazmoError({
          statusCode: 401,
          message: 'Unauthenticated',
          code: 'UNAUTHENTICATED'
        });
      }

      if (type === 'user') {
        request.user = {
          id: 'user-id',
          roles: ['user']
        };
      } else if (type === 'admin') {
        request.admin = {
          id: 'admin-id',
          roles: ['admin']
        };
      }
    }

    // create user auth provider
    fastifyInstance.decorate('SSO', authProviderHandler('user'));
    fastifyInstance.decorate('adminSSO', authProviderHandler('admin'));

    await server.enableAuthProviders();
    await server.loadCoreServices();

    // add anonymous route with preHandler option
    fastifyInstance.route({
      method: 'GET',
      url: '/anonymous',
      handler: (request, reply) => {
        reply.code(200).send({ message: 'Anonymous request' });
      },
      preHandler: fastifyInstance.auth([fastifyInstance.anonymousStrategy])
    });

    // add user route with preHandler option
    fastifyInstance.route({
      method: 'GET',
      url: '/user',
      handler: (request, reply) => {
        reply.code(200).send({ message: 'User request' });
      },
      preHandler: fastifyInstance.userAuthChain
    });

    fastifyInstance.route({
      method: 'GET',
      url: '/admin',
      handler: (request, reply) => {
        reply.code(200).send({ message: 'Admin request' });
      },
      preHandler: fastifyInstance.adminAuthChain
    });

    const config = fastifyInstance.diContainer.resolve('config');

    await fastifyInstance.listen(config.app.server);
    await fastifyInstance.ready();
    host = getTestHost(fastifyInstance);
  });

  after(async () => {
    await fastifyInstance.close();
  });

  it('should create a Fastify instance', () => {
    assert(fastifyInstance, 'Fastify instance should be created');
  });

  it("successfully loads the server", async () => {
    assert.ok(server)
  })

  it('should register health routes', async () => {
    const hasRoute = fastifyInstance.hasRoute({
      method: 'GET',
      url: '/health'
    });
    assert(hasRoute, 'Routes should include /health');
  });

  it('should successfully call health route', async () => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.payload).status, 'ok');
  });

  it('should register graphql', async () => {
    const response = await fastifyInstance.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query {
            health
          }
        `
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.payload).data.health, true);
  });

  it('should register auth providers', async () => {
    const hasAuthProvider = fastifyInstance.hasDecorator('anonymousStrategy');
    assert(hasAuthProvider, 'Anonymous strategy should be registered');

    const hasUserAuthProvider = fastifyInstance.hasDecorator('userAuthChain');
    assert(hasUserAuthProvider, 'User auth chain should be registered');

    const hasAdminAuthProvider = fastifyInstance.hasDecorator('adminAuthChain');
    assert(hasAdminAuthProvider, 'Admin auth chain should be registered');
  });

  // test dicontainer is correctly registered
  it('should register di container', async () => {
    const hasDiContainer = fastifyInstance.hasDecorator('diContainer');
    assert(hasDiContainer, 'DI container should be registered');
  });

  it('should allow request to be made anonymously', async () => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/anonymous',
      preHandler: fastifyInstance.auth([fastifyInstance.anonymousStrategy])
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.payload).message, 'Anonymous request');
  });

  it('should disallow request to be made without authentication', async () => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/user'
    });

    assert.equal(response.statusCode, 401);
  });

  it('should allow request to be made with valid user authentication', async () => {
    assert(fastifyInstance.hasDecorator('SSO'), 'Application has SSO auth provider successfully registered');

    const response = await fetch(path.join(host, 'user'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    const responseBody = await response.json();

    assert.equal(response.status, 200);
    assert.equal(responseBody.message, 'User request');
  });

  it('should disallow request to be made without valid user authentication', async () => {
    const response = await fetch(path.join(host, 'user'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}-is-not-valid`
      }
    });

    assert.equal(response.status, 401);
  });

  it('should disallow request to be made without valid admin authentication', async () => {
    const response = await fastifyInstance.inject({
      method: 'GET',
      url: '/admin',
    });

    assert.equal(response.statusCode, 401);
  });

  it('should allow admin request to be made with valid admin authentication', async () => {
    assert(fastifyInstance.hasDecorator('adminAuthChain'), 'Application has adminAuthChain auth provider successfully registered');

    const response = await fetch(path.join(host, 'admin'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminAuthToken}`
      }
    });

    const responseBody = await response.json();

    assert.equal(response.status, 200);
    assert.equal(responseBody.message, 'Admin request');
  });

  it('should not allow request to be made with invalid admin authentication', async () => {
    const response = await fetch(path.join(host, 'admin'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminAuthToken}-is-not-valid`
      }
    });

    assert.equal(response.status, 401);
    assert.equal(response.statusText, 'Unauthorized');
  });
})