const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;

// MIME types lookup
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    // Parse URL path
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Resolve absolute path to prevent directory traversal
    const absolutePath = path.resolve(filePath);
    const workspacePath = path.resolve('.');

    if (!absolutePath.startsWith(workspacePath)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    const extname = String(path.extname(absolutePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(absolutePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File Not Found');
            } else {
                res.writeHead(500);
                res.end(`Internal Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', '==================================================');
    console.log('\x1b[32m%s\x1b[0m', '   🛡️  WHISPERMASK LOCAL DEMO SERVER ACTIVE  🛡️');
    console.log('\x1b[36m%s\x1b[0m', '==================================================');
    console.log(`Local Access: \x1b[33mhttp://localhost:${PORT}\x1b[0m`);
    
    // Get local network IP addresses
    const interfaces = os.networkInterfaces();
    let networkFound = false;
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`Network Access: \x1b[33mhttp://${net.address}:${PORT}\x1b[0m`);
                networkFound = true;
            }
        }
    }
    
    if (!networkFound) {
        console.log('\x1b[90m%s\x1b[0m', 'No active local network interface detected. Connect to Wi-Fi for phone testing.');
    }
    console.log('\x1b[36m%s\x1b[0m', '==================================================');
    console.log('Press \x1b[31mCtrl+C\x1b[0m to terminate server.\n');
});
