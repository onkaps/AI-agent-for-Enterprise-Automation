const cds = require('@sap/cds');
const bodyParser = require('body-parser');

module.exports = cds.service.impl(async function () {
    const app = this.app; // Get the Express app instance

    // Use body-parser to parse raw text body for incoming webhook messages
    // Microsoft Teams webhook sends content as 'text/plain' or 'application/x-www-form-urlencoded'
    // You might need to adjust based on the exact content type Teams sends.
    // For simplicity, we'll use text parsing here.
    app.use(bodyParser.text({ type: 'text/plain' }));
    app.use(bodyParser.urlencoded({ extended: true }));


    // Define a custom route to handle the Teams webhook POST requests
    app.post('/webhook/messages', async (req, res) => {
        const incomingText = req.body;
        console.log(`[WebhookService] Received prompt from Teams: ${incomingText}`);

        // Construct the reply message
        const replyMessage = `Prompt received: ${incomingText}`;

        // Send back the reply. Teams expects a JSON response.
        res.status(200).json({
            type: 'message',
            text: replyMessage
        });
    });
});