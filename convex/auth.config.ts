// Auth configuration for Convex Auth
// For Password provider, this file may not be strictly required,
// but it helps configure the JWKS endpoint
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL || "https://compassionate-albatross-460.convex.site",
      applicationID: "convex",
    },
  ],
};

