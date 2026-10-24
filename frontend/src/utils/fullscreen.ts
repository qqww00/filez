// Extended interfaces for cross-browser / mobile fullscreen support
export interface WebKitVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
  webkitDisplayingFullscreen?: boolean;
}

export interface WebKitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

export interface WebKitHTMLElement extends HTMLDivElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

export function getFullscreenElement(doc: Document = document): Element | null {
  if (typeof doc === 'undefined') return null;
  const webkitDoc = doc as WebKitDocument;
  return (
    webkitDoc.fullscreenElement ||
    webkitDoc.webkitFullscreenElement ||
    webkitDoc.mozFullScreenElement ||
    webkitDoc.msFullscreenElement ||
    null
  );
}

export function exitFullscreenAny(doc: Document = document): Promise<void> | void {
  if (typeof doc === 'undefined') return;
  const webkitDoc = doc as WebKitDocument;
  if (webkitDoc.exitFullscreen) {
    return webkitDoc.exitFullscreen().catch(() => {});
  } else if (webkitDoc.webkitExitFullscreen) {
    try {
      return webkitDoc.webkitExitFullscreen();
    } catch {
      // ignore
    }
  } else if (webkitDoc.mozCancelFullScreen) {
    try {
      return webkitDoc.mozCancelFullScreen();
    } catch {
      // ignore
    }
  } else if (webkitDoc.msExitFullscreen) {
    try {
      return webkitDoc.msExitFullscreen();
    } catch {
      // ignore
    }
  }
}

export type FullscreenStrategy =
  | 'container-standard'
  | 'container-webkit'
  | 'video-standard'
  | 'video-webkit'
  | 'pseudo';

export function isMobileDevice(nav?: Navigator, win?: Window): boolean {
  const currentNav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);
  const currentWin = win || (typeof window !== 'undefined' ? window : undefined);
  if (!currentNav) return false;
  const userAgent = currentNav.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const hasTouchScreen =
    Boolean(currentWin && 'ontouchstart' in currentWin) ||
    (currentNav.maxTouchPoints && currentNav.maxTouchPoints > 0) ||
    // @ts-expect-error msMaxTouchPoints vendor prefix
    Boolean(currentNav.msMaxTouchPoints && currentNav.msMaxTouchPoints > 0);
  return Boolean(
    isMobileUA || (hasTouchScreen && typeof currentWin?.innerWidth === 'number' && currentWin.innerWidth <= 1024)
  );
}

export async function lockOrientationLandscape(): Promise<void> {
  if (
    typeof screen !== 'undefined' &&
    screen.orientation &&
    typeof screen.orientation.lock === 'function'
  ) {
    try {
      await screen.orientation.lock('landscape');
    } catch {
      // Browsers may reject orientation lock if not supported or not in native fullscreen
    }
  }
}

export function unlockOrientation(): void {
  if (
    typeof screen !== 'undefined' &&
    screen.orientation &&
    typeof screen.orientation.unlock === 'function'
  ) {
    try {
      screen.orientation.unlock();
    } catch {
      // Ignore unlock errors
    }
  }
}

export async function requestFullscreenWithFallback(
  container: WebKitHTMLElement | null,
  video: WebKitVideoElement | null,
  onActivatePseudoFullscreen: () => void,
  allowNativeVideoFallback: boolean = false
): Promise<FullscreenStrategy> {
  const tryFallback = async (): Promise<FullscreenStrategy> => {
    // Only delegate to browser native video player if explicitly permitted (e.g. mobile browsers)
    if (allowNativeVideoFallback && video) {
      if (typeof video.webkitEnterFullscreen === 'function') {
        try {
          video.webkitEnterFullscreen();
          return 'video-webkit';
        } catch {
          // Fall through
        }
      }
      if (typeof video.requestFullscreen === 'function') {
        try {
          await video.requestFullscreen();
          return 'video-standard';
        } catch {
          // Fall through
        }
      }
    }
    // Default: Keep Filez custom player UI in fullscreen via CSS pseudo-fullscreen
    onActivatePseudoFullscreen();
    return 'pseudo';
  };

  if (container && typeof container.requestFullscreen === 'function') {
    try {
      await container.requestFullscreen();
      return 'container-standard';
    } catch {
      return await tryFallback();
    }
  } else if (
    container &&
    (typeof container.webkitRequestFullscreen === 'function' ||
      typeof container.webkitRequestFullScreen === 'function')
  ) {
    try {
      const fn =
        container.webkitRequestFullscreen ||
        container.webkitRequestFullScreen;
      fn?.call(container);
      return 'container-webkit';
    } catch {
      return await tryFallback();
    }
  } else {
    return await tryFallback();
  }
}
