// Auth configuration for Convex Auth
// For Password provider, this file may not be strictly required,
// but it helps configure the JWKS endpoint
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL || "https://compassionate-albatross-460.convex.site",
      applicationID: "convex",
    },
  ],
};
export default authConfig;

