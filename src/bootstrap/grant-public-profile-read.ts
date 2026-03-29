import type { Core } from '@strapi/strapi';

const PROFILE_FIND_ACTION = 'api::profile.profile.find' as const;

/**
 * Ensures the Public role can GET /api/profile (required for the Next.js product app).
 */
export async function grantPublicProfileRead(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) {
    strapi.log.warn('[bootstrap:profile-permissions] Public role not found, skipping.');
    return;
  }

  const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
    where: { action: PROFILE_FIND_ACTION, role: publicRole.id },
  });

  if (existing) {
    return;
  }

  await strapi.db.query('plugin::users-permissions.permission').create({
    data: {
      action: PROFILE_FIND_ACTION,
      role: publicRole.id,
    },
  });

  strapi.log.info('[bootstrap:profile-permissions] Granted Public → Profile find.');
}
