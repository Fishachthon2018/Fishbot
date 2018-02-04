import * as t from 'io-ts';
import * as FormData from 'form-data';
import * as express from 'express';
import fetch from 'node-fetch';
import * as config from './config';
import * as bot from './bot';
import * as fish from './fish';
import * as replies from './replies';

const xhub = require('express-x-hub');


export type FbMessage = {
  text?: string,
  attachment?: FbImageAttachment | FbTemplateAttachment | FbTemplateButton | FileAttachment,
  quick_replies?: FbQuickReply[],
  filedata?: any
};

type FbImageAttachment = {
  type: 'image',
  payload: {
    url?: string,
    is_reusable: boolean,
    filedata?: Promise<any>
  }
};

type FbTemplateButton = {
  type: 'template',
  payload: {
    template_type: 'button',
    text: string,
    buttons: FbButton[]
  }
}

type FbTemplateAttachment = {
  type: 'template',
  payload: {
    template_type: 'generic',
    elements: GenericTemplateElement[]
  }
};

type GenericTemplateElement = {
  title?: string,
  subtitle?: string,
  image_url?: string,
  buttons?: FbButton[]
}

type FbQuickReply = {
  content_type: 'text',
  title: string,
  image_url?: string,
  payload: string
};

type FileAttachment = {
  type: 'file' | 'image',
  payload: {
    url?: string,
    contentUrl?: string
  }
};

type FbButton = {
  type: 'postback',
  title: string,
  payload: string
} | {
  type: 'web_url',
  url: string,
  title: string
} | {
  type: 'phone_number',
  title: string,
  payload: string
};

let VerifyPayload = t.interface({
  'hub.mode': t.string,
  'hub.verify_token': t.string,
  'hub.challenge': t.string
});

function xHubVerify(req: any, res: any, next: any) {
  if(!req.isXHub || !req.isXHubValid()) {
    console.log('[] Missing or invalid X-Hub signature')
    res.status(400).send('Error: Missing or invalid X-Hub signature');
  } else {
    next();
  }
}

function logRequest(req: any, res: any, next: any) {
  console.log('[FB WEBHOOK] \n  body:',
      JSON.stringify(req.body),
      '\n  query:', JSON.stringify(req.query),
      '\n  headers:', JSON.stringify(req.rawHeaders)
    );
  next();
}

export function webhookHandler() {
  let {appSecret, accessToken} = config.fb;
  let app = express();
  app.use(xhub({algorithm: 'sha1', secret: appSecret}));
  app.post('/webhook', logRequest, xHubVerify, async (req, res) => {
      res.status(200).send('EVENT_RECEIVED');
      let [entry] = req.body.entry;
      let [msg] = entry.messaging;

      console.log('[FB POST]', JSON.stringify(req.body, null, 4));

      if(msg && msg.message && msg.message.attachments) {
          console.log('[FB] received attachments');
        handleAttachment(msg.sender.id, msg.message.attachments);
      }
      else if(msg && msg.message && !msg.message.is_echo) {
        handleMessage(msg.sender.id, msg.message.quick_reply ? msg.message.quick_reply.payload : msg.message.text);
      } else if(msg.postback) {
        handleMessage(msg.sender.id, msg.postback.payload);
      }{
        console.log('Event ignored');
      }
  });

  app.get('/webhook', (req, res) => {
    let {verifyToken} = config.fb;
    
    let result = t.validate(req.query, VerifyPayload);
    if(result.isRight()) {
      // Your verify token. Should be a random string.
        
      // Parse the query params
      let mode = result.value['hub.mode'];
      let token = result.value['hub.verify_token'];
      let challenge = result.value['hub.challenge'];
        
      // Checks if a token and mode is in the query string of the request
      if (mode === 'subscribe' && token && challenge) {
      
        // Checks the mode and token sent is correct
        if (token === verifyToken) {
          
          // Responds with the challenge token from the request
          console.log('WEBHOOK_VERIFIED');
          res.status(200).send(challenge);
        
        } else {
          // Responds with '403 Forbidden' if verify tokens do not match
          res.status(403).send('Invalid verify_token');      
        }
      } else {
        res.status(400).send('Invalid mode');
      }
    } else {
      res.status(400).json(result.value);
    }
  });

  return app;
}

async function handleMessage(senderId: string, msg: string) {
    try {
        console.log('[FB MESSAGE]', JSON.stringify(msg, null, 4));

        let replies = await bot.handle({
            source: 'facebook',
            sessionId: senderId,
            text: msg,
            personName: await getPersonName(senderId)
        });

        for(let reply of replies) {
            await sendMessage(senderId, reply);
        }
    } catch (e) {
        console.error(e, e.stack);
    }
}

async function handleAttachment(senderId: string, attachements: any[]) {
    try {
        for(let attachment of attachements) {
            if(attachment.type === 'image') {
                handleImage(senderId, attachment.url);
            } else if(attachment.type === 'location') {
                handleLocation(
                    senderId, 
                    attachment.payload.coordinates.lat,
                    attachment.payload.coordinates.long
                )
            }
        }
    } catch (e) {
        console.error(e, e.stack);
    }
}

async function handleImage(senderId: string, imageUrl: string) {
    let fishname = await fish.getFish(imageUrl);
    await sendMessage(senderId, {
      text: replies.waitForIdentification()
    });
    handleMessage(senderId, 'Caught a ' + fishname.name);
}

function handleLocation(senderId: string, lat: number, long: number) {
    handleMessage(senderId, `Location: ${lat},${long}`);
}

async function sendMessage(recipientId: string, message: any) {
  let {accessToken} = config.fb;
  let data = new FormData;
  var filedata: any;
  if(message.attachment && message.attachment.payload && message.attachment.payload.filedata) {
    filedata = await message.attachment.payload.filedata;
    delete message.attachment.payload.filedata;
  }
  data.append('messaging_type', 'RESPONSE');
  data.append('recipient', JSON.stringify({id: recipientId}));
  data.append('message', JSON.stringify(message));
  if(filedata) {
    let CRLF = '';
    data.append('filedata', filedata, <any>{
        filename: 'image.png',
        contentType: 'image/png'
    });
  }

  let resp = await fetch('https://graph.facebook.com/v2.6/me/messages?access_token=' + accessToken, {
    method: 'POST',
    headers: {
      //'content-type': 'multipart/form-data'
    },
    body: data
  });
  let result = await resp.text();
  if(!resp.ok) {
    console.error('[FB ERROR]', result);
  }
}

async function getPersonName(userId: string) {
    let {accessToken} = config.fb;
    let resp = await fetch(
        `https://graph.facebook.com/v2.12/${userId}?debug=all&format=json&method=get&pretty=0&suppress_http_code=1&access_token=${accessToken}`
    );
    let r = await resp.json();
    return r.first_name;
}

export async function setupProfile() {
  let resp = await fetch(`https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${config.fb.accessToken}`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      get_started: {
        payload: 'Get started'
      }
    })
  });
  console.log('[FACBOOK SETUP]', await resp.text());
}