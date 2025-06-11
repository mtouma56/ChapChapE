#!/bin/sh
set -e

# Start the FastAPI backend
cd /backend || { echo "Backend directory not found"; exit 1; }

echo "Starting FastAPI backend"
# Start Uvicorn with proper host binding
uvicorn server:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

echo "Waiting for backend to respond..."
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -fs http://localhost:8001/api/ >/dev/null 2>&1; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Backend process exited before responding"
        exit 1
    fi
    ATTEMPT=$((ATTEMPT+1))
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        echo "Backend failed to respond after $MAX_ATTEMPTS attempts"
        kill $BACKEND_PID
        exit 1
    fi
    sleep 1
done
echo "Backend is up"

# Start Nginx
nginx -g 'daemon off;' &
NGINX_PID=$!

# Handle termination signals
trap 'kill $BACKEND_PID $NGINX_PID; exit 0' SIGTERM SIGINT

# Check if processes are still running
while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $NGINX_PID 2>/dev/null; do
    sleep 1
done

# If we get here, one of the processes died
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Nginx died, shutting down backend..."
    kill $BACKEND_PID
else
    echo "Backend died, shutting down nginx..."
    kill $NGINX_PID
fi

exit 1
