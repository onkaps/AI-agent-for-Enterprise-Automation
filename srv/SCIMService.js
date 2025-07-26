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
