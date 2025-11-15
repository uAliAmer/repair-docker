#!/bin/sh
# wait-for-it.sh - Wait for PostgreSQL to be ready before starting the application

set -e

host="$1"
shift
cmd="$@"

until nc -z -v -w30 "$host" 5432
do
  echo "Waiting for PostgreSQL at $host:5432..."
  sleep 2
done

echo "PostgreSQL is ready - executing command"
exec $cmd
