import { FastifyRequest, FastifyReply } from '@ayazmo/types';

export interface IAuthStrategy {
  authenticate(request: FastifyRequest, reply: FastifyReply): Promise<boolean>;
  verify(credentials: any): Promise<boolean>;
  logout(request: FastifyRequest): Promise<void>;
}