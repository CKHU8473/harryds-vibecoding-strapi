import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Core, Modules } from '@strapi/strapi';

type ProfileInput = Modules.Documents.Params.Data.Input<'api::profile.profile'>;

/** 1×1 transparent PNG — used only when no file is provided (see seed logs). */
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const PROFILE_UID = 'api::profile.profile' as const;

const SEED_DATA = {
  name: '豆皮壽司',
  info: "Hi I'm Inarisusi!",
  socialLinks: [
    { icon: 'instagram' as const, label: 'Instagram', url: 'https://instagram.com' },
    { icon: 'medium' as const, label: 'Medium', url: 'https://medium.com' },
    { icon: 'linkedin' as const, label: 'Linkedin', url: 'https://linkedin.com' },
  ],
};

function resolveAvatarSourcePath(strapi: Core.Strapi): { filePath: string; cleanup: () => void; label: string } {
  const envPath = process.env.PROFILE_SEED_AVATAR_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { filePath: path.resolve(envPath), cleanup: () => {}, label: `PROFILE_SEED_AVATAR_PATH (${envPath})` };
  }

  const repoSeed = path.join(strapi.dirs.app.root, 'scripts', 'seed-assets', 'avatar.png');
  if (fs.existsSync(repoSeed)) {
    return { filePath: repoSeed, cleanup: () => {}, label: 'scripts/seed-assets/avatar.png' };
  }

  const tmp = path.join(os.tmpdir(), `strapi-profile-seed-avatar-${Date.now()}.png`);
  fs.writeFileSync(tmp, Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64'));
  return {
    filePath: tmp,
    cleanup: () => {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    },
    label: 'embedded 1×1 PNG placeholder (set PROFILE_SEED_AVATAR_PATH or add scripts/seed-assets/avatar.png)',
  };
}

async function uploadSeedAvatar(strapi: Core.Strapi): Promise<number | undefined> {
  const { filePath, cleanup, label } = resolveAvatarSourcePath(strapi);
  strapi.log.info(`[seed:profile] Avatar source: ${label}`);

  try {
    const stat = fs.statSync(filePath);
    const uploaded = await strapi.plugin('upload').service('upload').upload({
      data: {
        fileInfo: {
          alternativeText: 'Profile avatar',
          caption: 'Seeded from profile.json',
        },
      },
      files: {
        filepath: filePath,
        originalFilename: path.basename(filePath),
        mimetype: 'image/png',
        size: stat.size,
      },
    });

    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (file && typeof file.id === 'number') {
      return file.id;
    }
    return undefined;
  } finally {
    cleanup();
  }
}

export async function seedProfile(strapi: Core.Strapi) {
  if (process.env.SEED_PROFILE === '0') {
    strapi.log.info('[seed:profile] Skipped (SEED_PROFILE=0).');
    return;
  }

  const existing = await strapi.documents(PROFILE_UID).findFirst();
  if (existing?.name === SEED_DATA.name) {
    strapi.log.info('[seed:profile] Already seeded, skipping.');
    return;
  }

  let avatarId: number | undefined;
  try {
    avatarId = await uploadSeedAvatar(strapi);
  } catch (err) {
    strapi.log.warn('[seed:profile] Avatar upload failed; seeding without avatar.', err);
  }

  const data: ProfileInput = {
    name: SEED_DATA.name,
    info: SEED_DATA.info,
    socialLinks: SEED_DATA.socialLinks,
    ...(avatarId != null ? { avatar: avatarId } : {}),
  };

  if (existing) {
    await strapi.documents(PROFILE_UID).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
    strapi.log.info('[seed:profile] Updated profile single-type and published.');
  } else {
    await strapi.documents(PROFILE_UID).create({
      data,
      status: 'published',
    });
    strapi.log.info('[seed:profile] Created profile single-type and published.');
  }
}
