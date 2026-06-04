/**
 * Send a connection request notification.
 *
 * @param {string} to          - Recipient email
 * @param {string} senderName  - Name of the person who sent the request
 */
const sendConnectionRequestEmail = (to, senderName) => {
  return {
    to,
    subject: `${senderName} wants to connect on DevTinder`,
    html: `
      <p><strong>${senderName}</strong> sent you a connection request.</p>
      <a href="https://devtinder.subratajana.com/requests"
         style="display:inline-block;padding:12px 24px;background:#10b981;color:#fff;border-radius:6px;text-decoration:none;">
        View Request
      </a>
    `,
    text: `${senderName} wants to connect with you on DevTinder. Visit https://devtinder.subratajana.com/requests`,
  };
};

export default sendConnectionRequestEmail;
