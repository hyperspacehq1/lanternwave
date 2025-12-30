import postmark from "postmark";

const client = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN
);

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  firstName,
}) {
  return client.sendEmailWithTemplate({
    From: process.env.POSTMARK_FROM_EMAIL,
    To: to,
    TemplateAlias: "password-reset",
    TemplateModel: {
      product_url: "https://lanternwave.com",
      product_name: "Lanternwave",
      name: firstName || "Lanternwave User",
      action_url: resetUrl,
      support_url: "mailto:support@lanternwave.com",
      company_name: "Lanternwave",
      company_address:
        "87 North Raymond Ste 504, Pasadena California 91103",
    },
  });
}
