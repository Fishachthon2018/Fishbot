import fetch from 'node-fetch';
import * as dialogflow from './dialogflow';
import {FbMessage} from './fb';
import * as fish from './fish';
import * as replies from './replies';
import { getFishByName } from './fish';
import * as config from './config';
import { undefined } from 'io-ts';
import { join } from 'path';

interface Message {
    sessionId: string,
    personName: string,
    source: 'facebook',
    text: string
}

type Reply = FbMessage;

interface SessionInfo {
    locationName?: string
};
var sessions : {[sessionId: string]: SessionInfo} = {};

interface LocationInfo {
    name: string
}

export async function handle(msg: Message) : Promise<Reply[]> {
    if(!sessions[msg.sessionId]) {
        sessions[msg.sessionId] = {};
    }
    let session = sessions[msg.sessionId];

    let result = await dialogflow.query({
        query: msg.text,
        source: msg.source,
        sessionId: msg.sessionId,
        lang: 'en'
    });

    let vars = {
        $personName: msg.personName,
        $br: '\n',
        $location: 'Nantou',
        $fishName: '?',
        $fishWeight: '1',
        $fishLength: '0.5',
        $locationName: <string | undefined> session.locationName
    }

    let {parameters} = result.result;

    if(parameters.fishName) {
        let f = await fish.getFishByName(parameters.fishName);
        if(f) {
            vars.$fishName = f.name;
            vars.$fishWeight = f.fishWeight;
            vars.$fishLength = f.fishLength;
        }
    }

    if(parameters.lat && parameters.long) {
        let locationName = await getLocationName({
            lat: parameters.lat,
            long: parameters.long
        });
        vars.$locationName = locationName;
        session.locationName = locationName;
    }

    if(result.result.action == 'caught-a-fish') {
        console.log('[caught a fish]')
        return await processFish(parameters.fishName, vars);
    } else {
        return await processSpeech(result.result.speech, vars);
    }
}

async function processFish(fishName: string, vars: any) {
    let fish = await getFishByName(fishName);
    if(fish && fish.endangered) {
        console.log('[processFish] fish is endangered');
        return await processSpeech(replies.endangeredFish(), vars);
    } else if(fish && fish.edible) {
        console.log('[processFish] fish is edible');
        return await processSpeech(replies.goodFish(), vars);
    } else {
        console.log('[processFish] fish is unidentified');
        return await processSpeech(replies.goodFish(), vars);
    }
}

async function processSpeech(speech: string, vars: any) : Promise<Reply[]> {
    let fbReplies : Reply[] = [];

    for(let text of speech.split('---')) {
        text = text
            .replace(/^\s+/, '')
            .replace(/\s+$/, '');
        
        let quick_replies : any[] = [];
        let images : string[] = [];
        let extraReplies : Reply[] = [];

        text = text.replace(/\$askForLocation/g, () => {
            quick_replies.push({
                content_type: 'location'
            })
            return '';
        });

        text = text.replace(/\$contactAgency/g, () => {
            extraReplies.push({
                attachment: {
                    type: "template" as "template",
                    payload: {
                        template_type: "generic" as "generic",
                        elements: [
                            {
                                title: 'Endemic Species Research Institute',
                                subtitle: '',
                                buttons: [
                                    {
                                        type: 'web_url',
                                        title: 'Website',
                                        url: 'https://tesri.tesri.gov.tw'
                                    },
                                    {
                                        type: 'phone_number',
                                        title: 'Call',
                                        payload: '(049)2761331'
                                    }
                                ]
                            },
                            {
                                title: 'Academia Sinica Biodiversity Research Center',
                                subtitle: '',
                                buttons: [
                                    {
                                        type: 'web_url',
                                        title: 'Website',
                                        url: 'https://www.biodiv.tw'
                                    },
                                    {
                                        type: 'phone_number',
                                        title: 'Call',
                                        payload: '02-2789-9621'
                                    }
                                ]
                            },
                            {
                                title: 'NTU Institute of Oceanography',
                                subtitle: '',
                                buttons: [
                                    {
                                        type: 'web_url',
                                        title: 'Website',
                                        url: 'http://www.oc.ntu.edu.tw'
                                    },
                                    {
                                        type: 'phone_number',
                                        title: 'Call',
                                        payload: '886-2-23636040'
                                    }
                                ]
                            },
                        ]
                    }
                }
            });

            return '';
        });

        text = text.replace(/\[image:.+\]/, (match) => {
            let [_, imageName] = /\[image:(.+)\]/.exec(match)!;
            images.push(imageName);
            return '';
        });

        text = text.replace(/\$\w+/g, (match) => {
            return vars[match] ? vars[match] : match;
        });
        
        
        text = text.replace(/\:\: [^:]+/g, (match) => {
            let value = match.substr(3);
            quick_replies.push({
                content_type: 'text',
                title: value,
                payload: value
            });
            return '';
        });

        text = text
            .replace(/^\s+/, '')
            .replace(/\s+$/, '');
        
        if(text) {
            fbReplies.push({
                text: text,
            });
        }

        if(images.length > 0) {
            for(let img of images) {
                fbReplies.push({
                    attachment: {
                        type: 'image',
                        payload: {
                            is_reusable: true,
                            filedata: getImageData(img)
                        }
                    }
                });
            }
        }

        fbReplies = [... fbReplies, ... extraReplies];

        if(quick_replies.length > 0) {
            if(fbReplies.length == 0) fbReplies.push({text: ''});
            fbReplies[fbReplies.length - 1].quick_replies = quick_replies;
        }
    }

    return fbReplies;
}

let imageDataCache : any = {};

async function getImageData(url: string) {
    if(!imageDataCache[url]) {
        let resp = await fetch(url);
        imageDataCache[url] = await resp.buffer();
    }
    return imageDataCache[url];
}

async function getLocationName(coords: {lat: string, long: string}) {
    let {lat, long} = coords;
    let unknown = `$lat,$long`;

    let result = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${lat},${long}&key=${config.googleMaps.apiKey}`
    );

    let data : any = await result.json();

    if(!result.ok || !data.results) {
        console.error(await result.text());
        return unknown;
    }

    let locationInfo: any = {};

    for(let row of data.results[0].address_components) {
        if(row.types.indexOf('political') != -1) {
            return row.short_name
        }
    }

    return unknown;
}