/* eslint-disable @typescript-eslint/no-explicit-any */
import middy from '@middy/core';
import validator from '@middy/validator';
import express, { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { app } from './config/app';
import { handlers } from './modules/users/index';

const router = express.Router();

const endpoints = ['/', '/user', '/user/all'];

let response: Response;
router.use((req, res, next) => {
    response = res;

    const { path } = req;
    if (!endpoints.includes(path)) {
        next();
        return;
    }

    const { headers } = req;
    const { authorization } = headers;

    let token = authorization?.split(' ')[1];
    if (!token) token = '';

    try {
        const decoded: any = jwt.verify(token, app.PASSPHRASE);
        const user = decoded.data;

        if (user.role !== '0000' && user.role !== '1000') throw new Error();

        next();
    } catch (error) {
        res.status(401).send(res.__('user-401'));
    }
});

const errorHandler = {
    onError: async (request: any) => response.status(500).send(request.error?.message),
};

const createSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                email: { type: 'string', minLength: 3, maxLength: 150 },
                name: { type: 'string', minLength: 3, maxLength: 100 },
                lastname: { type: 'string', minLength: 3, maxLength: 100 },
                cellphone: { type: 'string', pattern: '^((\\d{3,4}-\\d{4})|(\\+\\d{3}\\s\\d{3,4}-\\d{4}))$' },
                address: { type: 'string', minLength: 3, maxLength: 250 },
                birthdate: { type: 'string' },
                role: { type: 'string' },
            },
            required: ['email', 'name', 'lastname', 'cellphone', 'address', 'birthdate', 'role'],
        },
    },
};
const create = middy(handlers.create)
    .use(validator({ inputSchema: createSchema }))
    .use(errorHandler);
router.post('/', create);

const loginSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                email: { type: 'string', minLength: 3, maxLength: 150 },
            },
            required: ['email'],
        },
    },
};
const login = middy(handlers.login)
    .use(validator({ inputSchema: loginSchema }))
    .use(errorHandler);
router.post('/login', login);

const list = middy(handlers.list)
    .use(errorHandler);
router.get('/', list);

const updateSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                email: { type: 'string', minLength: 3, maxLength: 150 },
                name: { type: 'string', minLength: 3, maxLength: 100 },
                lastname: { type: 'string', minLength: 3, maxLength: 100 },
                cellphone: { type: 'string', pattern: '^((\\d{3,4}-\\d{4})|(\\+\\d{3}\\s\\d{3,4}-\\d{4}))$' },
                address: { type: 'string', minLength: 3, maxLength: 250 },
                birthdate: { type: 'string' },
                role: { type: 'string' },
            },
            required: ['email'],
        },
    },
};
const update = middy(handlers.update)
    .use(validator({ inputSchema: updateSchema }))
    .use(errorHandler);
router.put('/', update);

const deleteRoute = middy(handlers.delete)
    .use(errorHandler);
router.delete('/:email', deleteRoute);

const deleteAll = middy(handlers.deleteAll)
    .use(errorHandler);
router.delete('/all', deleteAll);

export default router;
