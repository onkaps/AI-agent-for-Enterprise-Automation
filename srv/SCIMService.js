const { revokeGroupsFromUser, getAllUsersFromSCIM, getUserUuidByEmail, getGroupId, assignGroupsToUser, UserCreation } = require('./BulkAssignment');
const cds = require('@sap/cds');
// const xsenv = require('@sap/xsenv');
// xsenv.loadEnv();


module.exports = cds.service.impl(async function () {
  
  this.on('getAllUsers', async req => {
    try {
      console.log(`[Service] Fetching all users from SCIM`);
      const users = await getAllUsersFromSCIM('ias_api');
      return { status: 'success', users };
    } catch (err) {
      console.error(`[Service]  Failed to fetch users: ${err.message}`);
      req.error(500, `Failed to fetch users: ${err.message}`);
    }
  });

  this.on('getUserUuidByEmail', async req => {
    const { email } = req.data;

    if (!email) {
      req.error(400, 'Email is required');
      return;
    }

    try {
      console.log(`[Service] Fetching UUID for email: ${email}`);
      const uuid = await getUserUuidByEmail(email, 'ias_api');

      if (!uuid) {
        req.error(404, `No user found with email: ${email}`);
        return;
      }

      return { status: 'success', email, uuid };
    } catch (err) {
      console.error(`[Service] Failed to get UUID: ${err.message}`);
      req.error(500, `Failed to get UUID: ${err.message}`);
    }
  });

  this.on('getGroupId', async req => {
    const { groupName } = req.data;
  
    if (!groupName) {
      req.error(400, 'Group name is required');
      return;
    }
  
    try {
      console.log(`[Service] Fetching ID for group: ${groupName}`);
      const groupId = await getGroupId(groupName, 'ias_api');
  
      if (!groupId) {
        req.error(404, `No group found with name: ${groupName}`);
        return;
      }
  
      return { status: 'success', groupName, groupId };
    } catch (err) {
      console.error(`[Service] Failed to get group ID: ${err.message}`);
      req.error(500, `Failed to get group ID: ${err.message}`);
    }
  });
  
  this.on('assignGroupsToUser', async req => {
    const { email, groupsNames } = req.data;
  
    if (!email || !Array.isArray(groupsNames) || groupsNames.length === 0) {
      req.error(400, 'Both "email" and non-empty "groupsNames" array are required.');
      return;
    }
  
    try {
      console.log(`[assignGroupsToUser] Email: ${email}`);
      console.log(`[assignGroupsToUser] Groups: ${groupsNames.join(', ')}`);
      const result = await assignGroupsToUser(email, groupsNames);
      return result;
    } catch (err) {
      console.error(`[assignGroupsToUser] ❌ Error:`, err.message);
      req.error(500, `Failed to assign groups: ${err.message}`);
    }
  });

  this.on('revokeGroupsFromUser', async (req) => {
    const { email, groupsNames } = req.data;

    console.log(`[revokeGroupsFromUser] Email: ${email}`);
    console.log(`[revokeGroupsFromUser] Groups: ${groupsNames}`);

    if (!email || !Array.isArray(groupsNames) || groupsNames.length === 0) {
      return req.reject(400, 'Both "email" and non-empty "groupsNames" array are required.');
    }

    try {
      const result = await revokeGroupsFromUser(email, groupsNames);
      return result;
    } catch (err) {
      console.error(`[revokeGroupsFromUser] ❌ Handler Error: ${err.message}`);
      return req.reject(500, `Failed to revoke groups: ${err.message}`);
    }
  });


  
  // CREATE USERS ACTIONS

  this.on('createUser', async req => {
    const { userAttributes } = req.data;

    if (!userAttributes) {
      req.error(400, 'userAttributes is required');
      return;
    }

    try {
      // Parse the JSON string if it's a string
      let parsedAttributes;
      if (typeof userAttributes === 'string') {
        parsedAttributes = JSON.parse(userAttributes);
      } else {
        parsedAttributes = userAttributes;
      }

      console.log(`[Service] Creating user with attributes:`, JSON.stringify(parsedAttributes, null, 2));

      const userCreator = new UserCreation('ias_api');
      const result = await userCreator.createUser(parsedAttributes);

      return {
        status: 'success',
        message: 'User created successfully',
        user: result
      };
    } catch (err) {
      console.error(`[Service] Failed to create user: ${err.message}`);
      req.error(500, `Failed to create user: ${err.message}`);
    }
  });

  /**
   * Creates multiple users in bulk
   */
  this.on('createUsers', async req => {
    const { usersArray } = req.data;

    if (!usersArray) {
      req.error(400, 'usersArray is required');
      return;
    }

    try {
      // Parse the JSON string if it's a string
      let parsedUsersArray;
      if (typeof usersArray === 'string') {
        parsedUsersArray = JSON.parse(usersArray);
      } else {
        parsedUsersArray = usersArray;
      }

      if (!Array.isArray(parsedUsersArray) || parsedUsersArray.length === 0) {
        req.error(400, 'usersArray must be a non-empty array');
        return;
      }

      console.log(`[Service] Creating ${parsedUsersArray.length} users in bulk`);

      const userCreator = new UserCreation('ias_api');
      const results = await userCreator.createUsers(parsedUsersArray);

      return {
        status: results.failed.length === 0 ? 'success' : 'partial_success',
        message: `Bulk user creation completed: ${results.summary.successful} successful, ${results.summary.failed} failed`,
        results: results
      };
    } catch (err) {
      console.error(`[Service] Failed to create users in bulk: ${err.message}`);
      req.error(500, `Failed to create users in bulk: ${err.message}`);
    }
  });

  /**
   * Creates a simple user with minimal required fields for testing
   */
  this.on('createSimpleUser', async req => {
    const { email, firstName, lastName, password } = req.data;

    if (!email || !firstName || !lastName) {
      req.error(400, 'email, firstName, and lastName are required');
      return;
    }

    try {
      console.log(`[Service] Creating simple user: ${firstName} ${lastName} (${email})`);

      const userCreator = new UserCreation('ias_api');
      const result = await userCreator.createSimpleUser(email, firstName, lastName, password);

      return {
        status: 'success',
        message: 'Simple user created successfully',
        user: result
      };
    } catch (err) {
      console.error(`[Service] Failed to create simple user: ${err.message}`);
      req.error(500, `Failed to create simple user: ${err.message}`);
    }
  });

});
