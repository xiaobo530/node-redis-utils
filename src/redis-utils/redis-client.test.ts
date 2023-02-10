import { describe, test, expect } from "@jest/globals";
import { createRedisClient, RedisClient } from "./redis-client";

describe("Redis Client", () => {
  let client: RedisClient;

  test("create redis client", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();
    await client.close();
  });

  test("get/set a string by keyPrefix: app", async () => {
    const client = await createRedisClient({
      url: "redis://127.0.0.1:6379/0",
      keyPrefix: "app:",
    });
    expect(client.ioredis).not.toBeNull();

    const key = "test:string";
    const value = "1234567890";
    await client.ioredis.set(key, value);
    const getvalue = await client.ioredis.get(key);
    expect(getvalue).toEqual(value);

    await client.close();
  });

  test("get/set a string", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:string";
    const value = "1234567890";

    await client.ioredis.set(key, value);
    const getvalue = await client.ioredis.get(key);
    expect(getvalue).toEqual(value);

    await client.close();
  });

  test("using counter helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:counter";
    const value = 99;

    const counter = await client.counter(key, value);
    let getvalue = await counter.get();
    expect(getvalue).toEqual(value);

    await counter.incr();
    getvalue = await counter.get();
    expect(getvalue).toEqual(100);

    await counter.incr(20);
    getvalue = await counter.get();
    expect(getvalue).toEqual(120);

    await counter.decr(33);
    getvalue = await counter.get();
    expect(getvalue).toEqual(120 - 33);

    await client.close();
  });

  test("using bits helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:bits";
    await client.ioredis.del(key);

    const bits = await client.bits(key);
    await bits.set(100);

    let count = await bits.count();
    expect(count).toEqual(1);

    let bit = await bits.get(100);
    expect(bit).toEqual(1);

    await bits.unset(100);
    count = await bits.count();
    expect(count).toEqual(0);

    await bits.set(77, 88, 99);
    count = await bits.count();
    expect(count).toEqual(3);

    bit = await bits.get(88);
    expect(bit).toEqual(1);

    await client.close();
  });

  test("using string helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:string";
    const value = "1234567890";
    const redisString = client.string(key);

    await redisString.set(value);

    const getvalue = await redisString.get();

    expect(getvalue).toEqual(value);

    await client.close();
  });

  test("using queue helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:queue";
    await client.ioredis.del(key);

    const queue = client.queue(key);
    await queue.push(1, 2, 3);
    let size = await queue.size();
    expect(size).toEqual(3);
    const pop = await queue.pop();
    size = await queue.size();
    expect(size).toEqual(2);
    expect(pop).toEqual("1");

    await client.close();
  });

  test("using stack helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:stack";
    await client.ioredis.del(key);

    const stack = client.stack(key);
    await stack.push(1, 2, 3);
    let size = await stack.size();
    expect(size).toEqual(3);
    const pop = await stack.pop();
    size = await stack.size();
    expect(size).toEqual(2);
    expect(pop).toEqual("3");

    await client.close();
  });

  test("using set helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:set";
    await client.ioredis.del(key);

    const set = client.set(key);
    await set.add(1, 2, 3, 4, 5);
    let size = await set.size();
    expect(size).toEqual(5);

    const all = await set.getAll();
    expect(all).toEqual(["1", "2", "3", "4", "5"]);

    await set.remove(3);
    size = await set.size();
    expect(size).toEqual(4);

    const exist = await set.contains(4);
    expect(exist).toBeTruthy();

    const pop = await set.pop();
    size = await set.size();
    expect(size).toEqual(3);

    await client.close();
  });

  test("using hashset helper", async () => {
    const client = await createRedisClient({ url: "redis://127.0.0.1:6379/0" });
    expect(client.ioredis).not.toBeNull();

    const key = "test:hashset";
    await client.ioredis.del(key);

    const obj = {
      name: "andy",
      age: 18,
      city: "shanghai",
      country: "china",
      zip: 200000,
      address: "上海市松江区广富林路568号松江万达",
    };
    const hashset = client.hashSet(key);
    await hashset.setObject(obj);
    let size = await hashset.size();
    expect(size).toEqual(6);

    const all = await hashset.getAll();
    expect(all).toHaveProperty("city");

    const exist = await hashset.contains("address");
    expect(exist).toBeTruthy();

    const keys = await hashset.keys();
    expect(keys.length).toBe(6);
    expect(keys).toContain("country");

    await client.close();
  });
});
