// netlify/functions/auth.js
// Proveedor OAuth mínimo para Decap CMS (GitHub) como Netlify Function.
//
// Rutas:
//   - /.netlify/functions/auth
//        -> redirige a GitHub (authorize)
//   - /.netlify/functions/auth/callback?code=...&state=...
//        -> intercambia "code" por "access_token" y notifica al opener
//           con el formato que Decap espera:
//             "authorization:github:success:<TOKEN>"
//             "authorization:github:error:<ERR>"
//   - /.netlify/functions/auth/token?token=...  (opcional, compat)
//
// Requisitos en Netlify (Environment variables):
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET
//
// En GitHub (OAuth App):
//   Authorization callback URL:
//     https://TU-SITIO.netlify.app/.netlify/functions/auth/callback
//
// En /admin/config.yml:
//   backend:
//     name: github
//     repo: TU_USUARIO/labroute.github.io
//     branch: main
//     base_url: https://TU-SITIO.netlify.app
//     auth_endpoint: /.netlify/functions/auth
//     auth_type: implicit

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SCOPE = "public_repo"; // usa "repo" si el repo es privado

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

// Construye https://host actual (respeta proxy de Netlify)
const siteURL = (event) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host;
  return `${proto}://${host}`;
};

exports.handler = async (event) => {
  const url = new URL(event.rawUrl);
  const pathname = url.pathname;

  // 1) Inicio: redirige a GitHub para autorizar
  if (pathname.endsWith("/auth")) {
    const state = Math.random().toString(36).slice(2);
    const redirect_uri = `${siteURL(event)}/.netlify/functions/auth/callback`;

    const authorizeURL = new URL(GITHUB_AUTHORIZE);
    authorizeURL.searchParams.set("client_id", CLIENT_ID);
    authorizeURL.searchParams.set("redirect_uri", redirect_uri);
    authorizeURL.searchParams.set("scope", SCOPE);
    authorizeURL.searchParams.set("state", state);

    return {
      statusCode: 302,
      headers: { Location: authorizeURL.toString() },
    };
  }

   // 2) /auth/callback -> intercambia "code" por "access_token"
  if (pathname.endsWith("/callback")) {
    const code = url.searchParams.get("code");
    if (!code) return { statusCode: 400, body: "Missing code" };

    const tokenResp = await fetch(GITHUB_TOKEN, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = await tokenResp.json();
    const token = data && data.access_token ? String(data.access_token) : "";
    const err   = data.error || "oauth_error";

    const html = `
<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
  (function () {
    function send(msg){ if (window.opener) { window.opener.postMessage(msg, "*"); } }
    var token = ${JSON.stringify(token)};
    if (token) {
      // Formato clásico Decap:
      send("authorization:github:success:" + token);
      // Formato objeto (por compatibilidad):
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
    return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8" }, body: html };
  }

  // 3) Compat opcional
  if (pathname.endsWith("/token")) {
    const token = url.searchParams.get("token");
    if (!token) return { statusCode: 400, body: "Missing token" };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    };
  }

  // /auth/debug -> devuelve si las env vars existen (sin exponerlas)
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
  
  // Fallback: inicia flujo
  const base = `${siteURL(event)}/.netlify/functions/auth`;
  return { statusCode: 302, headers: { Location: base } };
};
