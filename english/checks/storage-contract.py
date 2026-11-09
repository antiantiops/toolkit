"""Run against a Docker inspect JSON file; no credentials are printed."""
import json
import posixpath
import sys


def check(container):
    env = dict(item.split('=', 1) for item in container['Config']['Env'] if '=' in item)
    mounts = container['Mounts']
    expected = {
        'WORDS_DB_PATH': '/data/words.sqlite',
        'LOOKUP_DB_PATH': '/data/lookup.sqlite',
        'CACHE_DIR': '/data/cache',
        'LISTENING_AUDIO_DIR': '/data/listening-audio',
        'SPOTIFY_CACHE_DIR': '/data/spotify',
    }
    for key, value in expected.items():
        assert env.get(key) == value, f'{key} must explicitly equal {value}'
    for target in ['/data', '/tmp/vocab_uploads']:
        matches = [m for m in mounts if posixpath.normpath(m['Destination']) == target]
        assert len(matches) == 1, f'missing/ambiguous mount: {target}'
        mount = matches[0]
        assert mount['Type'] == 'bind' and mount['RW'], f'{target} needs writable bind mount'
        source = posixpath.normpath(mount['Source'])
        assert source.startswith('/') and '.next' not in source.split('/'), 'data cannot live under build tree'
    # Reject nested mounts that could hide the verified durable data tree.
    assert not any(m['Destination'].startswith('/data/') for m in mounts), 'inspect nested data mounts manually'


if __name__ == '__main__':
    with open(sys.argv[1]) as stream:
        payload = json.load(stream)
    check(payload[0] if isinstance(payload, list) else payload)
    print('PASS storage mount/environment contract; data contents still require separate checks')
