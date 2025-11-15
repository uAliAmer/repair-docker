#!/bin/bash

echo "ACME Challenge Debug Script"
echo "==========================="

# Test if nginx container is running
echo "1. Checking if nginx is running..."
docker ps | grep nginx

# Create a test file in the certbot directory
echo "2. Creating test file in certbot directory..."
TEST_FILE="test-$(date +%s).txt"
echo "This is a test file for ACME challenge" > ~/n8n/nginx/certbot/$TEST_FILE

# Check if file exists
echo "3. Checking if test file was created..."
ls -la ~/n8n/nginx/certbot/

# Test if the file is accessible via HTTP
echo "4. Testing HTTP access to .well-known/acme-challenge/..."
curl -I http://fix.nixflow.xyz/.well-known/acme-challenge/$TEST_FILE

# Check nginx logs
echo "5. Recent nginx error logs:"
docker logs nginx --tail 20 2>&1 | grep -E "(error|403|.well-known)"

# Check directory permissions inside container
echo "6. Checking permissions inside nginx container..."
docker exec nginx ls -la /var/www/certbot/ 2>/dev/null || echo "Directory might not exist in container"

# Clean up
echo "7. Cleaning up test file..."
rm ~/n8n/nginx/certbot/$TEST_FILE

echo ""
echo "Debug complete. Look for any 403 errors or permission issues above."
