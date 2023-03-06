const winston = require("winston")


function buildInfoLogger() {
    return winston.createLogger({
        transports: [new winston.transports.Console( { level: 'debug' })]
    })
}

function buildWarnLogger() {
    return winston.createLogger({
        transports: [
            new winston.transports.Console( { level: 'debug' }),
            new winston.transports.File( { filename: 'warn.log', level: 'warn' })
        ]
    })
}

function buildErrorLogger() {
    return winston.createLogger({
        transports: [
            new winston.transports.Console( { level: 'debug' }),
            new winston.transports.File( { filename: 'error.log', level: 'error' })
        ]
    })
}

let infoLogger = buildInfoLogger()
let warnLogger = buildWarnLogger()
let errorLogger = buildErrorLogger()

module.exports = {infoLogger, warnLogger, errorLogger};