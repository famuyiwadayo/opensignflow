export type AccessTokenPayload = {
  sub: string;
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
};
