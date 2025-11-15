# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-service repair tracking system for managing device repairs across multiple branches. The system includes:

- **Repair Tracker Backend**: Node.js/Express API with PostgreSQL database (Prisma ORM)
- **Frontend**: Static HTML/CSS/JavaScript pages served via Nginx
- **n8n**: Workflow automation for repair status notifications
- **Evolution API**: WhatsApp integration for customer notifications
- **PostgreSQL**: Shared database for all services (separate schemas)
- **Redis**: Caching layer for the backend API
- **Nginx**: Reverse proxy and SSL termination

## Architecture

### Multi-Database Setup
The PostgreSQL instance hosts three separate databases:
- `n8n`: n8n workflow data
- `evolution`: Evolution API WhatsApp sessions and messages
- `repair_tracker`: Main repair tracking application data (managed by Prisma)

Database users are created via init scripts in `postgres_init/`:
- `postgres_init/01-create-evolution-db.sh`
- `postgres_init/02-create-repair-db.sh`

### Service Communication
- Backend API exposes REST endpoints on port 3000 (proxied via Nginx)
- Backend sends webhook notifications to n8n at `N8N_WEBHOOK_URL`
- n8n workflows can trigger Evolution API for WhatsApp messages
- Frontend communicates with backend via `/api/*` endpoints through Nginx

### Data Flow for Repairs
1. User creates repair via frontend form
2. Backend creates repair record in PostgreSQL with unique `repairId` (format: RPR251112-123)
3. Backend generates QR code URL for tracking
4. Backend sends webhook to n8n with repair data
5. n8n workflow processes notification (can trigger WhatsApp via Evolution API)
6. Status updates follow same flow: Update → Database → n8n → Notifications

### Authentication
- JWT-based authentication for backend API
- Default users seeded via `backend/prisma/seed.js`
- Four roles: ADMIN, TECH (repair center), USER (branch), VIEWER
- Evolution API uses API key authentication (`AUTHENTICATION_API_KEY`)

## Common Development Commands

### Docker Operations
```bash
# Start all services
docker-compose up -d

# View logs for specific service
docker logs repair-tracker-backend -f
docker logs n8n -f
docker logs evolution-api -f

# Restart specific service
docker-compose restart backend
docker-compose restart nginx

# Stop all services
docker-compose down

# Rebuild and start (after code changes)
docker-compose up -d --build backend
```

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Prisma commands
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate       # Create and apply migration (dev)
npm run prisma:deploy        # Apply migrations (production)
npm run prisma:studio        # Open Prisma Studio GUI
npm run prisma:seed          # Seed default users

# Direct Prisma commands
npx prisma migrate dev --name <migration_name>
npx prisma db push           # Push schema without migration
npx prisma studio            # Database GUI on http://localhost:5555
```

### Database Access

```bash
# Access PostgreSQL via docker
docker exec -it <postgres-container-name> psql -U n8n -d repair_tracker

# Access repair_tracker database as repair_user
docker exec -it <postgres-container-name> psql -U repair_user -d repair_tracker

# View all databases
docker exec -it <postgres-container-name> psql -U n8n -c "\l"
```

### Frontend Development

Frontend files are in `frontend/` and served by Nginx at `/usr/share/nginx/html/repair`:
- `index.html` - Main landing page
- `Dashboard.html` - Admin dashboard for viewing all repairs
- `RepairForm.html` - Form for creating new repairs
- `RepairCenter.html` - Repair center management interface
- `track.html` - Public tracking page (customer-facing)
- `QRScanner.html` - QR code scanner for quick lookup
- `Reports.html` - Reporting and analytics

Changes to frontend files require nginx reload:
```bash
docker-compose restart nginx
```

### SSL Certificates

SSL managed via Let's Encrypt and Certbot:
```bash
# Request new certificate
docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d domain.example.com

# Renew certificates (automatic via certbot service)
docker-compose run --rm certbot renew

# Reload nginx after cert changes
docker exec nginx nginx -s reload
```

## Environment Configuration

All configuration is in `.env` file. Key variables:

### Database
- `DATABASE_URL`: Prisma connection string for repair_tracker database
- PostgreSQL credentials for each service (n8n, evolution, repair_tracker)

### Backend API
- `JWT_SECRET`: Secret for JWT token signing (change in production!)
- `ALLOWED_ORIGINS`: CORS whitelist
- `N8N_WEBHOOK_URL`: Webhook endpoint for n8n integration
- `PUBLIC_TRACKING_URL`: Base URL for customer tracking links
- `REDIS_URL`: Redis connection string

### n8n
- `N8N_HOST`, `N8N_PROTOCOL`: External access configuration
- `DB_POSTGRESDB_*`: PostgreSQL connection details
- `WEBHOOK_URL`: Public webhook base URL

### Evolution API
- `EVOLUTION_API_KEY`: Authentication key
- `DATABASE_CONNECTION_URI`: PostgreSQL connection for Evolution
- `CACHE_REDIS_URI`: Redis connection for Evolution caching

## Backend Code Structure

```
backend/src/
├── config/          # Configuration and constants
│   ├── constants.js
│   └── database.js  # Prisma client singleton
├── controllers/     # Request handlers
│   ├── authController.js
│   └── repairController.js
├── middleware/      # Express middleware
│   ├── auth.js              # JWT authentication
│   ├── errorHandler.js      # Global error handler
│   └── validation.js        # Request validation
├── routes/          # Route definitions
│   ├── authRoutes.js
│   └── repairRoutes.js
├── services/        # Business logic
│   ├── n8nService.js        # n8n webhook integration
│   └── repairService.js     # Repair CRUD operations
├── utils/           # Utilities
│   ├── fileUpload.js        # Multer configuration
│   ├── qrCode.js            # QR code generation
│   └── repairId.js          # Unique ID generation
└── server.js        # Main Express app
```

### Prisma Schema Key Models

**User**: Manages authentication and authorization
- Roles: ADMIN, TECH, USER, VIEWER
- Relations: created repairs, history entries, notes

**Repair**: Main repair tracking entity
- Unique `repairId` in format RPR[YYMMDD]-[sequence]
- Status progression tracked via `RepairStatus` enum
- Includes customer info, device details, costs, dates

**RepairHistory**: Audit log for all repair actions
- Tracks status changes and activities
- Links to User for accountability

**Note**: Customer-facing notes on repairs
- Timestamped text entries
- Associated with specific repair and user

**RepairStatus enum**: Defines repair lifecycle
- Branch reception: RECEIVED_AQD, RECEIVED_BABYLON, RECEIVED_CAMP
- Repair center: RECEIVED_CENTER, IN_REPAIR, REPAIR_COMPLETE, UNREPAIRABLE
- Return: READY_FOR_PICKUP, DELIVERED_TO_CUSTOMER

## Important Notes

### Modifying the Database Schema
1. Edit `backend/prisma/schema.prisma`
2. Create migration: `npm run prisma:migrate` (development) or generate SQL migration files
3. In production, backend container automatically runs `prisma migrate deploy` on startup (see `backend/start.sh`)
4. Prisma Client is regenerated automatically during migrations

### Adding API Endpoints
1. Create/modify controller in `backend/src/controllers/`
2. Add route in `backend/src/routes/`
3. Add authentication middleware if needed: `router.use(authenticate)`
4. Add validation middleware: `validate([validationRules])`
5. Update CORS settings if new origins needed

### n8n Webhook Integration
- Backend sends POST requests to `N8N_WEBHOOK_URL` on repair events
- Webhook payload includes full repair object + action type
- n8n workflows are configured via n8n UI at port 5678
- n8n data persists in `n8n_data/` volume

### File Uploads
- Images stored in `backend/uploads/images/`
- Served via Express static middleware at `/uploads` path
- Nginx also mounts `backend/uploads` for direct serving
- Max file size: 5MB (configurable via `MAX_FILE_SIZE`)
- Allowed types: jpeg, png, jpg

### Default Credentials (Change in Production!)
After seeding, default users are:
- admin / Admin@123 (ADMIN role)
- tech / Tech@123 (TECH role)
- user / User@123 (USER role)
- viewer / View@123 (VIEWER role)

### Nginx Routing
- `/api/*` → Backend service (port 3000)
- `/` → Frontend static files
- `/webhook/*` → n8n service (port 5678)
- `/evolution/*` → Evolution API (port 8080)
- `/uploads/*` → Backend uploaded files

## Testing

When testing the API:
```bash
# Health check
curl http://localhost:3000/health

# Login (get JWT token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Create repair (requires JWT)
curl -X POST http://localhost:3000/api/repairs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...repair data...}'
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is ready: `docker logs <postgres-container>`
- Check database connection: Verify `DATABASE_URL` in `.env`
- Check migrations: `docker exec -it repair-tracker-backend npm run prisma:migrate`

### n8n webhook not firing
- Verify `N8N_WEBHOOK_URL` is accessible from backend container
- Check n8n logs: `docker logs n8n -f`
- Verify webhook is activated in n8n workflow

### Evolution API connection issues
- Check Redis is running: `docker logs repair-tracker-redis`
- Verify PostgreSQL evolution database exists
- Check API key in requests matches `AUTHENTICATION_API_KEY`

### CORS errors
- Add origin to `ALLOWED_ORIGINS` in `.env`
- Restart backend after changing `.env`

### SSL/Certificate issues
- Check certbot logs: `docker logs certbot -f`
- Verify DNS points to server
- Ensure ports 80/443 are open
- Check nginx configuration in `nginx/conf/`
