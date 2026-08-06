# Bí quá tìm đến tarrot

Static Vietnamese 5-card tarot demo.

```bash
docker build -t tarot-demo .
docker run --rm -p 8080:80 --name tarot-demo tarot-demo
```

## Run

```sh
docker build -t tarot-demo .
docker run --rm -p 18080:80 --network omniroute_default -e AI_KEY="$AI_KEY" tarot-demo
```

`AI_KEY` is required at runtime. Never commit it.
