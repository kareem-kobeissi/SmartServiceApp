# Smart Service

Smart Service is a graduation-project mobile application that connects customers with nearby service providers. It uses React Native with Expo and JavaScript, with a Node.js/Express backend and MongoDB Atlas.

## Main capabilities

- Customer and provider registration and JWT authentication
- Provider services, availability, and GPS location
- Customer service requests with optional images and GPS coordinates
- Nearby-provider discovery and provider selection
- Request acceptance, rejection, and full service lifecycle
- Live updates with Socket.IO and Expo push notifications
- Live provider-location sharing for active requests
- Explainable priority, price, and duration estimation
- Customer ratings and provider reviews

## Project structure

- `src/` — Expo React Native application
- `backend/` — Express API, MongoDB models, Socket.IO, and tests
- `report/` — graduation-project documentation and screen-flow artifacts

## Mobile setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and configure the public API URL. Android map builds also require your own restricted `GOOGLE_MAPS_API_KEY`.

```bash
npx expo start
```

For Expo Web, use `EXPO_PUBLIC_API_URL=http://localhost:5000`. A physical phone must use the computer's local IPv4 address.

## Backend setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and provide private values for `MONGODB_URI` and `JWT_SECRET`.

```bash
npm run dev
```

Health check: `http://localhost:5000/api/health`

## Private configuration

The repository intentionally excludes local environment files, MongoDB credentials, JWT secrets, Android Firebase configuration, uploaded images, and Google Maps API keys. Supply your own `google-services.json` for Android push-notification builds.
