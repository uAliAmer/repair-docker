#!/bin/bash

# Quick fix to get SSL for fix.nixflow.xyz
cd /root/n8n

echo "Quick SSL Setup for fix.nixflow.xyz"
echo "===================================="
echo ""

# 1. Ensure directories exist
echo "1. Creating directories..."
mkdir -p nginx/conf nginx/certbot nginx/ssl
chmod 755 nginx/certbot

# 2. Create minimal nginx config
echo "2. Creating minimal nginx config..."
cat > nginx/conf/minimal.conf << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    
    # Only serve ACME challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
        default_type "text/plain";
    }
    
    location / {
        return 404;
    }
}
EOF

# 3. Restart nginx
echo "3. Restarting nginx..."
docker compose restart nginx
sleep 3

# 4. Test with a file
echo "4. Testing ACME challenge..."
echo "test" > nginx/certbot/test.txt
if curl -s http://fix.nixflow.xyz/.well-known/acme-challenge/test.txt | grep -q "test"; then
    echo "✓ ACME challenge working!"
else
    echo "✗ ACME challenge failed. Debugging..."
    echo ""
    echo "Checking container:"
    docker exec $(docker compose ps -q nginx) ls -la /var/www/certbot/ || echo "Directory issue"
    echo ""
    echo "Nginx error log:"
    docker compose logs nginx --tail=10
fi
rm -f nginx/certbot/test.txt

# 5. Get certificate
echo ""
echo "5. Requesting certificate for fix.nixflow.xyz..."
docker compose run --rm \
    --entrypoint certbot \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@nixflow.xyz \
    --agree-tos \
    --no-eff-email \
    --staging \
    -d fix.nixflow.xyz

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Test certificate obtained!"
    echo ""
    echo "Now get the real certificate (remove --staging):"
    echo "docker compose run --rm --entrypoint certbot certbot certonly --webroot --webroot-path=/var/www/certbot --email admin@nixflow.xyz --agree-tos --no-eff-email --force-renewal -d fix.nixflow.xyz"
else
    echo ""
    echo "✗ Failed. Check the error above."
fi
