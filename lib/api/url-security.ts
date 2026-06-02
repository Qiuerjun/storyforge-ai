// lib/api/url-security.ts
// SSRF 防护 - 限制服务端出站请求的目标地址

/**
 * 检查 URL 是否为安全的外部请求目标
 * 阻止对内部/私有网络地址的请求
 *
 * @returns 如果 URL 安全返回 true，否则返回错误消息字符串
 */
export function validateExternalUrl(urlString: string): true | string {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return "URL 格式无效";
  }

  // 只允许 http/https 协议
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "只允许 http 和 https 协议";
  }

  const hostname = url.hostname.toLowerCase();

  // 阻止私有/内部地址
  if (isPrivateOrReservedHostname(hostname)) {
    return "不允许访问内部网络地址";
  }

  return true;
}

/**
 * 判断主机名是否为私有或保留地址
 */
function isPrivateOrReservedHostname(hostname: string): boolean {
  // localhost
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return true;
  }

  // 127.x.x.x 回环地址
  if (hostname.startsWith("127.")) {
    return true;
  }

  // 0.0.0.0
  if (hostname === "0.0.0.0") {
    return true;
  }

  // 10.x.x.x 私有地址
  if (hostname.startsWith("10.")) {
    return true;
  }

  // 172.16-31.x.x 私有地址
  if (hostname.startsWith("172.")) {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
  }

  // 192.168.x.x 私有地址
  if (hostname.startsWith("192.168.")) {
    return true;
  }

  // 169.254.x.x 链路本地地址（AWS metadata 等）
  if (hostname.startsWith("169.254.")) {
    return true;
  }

  // IPv6 私有地址
  if (hostname === "::1" || hostname === "[::1]") {
    return true;
  }
  if (hostname.startsWith("fe80:") || hostname.startsWith("[fe80:")) {
    return true;
  }
  if (hostname.startsWith("fc00:") || hostname.startsWith("[fc00:")) {
    return true;
  }
  if (hostname.startsWith("fd00:") || hostname.startsWith("[fd00:")) {
    return true;
  }

  // IPv6 映射的 IPv4
  if (hostname.startsWith("::ffff:")) {
    return true;
  }

  return false;
}
