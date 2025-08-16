// netlify/functions/auth.js
// Proveedor OAuth mínimo para Decap CMS con GitHub (Netlify Function).

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SCOPE = "public_repo"; // usa "repo" si tu repo es privado

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

const siteURL = (event) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host;
  return `${proto}://${host}`;
};

exports.handler = async (event) => {
  const url = new URL(event.rawUrl);
  const pathname = url.pathname;

  // Diagnóstico: verifica que las env vars estén presentes (no expone valores).
  if (pathname.endsWith("/debug")) {
    const idOk = !!CLIENT_ID && CLIENT_ID.length > 10;
    const secretOk = !!CLIENT_SECRET && CLIENT_SECRET.length > 10;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        env_ok: idOk && secretOk,
        client_id_present: idOk,
        client_secret_present: secretOk
      }),
    };
  }

  // 1) /.netlify/functions/auth  -> redirige a GitHub para autorizar
  if (pathname.endsWith("/auth")) {
    const state = Math.random().toString(36).slice(2);
    const redirect_uri = `${siteURL(event)}/.netlify/functions/auth/callback`;

    const authorizeURL = new URL(GITHUB_AUTHORIZE);
    authorizeURL.searchParams.set("client_id", CLIENT_ID);
    authorizeURL.searchParams.set("redirect_uri", redirect_uri);
    authorizeURL.searchParams.set("scope", SCOPE);
    authorizeURL.searchParams.set("state", state);

    return { statusCode: 302, headers: { Location: authorizeURL.toString() } };
  }

  // 2) /.netlify/functions/auth/callback -> intercambio code -> access_token
  if (pathname.endsWith("/callback")) {
    const code = url.searchParams.get("code");
    if (!code) return { statusCode: 400, body: "Missing code" };

    try {
      const tokenResp = await fetch(GITHUB_TOKEN, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        }),
      });
      const data = await tokenResp.json();
      const token = data && data.access_token ? String(data.access_token) : "";
      const err   = data.error || "oauth_error";

      // Envía ambos formatos (string y objeto) por compatibilidad con Decap CMS.
      const html = `
<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
  (function () {
    function send(msg){ if (window.opener) { window.opener.postMessage(msg, "*"); } }
    var token = ${JSON.stringify(token)};
    if (token) {
      send("authorization:github:success:" + token);
      send({ token: token, provider: "github" });
    } else {
      send("authorization:github:error:${err}");
      send({ error: "${err}", provider: "github" });
    }
    window.close();
  })();
</script>
Cerrando…
</body></html>`;
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: html,
      };
    } catch (e) {
      const html = `
<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
  (function () {
    if (window.opener) {
      window.opener.postMessage("authorization:github:error:${(e && e.message) || "exception"}", "*");
    }
    window.close();
  })();
</script>
Error
</body></html>`;
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: html,
      };
    }
  }

  // 3) Compat opcional: /.netlify/functions/auth/token?token=XYZ
  if (pathname.endsWith("/token")) {
    const token = url.searchParams.get("token");
    if (!token) return { statusCode: 400, body: "Missing token" };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    };
  }

  // Fallback: inicia flujo en /auth
  const base = `${siteURL(event)}/.netlify/functions/auth`;
  return { statusCode: 302, headers: { Location: base } };
};
