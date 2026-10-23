#!/usr/bin/env python3
"""Create local development secrets without printing or replacing existing values."""
import base64
import os
from pathlib import Path
import secrets

root = Path(__file__).resolve().parent.parent
path = root / '.env'
try:
    with path.open('x') as output:
        os.chmod(path, 0o600)
        output.write('DB_USER=quizlet_user\nDB_NAME=quizlet_db\n')
        output.write('DB_PASSWORD=' + secrets.token_urlsafe(32) + '\n')
        output.write('JWT_SECRET=' + base64.b64encode(secrets.token_bytes(64)).decode() + '\n')
except FileExistsError:
    print('.env already exists; kept existing configuration.')
else:
    print('Created .env with random local credentials. Keep this file private.')
