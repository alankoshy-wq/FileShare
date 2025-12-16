import net from 'net';
const port = 3000;
const client = new net.Socket();
console.log(`Checking if port ${port} is open...`);
client.connect(port, '127.0.0.1', () => {
    console.log(`✅ Port ${port} is OPEN (Server is running)`);
    client.destroy();
});
client.on('error', (err) => {
    console.error(`❌ Port ${port} is CLOSED (Server is NOT running)`);
    console.error(`Error: ${err.message}`);
    client.destroy();
});
