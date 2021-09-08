import { createLogger, transports } from 'winston';

import { app } from '../config/app';

const logger = createLogger({
    level: app.LOG_LEVEL,
    transports: [
        new transports.Console(),
    ],
});

export default logger;
