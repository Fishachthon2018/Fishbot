import {Application, Request, Response} from "express";
import fetch from 'node-fetch';
import * as config from "./config";

const DIALOGFLOW_QUERY_URL = 'https://api.dialogflow.com/v1/query';

export interface Query {
    contexts?: string[],
    query: string,
    timezone?: string,
    lang: string,
    sessionId: string,
    source?: string
}

export interface DialogflowResult {
    action: string,
    actionIncomplete: boolean,
    contexts: string[],
    speech: string,
    fullfillment: {
        speech: string
    },
    metadata: {
        intentId: string,
        intentName: string,
        webhookForSlotFillinUsed: boolean,
        webhookUsed: boolean
    },
    parameters: {
        [key: string]: any
    },
    resolvedQuery: string,
    score: number,
    source: string
};

interface DialogflowResponse {
    id: string,
    result: DialogflowResult,
    sessionId: string,
    status: {
        code: number,
        errorType: 'success' | string
    },
    timestamp: string
}

export async function query(request: Query): Promise<DialogflowResponse> {
    let resp = await fetch(DIALOGFLOW_QUERY_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer ' + config.dialogFlow.accessToken
        },
        body: JSON.stringify(request)
    });
    let result = await resp.json();
    console.log('[DIALOGFLOW RESPONSE]', JSON.stringify(result, null, 4));
    if(!resp.ok) {
        throw new Error('Dialogflow error: ' + JSON.stringify(result, null, 4));
    }
    return result;
}