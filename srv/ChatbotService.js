// service.js
const { handleGeminiExtraction } = require('./GeminiParser');
const { assignGroupsToUser, revokeGroupsFromUser } = require('./BulkAssignment');

module.exports = cds.service.impl(function () {
  this.on('handleChatbotInput', async (req) => {
    const inputText = req.data.input;

    console.log(`[Chatbot] 🟢 Received input: ${inputText}`);

    // Step 1: Extract intent and info
    const { intent, email, groups } = await handleGeminiExtraction(inputText);
    if (!intent || !email || !groups.length) {
      return { status: 'error', message: 'Could not extract enough info from input.' };
    }

    console.log(`[Chatbot] 🔍 Parsed intent: ${intent}, email: ${email}, groups: ${groups.join(', ')}`);

    // Step 2: Route action
    if (intent === 'assign') {
      return await assignGroupsToUser(email, groups);
    } else if (intent === 'revoke') {
      return await revokeGroupsFromUser(email, groups);
    } else {
      return { status: 'error', message: `Unrecognized intent: ${intent}` };
    }
  });
});
