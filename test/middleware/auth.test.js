const test = require('node:test');
const assert = require('node:assert');
const { isLoggedIn, getUser, ensureAuth } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const pool = require('../../db');

test('Auth Middleware Tests', async (t) => {
    // Simpan implementasi asli untuk di-restore nanti
    const originalVerify = jwt.verify;
    const originalQuery = pool.query;

    t.afterEach(() => {
        jwt.verify = originalVerify;
        pool.query = originalQuery;
    });

    await t.test('isLoggedIn - redirects to /login if no token', async () => {
        const req = { cookies: {} };
        const res = { redirect: (url) => res.redirectUrl = url };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        await isLoggedIn(req, res, next);

        assert.strictEqual(res.redirectUrl, '/login');
        assert.strictEqual(nextCalled, false);
    });

    await t.test('isLoggedIn - calls next() and sets req.user on success', async () => {
        const req = { cookies: { jwt: 'valid_token' } };
        const res = { redirect: () => {} };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        jwt.verify = () => ({ id: 1 });
        pool.query = async () => [[{ id: 1, name: 'Test User' }]];

        await isLoggedIn(req, res, next);

        assert.strictEqual(nextCalled, true);
        assert.deepStrictEqual(req.user, { id: 1, name: 'Test User' });
    });

    await t.test('getUser - sets res.locals.user to null if token is "logout"', async () => {
        const req = { cookies: { jwt: 'logout' } };
        const res = { locals: {} };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        await getUser(req, res, next);

        assert.strictEqual(nextCalled, true);
        assert.strictEqual(res.locals.user, null);
    });

    await t.test('getUser - catches jwt verify error and sets user to null', async () => {
        const req = { cookies: { jwt: 'expired_token' } };
        const res = { locals: {} };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        jwt.verify = () => { throw new Error('jwt expired'); };

        await getUser(req, res, next);

        assert.strictEqual(nextCalled, true);
        assert.strictEqual(res.locals.user, null);
    });
});
