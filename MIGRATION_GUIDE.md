# MongoDB Migration Guide

This guide explains how to migrate your LocalGPT application from SQLite to MongoDB.

## Prerequisites

- Docker and Docker Compose installed
- Existing LocalGPT installation with SQLite database
- Sufficient disk space for both databases during migration

## Migration Steps

### 1. Backup Your Data

Before starting the migration, create a backup of your SQLite database:

```bash
# Create a backup directory
mkdir -p /path/to/backup

# Copy the SQLite database
cp /path/to/your/blockchain.db /path/to/backup/blockchain_$(date +%Y%m%d).db
```

### 2. Update Configuration

Update your `.env` file with the new MongoDB configuration:

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localgpt:localgpt123@mongodb:27017/localgpt?authSource=admin
MONGODB_DB=localgpt
```

### 3. Start MongoDB Services

Start the MongoDB services using Docker Compose:

```bash
docker-compose up -d mongodb mongo-express
```

### 4. Run the Migration Script

Run the migration script to transfer data from SQLite to MongoDB:

```bash
# Make the script executable
chmod +x scripts/migrate_to_mongodb.py

# Run the migration script
docker-compose run --rm backend python /app/scripts/migrate_to_mongodb.py
```

### 5. Verify the Migration

You can verify the migration by:

1. Accessing the MongoDB Express UI at http://localhost:8081
2. Checking the logs for any errors
3. Verifying record counts match between SQLite and MongoDB

### 6. Update Application Configuration

Update your application to use MongoDB by ensuring the following environment variables are set:

```env
# In your .env file
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://localgpt:localgpt123@mongodb:27017/localgpt?authSource=admin
MONGODB_DB=localgpt
```

### 7. Start the Application

Start the full application stack:

```bash
docker-compose up -d
```

## Post-Migration Tasks

1. **Verify Data Integrity**: Check that all data was migrated correctly
2. **Monitor Performance**: Keep an eye on MongoDB performance
3. **Cleanup**: After confirming everything works, you can remove the SQLite database backup

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Verify MongoDB is running: `docker ps | grep mongo`
2. Check logs: `docker logs mongodb`
3. Verify credentials in `.env` match those in `docker-compose.yml`

### Migration Errors

If the migration fails:

1. Check the error logs
2. Ensure the SQLite database is not corrupted
3. Verify there's enough disk space
4. Try running the migration in smaller batches

## Rollback Plan

If you need to rollback to SQLite:

1. Stop all services
2. Restore your SQLite backup
3. Revert any configuration changes
4. Restart the application

## MongoDB Management

### Accessing MongoDB Shell

```bash
docker exec -it mongodb mongosh -u localgpt -p localgpt123 --authenticationDatabase admin localgpt
```

### Backup MongoDB

```bash
# Create a backup
docker exec -it mongodb mongodump --uri="mongodb://localgpt:localgpt123@localhost:27017/localgpt?authSource=admin" --out=/data/backup/

# Copy backup to host
docker cp mongodb:/data/backup/ /path/to/host/backup/
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp /path/to/host/backup/ mongodb:/data/backup/

# Restore from backup
docker exec -it mongodb mongorestore --uri="mongodb://localgpt:localgpt123@localhost:27017/localgpt?authSource=admin" --drop /data/backup/localgpt/
```

## Monitoring

### Enable MongoDB Profiling

```javascript
// In MongoDB shell
db.setProfilingLevel(1, { slowms: 100 })
```

### Check Database Stats

```javascript
// In MongoDB shell
db.stats()
```

## Performance Tuning

1. **Indexing**: Ensure proper indexes are created
2. **Sharding**: Consider sharding for large datasets
3. **Caching**: Implement Redis or similar for frequently accessed data

## Security Considerations

1. Change default credentials
2. Enable authentication
3. Configure network access controls
4. Enable TLS/SSL for connections
5. Regular backups

## Maintenance

### Compact Database

```javascript
// In MongoDB shell
db.runCommand({ compact: 'collection_name' })
```

### Repair Database

```bash
docker exec -it mongodb mongod --repair --dbpath /data/db
```

## Support

For additional help, please refer to:
- [MongoDB Documentation](https://docs.mongodb.com/)
- [MongoDB University](https://university.mongodb.com/)
- [MongoDB Community Forums](https://community.mongodb.com/)
