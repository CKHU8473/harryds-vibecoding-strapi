/**
 * Custom like counter — uses Document Service in the controller (no REST PUT / partial-body issues).
 * Full URL: POST /api/profile/increment-like
 */
export default {
  type: 'content-api' as const,
  routes: [
    {
      method: 'POST',
      path: '/profile/increment-like',
      handler: 'api::profile.profile.incrementLike',
      config: {
        auth: false,
      },
    },
  ],
};
