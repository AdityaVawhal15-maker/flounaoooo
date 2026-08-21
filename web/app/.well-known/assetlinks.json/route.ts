import { NextResponse } from "next/server";

// Digital Asset Links — proves flouna.com and the Android app are the same
// owner. Without this served over HTTPS at exactly
// /.well-known/assetlinks.json, a Trusted Web Activity falls back to showing
// a browser URL bar and stops looking like an installed app.
//
// The fingerprint is the SHA-256 of the signing key the APK is built with, set
// as ANDROID_SIGNING_SHA256 (uppercase hex, colon separated). Until it is set
// the route returns an empty list rather than a wrong claim.
export const dynamic = "force-static";

export function GET() {
  const fingerprint = process.env.ANDROID_SIGNING_SHA256;
  const packageName = process.env.ANDROID_PACKAGE_NAME ?? "com.flouna.app";

  const statements = fingerprint
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: packageName,
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ]
    : [];

  return NextResponse.json(statements, {
    headers: { "content-type": "application/json" },
  });
}
