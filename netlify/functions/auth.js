// netlify/functions/auth.js
// Mini proveedor OAuth para Decap CMS (GitHub) como Netlify Function.
// Rutas usadas por Decap CMS:
//   - /.netlify/functions/auth          -> inicio (redirect a GitHub)
//   - /.netlify/functions/auth/callback -> intercambio de "code" por "access_token"
//   - /.netlify/functions/auth/token    -> entrega del token al cliente

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

  // 1) /auth -> redirige a GitHub
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
    if (!code) {
      return { statusCode: 400, body: "Missing code" };
    }

    // Intercambio en GitHub
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

    // Devuelve una página que guarda el token y cierra el popup (flujo Decap)
    const html = `
<!doctype html><html><body>
<script>
  (function() {
    function send(msg){ window.opener && window.opener.postMessage(msg, "*"); }
    if (${JSON.stringify(!!data.access_token)}) {
      send({ token: ${JSON.stringify(data.access_token)}, provider: "github" });
    } else {
      send({ error: ${JSON.stringify(data.error || "oauth_error")} });
    }
    window.close();
  })();
</script>
Cerrando…
</body></html>`;
    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  }

  // 3) /auth/token -> (opcional) compat; devuelve token si viene en query
  if (pathname.endsWith("/token")) {
    const token = url.searchParams.get("token");
    if (!token) return { statusCode: 400, body: "Missing token" };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    };
  }

  // fallback: redirige a /auth
  const base = `${siteURL(event)}/.netlify/functions/auth`;
  return { statusCode: 302, headers: { Location: base } };
};
