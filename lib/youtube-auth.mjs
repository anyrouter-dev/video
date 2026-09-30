#!/usr/bin/env node
/**
 * model-drop :: youtube-auth  (one-time OAuth setup)
 *
 *   YOUTUBE_CLIENT_ID=… YOUTUBE_CLIENT_SECRET=… node lib/youtube-auth.mjs
 *
 * Uploading to YouTube needs an OAuth refresh token, and a refresh token can
 * only be obtained by a human clicking a consent screen. This does that flow
 * locally and prints the three values to paste into `gh secret set`, so setup is
 * one command instead of hand-copying five things between two browser tabs.
 *
 * ── Before you run this ────────────────────────────────────────────────────
 *   1. https://console.cloud.google.com → create (or pick) a project
 *   2. Enable "YouTube Data API v3" for that project
 *   3. OAuth consent screen → External → add your own Gmail as a test user
 *      (an app in "Testing" mode only works for users you list; "unverified"
 *       is FINE here, it just means a scary-looking consent page for one person)
 *   4. Credentials → Create Credentials → OAuth client ID → Application type:
 *      **Desktop app**
 *   5. Download the JSON, or read client_id / client_secret out of it
 *
 * Desktop-app clients are why this works without a redirect URL registered
 * anywhere: Google accepts any loopback `http://127.0.0.1:<port>`.
 *
 * ── After it prints ────────────────────────────────────────────────────────
 *   In the VIDEO repo (not this one):
 *     gh secret set YOUTUBE_CLIENT_ID
 *     gh secret set YOUTUBE_CLIENT_SECRET
 *     gh secret set YOUTUBE_REFRESH_TOKEN
 *   Optional repo variables:
 *     gh variable set YT_PRIVACY unlisted
 *     gh variable set YT_TITLE_TEMPLATE "AnyRouter — {id}"
 *
 * Scope requested is `youtube.upload` and nothing else — the minimum that can
 * insert a video. There is no read access to your channel, no analytics, and it
 * cannot delete anything. Revoke it at
 * https://myaccount.google.com/permissions if you ever want it gone.
 */
import http from 'node:http';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const flag = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : ''; };
const port = +flag('port') || +(process.env.YOUTUBE_AUTH_PORT) || 8099;
const wait = +flag('wait') || 300; // seconds before giving up

const clientId = process.env.YOUTUBE_CLIENT_ID || flag('client-id');
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || flag('client-secret');

if (!clientId || !clientSecret) {
  console.error(`
  Missing credentials. Set both, then re-run:

    YOUTUBE_CLIENT_ID=… YOUTUBE_CLIENT_SECRET=… node lib/youtube-auth.mjs

  You need an OAuth client of type **Desktop app** from a Google Cloud project
  with the YouTube Data API v3 enabled. The full setup is in the header of
  lib/youtube-auth.mjs.
`);
  process.exit(1);
}

const redirect = `http://127.0.0.1:${port}`;
const scope = 'https://www.googleapis.com/auth/youtube.upload';
const url =
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirect)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(scope)}` +
  `&access_type=offline` +   // this is what makes a refresh token come back
  `&prompt=consent` +         // and this forces one, so a re-run actually rotates it
  `&state=anyrouter-model-drop`;

let settled = false;
const finish = code => {
  if (settled) return;
  settled = true;
  try { server.close(); } catch {}
  setTimeout(() => process.exit(code), 120); // let the response flush first
};

const server = http.createServer((req, res) => {
  const u = new URL(req.url, redirect);
  if (u.pathname !== '/oauth2/callback') {
    res.writeHead(404).end('not found');
    return;
  }
  const err = u.searchParams.get('error');
  const code = u.searchParams.get('code');

  if (err || !code) {
    res.writeHead(400, { 'content-type': 'text/html' }).end(
      `<body style="font:16px system-ui;padding:40px;max-width:36em">
       <h2>Authorization failed</h2>
       <p>Google returned <code>${err || 'no code'}</code>.</p>
       <p>Usually the consent screen is still in <em>Testing</em> mode and your
          Gmail is not listed as a test user — add it under
          OAuth consent screen → Test users.</p>
       <p>You can close this tab.</p></body>`);
    console.error(`\n  Authorization failed: ${err || 'no code returned'}`);
    return finish(1);
  }

  res.writeHead(200, { 'content-type': 'text/html' }).end(
    `<body style="font:16px system-ui;padding:40px;max-width:36em">
     <h2>Authorized.</h2>
     <p>Back in your terminal — the refresh token is printed there.</p>
     <p>You can close this tab.</p></body>`);

  exchange(code);
});

async function exchange(code) {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j)}`);

    if (!j.refresh_token) {
      console.error(`
  Google returned an access token but NO refresh token.

  That happens when an authorization for this client already exists and Google
  decides not to re-issue one. The `+ '`prompt=consent`' + ` above should force
  it; if it still did not, revoke the app at
  https://myaccount.google.com/permissions and run this again.
`);
      return finish(1);
    }

    // Probe the scope WITHOUT uploading anything.
    //
    // A resumable-init is the one call that proves everything we care about —
    // API enabled, youtube.upload granted, channel writable — while never
    // transferring a byte, because a session is only opened, not used.
    //
    // A previous version probed a bare POST and treated 403 as fatal, throwing
    // away a perfectly good refresh token. A 403 from YouTube is ambiguous: the
    // usual cause is `accessNotConfigured` (the API was never enabled on the
    // project), which has nothing to do with the OAuth grant. So the token is
    // ALWAYS printed, and the probe is reported as advice.
    const probe = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${j.access_token}`,
          'content-type': 'application/json',
          'x-upload-content-length': '1',
          'x-upload-content-type': 'video/mp4',
        },
        body: JSON.stringify({ snippet: { title: 'probe' }, status: { privacyStatus: 'private' } }),
      },
    );
    const probeBody = await probe.text().catch(() => '');
    let verdict;
    if (probe.status === 200 || probe.status === 201) {
      verdict = 'Verified: the API is enabled and youtube.upload is granted. Uploads will work.';
    } else if (/accessNotConfigured|SERVICE_DISABLED/i.test(probeBody)) {
      verdict =
        'The OAuth grant is fine, but the YouTube Data API v3 is NOT enabled on this project.\n' +
        '  → console.cloud.google.com → pick this project → APIs & Services → Library\n' +
        '  → "YouTube Data API v3" → Enable. Then re-run this (a new token is not needed —\n' +
        '  → re-run and the same flow will mint a fresh one; the stored token will then work).';
    } else if (probe.status === 401) {
      verdict = 'The access token was rejected. Re-run this command to mint a fresh one.';
    } else if (probe.status === 403) {
      verdict =
        `YouTube returned 403. The full reason is below — the usual causes are the API not\n` +
        `  being enabled, or the app still being in "Testing" mode with your channel not\n` +
        `  listed as a test user.`;
    } else {
      verdict = `Probe returned ${probe.status}. The token was still issued; uploads may work.`;
    }

    console.log(`
  ── Set these in the VIDEO repo ──────────────────────────────────────

  gh secret set YOUTUBE_CLIENT_ID
  ${clientId}

  gh secret set YOUTUBE_CLIENT_SECRET
  ${clientSecret}

  gh secret set YOUTUBE_REFRESH_TOKEN
  ${j.refresh_token}

  ── Optional ──────────────────────────────────────────────────────────

  gh variable set YT_PRIVACY unlisted
  gh variable set YT_TITLE_TEMPLATE "AnyRouter — {id}"

  ── Verification ──────────────────────────────────────────────────────

  ${verdict}

  Revoke later: https://myaccount.google.com/permissions
${probe.status >= 400 ? `\n  YouTube said:\n  ${probeBody.slice(0, 600).replace(/\n\s*/g, '\n  ')}\n` : ''}
`);
    finish(0);
  } catch (e) {
    console.error(`\n  Token exchange failed: ${e.message}`);
    finish(1);
  }
}

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n  Port ${port} is busy. Re-run with --port=8100 (any port works).`);
    return process.exit(1);
  }
  console.error(e.message);
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`
  Opening Google's consent screen in your browser.
  If it does not open, paste this URL:

  ${url}

  Waiting up to ${wait}s for the redirect on ${redirect} …
`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try { execFileSync(opener, [url], { stdio: 'ignore' }); } catch { /* headless is fine */ }
  setTimeout(() => {
    if (settled) return;
    console.error('\n  Timed out waiting for the consent redirect. Re-run when you are ready.');
    finish(1);
  }, wait * 1000);
});
