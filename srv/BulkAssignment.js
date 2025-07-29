const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const core = require('@sap-cloud-sdk/core');
const { type } = require('@sap/cds');
 


async function getAllUsersFromSCIM(destinationName) {
  const destination = await core.getDestination('ias_api');

  const response = await executeHttpRequest(destination, {
    method: 'GET',
    url: '/scim/Users?count=100',
    headers: {
      'Accept': '*/*',
      'DataServiceVersion': '2.0',
      'Content-Type': 'application/scim+json'
    }
  });

  return response.data;
}

async function getUserUuidByEmail(email, destinationName) {
  try {
    const destination = await core.getDestination(destinationName);

    if (!destination?.url) {
      throw new Error(`Destination "${destinationName}" does not contain a URL.`);
    }

    const encodedEmail = encodeURIComponent(`emails.value eq "${email}"`);
    const url = `/scim/Users?filter=${encodedEmail}&count=100&attributes=id`;

    const response = await executeHttpRequest(destination, {
      method: 'GET',
      url,
      headers: {
        'Accept': 'application/scim+json',
        'DataServiceVersion': '2.0',
        'Content-Type': 'application/scim+json'
      }
    });

    const users = response.data.Resources;

    if (users && users.length > 0) {
      const user = users[0];
      const uuid = user['urn:ietf:params:scim:schemas:extension:sap:2.0:User']?.userUuid || user.id;
      console.log(`[getUserUuidByEmail] ✅ Found UUID for ${email}: ${uuid}`);
      return uuid;
    } else {
      console.warn(`[getUserUuidByEmail] ⚠️ No user found with email: ${email}`);
      return null;
    }

  } catch (error) {
    console.error(`[getUserUuidByEmail] ❌ Error:`, error.message);
    if (error.response) {
      console.error(`[getUserUuidByEmail] ❌ Response Status: ${error.response.status}`);
      console.error(`[getUserUuidByEmail] ❌ Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function getGroupId(groupName, destinationName) {
  try {
    const destination = await core.getDestination(destinationName);

    if (!destination?.url) {
      throw new Error(`Destination "${destinationName}" does not contain a URL.`);
    }

    const encodedGroupName = encodeURIComponent(`urn:sap:cloud:scim:schemas:extension:custom:2.0:Group:name eq "${groupName}"`);
    const url = `/scim/Groups?filter=${encodedGroupName}&count=100&attributes=id`;

    const response = await executeHttpRequest(destination, {
      method: 'GET',
      url,
      headers: {
        'Accept': 'application/scim+json',
        'DataServiceVersion': '2.0',
        'Content-Type': 'application/scim+json'
      }
    });

    const groups = response.data.Resources;

    if (groups && groups.length > 0) {
      const group = groups[0];
      const groupId = group.id;
      console.log(`[getGroupId] ✅ Found ID for group "${groupName}": ${groupId}`);
      return groupId;
    } else {
      console.warn(`[getGroupId] ⚠️ No group found with name: ${groupName}`);
      return null;
    }

  } catch (error) {
    console.error(`[getGroupId] ❌ Error:`, error.message);
    if (error.response) {
      console.error(`[getGroupId] ❌ Response Status: ${error.response.status}`);
      console.error(`[getGroupId] ❌ Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function assignGroupsToUser(email, groupNames) {
  const destinationName = 'ias_api';

  try {
    const userId = await getUserUuidByEmail(email, destinationName);

    if (!userId) {
      throw new Error(`User not found for email: ${email}`);
    }

    const destination = await core.getDestination(destinationName);
    if (!destination?.url) {
      throw new Error(`Destination "${destinationName}" does not contain a URL.`);
    }

    const ops = [];

    for (const groupName of groupNames) {
      const groupId = await getGroupId(groupName, destinationName);

      if (!groupId) {
        console.warn(`[assignGroupsToUser] ⚠️ Skipping group "${groupName}" (not found).`);
        continue;
      }

      ops.push({
        method: "PATCH",
        path: `/Groups/${groupId}`,
        bulkId: `group-${groupId}`,
        data: {
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          operations: [{
            op: "add",
            path: "members",
            value: [{ value: userId }]
          }]
        }
      });
    }

    if (ops.length === 0) {
      console.warn(`[assignGroupsToUser] ⚠️ No valid groups to assign.`);
      return { status: 'warning', message: 'No valid groups found to assign' };
    }

    const response = await executeHttpRequest(destination, {
      method: 'POST',
      url: `/scim/Bulk`,
      headers: {
        'Accept': 'application/scim+json',
        'Content-Type': 'application/scim+json'
      },
      data: {
        failOnErrors: 1,
        schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
        operations: ops
      }
    });

    console.log(`[assignGroupsToUser] ✅ Assigned ${ops.length} group(s) to ${email}`);
    return { status: 'success', email, assignedGroups: groupNames };

  } catch (err) {
    console.error(`[assignGroupsToUser] ❌ Failed: ${err.message}`);
    if (err.response) {
      console.error(`[assignGroupsToUser] ❌ Response Status: ${err.response.status}`);
      console.error(`[assignGroupsToUser] ❌ Response Data:`, JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}


async function revokeGroupsFromUser(email, groupNames) {
  const destinationName = 'ias_api';

  try {
    const userId = await getUserUuidByEmail(email, destinationName);

    if (!userId) {
      throw new Error(`User not found for email: ${email}`);
    }

    const destination = await core.getDestination(destinationName);
    if (!destination?.url) {
      throw new Error(`Destination "${destinationName}" does not contain a URL.`);
    }

    const ops = [];

    for (const groupName of groupNames) {
      const groupId = await getGroupId(groupName, destinationName);

      if (!groupId) {
        console.warn(`[revokeGroupsFromUser] ⚠️ Skipping group "${groupName}" (not found).`);
        continue;
      }

      ops.push({
        method: "PATCH",
        path: `/Groups/${groupId}`,
        bulkId: `group-${groupId}`,
        data: {
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          operations: [{
            op: "remove",
            path: "members",
            value: [{ value: userId }]
          }]
        }
      });
    }

    if (ops.length === 0) {
      console.warn(`[revokeGroupsFromUser] ⚠️ No valid groups to revoke.`);
      return { status: 'warning', message: 'No valid groups found to revoke' };
    }

    const response = await executeHttpRequest(destination, {
      method: 'POST',
      url: `/scim/Bulk`,
      headers: {
        'Accept': 'application/scim+json',
        'Content-Type': 'application/scim+json'
      },
      data: {
        failOnErrors: 1,
        schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
        operations: ops
      }
    });

    console.log(`[revokeGroupsFromUser] ✅ Revoked ${ops.length} group(s) from ${email}`);
    return { status: 'success', email, revokedGroups: groupNames };

  } catch (err) {
    console.error(`[revokeGroupsFromUser] ❌ Failed: ${err.message}`);
    if (err.response) {
      console.error(`[revokeGroupsFromUser] ❌ Response Status: ${err.response.status}`);
      console.error(`[revokeGroupsFromUser] ❌ Response Data:`, JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

class UserCreation {
  constructor(destinationName) {
    this.destinationName = destinationName;
  }

  createUserPayload(userAttributes) {
    const baseSchemas = ["urn:ietf:params:scim:schemas:core:2.0:User"];
    const payload = {
      schemas: [...baseSchemas]
    };

    //Handle userName (* field)
    if (userAttributes.userName) {
      payload.userName = userAttributes.userName;
    } else if (userAttributes.email) {
      payload.userName = userAttributes.email;
    } else {
      throw new Error("Either userName or email must be provided in userAttributes.");
    }

    //Handle optional fields
    if (userAttributes.password) {
      payload.password = userAttributes.password;
    }
    if (userAttributes.displayName) {
      payload.displayName = userAttributes.displayName;
    }
    if (userAttributes.nickName) {
      payload.nickName = userAttributes.nickName;
    }
    if (userAttributes.profileUrl) {
      payload.profileUrl = userAttributes.profileUrl;
    }
    if (userAttributes.title) {
      payload.title = userAttributes.title;
    }
    if (userAttributes.userType) {
      payload.userType = userAttributes.userType;
    }
    if (userAttributes.preferredLanguage) {
      payload.preferredLanguage = userAttributes.preferredLanguage;
    }
    if (userAttributes.locale) {
      payload.locale = userAttributes.locale;
    }
    if (userAttributes.timeZone) {
      payload.timeZone = userAttributes.timeZone;
    }

    //Handle active status
    payload.active = userAttributes.active !== undefined ? userAttributes.active : true;

    //Handle name object
    if (userAttributes.name) {
      payload.name = {};
      if (userAttributes.name.familyName) payload.name.familyName = userAttributes.name.familyName;
      if (userAttributes.name.familyName) payload.name.familyName = userAttributes.name.familyName;
      if (userAttributes.name.givenName) payload.name.givenName = userAttributes.name.givenName;
      if (userAttributes.name.middleName) payload.name.middleName = userAttributes.name.middleName;
      if (userAttributes.name.honorificPrefix) payload.name.honorificPrefix = userAttributes.name.honorificPrefix;
      if (userAttributes.name.honorificSuffix) payload.name.honorificSuffix = userAttributes.name.honorificSuffix;
      if (userAttributes.name.formatted) payload.name.formatted = userAttributes.name.formatted;
    }

    //Handle emails array
    if (userAttributes.emails && Array.isArray(userAttributes.emails)) {
      payload.emails = userAttributes.emails.map(email => {
        if (typeof email === 'string') {
          return { value: email, primary: true };
        }
        return email;
      });
    } else if (userAttributes.email) {
      payload.emails = [{ value: userAttributes.email, primary: true }];
    }

    //Handle phone numbers 
    if (userAttributes.phoneNumber || userAttributes.phoneNumbers) {
      payload.phoneNumbers = [];
      if (userAttributes.phoneNumbers && Array.isArray(userAttributes.phoneNumbers)) {
        payload.phoneNumbers = userAttributes.phoneNumbers.map(phone => {
          if (typeof phone === 'string') {
            return { value: phone, type: 'work' };
          }
          return phone;
        })
      } else if (userAttributes.phoneNumber) {
        payload.phoneNumbers = [{ value: userAttributes.phoneNumber, type: 'work' }];
      }
    }

    //Handle addresses
    if (userAttributes.addresses) {
      payload.addresses = userAttributes.addresses;
    }

    //Handle enterprise extension 
    if (userAttributes.enterprise) {
      payload.schemas.push("urn:ietf:params:scim:schemas:extension:enterprise:2.0:User");
      payload['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'] = userAttributes.enterprise;
    }
    // Handle SAP extension
    if (userAttributes.sapExtension) {
      payload.schemas.push("urn:ietf:params:scim:schemas:extension:sap:2.0:User");
      payload["urn:ietf:params:scim:schemas:extension:sap:2.0:User"] = userAttributes.sapExtension;
    }

    // Handle custom attributes dynamically
    if (userAttributes.customSchemas) {
      Object.keys(userAttributes.customSchemas).forEach(schema => {
        if (!payload.schemas.includes(schema)) {
          payload.schemas.push(schema);
        }
        payload[schema] = userAttributes.customSchemas[schema];
      });
    }

    console.log(`[UserCreation] Generated payload:`, JSON.stringify(payload, null, 2));
    console.log(payload);
    return payload;
  }
  async createUser(userAttributes) {
    console.log(`[UserCreation] Creating user with attributes:`, JSON.stringify(userAttributes, null, 2));
    const destination = await core.getDestination(this.destinationName);

    if (!destination?.url) {
      throw new Error(`Destination "${this.destinationName}" does not contain a URL.`);
    }
    const payload = this.createUserPayload(userAttributes);

    try {
      const response = await executeHttpRequest(destination, {
        method: 'POST',
        url: '/scim/Users',
        headers: {
          'Accept': 'application/scim+json',
          'Content-Type': 'application/scim+json',
          'DataServiceVersion': '2.0'
        },
        data: payload
      });
      console.log(`[UserCreation] User created successfully: ${response.data}`);
      console.log(`[UserCreation] Created user:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`[UserCreation] Error creating user:`, error.message);
      if (error.response) {
        console.error(`[UserCreation] Response Status: ${error.response.status}`);
        console.error(`[UserCreation] Response Data:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  async createUser(userArray) {
    console.log(`[UserCreation] Creating ${userArray.length} users in bulk`);

    const results = [];
    const errors = [];

    for (let i = 0; i < userArray.length; i++) {
      const userAttributes = userArray[i];
      try {
        console.log(`[UserCreation] Processing user ${i + 1}/${userArray.length}`);
        const result = await this.createUser(userAttributes);
        results.push({
          index: i,
          status: 'success',
          user: result,
          originalAttributes: userAttributes
        });
      } catch (error) {
        console.error(`[UserCreation] Error creating user ${i + 1}:`, error.message);
        errors.push({
          index: i,
          status: 'error',
          error: error.message,
          originalAttributes: userAttributes
        });
      }
    }

    console.log(`[UserCreation] Bulk creation completed: ${results.length} successes, ${errors.length} errors`);

    return {
      successful: results,
      failed: errors,
      summary: {
        total: userArray.length,
        successes: results.length,
        errors: errors.length
      }
    };
  }

  async createSimpleUser(email, firestName, lastName, password = null) {
    const userAttributes = {
      userName: email,
      email: email,
      name: {
        givenName: firestName,
        familyName: lastName,
        formatted: `${firestName} ${lastName}`
      },
      displayName: `${firestName} ${lastName}`,
      emails: [{ value: email, primary: true }],
      active: true
    };
    if (password) {
      userAttributes.password = password;
    }
    return await this.createUser(userAttributes);
  } 
}

module.exports = { revokeGroupsFromUser, getAllUsersFromSCIM, getUserUuidByEmail, getGroupId, assignGroupsToUser, UserCreation };

