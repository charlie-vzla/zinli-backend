import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import express, { Response } from 'express';

const app = express();

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

let response: Response;

// This is your common handler, in no way different than what you are used to doing every day in AWS Lambda
const baseHandler = async (req: any, res: any) => {
    const { name, lastname, email } = req.body;
    // const response = { result: 'success', message: 'payment processed correctly'}
    // console.log(JSON.stringify(req));
    res.send(`${name} ${lastname} ${email}`);
};

const inputSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                lastname: { type: 'string' },
                email: { type: 'string' },
            },
            required: ['email'], // Insert here all required event properties
        },
    },
};

// Let's "middyfy" our handler, then we will be able to attach middlewares to it
const handler = middy(baseHandler)
    .use({
        before: async (request) => {
            response = request.context;
        },
    })
    .use(jsonBodyParser()) // parses the request body when it's a JSON and converts it to an object
    .use(validator({ inputSchema })) // validates the input
    .use({
        onError: async (request) => response.status(500).send(request.error?.message),
    });

/* handler.onError(async (request) => {
    response.status(500).send(request.error?.message);
}); */

app.get('/', (req, res) => {
    res.send('Hellow World');
});

app.post('/user', handler);

app.listen(9021, () => {
    console.log('The application is listening on port 9021!');
});
