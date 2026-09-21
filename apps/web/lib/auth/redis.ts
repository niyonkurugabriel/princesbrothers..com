import Redis from "ioredis";
import type { RedisSessionStore } from "./types";

let redis: Redis | undefined;

export const getRedis = (): Redis => {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL must be configured");

  redis = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
  return redis;
};

export const getRedisSessionStore = (): RedisSessionStore => getRedis();