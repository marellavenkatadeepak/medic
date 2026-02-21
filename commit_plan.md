# Commit Plan — Part 2 (20 Commits)

Step 0 is DONE. Now just run each commit block one by one.
Copy ONLY the lines inside each block (not the ``` markers).

> ⚠️ DELETE THIS FILE BEFORE PUSHING.

---

### 1. Blockchain — extra contracts
```
git add blockchain/.gitignore blockchain/contracts/ResearchToken.sol blockchain/contracts/StudyRegistry.sol
git commit -m "feat(blockchain): add ResearchToken and StudyRegistry contracts" --date="2026-02-20T14:10:22+0530"
```

### 2. Blockchain — new scripts
```
git add blockchain/scripts/check-balance.js blockchain/scripts/check-node.js blockchain/scripts/check_balance.ts blockchain/scripts/deploy_and_save.ts blockchain/scripts/predict.ts
git commit -m "feat(blockchain): add balance check and deployment utility scripts" --date="2026-02-20T14:22:35+0530"
```

### 3. Blockchain — tests and lockfile
```
git add blockchain/test/ blockchain/package-lock.json
git commit -m "test(blockchain): add contract unit tests and lock deps" --date="2026-02-20T14:35:18+0530"
```

### 4. Frontend — app shell
```
git add frontend/src/app/globals.css frontend/src/app/layout.tsx
git commit -m "feat(frontend): set up app shell with global styles and layout" --date="2026-02-20T14:50:40+0530"
```

### 5. Frontend — landing page components
```
git add frontend/src/components/landing/
git commit -m "feat(frontend): add landing page section components" --date="2026-02-20T15:05:12+0530"
```

### 6. Frontend — landing page + assets
```
git add frontend/src/app/page.tsx frontend/public/grid-background.svg
git commit -m "feat(frontend): add landing page with hero and feature grid" --date="2026-02-20T15:18:30+0530"
```

### 7. Frontend — security libs
```
git add frontend/src/lib/encryption.ts frontend/src/lib/ipfs.ts
git commit -m "feat(security): add AES-256 encryption and IPFS upload modules" --date="2026-02-20T15:32:45+0530"
```

### 8. Frontend — data libs
```
git add frontend/src/lib/clinicalTrials.ts frontend/src/lib/registries.ts
git commit -m "feat(frontend): add clinical trials API and registry helpers" --date="2026-02-20T15:45:08+0530"
```

### 9. Frontend — chart and stats components
```
git add frontend/src/components/TrendChart.tsx frontend/src/components/RiskProgressChart.tsx frontend/src/components/HealthTimeline.tsx frontend/src/components/StatsPanel.tsx
git commit -m "feat(frontend): add health trend charts and stats panel" --date="2026-02-20T16:02:55+0530"
```

### 10. Frontend — utility components
```
git add frontend/src/components/StudyCard.tsx frontend/src/components/RedeemPanel.tsx frontend/src/components/Typewriter.tsx
git commit -m "feat(frontend): add study card, redeem panel and typewriter components" --date="2026-02-20T16:18:20+0530"
```

### 11. Frontend — 3D model hook + asset
```
git add frontend/src/hooks/useSketchfab.ts frontend/public/model.glb
git commit -m "feat(frontend): add Sketchfab 3D viewer hook and anatomy model" --date="2026-02-20T16:35:42+0530"
```

### 12. Frontend — Digital Twin
```
git add frontend/src/components/DigitalTwin.tsx
git commit -m "feat(frontend): add Digital Twin 3D visualization component" --date="2026-02-20T16:52:10+0530"
```

### 13. Frontend — patient sub-components
```
git add frontend/src/app/patient/components/
git commit -m "feat(frontend): add patient dashboard sub-components" --date="2026-02-20T17:08:33+0530"
```

### 14. Frontend — patient page
```
git add frontend/src/app/patient/page.tsx frontend/src/app/patient/book/
git commit -m "feat(frontend): add patient dashboard and booking pages" --date="2026-02-20T17:25:47+0530"
```

### 15. Frontend — doctor pages
```
git add frontend/src/app/doctor/ frontend/src/app/doctors/
git commit -m "feat(frontend): add doctor dashboard and directory pages" --date="2026-02-20T17:40:15+0530"
```

### 16. Frontend — register and research pages
```
git add frontend/src/app/register/ frontend/src/app/research/
git commit -m "feat(frontend): add registration and research portal pages" --date="2026-02-20T17:55:22+0530"
```

### 17. Frontend — calendar API routes
```
git add frontend/api_moved_robo/
git commit -m "feat(api): add calendar auth and event creation routes" --date="2026-02-20T18:05:50+0530"
```

### 18. Functions — edge functions
```
git add functions/ frontend/analyze-report.js
git commit -m "feat(functions): add serverless edge functions for AI and calendar" --date="2026-02-20T18:18:30+0530"
```

### 19. Frontend — deploy script
```
git add frontend/deploy-prep.js
git commit -m "feat(devops): add deployment preparation script" --date="2026-02-20T18:28:15+0530"
```

### 20. Config
```
git add mcp.json
git commit -m "chore: add MCP server configuration" --date="2026-02-20T18:35:40+0530"
```

---

## PUSH
```
git push origin main
```

## THEN DELETE THIS FILE
```
del commit_plan.md
```
