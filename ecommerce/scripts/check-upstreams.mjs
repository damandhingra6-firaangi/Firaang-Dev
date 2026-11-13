import { lookup } from "node:dns/promises";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const environmentPath = fileURLToPath(new URL("../.env.local", import.meta.url));
if (existsSync(environmentPath)) process.loadEnvFile(environmentPath);

if (!process.argv.includes("--probe")) {
  const nextVersion = JSON.parse(readFileSync(new URL("../node_modules/next/package.json", import.meta.url), "utf8")).version;
  console.log(JSON.stringify({ node: process.version, next: nextVersion, platform: process.platform,
    proxyEnvironmentPresent: ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"].filter((key) => Boolean(process.env[key])),
    environmentProxyOptInSupported: process.allowedNodeEnvironmentFlags.has("--use-env-proxy"),
  }));
  for (const [profile, flags] of [
    ["default", ""],
    ["ipv4first", "--dns-result-order=ipv4first"],
    ["no-family-autoselection", "--no-network-family-autoselection"],
    ["ipv4first-and-no-autoselection", "--dns-result-order=ipv4first --no-network-family-autoselection"],
  ]) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--probe"], {
      env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, flags].filter(Boolean).join(" "), UPSTREAM_PROBE_PROFILE: profile },
      encoding: "utf8", timeout: 45_000,
    });
    process.stdout.write(result.stdout ?? "");
    if (result.status !== 0) {
      console.error(JSON.stringify({ profile, probeFailed: true, code: result.error?.code ?? `EXIT_${result.status}` }));
      process.exitCode = 1;
    }
  }
} else {
  const hosts = new Set(["cdn.shopify.com", "api.resend.com", "api.twilio.com", "verify.twilio.com", "api.razorpay.com"]);
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (storeDomain) {
    try { hosts.add(new URL(storeDomain.includes("://") ? storeDomain : `https://${storeDomain}`).hostname); }
    catch { console.error(JSON.stringify({ invalidEnvironmentVariable: "SHOPIFY_STORE_DOMAIN" })); process.exitCode = 1; }
  } else console.log(JSON.stringify({ missingEnvironmentVariable: "SHOPIFY_STORE_DOMAIN" }));

  await Promise.all([...hosts].map(async (host) => {
    const started = Date.now();
    let families = [];
    try {
      families = [...new Set((await lookup(host, { all: true })).map((entry) => entry.family))];
      const response = await fetch(`https://${host}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
      console.log(JSON.stringify({ profile: process.env.UPSTREAM_PROBE_PROFILE, host, families, status: response.status, reachable: true, elapsedMs: Date.now() - started }));
    } catch (error) {
      console.log(JSON.stringify({ profile: process.env.UPSTREAM_PROBE_PROFILE, host, families, reachable: false,
        code: error.cause?.code ?? error.code ?? error.name,
        causes: error.cause?.errors?.map((cause) => ({ code: cause.code, address: cause.address, port: cause.port })),
        elapsedMs: Date.now() - started,
      }));
      process.exitCode = 1;
    }
  }));
}