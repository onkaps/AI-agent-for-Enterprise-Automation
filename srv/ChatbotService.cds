using { cuid } from '@sap/cds/common';

@cds.odata.v4
@path: 'ChatbotService'
service ChatbotService {

  action handleChatbotInput(input: String) returns {
    status: String;
    message: String;
    email: String;
    assignedGroups: many String;
    revokedGroups: many String;
  };

}
