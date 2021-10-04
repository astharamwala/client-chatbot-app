const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

module.exports = 
{
    samplesendQueryToDialogflow: async function (user_message, contact, projectId = 'chat-agent') {
        // A unique identifier for the given session
        const sessionId = uuid.v4();
    
        // Create a new session
        const sessionClient = new dialogflow.SessionsClient();
        const sessionPath = sessionClient.projectAgentSessionPath(
        projectId,
        sessionId
        );
    
        // The text query request.
        const request = {
            session: sessionPath,
            queryInput: {
                    text: {
                        // The query to send to the dialogflow agent
                        // text: user_message,
                        text: "please book",
                        // The language used by the client (en-US)
                        languageCode: 'en-US',
                    },
                },
        };
    
        // Send request and log result
        const responses = await sessionClient.detectIntent(request);
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`  Query: ${result.queryText}`);
        console.log(`  Response: ${result.fulfillmentText}`);
        if (result.intent) {
            console.log(`  Intent: ${result.intent.displayName}`);
        } else {
            console.log('  No intent matched.');
        }
    },

    sendMessage: async function (text, contact){
        let encodedSession;
        if (contact.Contexts && contact.Contexts.length) {
            console.info(`SESSION PRESENT ON CONTACT  ${contact.id}`)
            let contextName = contact.Contexts[0]['name'];
            encodedSession = contextName;
        }else{
            console.info(`SESSION NOT PRESENT ON CONTACT ${contact.id}`)
            const session = {
                contactId: contact.id,
                location: "1234",
                timeZone: "Asia/Calcutta",
                calendarId: "999",
                apiKey: "testapikey",
                uuid: uuid.v4()
            }
            encodedSession = Buffer.from(JSON.stringify(session)).toString('base64');
            encodedSession = encodeURIComponent(encodedSession)
            console.info(`SESSION Data for Dialogflow Webhook service: contact: ${contact.id}` + encodedSession)
        }

        let sessionClient
        let keyFilename = './chat-agent-dbd26-7324757e73ab.json';
        sessionClient = new dialogflow.SessionsClient({ keyFilename });

        const languageCode = 'en-US';
        console.info(`contact: ${contact.id}, encodedSession: ` + encodedSession)

        if (encodedSession) {
            const sessionPath = sessionClient.projectAgentSessionPath("chat-agent-dbd26", encodedSession);
            console.info(`sessionPath: ${sessionPath}`);
            console.info(`contact: ${contact.id} detecting intent for incoming message`);

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

            console.info(`contact: ${contact.id}, contact.Contexts: ` + JSON.stringify(contact.Contexts))
            if (contact.Contexts && contact.Contexts.length) {
                dialogflowPayload.queryParams['contexts'] = contact.Contexts
                dialogflowPayload.queryParams['resetContexts'] = !contact.Contexts || !contact.Contexts.length
            }

            // if (timeZone) {
            //     dialogflowPayload.queryParams['timeZone'] = timeZone
            // }

            console.info(`contact: ${contact.id}, dialogflowPayload: ` + JSON.stringify(dialogflowPayload))

            let responses =[]

            responses = await sessionClient.detectIntent(dialogflowPayload);
            console.info(`contact: ${contact.id} Dialogflow Responses: ` + JSON.stringify(responses))
            if (responses.length > 0) {
                const result = responses[0];
                console.info(JSON.stringify(result));
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
                        console.info(`contact: ${contact.id} Got SUCCESSRES from dialog flow webhook. Ignore`);
                        return undefined
                    }
                }
            }

        }
    },
}
