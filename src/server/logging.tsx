import * as winston from 'winston';

export const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		winston.format.printf(info => `${info.timestamp} - ${info.message}`),
	),
	transports: [
		new winston.transports.File({ filename: 'logs/server.log' }),
		new winston.transports.Console(),
	],
});
