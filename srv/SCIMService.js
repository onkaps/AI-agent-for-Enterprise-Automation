const { BulkAssignment, getAllUsersFromSCIM, getUserUuidByEmail, getGroupId } = require('./BulkAssignment');
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const cds = require('@sap/cds');
// const xsenv = require('@sap/xsenv');
// xsenv.loadEnv();


module.exports = cds.service.impl(async function () {
  this.on('assignUsersToGroup', async req => {
    const { groupId, emails } = req.data;
    console.log(`[Service]  Received request to assign users to groupId: ${groupId}`);
    console.log(`[Service]  Email list: ${JSON.stringify(emails)}`);
  
    const assigner = new BulkAssignment('ias_api');
  
    try {
      // Convert emails to UUIDs
      const uuidPromises = emails.map(email => getUserUuidByEmail(email, 'ias_api'));
      const uuids = await Promise.all(uuidPromises);
  
      const validUuids = uuids.filter(uuid => !!uuid);
      if (validUuids.length === 0) {
        req.error(404, 'No valid users found for the provided emails.');
        return;
      }
  
      console.log(`[Service] UUIDs to assign: ${validUuids.join(', ')}`);
  
      const result = await assigner.assignUsersToGroup(groupId, validUuids);
      console.log(`[Service] Assignment successful for groupId ${groupId}`);
  
      return {
        status: 'success',
        message: 'Users assigned successfully',
        assignedUuids: validUuids,
        result
      };
    } catch (err) {
      console.error(`[Service] Failed to assign users to group: ${err.message}`);
      req.error(500, `Failed to assign users: ${err.message}`);
    }
  });
  


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
  

});
