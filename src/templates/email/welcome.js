/**
 * Send a welcome email to a new user.
 *
 * @param {string} to   - Recipient email
 * @param {string} name - User's name
 */
const sendWelcomeEmail = (to, name) => {
  return {
    to,
    subject: `Welcome to DevTinder, ${name}! 🎉`,
    html: `
      <h1>Hey ${name}, welcome aboard!</h1>
      <p>We're thrilled to have you. Start exploring and connecting with developers.</p>
      <a href="https://devtinder.subratajana.com/explore"
         style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">
        Start Exploring
      </a>
    `,
    text: `Hey ${name}, welcome to DevTinder! Visit https://devtinder.subratajana.com/explore to get started.`,
  };
};

export default sendWelcomeEmail;
