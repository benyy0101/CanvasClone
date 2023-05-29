const express = require('express')
const morgan = require('morgan')
const redis = require('redis')


const api = require('./api')
const { connectToDb } = require('./lib/mongo')

const { returnVerifiedJwt } = require('./lib/auth')

const app = express()
const port = process.env.PORT || 8000

const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT || 6379

const redisClient = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});

const rateLimitMaxRequests_authFalse = 10
const rateLimitMaxRequests_authTrue = 30
const rateLimitWindowMs = 60000


async function rateLimit(req, res, next) {

    const token = returnVerifiedJwt(req)
    const uId = token ? token.sub : null
    const ip = req.ip
    
    let key = uId || ip
    let maxRequests = key === uId ? rateLimitMaxRequests_authTrue : rateLimitMaxRequests_authFalse

    let tokenBucket

    try {
        tokenBucket = await redisClient.hGetAll(key)
    } catch (e) {
        next()
        return
    }

    tokenBucket = {
        tokens: parseFloat(tokenBucket.tokens) || maxRequests,
        last: parseInt(tokenBucket.last) || Date.now()
    }
    console.log("== tokenBucket:", tokenBucket)
    
    const now = Date.now()
    const ellapsedMs = now - tokenBucket.last
    tokenBucket.tokens += ellapsedMs * (maxRequests / rateLimitWindowMs)
    tokenBucket.tokens = Math.min(maxRequests, tokenBucket.tokens)
    tokenBucket.last = now
    
    if (tokenBucket.tokens >= 1) {
        tokenBucket.tokens -= 1
        await redisClient.hSet(key, [['tokens', tokenBucket.tokens], ['last', tokenBucket.last]])
        next()
    } else {
        await redisClient.hSet(key, [['tokens', tokenBucket.tokens], ['last', tokenBucket.last]])
        res.status(429).send({
            err: "Too many requests per minute"
        })
    }
}

app.use(rateLimit)

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'))

app.use(express.json())
app.use(express.static('public'))

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api)

app.use('*', function (err, req, res, next) {
    console.error("== Error:", err)
    res.status(500).send({
        err: "Server error.  Please try again later."
    })
})

app.use('*', function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist"
  })
})

connectToDb(async () => {
    redisClient.connect().then(function () {
        app.listen(port, function () {
            console.log("== Server is running on port", port)
        })
    }).catch((err) => {
        console.error("== Redis error:", err);
    })
})
