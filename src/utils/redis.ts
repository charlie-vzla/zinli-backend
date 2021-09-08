/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import redis from 'redis';
import { promisify } from 'util';
import logger from './logger';

const TAG = 'REDIS';

logger.info('[REDIS] creating client!');
const client = redis.createClient({
    host: 'redis',
});

client.on('ready', () => {
    logger.info('[REDIS] connection ready!');
});

client.on('error', (error) => {
    logger.error(`[REDIS] ${error}}`);
});

const get = promisify(client.get).bind(client);
const set = promisify(client.set).bind(client);

export default {
    start: (): void => {
        logger.info('[REDIS] starting connection!');
    },
    get: async (key: string): Promise<any> => {
        logger.info(`[${TAG}] get ${key}!`);

        let result = null;
        try {
            result = await get(key);
            if (result) {
                result = JSON.parse(result);
            }
        } catch (error) {
            logger.error(`[${TAG}].get ${JSON.stringify(error)}`);
        }

        return result;
    },
    set: async (key: string, value: any): Promise<any> => {
        logger.info(`[${TAG}] set ${key}!`);
        await set(key, JSON.stringify(value));
    },
    client,
};
