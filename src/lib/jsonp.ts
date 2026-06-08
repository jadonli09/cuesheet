/**
 * Minimal JSONP fetcher. Used so the static client can hit the iTunes Search
 * and Deezer public APIs directly from the browser without CORS preflight.
 */
let counter = 0;

export function jsonp<T = unknown>(
  baseUrl: string,
  params: Record<string, string>,
  callbackParam = 'callback',
  timeoutMs = 7000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__cuesheet_jsonp_${Date.now().toString(36)}_${counter++}`;
    const script = document.createElement('script');
    let timer: number | undefined;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
    };

    (window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    const search = new URLSearchParams({ ...params, [callbackParam]: cbName });
    script.src = `${baseUrl}?${search.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timed out'));
    }, timeoutMs);

    document.head.appendChild(script);
  });
}
