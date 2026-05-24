export const REDIS_CLIENT = 'REDIS_CLIENT';

export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 60 * 5,     // 5 minutes
  LONG: 60 * 30,      // 30 minutes
  HOUR: 60 * 60,      // 1 hour
  DAY: 60 * 60 * 24,  // 24 hours
};

export const CACHE_KEYS = {
  KILL_SWITCH: 'kill_switch:status',
  BANK_LIST: 'payment:bank_list',
  DASHBOARD_STATS: 'admin:dashboard_stats',
  USER: (id: number) => `user:${id}`,
  DRIVER: (id: number) => `driver:${id}`,
  TRIP: (id: number) => `trip:${id}`,
  TRIP_LIST: 'trips:active',
};