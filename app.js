"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const core_1 = __importDefault(require("@middy/core"));
const http_json_body_parser_1 = __importDefault(require("@middy/http-json-body-parser"));
const validator_1 = __importDefault(require("@middy/validator"));
const app = (0, express_1.default)();
app.use(express_1.default.json()); // for parsing application/json
app.use(express_1.default.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
let response;
// This is your common handler, in no way different than what you are used to doing every day in AWS Lambda
const baseHandler = async (req, res) => {
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
            required: ['email'] // Insert here all required event properties
        }
    }
};
// Let's "middyfy" our handler, then we will be able to attach middlewares to it
const handler = (0, core_1.default)(baseHandler)
    .use({
    before: async (request) => {
        response = request.context;
    }
})
    .use((0, http_json_body_parser_1.default)()) // parses the request body when it's a JSON and converts it to an object
    .use((0, validator_1.default)({ inputSchema })) // validates the input
    .use({
    onError: async (request) => {
        // console.log(request.error?.message);
        return response.status(500).send(request.error?.message);
    }
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
