# DocumentDB Extension for Crunchy PGO (No Custom PG Image)

Pre-compiled [pg_documentdb](https://github.com/microsoft/documentdb) extension packaged as an OCI image.  
Deploy on **vanilla Crunchy PostgreSQL 16** managed by [PGO (postgres-operator)](https://github.com/CrunchyData/postgres-operator) — **without building a custom PostgreSQL Docker image**.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Extension Image (antiantiops/crunchy-documentdb-extension)     │
│  /extensions/                                                   │
│    ├── usr/pgsql-16/lib/        → .so files (RPATH patched)     │
│    ├── usr/pgsql-16/share/extension/ → .control + .sql files    │
│    ├── usr/lib64/               → libbson, libcrypto, etc.      │
│    └── usr/lib/                 → libpcre2, intelmathlib         │
└─────────────────────────────────────────────────────────────────┘
         │
         │  Job copies to PVCs
         ▼
┌──────────────────────────────────┐  ┌────────────────────────────────┐
│  PVC: documentdb-ext-pvc         │  │  PVC: documentdb-ext-sql-pvc   │
│  Mount: /volumes/documentdb-ext/ │  │  Mount: /usr/pgsql-16/share/   │
│  Contains: .so + all deps        │  │         extension/             │
│                                  │  │  Contains: vanilla ext files   │
│  dynamic_library_path points here│  │  + DocumentDB .control/.sql    │
│  RPATH resolves deps from here   │  │  (merged from base image)      │
└──────────────────────────────────┘  └────────────────────────────────┘
         │                                       │
         └───────────────┬───────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgresCluster (vanilla Crunchy ubi9-16.x)                    │
│  - shared_preload_libraries = pg_documentdb_core                │
│  - dynamic_library_path = /volumes/documentdb-ext/usr/pgsql-16/lib:$libdir │
│  - CREATE EXTENSION documentdb_core → ✅                        │
└─────────────────────────────────────────────────────────────────┘
```

**Key technique:** `.so` files are built with **RPATH** (`/volumes/documentdb-ext/usr/lib64:/volumes/documentdb-ext/usr/lib`) so the dynamic linker resolves dependencies (libbson, libpcre2, intelmathlib) from the volume mount path — no `LD_LIBRARY_PATH` needed.

## Prerequisites

- Kubernetes 1.26+
- CrunchyData PGO v5.5+ or v6.0+
- Default StorageClass with `ReadWriteOnce` support
- Access to pull from Docker Hub (`antiantiops/crunchy-documentdb-extension`)

## Step-by-Step Deployment

### Step 1: Create PVCs

```yaml
# documentdb-pvcs.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: documentdb-ext-pvc
  namespace: postgres-operator
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 500Mi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: documentdb-ext-sql-pvc
  namespace: postgres-operator
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 100Mi
```

```bash
kubectl apply -f documentdb-pvcs.yaml
```

### Step 2: Populate PVCs with Extension Files

This Job copies `.so` + dependencies into the first PVC:

```yaml
# populate-ext-libs.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: populate-documentdb-ext
  namespace: postgres-operator
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: copy
          image: antiantiops/crunchy-documentdb-extension:pg16-documentdb0.107.0
          command:
            - sh
            - -c
            - |
              cp -a /extensions/* /target/
              echo "Done. Files copied:"
              ls /target/usr/pgsql-16/lib/*.so
          volumeMounts:
            - name: ext
              mountPath: /target
      volumes:
        - name: ext
          persistentVolumeClaim:
            claimName: documentdb-ext-pvc
```

```bash
kubectl apply -f populate-ext-libs.yaml
kubectl wait --for=condition=complete job/populate-documentdb-ext -n postgres-operator --timeout=300s
```

This Job merges vanilla Crunchy extension files + DocumentDB `.control`/`.sql` into the second PVC:

```yaml
# populate-ext-sql.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: populate-ext-sql
  namespace: postgres-operator
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      securityContext:
        runAsUser: 0
      containers:
        - name: merge
          # Use vanilla Crunchy image matching your target PG version
          image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.14-2621
          command:
            - sh
            - -c
            - |
              echo "Copying vanilla extension files..."
              cp -a /usr/pgsql-16/share/extension/* /target/

              echo "Copying DocumentDB extension files..."
              cp -a /src-ext/usr/pgsql-16/share/extension/* /target/

              echo "Fixing module_pathname in .control files..."
              sed -i 's|\$libdir/pg_documentdb_core|/volumes/documentdb-ext/usr/pgsql-16/lib/pg_documentdb_core|g' \
                /target/documentdb_core.control
              sed -i 's|\$libdir/pg_documentdb|/volumes/documentdb-ext/usr/pgsql-16/lib/pg_documentdb|g' \
                /target/documentdb.control

              chown -R 26:26 /target/
              echo "Done. Total files: $(ls /target/ | wc -l)"
              echo "DocumentDB control:"
              cat /target/documentdb_core.control
          volumeMounts:
            - name: sql-target
              mountPath: /target
            - name: ext-source
              mountPath: /src-ext
      volumes:
        - name: sql-target
          persistentVolumeClaim:
            claimName: documentdb-ext-sql-pvc
        - name: ext-source
          persistentVolumeClaim:
            claimName: documentdb-ext-pvc
```

```bash
kubectl apply -f populate-ext-sql.yaml
kubectl wait --for=condition=complete job/populate-ext-sql -n postgres-operator --timeout=300s
```

> **Important:** Both Jobs must complete BEFORE creating the PostgresCluster (PVCs are `ReadWriteOnce`).

### Step 3: Create PostgresCluster

```yaml
# pg-documentdb.yaml
apiVersion: postgres-operator.crunchydata.com/v1beta1
kind: PostgresCluster
metadata:
  name: pg-documentdb
  namespace: postgres-operator
spec:
  postgresVersion: 16
  # Omit 'image' to use PGO default vanilla Crunchy image
  # Or specify explicitly:
  # image: registry.developers.crunchydata.com/crunchydata/crunchy-postgres:ubi9-16.14-2621
  instances:
    - name: instance1
      replicas: 1
      dataVolumeClaimSpec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 10Gi
      volumes:
        additional:
          # .so + dependencies
          - name: documentdb-ext
            claimName: documentdb-ext-pvc
            containers: [database]
          # .control + .sql files (vanilla + documentdb merged)
          - name: documentdb-ext-sql
            claimName: documentdb-ext-sql-pvc
            containers: [database]
  backups:
    pgbackrest:
      repos:
        - name: repo1
          volume:
            volumeClaimSpec:
              accessModes: [ReadWriteOnce]
              resources:
                requests:
                  storage: 10Gi
  patroni:
    dynamicConfiguration:
      postgresql:
        parameters:
          dynamic_library_path: "/volumes/documentdb-ext/usr/pgsql-16/lib:$libdir"
          shared_preload_libraries: "pg_documentdb_core"
```

```bash
kubectl apply -f pg-documentdb.yaml
```

### Step 4: Patch StatefulSet for Extension SQL Mount

PGO mounts additional volumes at `/volumes/{name}`. But PostgreSQL looks for `.control`/`.sql` files at the hardcoded path `/usr/pgsql-16/share/extension/`. We need to overlay this path:

```bash
# Get the StatefulSet name
STS_NAME=$(kubectl get sts -n postgres-operator \
  -l postgres-operator.crunchydata.com/cluster=pg-documentdb,postgres-operator.crunchydata.com/data=postgres \
  -o jsonpath='{.items[0].metadata.name}')

# Patch: add volumeMount to overlay /usr/pgsql-16/share/extension/
kubectl get sts "$STS_NAME" -n postgres-operator -o json | \
  jq '.spec.template.spec.containers = [
    .spec.template.spec.containers[] |
    if .name == "database" then
      .volumeMounts += [{
        "mountPath": "/usr/pgsql-16/share/extension",
        "name": "volumes-documentdb-ext-sql"
      }]
    else . end
  ]' | kubectl apply -f -

# Delete pod to pick up the new mount
kubectl delete pod -n postgres-operator \
  -l postgres-operator.crunchydata.com/cluster=pg-documentdb,postgres-operator.crunchydata.com/data=postgres
```

> **Note:** PGO reconciler may revert this patch. See [Production Considerations](#production-considerations) below.

### Step 5: Verify

```bash
# Wait for pod to be ready
kubectl wait --for=condition=ready pod \
  -l postgres-operator.crunchydata.com/cluster=pg-documentdb,postgres-operator.crunchydata.com/data=postgres \
  -n postgres-operator --timeout=120s

# Get pod name
POD=$(kubectl get pod -n postgres-operator \
  -l postgres-operator.crunchydata.com/cluster=pg-documentdb,postgres-operator.crunchydata.com/data=postgres \
  -o jsonpath='{.items[0].metadata.name}')

# Check extension loaded
kubectl exec -n postgres-operator "$POD" -c database -- \
  psql -U postgres -c "SHOW shared_preload_libraries;"

# Check RPATH
kubectl exec -n postgres-operator "$POD" -c database -- \
  readelf -d /volumes/documentdb-ext/usr/pgsql-16/lib/pg_documentdb_core.so | grep RUNPATH

# Create extension
kubectl exec -n postgres-operator "$POD" -c database -- \
  psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS documentdb_core;"

# Verify
kubectl exec -n postgres-operator "$POD" -c database -- \
  psql -U postgres -c "\dx"
```

Expected output:

```
      Name       | Version |   Schema   |                  Description
-----------------+---------+------------+-----------------------------------------------
 documentdb_core | 0.107-0 | public     | Core API surface for DocumentDB on PostgreSQL
 plpgsql         | 1.0     | pg_catalog | PL/pgSQL procedural language
```

## Production Considerations

### STS Patch Reconciliation

PGO reconciles the StatefulSet periodically. The volumeMount patch for `/usr/pgsql-16/share/extension` may be reverted. Mitigations:

1. **Use a MutatingWebhook** to inject the volumeMount on pod creation
2. **Use Kustomize patches** if deploying PGO via GitOps
3. **Monitor** the STS and re-apply patch if reverted (CronJob or controller)
4. **Request upstream PGO feature** for custom mountPath in `volumes.additional`

### DocumentDB Full Extension

The `documentdb` extension (not just `documentdb_core`) requires additional extensions:

```
requires = 'documentdb_core, pg_cron, tsm_system_rows, vector, postgis, rum'
```

These must also be available. Vanilla Crunchy `ubi9-16.x` already includes `tsm_system_rows` and `vector`. You may need:

- `pg_cron` — included in Crunchy image
- `postgis` — use `crunchy-postgres-gis` image variant
- `rum` — requires separate deployment (same RPATH approach)

### Node Scheduling

Both PVCs use `ReadWriteOnce` — the PostgreSQL pod must schedule on the same node as the populate Jobs. Options:

- Use `ReadWriteMany` StorageClass if available
- Set nodeAffinity on both Jobs and PostgresCluster to pin to same node
- Accept that Jobs must complete before cluster creation

### Upgrading DocumentDB Version

1. Update image tag in populate Jobs
2. Re-run both populate Jobs (delete old pods first, cluster must be stopped)
3. Restart PostgreSQL pod
4. Run `ALTER EXTENSION documentdb_core UPDATE;`

## Image Contents

```
/extensions/
├── usr/
│   ├── pgsql-16/
│   │   ├── lib/
│   │   │   ├── pg_documentdb_core.so    (RPATH patched)
│   │   │   └── pg_documentdb.so         (RPATH patched)
│   │   └── share/extension/
│   │       ├── documentdb_core.control
│   │       ├── documentdb_core--*.sql
│   │       ├── documentdb.control
│   │       └── documentdb--*.sql
│   ├── lib64/
│   │   ├── libbson-1.0.so.0.0.0
│   │   ├── libcrypto.so.3.5.5
│   │   ├── libevent-2.1.so.7.0.1
│   │   └── ... (system deps)
│   └── lib/
│       ├── libpcre2-8.so.*
│       └── intelmathlib/
└── entrypoint.sh
```

**RPATH value:** `/volumes/documentdb-ext/usr/lib64:/volumes/documentdb-ext/usr/lib`

## Build

```bash
cd crunchy-documentdb-extension/
docker build -t antiantiops/crunchy-documentdb-extension:pg16-documentdb0.107.0 .
```

Or trigger via GitHub Actions:

```bash
# workflow_dispatch
gh workflow run build-crunchy-documentdb-extension.yml \
  --ref master \
  -f documentdb_ref=v0.107-0
```

## Tested With

| Component | Version |
|-----------|---------|
| Kubernetes | 1.34 (k0s) |
| PGO | 6.0.2 |
| Crunchy PostgreSQL | ubi9-16.14-2621 |
| DocumentDB | 0.107-0 |
| patchelf | 0.15.0-1.el9 |

## License

DocumentDB extension: [MIT License](https://github.com/microsoft/documentdb/blob/main/LICENSE)  
This packaging: Apache 2.0
