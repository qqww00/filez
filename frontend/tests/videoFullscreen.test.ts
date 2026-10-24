import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFullscreenElement,
  exitFullscreenAny,
  requestFullscreenWithFallback,
  isMobileDevice,
  lockOrientationLandscape,
  unlockOrientation,
  type WebKitHTMLElement,
  type WebKitVideoElement,
} from '../src/utils/fullscreen.ts';

test('getFullscreenElement detects standard and vendor-prefixed fullscreen elements', () => {
  const mockElement = {} as Element;

  // Standard document.fullscreenElement
  const docStandard = { fullscreenElement: mockElement } as unknown as Document;
  assert.strictEqual(getFullscreenElement(docStandard), mockElement);

  // WebKit prefixed
  const docWebKit = { webkitFullscreenElement: mockElement } as unknown as Document;
  assert.strictEqual(getFullscreenElement(docWebKit), mockElement);

  // Mozilla prefixed
  const docMoz = { mozFullScreenElement: mockElement } as unknown as Document;
  assert.strictEqual(getFullscreenElement(docMoz), mockElement);

  // Microsoft prefixed
  const docMS = { msFullscreenElement: mockElement } as unknown as Document;
  assert.strictEqual(getFullscreenElement(docMS), mockElement);

  // None active
  const docNone = {} as unknown as Document;
  assert.strictEqual(getFullscreenElement(docNone), null);
});

test('exitFullscreenAny invokes standard exitFullscreen if available', () => {
  let called = false;
  const doc = {
    exitFullscreen: () => {
      called = true;
      return Promise.resolve();
    },
  } as unknown as Document;

  exitFullscreenAny(doc);
  assert.strictEqual(called, true);
});

test('exitFullscreenAny falls back to webkitExitFullscreen if standard is absent', () => {
  let called = false;
  const doc = {
    webkitExitFullscreen: () => {
      called = true;
    },
  } as unknown as Document;

  exitFullscreenAny(doc);
  assert.strictEqual(called, true);
});

test('requestFullscreenWithFallback uses standard container.requestFullscreen when available and resolves', async () => {
  let pseudoActivated = false;
  let containerRequested = false;

  const mockContainer = {
    requestFullscreen: async () => {
      containerRequested = true;
    },
  } as unknown as WebKitHTMLElement;

  const strategy = await requestFullscreenWithFallback(
    mockContainer,
    null,
    () => {
      pseudoActivated = true;
    }
  );

  assert.strictEqual(containerRequested, true);
  assert.strictEqual(pseudoActivated, false);
  assert.strictEqual(strategy, 'container-standard');
});

test('requestFullscreenWithFallback prioritizes custom player (pseudo-fullscreen) on iOS Safari when container fullscreen is missing', async () => {
  let pseudoActivated = false;
  let videoFullscreenEntered = false;

  // On iOS Safari, container (HTMLDivElement) has no requestFullscreen or webkitRequestFullscreen
  const mockContainer = {} as unknown as WebKitHTMLElement;

  const mockVideo = {
    webkitEnterFullscreen: () => {
      videoFullscreenEntered = true;
    },
  } as unknown as WebKitVideoElement;

  const strategy = await requestFullscreenWithFallback(
    mockContainer,
    mockVideo,
    () => {
      pseudoActivated = true;
    }
  );

  // Custom UI is preserved via pseudo-fullscreen; native video player is NOT invoked
  assert.strictEqual(videoFullscreenEntered, false);
  assert.strictEqual(pseudoActivated, true);
  assert.strictEqual(strategy, 'pseudo');
});

test('requestFullscreenWithFallback prioritizes custom player (pseudo-fullscreen) when container.requestFullscreen rejects', async () => {
  let pseudoActivated = false;
  let videoFullscreenEntered = false;

  // On mobile browsers where container fullscreen rejects due to permissions
  const mockContainer = {
    requestFullscreen: async () => {
      throw new Error('NotAllowedError: Permissions check failed');
    },
  } as unknown as WebKitHTMLElement;

  const mockVideo = {
    webkitEnterFullscreen: () => {
      videoFullscreenEntered = true;
    },
  } as unknown as WebKitVideoElement;

  const strategy = await requestFullscreenWithFallback(
    mockContainer,
    mockVideo,
    () => {
      pseudoActivated = true;
    }
  );

  assert.strictEqual(videoFullscreenEntered, false);
  assert.strictEqual(pseudoActivated, true);
  assert.strictEqual(strategy, 'pseudo');
});

test('requestFullscreenWithFallback delegates to video.webkitEnterFullscreen only when allowNativeVideoFallback is true', async () => {
  let pseudoActivated = false;
  let videoFullscreenEntered = false;

  const mockContainer = {} as unknown as WebKitHTMLElement;

  const mockVideo = {
    webkitEnterFullscreen: () => {
      videoFullscreenEntered = true;
    },
  } as unknown as WebKitVideoElement;

  const strategy = await requestFullscreenWithFallback(
    mockContainer,
    mockVideo,
    () => {
      pseudoActivated = true;
    },
    true // allowNativeVideoFallback
  );

  assert.strictEqual(videoFullscreenEntered, true);
  assert.strictEqual(pseudoActivated, false);
  assert.strictEqual(strategy, 'video-webkit');
});

test('requestFullscreenWithFallback activates pseudo-fullscreen when all native APIs fail or are unsupported', async () => {
  let pseudoActivated = false;

  const mockContainer = {
    requestFullscreen: async () => {
      throw new Error('NotAllowedError');
    },
  } as unknown as WebKitHTMLElement;

  const mockVideo = {
    webkitEnterFullscreen: () => {
      throw new Error('Video fullscreen unsupported');
    },
  } as unknown as WebKitVideoElement;

  const strategy = await requestFullscreenWithFallback(
    mockContainer,
    mockVideo,
    () => {
      pseudoActivated = true;
    }
  );

  assert.strictEqual(pseudoActivated, true);
  assert.strictEqual(strategy, 'pseudo');
});

test('requestFullscreenWithFallback delegates to video.requestFullscreen on mobile Chrome when container rejects and allowNativeVideoFallback is true', async () => {
  let pseudoActivated = false;
  let videoStandardEntered = false;

  const mockContainer = {
    requestFullscreen: async () => {
      // Insecure context or permissions error on mobile Chrome (e.g. http://<ip>:3000)
      throw new Error('NotAllowedError: Permissions check failed');
    },
  } as unknown as WebKitHTMLElement;

  const mockVideo = {
    requestFullscreen: async () => {
      videoStandardEntered = true;
    },
  } as unknown as WebKitVideoElement;

  const strategy = await requestFullscreenWithFallback(
    mockContainer,
    mockVideo,
    () => {
      pseudoActivated = true;
    },
    true // allowNativeVideoFallback (enabled on mobile)
  );

  assert.strictEqual(videoStandardEntered, true);
  assert.strictEqual(pseudoActivated, false);
  assert.strictEqual(strategy, 'video-standard');
});

test('isMobileDevice detects mobile user agents and touch screens accurately', () => {
  // Emulate Mobile Chrome Android UA
  const androidNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    maxTouchPoints: 5,
  } as unknown as Navigator;
  const androidWin = {
    innerWidth: 412,
  } as unknown as Window;
  assert.strictEqual(isMobileDevice(androidNav, androidWin), true);

  // Emulate iPhone Mobile Safari/Chrome UA
  const iphoneNav = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
    maxTouchPoints: 5,
  } as unknown as Navigator;
  const iphoneWin = {
    innerWidth: 390,
  } as unknown as Window;
  assert.strictEqual(isMobileDevice(iphoneNav, iphoneWin), true);

  // Emulate Desktop Chrome
  const desktopNav = {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    maxTouchPoints: 0,
  } as unknown as Navigator;
  const desktopWin = {
    innerWidth: 1920,
  } as unknown as Window;
  assert.strictEqual(isMobileDevice(desktopNav, desktopWin), false);
});

test('lockOrientationLandscape and unlockOrientation execute safely without throwing', async () => {
  const originalScreen = globalThis.screen;

  try {
    let locked = false;
    let unlocked = false;

    // @ts-expect-error mock screen
    globalThis.screen = {
      orientation: {
        lock: async (mode: string) => {
          assert.strictEqual(mode, 'landscape');
          locked = true;
        },
        unlock: () => {
          unlocked = true;
        },
      },
    };

    await lockOrientationLandscape();
    assert.strictEqual(locked, true);

    unlockOrientation();
    assert.strictEqual(unlocked, true);
  } finally {
    // @ts-expect-error restore
    globalThis.screen = originalScreen;
  }
});
