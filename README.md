# Campusly Student Management

Campusly is a Node.js student management app with MongoDB-backed accounts, student records, courses, attendance, and low-attendance alerts.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` if MongoDB is not using the local default.
3. Start MongoDB, then run `npm start`.
4. Open `http://localhost:3000` and register an account.

## Deploy on Render

The included `render.yaml` defines the web service. Create a MongoDB database on MongoDB Atlas, then create a Render Blueprint from this repository. Set `MONGODB_URI` in the Render service environment to the Atlas connection string; do not commit that value or put it in `render.yaml`. Allow the Render service to reach the Atlas cluster in Atlas Network Access. Once the deployment is healthy, open its Render URL and register an account.

The local `.data` folder and `.env` file are excluded from Git. Production data is stored in the configured MongoDB database.