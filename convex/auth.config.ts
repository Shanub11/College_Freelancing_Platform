const googleClientId = process.env["AUTH_GOOGLE_CLIENT_ID"];

const providers: any[] = [
  // Internal Convex auth (used by Password provider)
  {
    domain: process.env.CONVEX_SITE_URL,
    applicationID: "convex",
  },
];

if (googleClientId) {
  providers.push({
    domain: "https://accounts.google.com",
    applicationID: googleClientId,
  });
}

export default {
  providers,
};
