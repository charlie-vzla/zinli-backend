# zinli-backend

Servicio nodejs para la app de prueba zinli-webapp.

## Development

```sh
# Run redis service
mkdir zinli-data
docker run --name zinli-redis -v "$PWD"/zinli-data:/data -d redis:6.2.5-alpine redis-server --appendonly yes

# Donwload repo
git clone https://github.com/charlie-vzla/zinli-backend.git

cd zinli-backend

# Run docker image
docker run -dit --name zinli-api \
    -p 9021:9021 \
    -v ${PWD}:/home/node \
    -w /home/node \
    -u $(id -u ${USER}):$(id -g ${USER}) \
    --link zinli-redis:redis \
    node:lts-alpine

 # Run docker execute to access the basic tools
 docker exec -it zinli-api sh
```

## Run
```bash
 # Installing dependecies
 npm install

 # Running
 npm start
```

> It is recommended that your service has a certificate to run over https. However, if you do not have it, the service will run over http.
> If we have a certificate we just need to associate a server with the express instance. This can be done with https.createServer function, this will return a server instance that we can set to listen.

After running ```npm start``` the app should be listening in the port ```9021```, this can be changed in the app config
