module.exports = {
    apiHost: !process.env.IS_PRODUCTION ? "http://localhost:3000" : 'https://accounts.noku.io',
    currentHost: !process.env.IS_PRODUCTION ? "http://localhost:8080" : (!process.env.IS_PRODUCTION_BETA ? 'https://wallet.noku.io' : 'https://beta-wallet.noku.io'),
    clientID: process.env.OAuth2ClientID,
    clientSecret: process.env.OAuth2ClientSecret
}