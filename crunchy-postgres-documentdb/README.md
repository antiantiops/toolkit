# Crunchy PostgreSQL 16 + DocumentDB Extension

Docker image dựa trên Crunchy PostgreSQL 16 chính thức, thêm [DocumentDB extension](https://github.com/FoundationDB/fdb-document-layer) để FerretDB có thể dùng PostgreSQL làm backend với MongoDB wire protocol.

## Image

```
antiantiops/crunchy-postgres-documentdb:pg16.14-documentdb0.107.0
antiantiops/crunchy-postgres-documentdb:pg16-documentdb-latest
```

Build tự động qua GitHub Actions khi có tag mới hoặc push lên branch `master`.

## Cài gì?

- **Base**: `registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.6-0`
- **DocumentDB extension**: `0.107-0` (từ PGDG EL9 repo)
- **Dependencies**:
  - PostGIS `3.6.3` (GIS functions)
  - pgvector `0.9.0` (vector similarity search)
  - pg_cron `1.6` (cron job scheduler)
  - RUM index `1.3` (full-text search)
  - GEOS `3.14` + PROJ `9.8` (geospatial libraries)

## Sử dụng

### 1. Deploy với Crunchy Postgres Operator (PGO)

**Ví dụ PostgresCluster:**

```yaml
apiVersion: postgres-operator.crunchydata.com/v1beta1
kind: PostgresCluster
metadata:
  name: postgres
  namespace: postgres-operator
spec:
  image: antiantiops/crunchy-postgres-documentdb:pg16.14-documentdb0.107.0
  postgresVersion: 16
  instances:
    - name: instance1
      replicas: 1
      dataVolumeClaimSpec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 5Gi
  patroni:
    dynamicConfiguration:
      postgresql:
        parameters:
          # DocumentDB cần cả core và main extension
          shared_preload_libraries: "pgaudit,pg_documentdb_core,pg_documentdb,pg_cron"
          cron.database_name: ferretdb
```

**Quan trọng:**
- `shared_preload_libraries` phải có cả `pg_documentdb_core` và `pg_documentdb`
- Setting này yêu cầu restart PostgreSQL pod

### 2. Tạo extension

Sau khi pod đã `Running` và `Ready`:

```sql
-- Kết nối vào database ferretdb
CREATE EXTENSION IF NOT EXISTS documentdb CASCADE;

-- Verify
SELECT extname, extversion FROM pg_extension WHERE extname IN ('documentdb', 'documentdb_core');
SELECT nspname FROM pg_namespace WHERE nspname = 'documentdb_api';
```

Extension `documentdb CASCADE` sẽ tự động cài:
- documentdb_core
- pg_cron
- postgis
- pgvector
- rum
- tsm_system_rows

⚠️ **Lưu ý**: `CREATE EXTENSION documentdb CASCADE` tạo hàng trăm function/table/trigger, cần 5-10 phút trên cluster nhỏ (500m CPU, 512Mi RAM). Tăng `statement_timeout` nếu cần:

```sql
SET statement_timeout = '20min';
CREATE EXTENSION documentdb CASCADE;
```

### 3. FerretDB setup

**Deploy FerretDB:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ferretdb
  namespace: ferretdb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ferretdb
  template:
    metadata:
      labels:
        app: ferretdb
    spec:
      containers:
        - name: ferretdb
          image: ghcr.io/ferretdb/ferretdb:2.7.0
          ports:
            - containerPort: 27017
          env:
            - name: FERRETDB_POSTGRESQL_URL
              value: "postgres://ferretdb:PASSWORD@postgres-primary.postgres-operator.svc:5432/ferretdb?sslmode=disable"
            - name: FERRETDB_HANDLER
              value: "documentdb"
            # Tắt auth khi import data lần đầu
            - name: FERRETDB_AUTH
              value: "false"
```

**Test kết nối:**

```bash
mongosh --host ferretdb.ferretdb.svc --port 27017

# Trong mongosh
use testdb
db.testcol.insertOne({hello: "world"})
db.testcol.find()
```

## Build Process

Image build qua multi-stage:

1. **Stage 1 (Rocky 9 builder)**:
   - Cài DocumentDB extension + dependencies từ PGDG repo
   - Copy GEOS/PROJ libs từ non-standard paths (`/usr/geos314/`, `/usr/proj98/`)
   - Copy PostGIS, pgvector, pg_cron, RUM extension files
   - Normalize paths về `/usr/lib64/` (tránh conflict với `/lib64` symlink)

2. **Stage 2 (Crunchy base)**:
   - Copy staging tree từ builder
   - Chạy `ldconfig` để system nhận non-standard library paths
   - Giữ nguyên Crunchy scripts, Patroni, pgBackRest

**Challenges đã fix:**
- GEOS/PROJ libraries nằm ở non-standard prefix (`/usr/geos314/lib64/`, `/usr/proj98/lib64/`)
- Crunchy base có `/lib64` → symlink, buildkit từ chối COPY đè lên
- PostGIS cần cả `.control`, `.sql`, contrib SQL files, không chỉ `.so`
- DocumentDB `CREATE EXTENSION` cascade rất nặng trên cluster nhỏ

## Troubleshooting

### Extension creation timeout

```sql
-- Tăng timeout
SET statement_timeout = '20min';
CREATE EXTENSION documentdb CASCADE;
```

### Missing shared libraries

```bash
# Trong pod, check lib paths
ldconfig -p | grep -E 'geos|proj'
ldd /usr/pgsql-16/lib/postgis-3.so
```

### FerretDB connection fails

```bash
# Check FerretDB logs
kubectl -n ferretdb logs -l app=ferretdb --tail=50

# Common issues:
# - PostgreSQL password không đúng
# - User chưa có quyền documentdb_admin_role
# - Extension chưa tạo
```

### Grant permissions

```sql
-- PostgreSQL
GRANT documentdb_admin_role TO ferretdb;
GRANT CONNECT ON DATABASE ferretdb TO ferretdb;
```

## Migration MongoDB → FerretDB

**Export từ MongoDB:**

```bash
mongoexport --uri="mongodb://user:pass@host:27017/dbname" \
  --collection=collname --out=collname.json
```

**Import vào FerretDB:**

```bash
mongoimport --host ferretdb.svc --port 27017 \
  --db dbname --collection collname --file collname.json
```

⚠️ **Lưu ý**: FerretDB v2.7.0 chưa hỗ trợ đầy đủ MongoDB authentication protocol. Dùng `FERRETDB_AUTH=false` khi import data lần đầu.

## Tài liệu

- [DocumentDB extension docs](https://github.com/FoundationDB/fdb-document-layer)
- [FerretDB docs](https://docs.ferretdb.io/)
- [Crunchy Postgres Operator](https://access.crunchydata.com/documentation/postgres-operator/latest/)

## License

Image build scripts: MIT
DocumentDB extension: Apache 2.0
Crunchy PostgreSQL base image: proprietary (Crunchy Data)
