import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from './client.js';

// ─── Default Config ────────────────────────────────────────────────────────────
const DEFAULT_FROM = 'noreply@devtinder.subratajana.com';
const DEFAULT_CHARSET = 'UTF-8';

// ─── Core Builder ──────────────────────────────────────────────────────────────
/**
 * Build a SendEmailCommand from a config object.
 *
 * @param {Object} options
 * @param {string|string[]} options.to          - Recipient address(es)
 * @param {string}          options.subject     - Email subject
 * @param {string}          [options.html]      - HTML body (optional)
 * @param {string}          [options.text]      - Plain-text body (optional)
 * @param {string}          [options.from]      - Sender address (defaults to DEFAULT_FROM)
 * @param {string[]}        [options.cc]        - CC addresses
 * @param {string[]}        [options.replyTo]   - Reply-To addresses
 */
const buildEmailCommand = ({
  to,
  subject,
  html,
  text,
  from,
  cc = [],
  replyTo = [],
}) => {
  if (!to) throw new Error('emailService: "to" is required');
  if (!subject) throw new Error('emailService: "subject" is required');
  if (!html && !text)
    throw new Error(
      'emailService: at least one of "html" or "text" is required',
    );

  const toAddresses = Array.isArray(to) ? to : [to];

  const body = {};
  if (html) body.Html = { Charset: DEFAULT_CHARSET, Data: html };
  if (text) body.Text = { Charset: DEFAULT_CHARSET, Data: text };

  return new SendEmailCommand({
    Source: from || DEFAULT_FROM,
    Destination: {
      ToAddresses: toAddresses,
      CcAddresses: cc,
    },
    Message: {
      Subject: { Charset: DEFAULT_CHARSET, Data: subject },
      Body: body,
    },
    ReplyToAddresses: replyTo,
  });
};

// ─── Core Send ─────────────────────────────────────────────────────────────────
/**
 * Send an email via AWS SES.
 *
 * @param {Object} options - Same options as buildEmailCommand
 * @returns {Promise<Object>} SES response or MessageRejected error
 */
const sendEmail = async (options) => {
  const command = buildEmailCommand(options);
  try {
    const result = await sesClient.send(command);
    return { success: true, result };
  } catch (err) {
    if (err instanceof Error && err.name === 'MessageRejected') {
      return { success: false, error: err };
    }
    throw err;
  }
};

// ─── Exports ───────────────────────────────────────────────────────────────────
export default sendEmail;
