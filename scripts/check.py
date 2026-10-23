#!/usr/bin/env python3
"""Run PostgreSQL or browser regressions in an isolated, disposable local database."""
import argparse
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import uuid
from urllib.request import build_opener, ProxyHandler
from urllib.error import URLError

parser = argparse.ArgumentParser()
parser.add_argument('suite', choices=['postgres', 'e2e'])
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
os.chdir(root)
config = dict(os.environ)
if (root / '.env').exists():
    for line in (root / '.env').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            name, value = line.split('=', 1)
            config.setdefault(name, value)
for name in ['DB_USER', 'DB_PASSWORD', 'JWT_SECRET']:
    if not config.get(name):
        raise SystemExit('Missing local configuration. Run python3 scripts/init-env.py and configure .env.')
compose = ['docker', 'compose']
subprocess.run(compose + ['up', '-d', '--wait', '--wait-timeout', '60', 'postgres'], check=True, env=config)
db = 'words_up_test_' + uuid.uuid4().hex[:12]
pg = compose + ['exec', '-T', 'postgres']
subprocess.run(pg + ['createdb', '-U', config['DB_USER'], db], check=True, env=config)
server = None
try:
    url = 'jdbc:postgresql://127.0.0.1:5432/' + db
    config.update(TEST_DATABASE_URL=url, TEST_DATABASE_USERNAME=config['DB_USER'], TEST_DATABASE_PASSWORD=config['DB_PASSWORD'])
    if args.suite == 'postgres':
        runner = ['bash', config['MAVEN_RUNNER']] if config.get('MAVEN_RUNNER') else ['cmd', '/c', 'mvnw.cmd'] if os.name == 'nt' else ['sh', './mvnw', '-B', '-ntp']
        subprocess.run(runner + ['verify', '-Dspring.profiles.active=postgres'], env=config, check=True)
    else:
        config['DB_URL'] = url
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        config['E2E_BASE_URL'] = 'http://127.0.0.1:' + str(port)
        java = str(Path(config['JAVA_HOME']) / 'bin' / 'java') if config.get('JAVA_HOME') else 'java'
        Path('artifacts').mkdir(exist_ok=True)
        with open('artifacts/e2e-server.log', 'w') as log:
            server = subprocess.Popen([java, '-jar', 'target/flash-0.0.1-SNAPSHOT.jar', '--server.address=127.0.0.1', '--server.port=' + str(port)], env=config, stdout=log, stderr=subprocess.STDOUT)
            opener = build_opener(ProxyHandler({}))
            for attempt in range(60):
                try:
                    with opener.open(config['E2E_BASE_URL'] + '/api/sets/public', timeout=3) as response:
                        if response.status == 200: break
                except URLError:
                    if server.poll() is not None or attempt == 59:
                        raise RuntimeError('Test app failed to start; inspect artifacts/e2e-server.log')
                    time.sleep(1)
            npm = 'npm.cmd' if os.name == 'nt' else 'npm'
            subprocess.run([npm, 'test'], env=config, check=True)
finally:
    if server is not None:
        server.terminate()
        try: server.wait(timeout=20)
        except subprocess.TimeoutExpired: server.kill(); server.wait()
    subprocess.run(pg + ['dropdb', '--if-exists', '-U', config['DB_USER'], db], check=True, env=config)
