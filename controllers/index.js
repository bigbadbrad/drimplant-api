const router = require('express').Router();
const v1 = require('./v1');
const { publicApiKey, rateLimit } = require('../middleware/publicApi');

router.use('/v1', rateLimit(), publicApiKey, v1);

module.exports = router;
