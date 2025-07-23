

@cds.odata.v4
@path : 'SCIMService'
service SCIMService
{
    action assignUsersToGroup
    (
        groupId : String,
        userIds : many String
    )
    returns String;

    action testDestination
    (
    )
    returns String;

    action getAllUsers
    (
    )
    returns String;

    action Action1
    (
    )
    returns String;
}
