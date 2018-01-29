require('dotenv').config();
const fs = require('fs');
const http = require('http');
const app = require('./app');

// http server
const httpServer = http.createServer(app);
const httpPort = process.env.HTTP_PORT || 3000;
httpServer.listen(httpPort);
console.log(`http server listening on port ${httpPort}`);
