import { IAuthStrategy } from '@ayazmo/types';

export class JwtStrategy implements IAuthStrategy {
  async authenticate(request: any): Promise<any> {
    // Extract token from the request
    const token = request.headers['Authorization']?.split(' ')[1];
    if (!token) {
      throw new Error('Invalid credentials');
    }
    return this.verify(token);
  }

  async verify(token: string): Promise<boolean> {
    // Token verification logic (e.g., checking if the token is valid)
    return token === 'expectedToken'; // Simplified for example purposes
  }

  async logout(request: any): Promise<void> {
    // Implement logout logic if necessary for the token strategy
  }
}

export async function validateJwtStrategy(request, reply) {
  const jwtStrategy = new JwtStrategy();
  await jwtStrategy.authenticate(request);
}
