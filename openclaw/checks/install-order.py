from pathlib import Path
for name in ('Dockerfile', 'Dockerfile_DevOps'):
    text = (Path(__file__).resolve().parents[1] / name).read_text()
    assert text.count('COPY . .') == 1, name
    assert text.index('COPY . .') < text.index('pnpm install --frozen-lockfile'), name
    assert '--ignore-scripts' not in text, name
print('PASS: both images stage generator inputs before install; lifecycle hooks preserved')
