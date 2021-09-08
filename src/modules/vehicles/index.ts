/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as jwt from 'jsonwebtoken';
import moment from 'moment';

import logger from '../../utils/logger';
import redis from '../../utils/redis';

import { app } from '../../config/app';

const TAG = 'Vehicle';

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

interface Vehicle {
    id?: number;
    client: string;
    cellphone: string;
    plates: string;
    rentFrom: string;
    rentTo: string;
    status: string;
    user: string;
    fecCre: string;
    fecMod ?: string;
}

interface Response {
    data?: any;
    message: string;
    error?: string;
}

/**
 * VEHICLES STATUS
 * 1 Reservado
 * 2 Cancelado
 * 3 Retirado
 * 4 Entregado
 */

const checkPlates = async (data: any): Promise<boolean> => {
    logger.info(`[${TAG}.CheckPlates]`);

    let platesDate = await redis.get('plates_dates');
    if (!platesDate) {
        platesDate = {};
        await redis.set('plates_dates', platesDate);
    }

    if (!platesDate[data.plates]) return true;

    const dates = platesDate[data.plates];

    const newFrom = moment(data.from);
    const newTo = moment(data.to);
    for (let i = 0; i < dates.length; ++i) {
        const date = dates[i];

        const from = moment(date.from);
        const to = moment(date.to);

        if (newFrom.isBetween(from, to, undefined, '[]')) return false;

        if (newTo.isBetween(from, to, undefined, '[]')) return false;
    }

    return true;
};

export const handlers = {
    create: async (req: any, res: any) => {
        logger.info(`[${TAG}] create handler!`);

        let vehicles = await redis.get('vehicles');
        if (!vehicles) vehicles = {};

        const { headers, body } = req;

        // check if plates is not unique in this date
        const valid = await checkPlates({
            plates: body.plates,
            from: body.rentFrom,
            to: body.rentTo,
        });

        let result: Response;
        if (!valid) {
            result = { message: res.__('vehicle-create-400'), error: '' };
            res.status(400).send(result);
            return;
        }

        let status = 200;
        try {
            let count = await redis.get('vehicles_count');
            if (!count) count = 0;

            ++count;

            const { authorization } = headers;

            const token = authorization?.split(' ')[1];
            const decoded: any = jwt.verify(token, app.PASSPHRASE);
            const user: User = decoded.data;

            const data: Vehicle = { ...body };
            data.user = user.email;
            data.fecCre = moment().format('YYYY-MM-DD');
            data.status = '1'; // Reservado

            vehicles[`${body.client}-${body.plates}`] = data;

            await redis.set('vehicles', vehicles);
            await redis.set('vehicles_count', count);

            const platesDate = await redis.get('plates_dates');
            let dates = platesDate[data.plates];
            if (!dates) dates = [];

            dates.push({ from: data.rentFrom, to: data.rentTo });
            platesDate[data.plates] = dates;

            await redis.set('plates_dates', platesDate);

            result = { data, message: res.__('vehicle-200') };
        } catch (error) {
            logger.error(`[${TAG}].create ${JSON.stringify(error)}`);

            status = 500;
            result = { message: res.__('vehicle-create-500'), error: JSON.stringify(error) };
        }

        res.status(status).send(result);
    },
    list: async (req: any, res: any) => {
        logger.info(`[${TAG}] list handler!`);

        let vehicles = await redis.get('vehicles');
        if (!vehicles) vehicles = {};

        logger.info(`[${TAG}] ${JSON.stringify(vehicles)}}`);

        const data: Vehicle[] = [];
        Object.keys(vehicles).forEach((vehicle) => data.push(vehicles[vehicle]));
        const result: Response = { data: { total: data.length, vehicles: data }, message: 'ok' };

        res.status(200).send(result);
    },
    update: async (req: any, res: any) => {
        logger.info(`[${TAG}] update handler!`);

        const { headers, body } = req;
        let result: Response;

        const vehicles = await redis.get('vehicles');
        const id = `${body.client}-${body.plates}`;

        if (!vehicles || !vehicles[id]) {
            result = { message: res.__('vehicle-404'), error: '' };
            res.status(404).send(result);
            return;
        }

        let vehicle: Vehicle = vehicles[id];
        let valid = true;
        if (
            vehicle.plates !== body.plates
            || vehicle.rentFrom !== body.rentFrom
            || vehicle.rentTo !== body.rentTo
        ) {
            valid = await checkPlates({
                plates: body.plates,
                from: body.rentFrom,
                to: body.rentTo,
            });
        }

        if (!valid) {
            result = { message: res.__('vehicle-update-400'), error: '' };
            res.status(400).send(result);
            return;
        }

        // revisar si los status
        if (vehicle.status === '2' || vehicle.status === '4') {
            const { status } = body;
            if (status !== '2' || status !== '4') {
                result = { message: res.__('vehicle-update-400'), error: res.__('vehicle-status-block') };
                res.status(400).send(result);
                return;
            }
        } else if (vehicle.status === '3') {
            const { status } = body;
            if (status !== '4') {
                result = { message: res.__('vehicle-update-400'), error: res.__('vehicle-status-invalid') };
                res.status(400).send(result);
                return;
            }
        }

        /** UPDATING PLATES_DATE INFO */

        const platesDate = await redis.get('plates_dates');
        const mFrom = moment(vehicle.rentFrom);
        const mTo = moment(vehicle.rentTo);

        let dates = platesDate[vehicle.plates];

        const nDates = [];
        for (let i = 0; i < dates.length; ++i) {
            const date = dates[i];

            const from = moment(date.from);
            const to = moment(date.to);
            if (from === mFrom && to === mTo) {
                continue;
            }

            nDates.push(date);
        }
        platesDate[vehicle.plates] = nDates;

        dates = platesDate[body.plates];
        if (!dates) dates = [];

        dates.push({ from: body.rentFrom, to: body.rentTo });
        platesDate[body.plates] = dates;

        /** END OF UPDATE FOR PLATES_DATE INFO */

        const { authorization } = headers;

        const token = authorization?.split(' ')[1];
        const decoded: any = jwt.verify(token, app.PASSPHRASE);
        const user: User = decoded.data;

        vehicle = Object.assign(vehicle, body);
        vehicle.fecMod = moment().format('YYYY-MM-DD');
        vehicle.user = user.email;

        vehicles[vehicle.client] = vehicle;

        await redis.set('vehicles', vehicles);
        await redis.set('plates_date', platesDate);

        result = { data: vehicle, message: res.__('vehicle-200') };
        res.status(200).send(result);
    },
    updateAll: async (req: any, res: any) => {
        logger.info(`[${TAG}] updateAll handler`);

        const { body } = req;

        let vehicles = await redis.get('vehicles');
        if (!vehicles) vehicles = {};

        const data: Vehicle[] = [];
        Object.keys(vehicles).forEach((key) => {
            const vehicle: Vehicle = vehicles[key];

            if (vehicle.status === '1') {
                vehicle.status = body.status;
            } else if (vehicle.status === '3' && body.status === '4') {
                vehicle.status = '4';
            }

            vehicles[key] = vehicle;
            data.push(vehicle);
        });

        await redis.set('vehicles', vehicles);

        res.status(200).send({ data, messge: res.__('vehicle-200') });
    },
    delete: async (req: any, res: any) => {
        logger.info(`[${TAG}] delete handler!`);

        const { params } = req;
        let result: Response;

        const vehicles = await redis.get('vehicles');
        const count = await redis.get('vehicles_count');
        const id = `${params.client}-${params.plate}`;

        if (!vehicles || !vehicles[id]) {
            result = { message: res.__('vehicle-404'), error: '' };
            res.status(404).send(result);
            return;
        }

        const vehicle = vehicles[id];
        const platesDates = await redis.get('plates_dates');
        const dates = platesDates[vehicle.plates];

        const mFrom = moment(vehicle.rentFrom);
        const mTo = moment(vehicle.rentTo);

        const nDates = [];
        for (let i = 0; i < dates.length; ++i) {
            const date = dates[i];

            const from = moment(date.from);
            const to = moment(date.to);
            if (from === mFrom && to === mTo) {
                continue;
            }

            nDates.push(date);
        }

        platesDates[vehicle.plates] = nDates;
        await redis.set('plates_dates', platesDates);

        delete vehicles[id];
        await redis.set('vehicles', vehicles);
        await redis.set('vehicles_count', count - 1);

        res.status(200).send({ data: [], message: res.__('vehicles-200') });
    },
    deleteAll: async (req: any, res: any) => {
        logger.info(`[${TAG}] delete All handler`);

        await redis.set('vehicles', {});
        await redis.set('plates_dates', {});
        await redis.set('vehicles_count', 0);

        res.status(200).send({ data: [], message: res.__('vehicles-200') });
    },
};
