import { validate } from 'class-validator';

import { LoginDto, RegisterDto } from '../dto';

describe('auth DTO validation', () => {
  it('accepts a valid registration payload', async () => {
    const dto = Object.assign(new RegisterDto(), {
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'correct-horse-battery-staple',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid registration name, email, and short password', async () => {
    const dto = Object.assign(new RegisterDto(), {
      name: 'G',
      email: 'not-an-email',
      password: 'short',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });

  it('rejects malformed login email and missing password', async () => {
    const dto = Object.assign(new LoginDto(), {
      email: 'not-an-email',
      password: '',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});
