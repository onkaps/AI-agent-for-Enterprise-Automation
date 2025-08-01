const axios = require('axios');
require('dotenv').config();

async function handleUserCreationExtraction(inputText) {
  const API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `
You are a SCIM user provisioning assistant. From the given input text, extract all relevant SCIM user attributes as a valid JSON object that can be used to create a user **and assign groups**.

Instructions:
- Always include:
  - "email" or "userName"
  - "groups": an array of group names the user should be assigned to (this is mandatory)
- Optionally include:
  - password, displayName
  - name: givenName, familyName, middleName, honorificPrefix, honorificSuffix, formatted
  - emails, phoneNumbers, addresses, profileUrl, title, userType, preferredLanguage, locale, timeZone, active
- If SAP-specific attributes (like costCenter, organization) are mentioned, include them under the key \`sapExtension\`
- If enterprise attributes (like manager, employeeNumber) are mentioned, include them under \`enterprise\`
- If custom schema fields are mentioned, add them under \`customSchemas\` using the format:
  \`customSchemas: { "<schema-URN>": { <fields> } }\`

Return only JSON in this format:

{
  "userName": "jane.doe@example.com",
  "groups": ["Admins", "Developers"],
  "name": {
    "givenName": "Jane",
    "familyName": "Doe",
    "formatted": "Jane Doe"
  },
  "emails": [
    { "value": "jane.doe@example.com", "primary": true }
  ],
  "active": true,
  "sapExtension": {
    "costCenter": "1001",
    "organization": "IT Department"
  },
  "customSchemas": {
    "urn:example:params:scim:schemas:extension:custom:2.0:User": {
      "employeeType": "contractor",
      "officeLocation": "Pune"
    }
  }
}

Input: "${inputText}"
`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY
        }
      }
    );

    const raw = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    // Ensure 'groups' exists
    if (!result.groups || !Array.isArray(result.groups)) {
      throw new Error(`"groups" field is missing or not an array in the extracted result.`);
    }

    console.log('[GeminiUserExtractor] ✅ Extracted user attributes:', result);
    return result;
  } catch (e) {
    console.error('[GeminiUserExtractor] ❌ Failed to parse Gemini response:', e.message);
    return null;
  }
}

module.exports = { handleUserCreationExtraction };
