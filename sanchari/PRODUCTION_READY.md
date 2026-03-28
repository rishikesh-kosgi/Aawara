# Production Readiness Notes

## Backend

- Runtime config is now environment-driven.
- PostgreSQL is already in use locally, so moving to AWS RDS PostgreSQL later is mainly a `DATABASE_URL` and `PGSSL_MODE` change.
- Security headers and rate limiting are enabled in the backend.
- CORS is controlled by `CORS_ORIGINS`.
- PM2 config is scaffolded in `touristspot-backend/ecosystem.config.js`.

### Required production backend env

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=5000`
- `DATABASE_URL=postgresql://...`
- `PGSSL_MODE=no-verify` or stricter for your RDS setup
- `JWT_SECRET=<long random secret>`
- `GOOGLE_WEB_CLIENT_ID=<your production Google web client id>`
- `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

## Android app

- Debug and release now use different cleartext policies.
- Release build is prepared for shrink/minify.
- Release signing is scaffolded through Gradle properties.
- Create a real keystore before Play Store upload.

### Required release signing values

Copy `touristspot/android/keystore.properties.example` into your local Gradle properties setup and provide:

- `RELEASE_STORE_FILE`
- `RELEASE_STORE_PASSWORD`
- `RELEASE_KEY_ALIAS`
- `RELEASE_KEY_PASSWORD`
- `GOOGLE_MAPS_API_KEY` if you return to native Google Maps later

## API base URL

- Development builds can still use local fallback URLs.
- Release builds no longer fall back to localhost or LAN IPs.
- Release builds expect the production backend URL to be reachable through the hosted config JSON or cached base URL.

## Remaining external work before launch

- Put backend behind HTTPS on EC2 with Nginx.
- Point the hosted API config JSON to the final HTTPS API base URL.
- Create the Google Sign-In production OAuth setup for the final Android package name and SHA certificate fingerprints.
- Create the Android release keystore and store it safely.
- Add privacy policy and Play Store listing assets.
- Move uploaded media to S3 if you do not want EC2 local disk dependence in production.
