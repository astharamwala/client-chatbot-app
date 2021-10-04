let encodedSession;
if (contact.Contexts && contact.Contexts.length) {
    log.info(`SESSION PRESENT ON CONTACT  ${contact?.id}`)
    let contextName = contact.Contexts[0]['name'];
    encodedSession = contextName.split('/')[4];
}else{
    log.info(`SESSION NOT PRESENT ON CONTACT ${contact?.id}`)
    const session = {
        contactId: contact.id,
        location: location.id,
        timeZone,
        calendarId,
        apiKey: location.apiKey,
        uuid: uuidv4()
    }
    encodedSession = Buffer.from(JSON.stringify(session)).toString('base64');
    encodedSession = encodeURIComponent(encodedSession)
    log.info(`SESSION Data for Dialogflow Webhook service: contact: ${contact?.id}` + encodedSession)
}

let sessionClient
let keyFilename = '/path/to/file/chat-agent-d7e73ab.json';
sessionClient = new dialogflow.SessionsClient({ keyFilename });

const languageCode = 'en-US';
log.info(`contact: ${contact?.id}, encodedSession: ` + encodedSession)

if (encodedSession) {
    const sessionPath = sessionClient.sessionPath(defaults.genericId, encodedSession);
    log.info(sessionPath);
    log.info(`contact: ${contact?.id} detecting intent for incoming message`);

    const dialogflowPayload = {
        session: sessionPath,
        queryInput: {
            text: {
                text,
                languageCode,
            },
        },
        queryParams: {}
    }

    log.info(`contact: ${contact?.id}, contact.Contexts: ` + JSON.stringify(contact.Contexts))
    if (contact.Contexts && contact.Contexts.length) {
        dialogflowPayload.queryParams['contexts'] = contact.Contexts
        dialogflowPayload.queryParams['resetContexts'] = !contact.Contexts || !contact.Contexts.length
    }

    if (timeZone) {
        dialogflowPayload.queryParams['timeZone'] = timeZone
    }

    log.info(`contact: ${contact?.id}, dialogflowPayload: ` + JSON.stringify(dialogflowPayload))

    let responses =[]

    responses = await sessionClient.detectIntent(dialogflowPayload);
    log.info(`contact: ${contact?.id} Dialogflow Responses: ` + JSON.stringify(responses))
    if (responses.length > 0) {
        const result = responses[0];
        log.info(JSON.stringify(result));
        if (result.queryResult &&
        result.queryResult.fulfillmentText &&
        result.queryResult.fulfillmentText !== 'TECHNICALERROR' &&
        result.queryResult.intent &&
        result.queryResult.intent.displayName !== 'Default Fallback Intent') {
            const contexts = result.queryResult.outputContexts;
            if (contexts && contexts.length) {
            const contexts= contexts.map(context => {
                delete context.parameters;
                return context;
            });
            await contact.ref.update({
                'contexts': contexts,
                'date_updated': firestore.FieldValue.serverTimestamp()
            });
            }
            if (result.queryResult.fulfillmentText === 'SUCCESSRES') {
            log.info(`contact: ${contact?.id} Got SUCCESSRES from dialog flow webhook. Ignore`);
            return undefined
            }
        }
    }
}