# DocumentDB Extension Image (initContainer)

Pre-compiled DocumentDB extension for Crunchy PostgreSQL 16.

## Usage

Use as an initContainer to inject DocumentDB extension into vanilla Crunchy PG:

```yaml
initContainers:
  - name: documentdb-extension
    image: antiantiops/crunchy-documentdb-extension:latest
    env:
      - name: EXTENSION_TARGET
        value: /opt/extensions
    volumeMounts:
      - name: extensions
        mountPath: /opt/extensions

containers:
  - name: database
    image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.14-2621
    volumeMounts:
      - name: extensions
        mountPath: /usr/pgsql-16/lib
        subPath: usr/pgsql-16/lib
      - name: extensions
        mountPath: /usr/pgsql-16/share/extension
        subPath: usr/pgsql-16/share/extension
      - name: extensions
        mountPath: /usr/lib64
        subPath: usr/lib64

volumes:
  - name: extensions
    emptyDir: {}
```

## With Crunchy PGO

In `PostgresCluster` spec:

```yaml
spec:
  instances:
    - name: instance1
      initContainers:
        - name: documentdb-extension
          image: antiantiops/crunchy-documentdb-extension:latest
          env:
            - name: EXTENSION_TARGET
              value: /opt/extensions
          volumeMounts:
            - name: extensions
              mountPath: /opt/extensions
      containers:
        - name: database
          volumeMounts:
            - name: extensions
              mountPath: /usr/pgsql-16/lib/pg_documentdb.so
              subPath: usr/pgsql-16/lib/pg_documentdb.so
            - name: extensions
              mountPath: /usr/pgsql-16/lib/pg_documentdb_core.so
              subPath: usr/pgsql-16/lib/pg_documentdb_core.so
      volumes:
        - name: extensions
          emptyDir: {}
```

> **Note:** PGO support for custom volumeMounts may vary. Test with your PGO version.

## Build

```bash
docker build -t antiantiops/crunchy-documentdb-extension:latest .
```
