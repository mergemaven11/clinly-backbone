from pathlib import Path

path = Path("tests/test_hardening.py")
text = path.read_text()
old = '"MONGO_URI": "mongodb://internal-mongo:27017/clinly",'
new = '"MONGO_URI": "mongodb://internal-mongo:27017/clinly?tls=true",'
if old not in text:
    raise SystemExit("production Mongo fixture anchor not found")
path.write_text(text.replace(old, new, 1))
