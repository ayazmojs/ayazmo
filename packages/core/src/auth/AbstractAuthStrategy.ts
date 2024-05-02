import { AyazmoError } from "@ayazmo/utils"

export default async function AbstractAuthStrategy (request, reply) {
  request.log.info('Using AbstractAuthStrategy, because no other authentication strategy is configured')
  throw AyazmoError({
    statusCode: 401,
    message: 'Unauthenticated',
    code: 'UNAUTHENTICATED'
  });
}
