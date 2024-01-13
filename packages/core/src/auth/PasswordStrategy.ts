import { IAuthStrategy } from '@ayazmo/types';

export class PasswordStrategy implements IAuthStrategy {
  async authenticate(request: any): Promise<any> {
    if (!request?.body) {
      throw new Error('Invalid credentials');
    }
    const { username, password } = request?.body;

    // Perform authentication logic (e.g., checking if username and password are valid)
    if (username && password) {
      return this.verify({ username, password });
    } else {
      throw new Error('Invalid credentials');
    }
  }

  async verify({ username, password }): Promise<boolean> {
    // Verification logic (e.g., checking if the user is valid)
    return username === 'admin' && password === 'admin'; // Simplified for example purposes
  }

  async logout(request: any): Promise<void> {
    // Implement logout logic if necessary for the password strategy
  }
}

export async function validatePasswordStrategy(request, reply) {
  const jwtStrategy = new PasswordStrategy();
  await jwtStrategy.authenticate(request);
}
