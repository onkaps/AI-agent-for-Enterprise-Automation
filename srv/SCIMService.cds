@cds.odata.v4
@path: 'SCIMService'
service SCIMService {

    action assignUsersToGroup(groupId : String, emails : many String)      returns String;

    action assignGroupsToUser(email : String, groupsNames : many String)   returns String;

    action revokeGroupsFromUser(email : String, groupsNames : many String)   returns String;

    action getGroupId(groupName : String)                returns String;

    action getAllUsers()                                 returns String;

    action getUserUuidByEmail(email : String)            returns String;
}
