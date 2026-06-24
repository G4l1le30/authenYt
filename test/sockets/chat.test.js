const test = require('node:test');
const assert = require('node:assert');
const configureSockets = require('../../sockets/chat');

test('Socket.IO chat configuration tests', async (t) => {
    await t.test('configureSockets - defines middleware and event handlers', () => {
        let middlewareCount = 0;
        let eventHandlers = {};

        const mockIo = {
            use: (fn) => { middlewareCount++; },
            on: (event, fn) => { eventHandlers[event] = fn; }
        };

        configureSockets(mockIo);

        assert.strictEqual(middlewareCount, 1);
        assert.ok(typeof eventHandlers['connection'] === 'function', 'Should define connection handler');
    });
});
