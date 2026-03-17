#!/bin/bash

#############################################
# AkibaPlus Database Backup Script
# 
# This script creates automated backups of the
# PostgreSQL database with rotation and compression
#############################################

# Configuration
DB_NAME="chamaPlus"
DB_USER="chama_app"
BACKUP_DIR="/home/samuel/backups/chamaplus"
RETENTION_DAYS=30  # Keep backups for 30 days
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/chamaplus_backup_${DATE}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_message "${GREEN}Created backup directory: $BACKUP_DIR${NC}"
fi

# Start backup
log_message "${YELLOW}Starting database backup...${NC}"

# Perform database dump
if pg_dump -U "$DB_USER" -h 127.0.0.1 "$DB_NAME" > "$BACKUP_FILE"; then
    log_message "${GREEN}✓ Database backup created: $BACKUP_FILE${NC}"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    log_message "${GREEN}✓ Backup compressed: ${BACKUP_FILE}.gz${NC}"
    
    # Get file size
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    log_message "Backup size: $SIZE"
    
    # Remove old backups (older than RETENTION_DAYS)
    log_message "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
    find "$BACKUP_DIR" -name "chamaplus_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    REMAINING=$(find "$BACKUP_DIR" -name "chamaplus_backup_*.sql.gz" -type f | wc -l)
    log_message "Total backups remaining: $REMAINING"
    
    log_message "${GREEN}✓ Backup completed successfully!${NC}"
    exit 0
else
    log_message "${RED}✗ Backup failed!${NC}"
    exit 1
fi
