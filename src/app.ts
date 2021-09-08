import cors from 'cors';
import express from 'express';
import { I18n } from 'i18n';
import moment from 'moment';
import morgan from 'morgan';
import path from 'path';
import users from './user.routes';
import logger from './utils/logger';
import redis from './utils/redis';
import vehicles from './vehicles.routes';

redis.start();
// redis.client.flushall();

const i18n = new I18n();
i18n.configure({
    locales: ['en', 'es'],
    directory: path.join(__dirname, 'locales'),
});

const app = express();

app.disable('x-powered-by');

app.use(cors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    origin: '*',
}));
app.use(i18n.init);
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(morgan('combined'));

app.get('/', (req, res) => res.status(200).send(res.__('welcome')));
app.use('/users', users);
app.use('/vehicles', vehicles);

redis.get('users').then(async (data) => {
    if (!data) {
        const rootUser = {
            id: 0,
            email: 'root@zinli.com',
            name: 'root',
            lastname: '',
            cellphone: '+123 1234-1234',
            address: 'Zinli root headquartes',
            birthdate: moment().format('YYYY-MM-DD'),
            role: '0000',
            valid: true,
        };

        await redis.set('users', { 'root@zinli.com': rootUser });
    }

    app.listen(9021, () => {
        logger.info('The application is listening on port 9021!');
    });
});

export default app;
