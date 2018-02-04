import {env} from 'process';

require('dotenv').config();

export const fb = {
    accessToken: env.FB_ACCESS_TOKEN,
    verifyToken: env.FB_VERIFY_TOKEN,
    appSecret: env.FB_APP_SECRET
}

export const dialogFlow = {
    accessToken: env.DIALOGLOW_ACCESS_TOKEN
}

export const googleMaps = {
    apiKey: env.GOOGLE_MAPS_API_KEY
}

export const webApp = {
    port: parseInt( env.PORT || '8000' )
}

console.log('setttings:fb', JSON.stringify(fb));
console.log('setttings:dialogFlow', JSON.stringify(dialogFlow));
console.log('setttings:googleMaps', JSON.stringify(googleMaps));
console.log('setttings:webApp', JSON.stringify(webApp));