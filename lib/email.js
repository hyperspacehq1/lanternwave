import postmark from "postmark";

const client = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN
);

/* --------------------------------
   Helpers
-------------------------------- */

function parseUserAgent(userAgent = "") {
  let operating_system = "Unknown OS";
  let browser_name = "Unknown Browser";

  if (/windows/i.test(userAgent)) operating_system = "Windows";
  else if (/mac/i.test(userAgent)) operating_system = "macOS";
  else if (/linux/i.test(userAgent)) operating_system = "Linux";
  else if (/iphone|ipad|ios/i.test(userAgent)) operating_system = "iOS";
  else if (/android/i.test(userAgent)) operating_system = "Android";

  if (/chrome/i.test(userAgent)) browser_name = "Chrome";
  else if (/safari/i.test(userAgent)) browser_name = "Safari";
  else if (/firefox/i.test(userAgent)) browser_name = "Firefox";
  else if (/edge/i.test(userAgent)) browser_name = "Edge";

  return { operating_system, browser_name };
}

function baseTemplateModel({ username, userAgent }) {
  const { operating_system, browser_name } =
    parseUserAgent(userAgent);

  return {
    name: username,
    operating_system,
    browser_name,
    support_url: "https://lanternwave.com/support",
    product_name: "Lanternwave",
    login_url: "https://lanternwave.com/login",
    support_email: "support@lanternwave.com",
    sender_name: "Lanternwave",
  };
}

/* --------------------------------
   Welcome Email
-------------------------------- */

export async function sendWelcomeEmail({
  to,
  username,
  userAgent,
}) {
  return client.sendEmailWithTemplate({
    From: process.env.POSTMARK_FROM_EMAIL,
    To: to,
    TemplateAlias: "welcome",
    TemplateModel: {
      ...baseTemplateModel({ username, userAgent }),
    },
  });
}

/* --------------------------------
   Reset Password Email
-------------------------------- */

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  username,
  userAgent,
}) {
  return client.sendEmailWithTemplate({
    From: process.env.POSTMARK_FROM_EMAIL,
    To: to,
    TemplateAlias: "password-reset",
    TemplateModel: {
      ...baseTemplateModel({ username, userAgent }),
      action_url: resetUrl,
    },
  });
}

/* --------------------------------
   Forgot Username Email
-------------------------------- */

export async function sendForgotUsernameEmail({
  to,
  username,
  userAgent,
}) {
  return client.sendEmailWithTemplate({
    From: process.env.POSTMARK_FROM_EMAIL,
    To: to,
    TemplateAlias: "forgot-username",
    TemplateModel: {
      ...baseTemplateModel({ username, userAgent }),
    },
  });
}
