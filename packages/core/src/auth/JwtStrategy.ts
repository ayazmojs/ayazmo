import { IAuthStrategy, FastifyRequest } from '@ayazmo/types';

export class JwtStrategy implements IAuthStrategy {
  async authenticate(request: FastifyRequest): Promise<boolean> {
    let jwtService: any;

    try {
      jwtService = request.diScope.resolve('jwtService');
    } catch (error) {
      request.log.error('JwtService not found. Pleasee make sure you install a plugin which supports JWT authentication.');
      return Promise.reject(new Error('Unauthorized'));
    }
    
    // Extract token from the request
    const authorization = request.headers['authorization'] ?? null;
    if (!authorization || typeof authorization !== 'string') {
      return Promise.reject(new Error('Unauthorized'));
    }

    const token = authorization.split(' ')[1];
    if (!token || typeof token !== 'string') {
      return Promise.reject(new Error('Unauthorized'));
    }

    const isAuthenticated = await jwtService.authenticate(request, token);

    if (!isAuthenticated) {
      throw new Error('Invalid credentials');
    }

    return isAuthenticated;
  }

  async logout(request: any): Promise<void> {
    // Implement logout logic if necessary for the token strategy
  }
}

export async function validateJwtStrategy(request: FastifyRequest) {
  const jwtStrategy = new JwtStrategy();
  await jwtStrategy.authenticate(request);
}
