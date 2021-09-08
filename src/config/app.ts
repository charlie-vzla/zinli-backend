import path from 'path';

export const app = {
    /**
      * Varibale que contiene la ruta base de la aplicacion
      *
      * @var APP_BASE
      * @type String
      */
    API_LOCATION: path.join(__dirname, '../'),
    /**
      * Propiedad que describe el puerto sobre el cual correra la app
      * @property API_PORT {Number}
      */
    API_PORT: 9021,
    /**
      * Log level <https://github.com/pimterry/loglevel>
      * @property LOG_LEVEL
      */
    LOG_LEVEL: 'debug',

    PASSPHRASE: 'ZiNlIsEcReT',
};
