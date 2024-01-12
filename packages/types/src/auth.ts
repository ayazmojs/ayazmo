export interface IAuthStrategy {
  authenticate(request: any): Promise<any>;
  verify(credentials: any): Promise<boolean>;
  logout(request: any): Promise<void>;
}