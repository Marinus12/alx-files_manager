import { createClient } from 'redis';

class RedisClient {
    constructor() {
        this.client = createClient();

        this.client.on('error', (error) => {
            console.error('Redis client error:', error);
        });
    }

    isAlive() {
        return this.client.connected;
    }

    async get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, reply) => {
                if (err) return reject(err);
                resolve(reply);
            });
        });
    }

    async set(key, value, duration) {
        console.log(`Setting key: ${key}, value: ${value}, duration: ${duration}`);
        return new Promise((resolve, reject) => {
            if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
                return reject(new Error('Invalid duration'));
            }

            this.client.set(key, value, 'EX', duration, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    async del(key) {
        return new Promise((resolve, reject) => {
            this.client.del(key, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }
}

const redisClient = new RedisClient();
export default redisClient;
