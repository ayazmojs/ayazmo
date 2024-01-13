import { IAuthStrategy, FastifyRequest } from '@ayazmo/types';

export class ApiTokenStrategy implements IAuthStrategy {
  async authenticate(request: FastifyRequest): Promise<any> {
    // Extract token from the request
    const apiToken = request.headers['x-api-key'] ?? '';

    if (Array.isArray(apiToken)) {
      throw new Error('Invalid credentials');
    }

    const isTokenValid = await this.verify(apiToken);
  
    if (!apiToken || !isTokenValid) {
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

export async function validateApitokenStrategy(request, reply) {
  const jwtStrategy = new ApiTokenStrategy();
  await jwtStrategy.authenticate(request);
}
