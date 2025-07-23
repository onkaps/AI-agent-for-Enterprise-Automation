const { BulkAssignment, getAllUsersFromSCIM } = require('./BulkAssignment');
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const cds = require('@sap/cds');
const xsenv = require('@sap/xsenv');
xsenv.loadEnv();


module.exports = cds.service.impl(async function () {
  this.on('assignUsersToGroup', async req => {
    const { groupId, userIds } = req.data;
    console.log(`[Service]  Received request to assign users to groupId: ${groupId}`);
    console.log(`[Service]  User list: ${JSON.stringify(userIds)}`);

    const assigner = new BulkAssignment('ias_api');

    try {
      const result = await assigner.assignUsersToGroup(groupId, userIds);
      console.log(`[Service] Assignment successful for groupId ${groupId}`);
      return {
        status: 'success',
        message: 'Users assigned successfully',
        result
      };
    } catch (err) {
      console.error(`[Service]  Failed to assign users to group: ${err.message}`);
      req.error(500, `Failed to assign users: ${err.message}`);
    }
  });

  this.on('testDestination', async req => {
    try {
      console.log(`[TEST] 🔍 Trying to fetch destination "ias_api"`);
      const dest = await getDestination('ias_api');
      console.log(`[TEST]  Destination fetched:`, dest);
      return { status: 'success', destination: dest?.url || 'No URL' };
    } catch (err) {
      console.error(`[TEST]  Failed to fetch destination: ${err.message}`);
      req.error(500, `Destination fetch failed: ${err.message}`);
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
});
