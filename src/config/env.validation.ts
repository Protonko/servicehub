type Environment = Record<string, string | undefined>;

const optionalIntegerKeys = ['PORT', 'DATABASE_PORT', 'REDIS_PORT'] as const;

const optionalBooleanKeys = ['DATABASE_SSL', 'DATABASE_MIGRATIONS_RUN'] as const;

export const validateEnvironment = (config: Environment): Environment => {
  for (const key of optionalIntegerKeys) {
    const value = config[key];

    if (value && Number.isNaN(Number.parseInt(value, 10))) {
      throw new Error(`${key} must be an integer`);
    }
  }

  for (const key of optionalBooleanKeys) {
    const value = config[key];

    if (
      value &&
      !['1', '0', 'true', 'false', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())
    ) {
      throw new Error(`${key} must be a boolean-like value`);
    }
  }

  return config;
};
