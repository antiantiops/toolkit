# Crunchy PostgreSQL 16 + DocumentDB Extension

A Docker image based on Crunchy PostgreSQL 16 with the [DocumentDB](https://github.com/documentdb/documentdb) extension. It provides the PostgreSQL backend required by [FerretDB](https://docs.ferretdb.io/) when exposing a MongoDB-compatible wire protocol.

## Images

```text
antiantiops/crunchy-postgres-documentdb:pg16.14-documentdb0.107.0
antiantiops/crunchy-postgres-documentdb:pg16-documentdb-latest
```

GitHub Actions builds images on pushes to `master` and on release tags.

## Included components

- Crunchy PostgreSQL 16 base image
- DocumentDB `0.107-0`
- PostGIS `3.6.3`
- pgvector `0.9.0`
- pg_cron `1.6`
- RUM `1.3`
- GEOS `3.14` and PROJ `9.8`

## Deploy with Crunchy Postgres for Kubernetes

Example `PostgresCluster`:

```yaml
apiVersion: postgres-operator.crunchydata.com/v1
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
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 5Gi
  patroni:
    dynamicConfiguration:
      postgresql:
        parameters:
          shared_preload_libraries: pgaudit,pg_documentdb_core,pg_documentdb,pg_cron
          cron.database_name: ferretdb
        pg_hba:
          - host all all 0.0.0.0/0 md5
          - host all all ::0/0 md5
```

`shared_preload_libraries` must include both `pg_documentdb_core` and `pg_documentdb`. Changing it requires a PostgreSQL restart.

## Create the extension

Connect to the application database after PostgreSQL is ready:

```sql
SET statement_timeout = '20min';
CREATE EXTENSION IF NOT EXISTS documentdb CASCADE;

SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('documentdb', 'documentdb_core');
```

`CREATE EXTENSION documentdb CASCADE` installs its dependencies, including `documentdb_core`, `pg_cron`, PostGIS, pgvector, RUM, and `tsm_system_rows`. On small clusters it can take several minutes.

## FerretDB with authentication

Example FerretDB deployment configuration:

```yaml
- name: FERRETDB_POSTGRESQL_URL
  value: postgres://ferretdb:PASSWORD@postgres-primary.postgres-operator.svc:5432/ferretdb?sslmode=disable
- name: FERRETDB_AUTH
  value: "true"
```

Use a dedicated PostgreSQL role and database for FerretDB. Do not put production passwords in Git manifests.

### Required DocumentDB worker connection

When PostgreSQL password authentication is enabled, DocumentDB index workers open an additional localhost PostgreSQL connection. Configure `documentdb.localhost_connection_string` with the same role that owns the FerretDB database:

```yaml
patroni:
  dynamicConfiguration:
    postgresql:
      parameters:
        documentdb.localhost_connection_string: "host=localhost user=ferretdb dbname=ferretdb password=REPLACE_ME"
```

Without this setting, applications can authenticate to FerretDB successfully but index creation can fail with:

```text
fe_sendauth: no password supplied
```

Keep this value in an encrypted secret-management workflow where possible. The Crunchy Postgres Operator setting accepts a connection string, not a Kubernetes `secretKeyRef`.

## Verify

```bash
kubectl -n postgres-operator exec -it postgres-instance1-0 -c database -- \
  psql -U postgres -d ferretdb -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname LIKE '%documentdb%';"

kubectl -n ferretdb logs deploy/ferretdb --tail=100
```

Connect through FerretDB:

```bash
mongosh 'mongodb://ferretdb:PASSWORD@ferretdb.ferretdb.svc:27017/admin?authMechanism=SCRAM-SHA-256'
```

Then run:

```javascript
use testdb
db.testcol.insertOne({ hello: "world" })
db.testcol.createIndex({ hello: 1 })
db.testcol.find()
```

## Troubleshooting

### Extension creation is slow or times out

```sql
SET statement_timeout = '20min';
CREATE EXTENSION documentdb CASCADE;
```

### Missing shared libraries

```bash
ldconfig -p | grep -E 'geos|proj'
ldd /usr/pgsql-16/lib/pg_documentdb.so
```

### `fe_sendauth: no password supplied` during `createIndexes`

Set `documentdb.localhost_connection_string` with the correct PostgreSQL role, database, and password. Confirm it is active:

```sql
SELECT CASE
  WHEN setting LIKE '%user=ferretdb%' AND setting LIKE '%password=%'
  THEN 'configured'
  ELSE 'missing'
END
FROM pg_settings
WHERE name = 'documentdb.localhost_connection_string';
```

### Required database permissions

```sql
GRANT documentdb_admin_role TO ferretdb;
GRANT CONNECT ON DATABASE ferretdb TO ferretdb;
```

## Build design

The Dockerfile uses two stages:

1. Rocky Linux 9 builds DocumentDB and collects extension dependencies.
2. Crunchy PostgreSQL receives the staged extension files and runs `ldconfig`.

This preserves Crunchy scripts, Patroni, and pgBackRest while adding DocumentDB and dependencies.

## License

- Image build scripts: MIT
- DocumentDB: Apache-2.0
- Crunchy PostgreSQL base image: subject to Crunchy Data terms
