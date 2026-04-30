// simulate.js - 50 concurrent users simulation

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Config
const SERVER_URL   = 'ws://localhost:3000';
const ROOM_NAME    = 'global';
const ROOM_CODE    = '123';
const NUM_USERS    = 50;
const DURATION_MS  = 30_000;          // 30 sec
const MIN_DELAY_MS = 300;             // min ms between messages per user
const MAX_DELAY_MS = 2_500;           // max ms between messages per user

const MESSAGES = [
    'Hi everyone!',
    'What\'s up?',
    'This is cool',
    'Hello there',
    'Good morning guys',
    'Testing...',
    'Can anyone hear me?',
    'I\'m here',
    'Sending messages...',
    'LOL',
    'It\'s me',
    'still here!',
    '50 users in this room',
];


function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let totalSent = 0;

// Single simulated user 
// index represents which number of user (0-50)
function runUser(index) {
    const username = `User_${index}`; // Create username
    const ws = new WebSocket(SERVER_URL);
    let joined = false;
    let timer  = null;

    ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'set_username', username }));
    });

    // Called when message sent from the server
    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);

        // Join the room after set username
        if (msg.type === 'username_set') {
            ws.send(JSON.stringify({ type: 'join_room', room: ROOM_NAME, code: ROOM_CODE }));
        }

        // Start sending messages after join the room
        if (msg.type === 'room_joined') {
            joined = true;
            sendNextMessage();
        }
    });

    ws.on('error', () => {}); // Accept error

    // send message in random duration(300 - 2500 ms) to avoid sequential order
    function sendNextMessage() {
        timer = setTimeout(function() {
            // Check the connection and send a message
            if (ws.readyState === WebSocket.OPEN) {
                const content = MESSAGES[rand(0, MESSAGES.length - 1)];
                ws.send(JSON.stringify({ type: 'chat_message', content }));
                totalSent++;
                process.stdout.write(`\rTotal Sent: ${totalSent}`);
            }
            sendNextMessage(); 
        }, rand(MIN_DELAY_MS, MAX_DELAY_MS));
    }

    // 30秒後にこのユーザーを終了させる関数を返す
    return function shutdown() {
        if (timer) clearTimeout(timer); // Cancel if timer is not null
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'leave_room' }));
            ws.close();
        }
    };
}



console.log(`\n Simulation start with ${NUM_USERS} users（${DURATION_MS / 1000} seconds）\n`);

// Launch 50 users concurrently and collect each shutdowns function
const shutdowns = [];
for (let i = 1; i <= NUM_USERS; i++) {
    shutdowns.push(runUser(i));
}

// Finish process after the duration(30 sec)
setTimeout(function() {
    console.log('\n\nFinishing...');

    for (const shutdown of shutdowns) shutdown();

    process.exit(0);
}, DURATION_MS);