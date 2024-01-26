import { IAuthStrategy, FastifyRequest } from '@ayazmo/types';

export class ApiTokenStrategy implements IAuthStrategy {
  async authenticate(request: FastifyRequest) {
    // Extract token from the request
    const apiToken = request.headers['x-api-key'] ?? null;

    if (!apiToken || typeof apiToken !== 'string') {
      return Promise.reject(new Error('Unauthorized'))
    }

    const isTokenValid = await this.verify(apiToken);

    if (!isTokenValid) {
      throw new Error('Invalid credentials');
    }
    return isTokenValid;
  }

  async verify(token: string): Promise<boolean> {
    // Token verification logic (e.g., checking if the token is valid)
    const validTokens = ['expectedToken', 'expectedToken2'];
    return validTokens.includes(token) // Simplified for example purposes
  }

  async logout(request: FastifyRequest): Promise<void> {
    // Implement logout logic if necessary for the token strategy
  }
}

export async function validateApitokenStrategy(request: FastifyRequest) {
  console.log('------validateApitokenStrategy-------')
  const jwtStrategy = new ApiTokenStrategy();
  await jwtStrategy.authenticate(request);
}
