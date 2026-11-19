# Conectar TuttoFit con Strava

La app vive en una página estática, así que no puede guardar tu acceso a Strava de forma segura. Este puente (un Cloudflare Worker gratuito) guarda ese acceso y le pasa tus actividades a la app. Se configura una sola vez.

## 1. Crea tu app de Strava
1. Entra en https://www.strava.com/settings/api
2. Rellena: nombre `TuttoFit`, categoría `Training`, sitio web `https://jorgetodo.github.io/plan-maraton/`, dominio de autorización `localhost`.
3. Apunta el **Client ID** y el **Client Secret**.

## 2. Autoriza el acceso a tus actividades
1. Abre en el navegador (cambia `TU_CLIENT_ID`):
   `https://www.strava.com/oauth/authorize?client_id=TU_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=read,activity:read_all`
2. Acepta. Te llevará a una página que no carga: copia de la barra de direcciones el valor que va después de `code=`.
3. En el Terminal del Mac, cambia los tres valores y ejecuta:
   ```
   curl -X POST https://www.strava.com/oauth/token -d client_id=TU_CLIENT_ID -d client_secret=TU_CLIENT_SECRET -d code=EL_CODIGO -d grant_type=authorization_code
   ```
4. De la respuesta, apunta el `refresh_token`.

## 3. Crea el puente en Cloudflare
1. Crea una cuenta gratuita en https://dash.cloudflare.com y ve a **Workers & Pages → Create → Worker**. Ponle de nombre `tuttofit-strava` y créalo.
2. Pulsa **Edit code**, borra lo que haya, pega el contenido de `strava-worker.js` y pulsa **Deploy**.
3. En **Settings → Variables and Secrets** añade:
   - `STRAVA_CLIENT_ID` (texto)
   - `STRAVA_CLIENT_SECRET` (secreto)
   - `STRAVA_REFRESH_TOKEN` (secreto)
   - `APP_KEY` (secreto): inventa una clave larga, por ejemplo de 30 caracteres.
4. Recomendado: en **Storage → KV** crea un espacio llamado `TOKENS` y enlázalo al Worker con el nombre `TOKENS`. Así el puente guarda el acceso cuando Strava lo renueva.
5. Apunta la dirección del Worker, del tipo `https://tuttofit-strava.TU-CUENTA.workers.dev`.

## 4. Conecta la app
En TuttoFit, ve a **Más → Strava**, pega la dirección del puente y la `APP_KEY`, y pulsa **Sincronizar ahora**. Desde ese momento, cada vez que abras la app se traerán tus actividades nuevas.

## Seguridad
- El Client Secret y el refresh token solo están en Cloudflare, nunca en la app ni en GitHub.
- Sin la `APP_KEY` el puente no devuelve nada.
- Para cortar el acceso: borra el Worker o revoca TuttoFit en https://www.strava.com/settings/apps
