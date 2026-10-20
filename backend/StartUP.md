# Backend Development Setup

## Prerequisites

- Docker Engine must be installed and running. On Windows, start Docker Desktop and wait until the engine reports that it is running.
- Node.js and npm must be installed.
- A reachable MongoDB instance is required. Set `MONGO_URI` in the backend environment before starting the application. The application appends the database name `velo` to this URI.

## Start the development environment

Run the following commands from the `backend` directory.

1. Start Docker Desktop to make the Docker Engine available.
2. Start the Redis service used by the background queues:

	```sh
	docker compose up -d
	```

	The Compose configuration starts Redis on port `6379`. Its configured password is `velo-redis-queue`.

3. Install the backend dependencies:

	```sh
	npm i
	```

4. Start the API and background workers together:

	```sh
	npm run full-dev
	```

`full-dev` runs the API in watch mode and starts the email and bad-email workers. Keep this terminal open while developing. The API listens on port `3000` by default; set `PORT` to override it.

## Verify and stop services

Confirm that Docker Compose reports the Redis container as running and that the terminal shows the API and workers starting without errors. The application also requires a valid `MONGO_URI`; startup will fail if it cannot connect to MongoDB.

To stop the Compose services, run this from the `backend` directory:

```sh
docker compose down
```
