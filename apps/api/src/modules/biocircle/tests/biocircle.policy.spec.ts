import {
  canDiscover,
  canSendInvite,
  canViewBioBook,
  canViewPhotos,
  canViewMetrics,
  canViewAchievements,
  DEFAULT_PRIVACY,
  type PrivacySnapshot,
} from '../policies/biocircle.policy.js';

const EVERYONE: PrivacySnapshot = {
  discoverableBy: 'EVERYONE',
  invitesFrom: 'EVERYONE',
  bioBookVisible: 'EVERYONE',
  photosVisible: 'EVERYONE',
  metricsVisible: 'EVERYONE',
  achievementsVisible: 'EVERYONE',
};

const CONNECTIONS_ONLY: PrivacySnapshot = {
  discoverableBy: 'CONNECTIONS',
  invitesFrom: 'CONNECTIONS',
  bioBookVisible: 'CONNECTIONS',
  photosVisible: 'CONNECTIONS',
  metricsVisible: 'CONNECTIONS',
  achievementsVisible: 'CONNECTIONS',
};

const NOBODY: PrivacySnapshot = {
  discoverableBy: 'NOBODY',
  invitesFrom: 'NOBODY',
  bioBookVisible: 'NOBODY',
  photosVisible: 'NOBODY',
  metricsVisible: 'NOBODY',
  achievementsVisible: 'NOBODY',
};

describe('BioCircle Policy', () => {
  describe('canDiscover', () => {
    it('allows EVERYONE visibility for non-connected stranger', () => {
      expect(canDiscover(EVERYONE, false, false)).toBe(true);
    });

    it('denies CONNECTIONS visibility for stranger', () => {
      expect(canDiscover(CONNECTIONS_ONLY, false, false)).toBe(false);
    });

    it('allows CONNECTIONS visibility for connected user', () => {
      expect(canDiscover(CONNECTIONS_ONLY, false, true)).toBe(true);
    });

    it('denies NOBODY visibility for everyone', () => {
      expect(canDiscover(NOBODY, false, true)).toBe(false);
    });

    it('always allows owner to see themselves', () => {
      expect(canDiscover(NOBODY, true, false)).toBe(true);
    });

    it('uses DEFAULT_PRIVACY when settings is null', () => {
      expect(canDiscover(null, false, false)).toBe(true); // DEFAULT is EVERYONE
    });
  });

  describe('canSendInvite', () => {
    it('allows invite when invitesFrom is EVERYONE', () => {
      expect(canSendInvite(EVERYONE, false, false)).toBe(true);
    });

    it('denies invite when invitesFrom is NOBODY', () => {
      expect(canSendInvite(NOBODY, false, false)).toBe(false);
    });

    it('allows invite when connected and invitesFrom is CONNECTIONS', () => {
      expect(canSendInvite(CONNECTIONS_ONLY, false, true)).toBe(true);
    });
  });

  describe('canViewBioBook', () => {
    it('allows viewing when visibility is EVERYONE', () => {
      expect(canViewBioBook(EVERYONE, false, false)).toBe(true);
    });

    it('denies viewing for strangers when CONNECTIONS', () => {
      expect(canViewBioBook(CONNECTIONS_ONLY, false, false)).toBe(false);
    });

    it('allows viewing for connections when CONNECTIONS', () => {
      expect(canViewBioBook(CONNECTIONS_ONLY, false, true)).toBe(true);
    });
  });

  describe('canViewPhotos', () => {
    it('denies strangers when NOBODY', () => {
      expect(canViewPhotos(NOBODY, false, false)).toBe(false);
    });

    it('allows owner always', () => {
      expect(canViewPhotos(NOBODY, true, false)).toBe(true);
    });
  });

  describe('canViewMetrics', () => {
    it('uses same evaluation logic as other fields', () => {
      expect(canViewMetrics(EVERYONE, false, false)).toBe(true);
      expect(canViewMetrics(CONNECTIONS_ONLY, false, false)).toBe(false);
      expect(canViewMetrics(CONNECTIONS_ONLY, false, true)).toBe(true);
    });
  });

  describe('canViewAchievements', () => {
    it('respects EVERYONE visibility', () => {
      expect(canViewAchievements(EVERYONE, false, false)).toBe(true);
    });

    it('respects NOBODY visibility', () => {
      expect(canViewAchievements(NOBODY, false, true)).toBe(false);
    });
  });

  describe('DEFAULT_PRIVACY', () => {
    it('has EVERYONE discoverability', () => {
      expect(DEFAULT_PRIVACY.discoverableBy).toBe('EVERYONE');
    });

    it('has CONNECTIONS as default for content visibility', () => {
      expect(DEFAULT_PRIVACY.bioBookVisible).toBe('CONNECTIONS');
      expect(DEFAULT_PRIVACY.photosVisible).toBe('CONNECTIONS');
      expect(DEFAULT_PRIVACY.metricsVisible).toBe('CONNECTIONS');
      expect(DEFAULT_PRIVACY.achievementsVisible).toBe('CONNECTIONS');
    });
  });
});
