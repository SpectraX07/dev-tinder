import { SESClient } from '@aws-sdk/client-ses';
import serverConfig from '../../core/server.js';
// Set the AWS Region.
// Credentials are automatically resolved using the AWS SDK credential provider chain.
// For more information, see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html
// Create SES service object.
const sesClient = new SESClient(serverConfig.aws.ses.client);
export { sesClient };
// snippet-end:[ses.JavaScript.createclientv3]
