import IORedis, { RedisKey, RedisOptions } from "ioredis";

export interface RedisConfig {
  url: string;
  keyPrefix?: string;
}

/**
 * create redis heler client object
 * @param cfg
 * @returns
 */
export async function createRedisClient(cfg: RedisConfig) {
  async function createIORedis(cfg: RedisConfig): Promise<IORedis> {
    return new Promise<IORedis>((resolve) => {
      const ioredis = new IORedis(cfg.url);
      if (cfg.keyPrefix) {
        ioredis.options.keyPrefix = cfg.keyPrefix;
      }

      ioredis.on("connect", async () => {
        resolve(ioredis);
        // console.log(`redis connected!`);
      });
    });
  }

  /**
   * close the redis connection
   * @returns
   */
  async function close(): Promise<void> {
    return new Promise((resolve, reject) => {
      ioredis.on("close", () => {
        resolve();
        // console.log(`redis disconnected!`);
      });

      ioredis.disconnect();
    });
  }

  /**
   * cache your data
   * @param key
   * @param value
   * @returns
   */
  async function cache(key: RedisKey, value?: string | number | Buffer) {
    async function get() {
      return await ioredis.get(key);
    }

    async function set(value: string | number | Buffer) {
      await ioredis.set(key, value);
    }

    if (value) {
      await set(value);
    }

    return {
      get,
      set,
    };
  }

  /**
   * the global lock
   * @param key
   * @param seconds
   * @returns
   */
  async function lock(key: RedisKey, seconds?: string | number) {
    async function get() {
      return await ioredis.get(key);
    }

    async function release() {
      await ioredis.del(key);
    }

    const val = await ioredis.setnx(key, "locked");
    if (val == 0) {
      return null;
    } else {
      ioredis.expire(key, seconds ?? 30);
      return {
        release,
      };
    }
  }

  /**
   * a counter
   * @param key
   * @param value
   * @returns
   */
  async function counter(key: RedisKey, value?: number) {
    async function get(): Promise<number> {
      const val = await ioredis.get(key);
      return Number.parseInt(val ?? "0");
    }

    async function incr(c?: number): Promise<number> {
      if (c) {
        return await ioredis.incrby(key, c);
      } else {
        return await ioredis.incr(key);
      }
    }

    async function decr(c?: number): Promise<number> {
      if (c) {
        return await ioredis.decrby(key, c);
      } else {
        return await ioredis.decr(key);
      }
    }

    await ioredis.set(key, value ?? 0);

    return {
      get,
      incr,
      decr,
    };
  }

  /**
   * limiting for some resources
   * @param key
   * @param maxValue
   * @param seconds
   * @param value
   * @returns
   */
  function throttle(
    key: RedisKey,
    maxValue: number,
    seconds: number = 60,
    value?: number
  ) {
    async function get(): Promise<number> {
      const val = await ioredis.get(key);
      return Number.parseInt(val ?? "0");
    }

    async function incr(c?: number): Promise<boolean> {
      let count = 0;
      if (c) {
        count = await ioredis.incrby(key, c);
        if (count == 1) {
          await ioredis.expire(key, seconds);
        }
      } else {
        count = await ioredis.incr(key);
        if (count == 1) {
          await ioredis.expire(key, seconds);
        }
      }

      return count > maxValue;
    }
    // await ioredis.set(key, value ?? 0, "EX", seconds, "NX");
    return {
      get,
      incr,
    };
  }

  /**
   * bits op
   * @param key
   * @returns
   */
  function bits(key: RedisKey) {
    async function get(offset: string | number): Promise<number> {
      return await ioredis.getbit(key, offset);
    }

    async function set(...offset: Array<number>) {
      if (Array.isArray(offset)) {
        for (let o of offset) {
          await ioredis.setbit(key, o, 1);
        }
      } else {
        await ioredis.setbit(key, offset, 1);
      }
    }

    async function unset(...offset: Array<number>) {
      if (Array.isArray(offset)) {
        for (let o of offset) {
          await ioredis.setbit(key, o, 0);
        }
      } else {
        await ioredis.setbit(key, offset, 0);
      }
    }

    async function count(): Promise<number> {
      return await ioredis.bitcount(key);
    }

    return {
      get,
      set,
      unset,
      count,
    };
  }

  /**
   * a message queue of FIFO
   * @param key
   * @returns
   */
  function queue(key: RedisKey) {
    async function push(...elements: (string | number | Buffer)[]) {
      return await ioredis.lpush(key, ...elements);
    }

    async function pop(): Promise<string | null> {
      return await ioredis.rpop(key);
    }

    async function size(): Promise<number> {
      return await ioredis.llen(key);
    }

    return {
      push,
      pop,
      size,
    };
  }

  /**
   * a mesage stack of LIFO
   * @param key
   * @returns
   */
  function stack(key: RedisKey) {
    async function push(...elements: (string | number | Buffer)[]) {
      return await ioredis.lpush(key, ...elements);
    }

    async function pop(): Promise<string | null> {
      return await ioredis.lpop(key);
    }

    async function size(): Promise<number> {
      return await ioredis.llen(key);
    }

    return {
      push,
      pop,
      size,
    };
  }

  /**
   * a data set utils
   * @param key
   * @returns
   */
  function set(key: RedisKey) {
    async function getAll(
      ...elements: (string | number | Buffer)[]
    ): Promise<string[]> {
      return await ioredis.smembers(key);
    }

    async function add(
      ...elements: (string | number | Buffer)[]
    ): Promise<number> {
      return await ioredis.sadd(key, ...elements);
    }

    async function remove(
      ...elements: (string | number | Buffer)[]
    ): Promise<number> {
      return await ioredis.srem(key, ...elements);
    }

    async function pop(
      ...elements: (string | number | Buffer)[]
    ): Promise<string | null> {
      return await ioredis.spop(key);
    }

    async function contains(
      member: string | number | Buffer
    ): Promise<boolean> {
      return (await ioredis.sismember(key, member)) == 1;
    }

    async function size(): Promise<number> {
      return await ioredis.scard(key);
    }

    return {
      getAll,
      add,
      remove,
      contains,
      size,
      pop,
    };
  }

  /**
   * a hashset utils
   * @param key
   * @returns
   */
  function hashSet(key: RedisKey) {
    async function getAll(
      ...elements: (string | number | Buffer)[]
    ): Promise<Record<string, string>> {
      return await ioredis.hgetall(key);
    }

    async function get(field: string | Buffer): Promise<string | null> {
      return await ioredis.hget(key, field);
    }

    async function setObject(obj: object): Promise<number> {
      return await ioredis.hset(key, obj);
    }

    async function setMap(
      map: Map<string | Buffer | number, string | Buffer | number>
    ): Promise<number> {
      return await ioredis.hset(key, map);
    }

    async function remove(...fields: (string | Buffer)[]): Promise<number> {
      return await ioredis.hdel(key, ...fields);
    }

    async function keys(): Promise<string[]> {
      return await ioredis.hkeys(key);
    }

    async function vals(): Promise<string[]> {
      return await ioredis.hvals(key);
    }

    async function contains(field: string | Buffer): Promise<boolean> {
      return (await ioredis.hexists(key, field)) == 1;
    }

    async function size(): Promise<number> {
      return await ioredis.hlen(key);
    }

    return {
      get,
      set,
      setObject,
      setMap,
      getAll,
      remove,
      contains,
      size,
      keys,
      vals,
    };
  }

  /**
   * generate serial numbers
   * @param key
   * @returns
   */
  function serial(key: RedisKey) {
    async function getAll(
      ...elements: (string | number | Buffer)[]
    ): Promise<Record<string, string>> {
      return await ioredis.hgetall(key);
    }

    async function getNum(
      field: string | Buffer,
      count: number
    ): Promise<number> {
      const num = await ioredis.hincrby(key, field, count);
      return num - count + 1;
    }

    async function getOne(field: string | Buffer): Promise<number> {
      const num = await ioredis.hincrby(key, field, 1);
      return num;
    }

    async function getMany(
      field: string | Buffer,
      count: number
    ): Promise<Array<number>> {
      const num = await ioredis.hincrby(key, field, count);

      const s = new Array<number>();
      for (let i = num - count + 1; i <= num; i++) {
        s.push(i);
      }
      return s;
    }

    async function get(field: string | Buffer): Promise<string | null> {
      return await ioredis.hget(key, field);
    }

    async function setObject(obj: object): Promise<number> {
      return await ioredis.hset(key, obj);
    }

    async function setMap(
      map: Map<string | Buffer | number, string | Buffer | number>
    ): Promise<number> {
      return await ioredis.hset(key, map);
    }

    async function remove(...fields: (string | Buffer)[]): Promise<number> {
      return await ioredis.hdel(key, ...fields);
    }

    async function keys(): Promise<string[]> {
      return await ioredis.hkeys(key);
    }

    async function vals(): Promise<string[]> {
      return await ioredis.hvals(key);
    }

    async function contains(field: string | Buffer): Promise<boolean> {
      return (await ioredis.hexists(key, field)) == 1;
    }

    async function size(): Promise<number> {
      return await ioredis.hlen(key);
    }

    return {
      get,
      set,
      setObject,
      setMap,
      getAll,
      remove,
      contains,
      size,
      keys,
      vals,
      getOne,
      getMany,
    };
  }

  const ioredis: IORedis = await createIORedis(cfg);
  return {
    ioredis,
    close,
    cache,
    counter,
    lock,
    throttle,
    bits,
    queue,
    stack,
    set,
    hashSet,
    serial,
  };
}

export type RedisClient = ReturnType<typeof createRedisClient>;
