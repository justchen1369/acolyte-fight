import { attachToSocket } from './connector';
import { logger } from './logging';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const program = require('commander');
program.option('--port <port>', 'Port number');
program.parse(process.argv);

const port = program.port || process.env.PORT || 7770;

app.use(express.static('./'));
attachToSocket(io);
http.listen(port, function() {
	logger.info("Started listening on port " + port);
});
