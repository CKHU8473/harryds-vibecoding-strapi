import { errors } from '@strapi/utils';
import { factories } from '@strapi/strapi';

const PROFILE_UID = 'api::profile.profile' as const;

export default factories.createCoreController(PROFILE_UID, ({ strapi }) => ({
  /**
   * POST /api/profile/increment-like — server-side +1 on published Profile.likeCount.
   * Exposed with auth:false; optional PROFILE_LIKE_SECRET + x-profile-like-secret header.
   */
  async incrementLike(ctx) {
    const secret = process.env.PROFILE_LIKE_SECRET;
    if (secret) {
      const header = ctx.get('x-profile-like-secret');
      if (header !== secret) {
        throw new errors.UnauthorizedError('Like secret mismatch');
      }
    }

    const existing = await strapi.documents(PROFILE_UID).findFirst({
      status: 'published',
    });

    if (!existing) {
      throw new errors.NotFoundError('Profile not found or not published');
    }

    const doc = existing as { documentId: string; likeCount?: number };
    const current =
      typeof doc.likeCount === 'number' && Number.isFinite(doc.likeCount)
        ? doc.likeCount
        : 0;
    const nextCount = current + 1;

    const updated = await strapi.documents(PROFILE_UID).update({
      documentId: doc.documentId,
      data: { likeCount: nextCount },
      status: 'published',
    });

    const likeCount =
      updated &&
      typeof updated === 'object' &&
      'likeCount' in updated &&
      typeof (updated as { likeCount: unknown }).likeCount === 'number' &&
      Number.isFinite((updated as { likeCount: number }).likeCount)
        ? Math.max(0, Math.floor((updated as { likeCount: number }).likeCount))
        : nextCount;

    ctx.body = { likeCount };
  },
}));
