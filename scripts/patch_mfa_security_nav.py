from pathlib import Path

path = Path("web/src/AppV3.jsx")
text = path.read_text()

replacements = [
    (
        "import PublicProviderPage from './PublicProviderPage'\n",
        "import PublicProviderPage from './PublicProviderPage'\nimport SecurityWorkspace from './SecurityWorkspace'\n",
    ),
    (
        "  ['integrations', 'Integrations', 'IN'],\n  ['audit', 'Activity log', 'AL'],\n",
        "  ['integrations', 'Integrations', 'IN'],\n  ['security', 'Security', 'SE'],\n  ['audit', 'Activity log', 'AL'],\n",
    ),
    (
        "    integrations: 'Integrations',\n    audit: 'Activity log',\n",
        "    integrations: 'Integrations',\n    security: 'Security',\n    audit: 'Activity log',\n",
    ),
    (
        "            {view === 'integrations' && isProvider && <IntegrationsWorkspace token={token} />}\n            {view === 'audit' && isProvider && <AuditWorkspace token={token} people={people} />}\n",
        "            {view === 'integrations' && isProvider && <IntegrationsWorkspace token={token} />}\n            {view === 'security' && <SecurityWorkspace token={token} />}\n            {view === 'audit' && isProvider && <AuditWorkspace token={token} people={people} />}\n",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"AppV3 patch anchor missing: {old!r}")
    text = text.replace(old, new, 1)

path.write_text(text)
