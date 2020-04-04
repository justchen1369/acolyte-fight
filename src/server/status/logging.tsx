import * as winston from 'winston';
import * as Transport from 'winston-transport';

const GoogleCloudLogging = require('@google-cloud/logging-winston').LoggingWinston;

let transports: Array<Transport> = [
	new winston.transports.Console(),
	new winston.transports.File({ filename: 'logs/server.log' }),
	new GoogleCloudLogging(),
];

export const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		winston.format.printf(info => `${info.timestamp} - ${info.message}`),
	),
	transports,
});