#!/bin/bash

#############################################
# AkibaPlus Database Restore Script
# 
# This script restores the PostgreSQL database
# from a backup file
#############################################

# Configuration
DB_NAME="chamaPlus"
DB_USER="chama_app"
BACKUP_DIR="/home/samuel/backups/chamaplus"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo -e "${BLUE}Usage: $0 [backup_file]${NC}"
    echo -e "If no backup file is specified, the most recent backup will be used."
    echo -e "\nExample:"
    echo -e "  $0"
    echo -e "  $0 /home/samuel/backups/chamaplus/chamaplus_backup_20260208_140000.sql.gz"
    echo -e "\nAvailable backups:"
    ls -lht "$BACKUP_DIR"/chamaplus_backup_*.sql.gz 2>/dev/null | head -10
    exit 1
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}✗ Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# Determine which backup file to use
if [ -z "$1" ]; then
    # Use most recent backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/chamaplus_backup_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}✗ No backup files found in $BACKUP_DIR${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Using most recent backup: $BACKUP_FILE${NC}"
else
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}✗ Backup file not found: $BACKUP_FILE${NC}"
        usage
    fi
fi

# Confirm restoration
echo -e "${YELLOW}⚠️  WARNING: This will replace the current database with the backup!${NC}"
echo -e "Database: ${BLUE}$DB_NAME${NC}"
echo -e "Backup file: ${BLUE}$BACKUP_FILE${NC}"
echo -e ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

# Decompress if necessary
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Decompressing backup...${NC}"
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    SQL_FILE="$TEMP_FILE"
    CLEANUP_TEMP=true
else
    SQL_FILE="$BACKUP_FILE"
    CLEANUP_TEMP=false
fi

# Stop the backend server before restoration
echo -e "${YELLOW}Stopping backend server...${NC}"
sudo systemctl stop chamaplus-backend 2>/dev/null

# Drop existing connections to the database
echo -e "${YELLOW}Dropping existing connections...${NC}"
psql -U "$DB_USER" -h 127.0.0.1 -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null

# Drop and recreate database
echo -e "${YELLOW}Recreating database...${NC}"
psql -U "$DB_USER" -h 127.0.0.1 -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
psql -U "$DB_USER" -h 127.0.0.1 -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null

# Restore from backup
echo -e "${YELLOW}Restoring database from backup...${NC}"
if psql -U "$DB_USER" -h 127.0.0.1 -d "$DB_NAME" < "$SQL_FILE"; then
    echo -e "${GREEN}✓ Database restored successfully!${NC}"
    
    # Cleanup temp file if created
    if [ "$CLEANUP_TEMP" = true ]; then
        rm -f "$SQL_FILE"
        echo -e "${GREEN}✓ Temporary file cleaned up${NC}"
    fi
    
    # Restart the backend server
    echo -e "${YELLOW}Starting backend server...${NC}"
    sudo systemctl start chamaplus-backend
    
    echo -e "${GREEN}✓ Restoration complete!${NC}"
    exit 0
else
    echo -e "${RED}✗ Database restoration failed!${NC}"
    
    # Cleanup temp file if created
    if [ "$CLEANUP_TEMP" = true ]; then
        rm -f "$SQL_FILE"
    fi
    
    # Try to restart the backend server anyway
    sudo systemctl start chamaplus-backend
    exit 1
fi
