// Turns a User-Agent string into the short phrase Login Activity shows next to
// a session ("Chrome on Windows"). Deliberately coarse: the point is to let
// someone recognise their own devices in a list, not to fingerprint them, so
// this reads a handful of well-known tokens and gives up gracefully rather than
// pulling in a UA-parsing dependency that tracks every browser build ever made.

const BROWSERS: [RegExp, string][] = [
  // Order matters — every Chromium browser also says "Chrome", and every
  // WebKit browser also says "Safari", so the specific names go first.
  [/\bEdgA?\//, "Edge"],
  [/\bOPR\/|\bOpera\//, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\bFirefox\/|\bFxiOS\//, "Firefox"],
  [/\bCriOS\//, "Chrome"],
  [/\bChrome\//, "Chrome"],
  [/\bSafari\//, "Safari"],
];

const PLATFORMS: [RegExp, string][] = [
  [/\bWindows NT\b/, "Windows"],
  [/\bAndroid\b/, "Android"],
  [/\biPhone\b/, "iPhone"],
  [/\biPad\b/, "iPad"],
  [/\bMac OS X\b|\bMacintosh\b/, "macOS"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bLinux\b/, "Linux"],
];

function match(ua: string, table: [RegExp, string][]) {
  for (const [re, name] of table) if (re.test(ua)) return name;
  return null;
}

export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  const browser = match(userAgent, BROWSERS);
  const platform = match(userAgent, PLATFORMS);
  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? "Unknown device";
}
