import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('returns the JWT payload unchanged from validate()', () => {
    const configService = { get: jest.fn().mockReturnValue('a'.repeat(32)) } as unknown as ConfigService;
    const strategy = new JwtStrategy(configService);

    const payload = { sub: 'user-1', email: 'jane@example.com', role: 'USER' as const };

    expect(strategy.validate(payload)).toBe(payload);
  });
});
