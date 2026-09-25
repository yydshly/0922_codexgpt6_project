/** Bound both connection and body-reading time. Failed requests remain retryable by providers. */
export const DATA_REQUEST_TIMEOUT_MS = 30_000;

export async function readDataJson<T>(url: string, label: string): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label}读取超时（30 秒）。网络恢复后可重试。`));
      controller.abort();
    }, DATA_REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${label}无法读取（HTTP ${response.status}）。请稍后重试。`);
        return await response.json() as T;
      })(),
      timeout,
    ]);
  } catch (error) {
    if (error instanceof TypeError) throw new Error(`${label}网络读取失败。连接恢复后可重试。`);
    if (error instanceof SyntaxError) throw new Error(`${label}格式无法识别。请重试或检查数据包。`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
