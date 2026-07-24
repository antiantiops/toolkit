# Crunchy PostgreSQL + DocumentDB (POC)

Builds `antiantiops/crunchy-postgres-documentdb` from the exact Crunchy PG16
runtime image and adds DocumentDB `0.107-0` extension binaries for FerretDB
2.7.

## Scope and safety

This is an **experimental POC**, not a Crunchy-supported image. It does not
replace PostgreSQL, `pg_ctl`, PGO scripts, Patroni, or pgBackRest binaries; it
only copies `documentdb*` extension files and DocumentDB-specific runtime
libraries into Crunchy's PGXS paths.

DocumentDB's upstream PG16 RPM declares dependencies on `pgvector`, `pg_cron`,
PostGIS, and RUM. The current Crunchy image contains pgvector and pg_cron but
not PostGIS/RUM. The first build is therefore an image-build POC, and must not
be assigned to the existing production `PostgresCluster`.

## Required PGO validation

1. Create a **new**, single-instance test `PostgresCluster` with a new 5Gi PVC.
2. Pin that test cluster's `spec.image` to the pushed image **digest**, never
   `latest`.
3. Confirm PGO reconciliation, Patroni readiness, and a pgBackRest backup.
4. Check DocumentDB dependencies then create the extension:

   ```sql
   SELECT name
   FROM pg_available_extensions
   WHERE name IN ('documentdb', 'postgis', 'rum', 'vector', 'pg_cron');

   CREATE EXTENSION documentdb CASCADE;
   SELECT nspname FROM pg_namespace WHERE nspname = 'documentdb_api';
   ```

5. Point FerretDB to the test primary service and run Mongo CRUD smoke tests.

If PostGIS/RUM are absent from the final image, stop there. They must be added
with packages built against the same Crunchy PostgreSQL ABI; do not deploy the
image to the existing cluster.
