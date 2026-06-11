export type AppConfig = {
  app: {
    nodeEnv: string;
    port: number;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
    migrationsRun: boolean;
  };
  redis: {
    host: string;
    port: number;
  };
};

const parseInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const appConfig = (): AppConfig => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInteger(process.env.PORT, 3000),
  },
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInteger(process.env.DATABASE_PORT, 5432),
    user: process.env.DATABASE_USER ?? 'servicehub',
    password: process.env.DATABASE_PASSWORD ?? 'servicehub',
    name: process.env.DATABASE_NAME ?? 'servicehub',
    ssl: parseBoolean(process.env.DATABASE_SSL),
    migrationsRun: parseBoolean(process.env.DATABASE_MIGRATIONS_RUN),
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInteger(process.env.REDIS_PORT, 6379),
  },
});
