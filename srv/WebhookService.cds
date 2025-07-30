@cds.odata.v4
@path: 'webhook'
service WebhookService {
    entity WebhookResponse {
        key id: Integer;
        message: String;
    }
}