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



module.exports = { revokeGroupsFromUser, getAllUsersFromSCIM, getUserUuidByEmail, getGroupId, assignGroupsToUser };

