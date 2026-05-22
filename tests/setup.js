process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars!';
process.env.JWT_SESSION_TRACKING = 'true';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.JWT_CLOCK_TOLERANCE = '5s';
