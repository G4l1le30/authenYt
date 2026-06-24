const test = require('node:test');
const assert = require('node:assert');
const authController = require('../../controllers/auth');
const pool = require('../../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

test('Auth Controller Tests', async (t) => {
    const originalQuery = pool.query;
    const originalCompare = bcrypt.compare;
    const originalSign = jwt.sign;

    t.afterEach(() => {
        pool.query = originalQuery;
        bcrypt.compare = originalCompare;
        jwt.sign = originalSign;
    });

    await t.test('login - fails if email or password is not provided', async () => {
        const req = { body: { email: '', password: '' } };
        const res = { 
            render: (view, data) => { res.view = view; res.data = data; }
        };

        await authController.login(req, res);

        assert.strictEqual(res.view, 'login');
        assert.strictEqual(res.data.message.type, 'danger');
        assert.match(res.data.message.text, /provide an email and password/);
    });

    await t.test('login - successful login sets cookie and redirects', async () => {
        const req = { body: { email: 'test@demo.test', password: 'password123' } };
        const res = { 
            cookie: (name, val, opts) => { res.cookieName = name; res.cookieVal = val; },
            redirect: (url) => { res.redirectUrl = url; }
        };

        pool.query = async () => [[{ id: 1, email: 'test@demo.test', password: 'hashed' }]];
        bcrypt.compare = async () => true;
        jwt.sign = () => 'fake_jwt_token';
        process.env.JWT_SECRET = 'secret';
        process.env.JWT_EXPIRES_IN = '1h';
        process.env.JWT_COOKIE_EXPIRES = '1';

        await authController.login(req, res);

        assert.strictEqual(res.cookieName, 'jwt');
        assert.strictEqual(res.cookieVal, 'fake_jwt_token');
        assert.strictEqual(res.redirectUrl, '/dashboard');
    });

    await t.test('logout - sets cookie to logout and redirects to /', async () => {
        const req = {};
        const res = { 
            cookie: (name, val, opts) => { res.cookieName = name; res.cookieVal = val; res.cookieOpts = opts; },
            redirect: (url) => { res.redirectUrl = url; }
        };

        await authController.logout(req, res);

        assert.strictEqual(res.cookieName, 'jwt');
        assert.strictEqual(res.cookieVal, 'logout');
        assert.strictEqual(res.redirectUrl, '/');
        assert.strictEqual(res.cookieOpts.httpOnly, true);
    });
});
