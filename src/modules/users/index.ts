/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import logger from '../../utils/logger';
import redis from '../../utils/redis';
import { app } from '../../config/app';

const TAG = 'USER';

let account: nodemailer.TestAccount;
const createAccount = async () => {
    logger.info('[USER] Creating account for mailing!');
    account = await nodemailer.createTestAccount();
};

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
const createTransport = async () => {
    logger.info('[USER] Creating transport for sending mail!');
    // create reusable transporter object using the default SMTP transport
    transporter = await nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: account.user, // generated ethereal user
            pass: account.pass, // generated ethereal password
        },
    });
};

interface User {
    id: number;
    email: string;
    name: string;
    lastname: string;
    cellphone: string;
    address: string;
    birthdate: string;
    role: string;
    valid: boolean;
    token ?: string;
}

interface Response {
    data?: any;
    message: string;
    error?: string;
}

export const handlers = {
    create: async (req: any, res: any): Promise<void> => {
        logger.info(`[${TAG}] create handler!`);

        if (!account) {
            await createAccount();
            await createTransport();
        }

        const { body } = req;
        let users = await redis.get('users');
        if (!users) users = {};

        if (users[body.email]) {
            res.status(400).send({ message: res.__('user-create-400'), error: '' });
            return;
        }

        logger.debug(`[${TAG}] users doesnt exists, procede to create!`);

        const data = { ...body };
        delete data.email;
        data.valid = true;

        let status = 200;
        let result: Response;

        try {
            logger.debug(`[${TAG}] sending mail!`);
            const info = await transporter.sendMail({
                from: '"Fred Foo 👻" <foo@example.com>', // sender address
                to: 'carlos.abreu@sigis.com.ve, shunwar500@gmail.com', // list of receivers
                subject: 'Hello ✔', // Subject line
                text: 'Hello world?', // plain text body
                html: '<b>Hello world?</b>', // html body
            });
            logger.debug(`[${TAG}] mail sent!`);

            // Preview only available when sending through an Ethereal account
            // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

            let count = await redis.get('users_count');
            if (!count) count = 0;

            ++count;

            users[body.email] = data;
            users[body.email].id = count;
            data.email = body.email;

            await redis.set('users', users);
            await redis.set('users_count', count);

            data.preview = nodemailer.getTestMessageUrl(info);
            result = { data, message: res.__('user-create-200') };
        } catch (error) {
            logger.error(`[${TAG}].create ${JSON.stringify(error)}`);

            status = 500;
            result = { message: res.__('user-create-500'), error: JSON.stringify(error) };
        }

        res.status(status).send(result);
    },
    login: async (req: any, res:any): Promise<void> => {
        logger.info(`[${TAG}] login handler!`);

        const { body } = req;
        let result: Response;

        const users = await redis.get('users');
        if (!users || !users[body.email]) {
            result = { message: res.__('user-404'), error: '' };
            res.status(404).send(result);
            return;
        }

        const user: User = users[body.email];
        if (!user.valid) {
            result = { message: res.__('user-400'), error: '' };
            res.status(400).send(result);
            return;
        }

        const token = jwt.sign({
            data: user,
        }, app.PASSPHRASE, { expiresIn: '24h' });

        user.token = token;
        result = { data: user, message: res.__('user-200') };

        res.status(200).send(result);
    },
    list: async (req: any, res: any): Promise<void> => {
        logger.info(`[${TAG} list handler!]`);

        let users = await redis.get('users');
        if (!users) users = {};

        const data: User[] = [];
        Object.keys(users).forEach((user) => {
            if (users[user].id !== 0) {
                data.push(users[user]);
            }
        });

        const result: Response = { data: { total: data.length, users: data }, message: 'ok' };

        res.status(200).send(result);
    },
    update: async (req: any, res: any): Promise<void> => {
        logger.info(`[${TAG}] update handler!`);

        const { body } = req;
        let result: Response;

        const users = await redis.get('users');
        if (!users || !users[body.email]) {
            result = { message: res.__('user-update-404'), error: '' };
            res.status(404).send(result);
            return;
        }

        let user: User = users[body.email];
        user = Object.assign(user, body);

        users[body.email] = user;
        await redis.set('users', users);

        result = { data: user, message: res.__('user-200') };
        res.status(200).send(result);
    },
    delete: async (req: any, res: any): Promise<void> => {
        logger.info(`[${TAG}] delete handler!`);

        const { params } = req;
        let result: Response;

        const users = await redis.get('users');
        if (!users || !users[params.email]) {
            result = { message: res.__('user-update-404'), error: '' };
            res.status(404).send(result);
            return;
        }

        const count = await redis.get('users_count');

        const user: User = users[params.email];
        delete users[params.email];

        await redis.set('users', users);
        await redis.set('users_count', count - 1);

        result = { data: user, message: res.__('user-200') };
        res.status(200).send(result);
    },
    deleteAll: async (req: any, res: any): Promise<void> => {
        logger.info(`[${TAG}] deleteAll handler!`);

        await redis.set('users', {});
        await redis.set('users_count', 0);

        res.status(200).send({ message: res.__('user-200') });
    },
};
