/* eslint-disable @typescript-eslint/no-explicit-any */

import middy from '@middy/core';
import validator from '@middy/validator';
import express, { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { app } from './config/app';

import { handlers } from './modules/vehicles/index';

const router = express.Router();

const endpoints = ['/', '/vehicles/all'];

let response: Response;
router.use((req, res, next) => {
    response = res;

    console.log(req.body);

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
        jwt.verify(token, app.PASSPHRASE);
        next();
    } catch (error) {
        res.status(401).send(res.__('user-401'));
    }
});

const errorHandler = {
    onError: async (request: any) => response.status(500).send(request.errror?.message),
};

const createSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                client: { type: 'string', minLength: 3, maxLength: 250 },
                cellphone: { type: 'string', pattern: '^((\\d{3,4}-\\d{4})|(\\+\\d{3}\\s\\d{3,4}-\\d{4}))$' },
                plates: {
                    type: 'string',
                    minLength: 4,
                    maxLength: 8,
                    pattern: '^[\\d\\w]+$',
                },
                rentFrom: { type: 'string' },
                rentTo: { type: 'string' },
            },
            required: ['client', 'cellphone', 'plates', 'rentFrom', 'rentTo'],
        },
    },
};
const create = middy(handlers.create)
    .use(validator({ inputSchema: createSchema }))
    .use(errorHandler);
router.post('/', create);

const list = middy(handlers.list)
    .use(errorHandler);
router.get('/', list);

const updateSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                client: { type: 'string', minLength: 3, maxLength: 250 },
                cellphone: { type: 'string', pattern: '^((\\d{3,4}-\\d{4})|(\\+\\d{3}\\s\\d{3,4}-\\d{4}))$' },
                plates: { type: 'string', minLength: 4, maxLength: 8 },
                rentFrom: { type: 'string' },
                rentTo: { type: 'string' },
                status: { type: 'string', pattern: '[1-4]' },
            },
            required: ['client', 'plates'],
        },
    },
};
const update = middy(handlers.update)
    .use(validator({ inputSchema: updateSchema }))
    .use(errorHandler);
router.put('/', update);

const updateAllSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                status: { type: 'string', pattern: '[1-4]' },
            },
            required: ['status'],
        },
    },
};
const updateAll = middy(handlers.updateAll)
    .use(validator({ inputSchema: updateAllSchema }))
    .use(errorHandler);
router.put('/all', updateAll);

const hDelete = middy(handlers.delete)
    .use(errorHandler);
router.delete('/:client/:plate', hDelete);

const deleteAll = middy(handlers.deleteAll)
    .use(errorHandler);
router.delete('/all', deleteAll);

export default router;
