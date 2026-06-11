import { describe, it, expect, beforeEach } from '@jest/globals';

import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppVersionService } from '@modules/appversion/service/app-version.service';
import { AppVersionHistory } from '@modules/core/entities/appversion.entity';

/**
 * A clean single-dependency example: AppVersionService only injects one
 * repository, so it's the simplest illustration of the mock-the-repo pattern.
 */
describe('AppVersionService.checkVersion', () => {
  let service: AppVersionService;
  const repo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppVersionService,
        { provide: getRepositoryToken(AppVersionHistory), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(AppVersionService);
  });

  it('throws on an invalid platform', async () => {
    await expect(service.checkVersion('driver', 'windows', '1.0.0'))
      .rejects.toThrow(BadRequestException);
  });

  it('returns safe fallback defaults when no settings row exists', async () => {
    repo.findOne.mockResolvedValue(null);
    const res = await service.checkVersion('passenger', 'android', '9.9.9');
    expect(res).toEqual({
      minVersion: '9.9.9',
      latestVersion: '9.9.9',
      isForceUpdate: false,
      updateMessage: null,
    });
  });

  it('never forces an update when the row is disabled', async () => {
    repo.findOne.mockResolvedValue({ isEnabled: false, latestVersion: '2.0.0' });
    const res = await service.checkVersion('driver', 'ios', '1.0.0');
    expect(res.minVersion).toBe('0.0.0');
    expect(res.isForceUpdate).toBe(false);
  });

  it('returns the stored settings when enabled', async () => {
    repo.findOne.mockResolvedValue({
      isEnabled: true,
      minVersion: '1.3.0',
      latestVersion: '1.4.0',
      isForceUpdate: true,
      updateMessage: 'Update available',
    });
    const res = await service.checkVersion('driver', 'android', '1.0.0');
    expect(res).toEqual({
      minVersion: '1.3.0',
      latestVersion: '1.4.0',
      isForceUpdate: true,
      updateMessage: 'Update available',
    });
  });
});