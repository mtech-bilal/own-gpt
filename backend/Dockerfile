# Build stage for Python dependencies
FROM python:3.10-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.10-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install MongoDB database tools
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian11-x86_64-100.9.4.tgz \
    && tar -xzf mongodb-database-tools-*.tgz \
    && cp -r mongodb-database-tools-*/bin/* /usr/local/bin/ \
    && rm -rf mongodb-database-tools-* \
    && apt-get remove -y wget \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Create application directories
RUN mkdir -p /app/model_data /app/memory_index /app/scripts

# Copy source code and scripts
COPY --chmod=755 backend/src/ /app/
COPY --chmod=755 scripts/ /app/scripts/

# Create a health check script
RUN echo '#!/bin/bash\n# Check if MongoDB is reachable\npython -c "import pymongo; pymongo.MongoClient(\"$MONGODB_URI\").admin.command(\"ping\")"\n' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# Expose the API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD ["/bin/bash", "/healthcheck.sh"] || exit 1

# Run the backend service
CMD ["sh", "-c", "\
    # Wait for MongoDB to be ready\n    until python -c \"import pymongo; pymongo.MongoClient(\"$MONGODB_URI\").admin.command(\"ping\")\"; do\n        echo 'Waiting for MongoDB to be ready...'\n        sleep 1\n    done\n    \n    # Run database migrations if needed\n    if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then\n        echo 'Running database migrations...'\n        python /app/scripts/migrate_to_mongodb.py || exit 1\n    fi\n    \n    # Start the application\n    echo 'Starting application...'\n    exec uvicorn main:app --host 0.0.0.0 --port 8000 --no-access-log\n"]
