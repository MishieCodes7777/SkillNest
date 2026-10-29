$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path 'dist/index.html')) { throw 'Build the frontend first: npm run build' }
if (-not (Test-Path 'ml/artifacts/topic-demo/model.json')) { throw 'Train the local artifact first: python ml/build_topic_demo.py' }
$env:PORT = '3003'
$env:TOPIC_MODEL_DEMO = 'true'
$env:NODE_ENV = 'development'
$env:ALLOWED_ORIGINS = 'http://localhost:3003'
Write-Host 'SkillNest ML Studio: http://localhost:3003/preview/ml (Ctrl+C stops this server)'
node server.js
