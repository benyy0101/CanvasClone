const jwt = require('jsonwebtoken')

const secret = "SuperSecret"

function generateAuthToken(userId) {
    const payload = { 
        sub: userId,
        
    }
    console.log("payload ", payload.admin)
     
    
    return jwt.sign(payload, secret, { expiresIn: '24h' })
}
exports.generateAuthToken = generateAuthToken


function requireAuthentication(req, res, next) {
    const authHeader = req.get('authorization') || ''
    const authParts = authHeader.split(' ')
    const token = authParts[0] === 'Bearer' ? authParts[1] : null

    try {
        const payload = jwt.verify(token, secret)
        
        req.user = payload.sub
    
        next()
    } catch (err) {
        res.status(401).send({
            err: "Invalid authentication token"
        })
    }
}

exports.requireAuthentication = requireAuthentication


exports.returnVerifiedJwt = (req) => {
    const authHeader = req.get('authorization') || ''
    const authParts = authHeader.split(' ')
    const token = authParts[0] === 'Bearer' ? authParts[1] : null

    try {
        const obj = jwt.verify(token, secret)
        return obj
    } catch (err) {
        return null
    }
}