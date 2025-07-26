const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const core = require('@sap-cloud-sdk/core');
const { type } = require('@sap/cds');
 
class BulkAssignment {
  constructor(destinationName) {
    this.destinationName = destinationName;
  }

  createPayload(groupId, userIds) {
    const operations = userIds.map(userId => ({
      op: "add",
      path: "members",
      value: [{ value: userId }]
    }));

    const payload = {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
      operations: [{
        method: "PATCH",
        bulkId: groupId,
        path: `/Groups/${groupId}`,
        data: {
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          operations
        }
      }]
    };

    console.log(`[BulkAssignment]  Payload created for groupId ${groupId}:`, JSON.stringify(payload, null, 2));
    return payload;
  }

  async assignUsersToGroup(groupId, userIds) {
    console.log(`[BulkAssignment]  Starting assignment for groupId: ${groupId} with users: ${userIds.join(', ')}`);

    const destination = await core.getDestination(this.destinationName);
    // if (!destination?.url) {
    //   console.error(`[BulkAssignment]  Destination "${this.destinationName}" not found or missing URL`);
    //   throw new Error(`Destination "${this.destinationName}" not found or missing URL`);
    // }

    console.log(`[BulkAssignment]  Destination resolved: ${destination.url}`);

    const payload = this.createPayload(groupId, userIds);

    try {
      const response = await executeHttpRequest(destination, {
        method: 'POST',
        url: '/scim/Bulk',
        headers: {
          'Content-Type': 'application/scim+json',
          'DataServiceVersion': '2.0',
          'Content-Type': 'application/scim+json'
        },
        data: payload
      });

      console.log(`[BulkAssignment]  API Response Status: ${response.status}`);
      console.log(`[BulkAssignment]  API Response Data:`, JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      console.error(`[BulkAssignment]  Error during API request:`, error.message);
      if (error.response) {
        console.error(`[BulkAssignment]  Response Error Status: ${error.response.status}`);
        console.error(`[BulkAssignment]  Response Error Data:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}

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

    const encodedGroupName = encodeURIComponent(`displayName eq "${groupName}"`);
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



module.exports = { BulkAssignment, getAllUsersFromSCIM, getUserUuidByEmail, getGroupId };

