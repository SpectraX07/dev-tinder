const pendingRequestCronEmailTemplate = (to) => {
  return {
    to,
    subject: `You have pending connection requests on DevTinder`,
    html: `
      <p>You have pending connection requests that were sent yesterday.</p>
      <a href="https://devtinder.subratajana.com/requests"
         style="display:inline-block;padding:12px 24px;background:#10b981;color:#fff;border-radius:6px;text-decoration:none;">
        View Requests
      </a>
    `,
    text: `You have pending connection requests that were sent yesterday. Visit https://devtinder.subratajana.com/requests`,
  };
};

export default pendingRequestCronEmailTemplate;
