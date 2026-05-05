#!/usr/bin/env python3
"""
Generate self-signed SSL certificates for local development using Python.
No external dependencies required - uses Python's built-in ssl and subprocess modules.
"""

import subprocess
import os
import sys
from pathlib import Path

ssl_dir = Path(__file__).parent / 'ssl'
ssl_dir.mkdir(exist_ok=True)

key_file = ssl_dir / 'private-key.pem'
cert_file = ssl_dir / 'certificate.pem'

print('🔐 Generating self-signed SSL certificates...\n')

# Try using openssl via subprocess
try:
    cmd = [
        'openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', str(key_file),
        '-out', str(cert_file),
        '-days', '365',
        '-subj', '/CN=localhost'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    
    print('✅ Certificates generated successfully!\n')
    print(f'Private Key: {key_file}')
    print(f'Certificate: {cert_file}')
    print('\nNext steps:')
    print('1. Update .env file with these paths:')
    print('   SSL_KEY_PATH=./ssl/private-key.pem')
    print('   SSL_CERT_PATH=./ssl/certificate.pem')
    print('\n2. Restart your server - it will now use HTTPS')
    
except FileNotFoundError:
    print('❌ OpenSSL not found on system.\n')
    print('Please install one of the following:\n')
    print('Option 1: Git for Windows (includes OpenSSL)')
    print('  Download: https://git-scm.com/download/win\n')
    print('Option 2: Install OpenSSL for Windows')
    print('  Download: https://slproweb.com/products/Win32OpenSSL.html\n')
    print('Option 3: Use Windows Subsystem for Linux (WSL)')
    print('  Run in PowerShell as admin: wsl --install\n')
    sys.exit(1)
    
except subprocess.CalledProcessError as e:
    print(f'❌ Error generating certificates: {e.stderr}')
    sys.exit(1)
