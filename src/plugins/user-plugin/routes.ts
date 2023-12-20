import { RouteOptions } from 'fastify';

const routes: RouteOptions[] = [
  {
    method: 'GET',
    url: '/users',
    handler: async (request, reply) => {
      return [
        { id: 1, name: 'John Doe' },
      ];
    }
  },
  // More routes can be added here...
];

export default routes;
