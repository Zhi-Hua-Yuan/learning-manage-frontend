# Browser E2E audit suite

The suite uses public HTTP APIs to create uniquely named disposable users and
data. It never embeds a production credential. By default Playwright starts the
Vite development server on `127.0.0.1:4173`; the backend must already be
available through the repository's `/api` proxy at `127.0.0.1:8123`.

Run the Chromium desktop/mobile suite plus Firefox/WebKit smoke tests:

```bash
npm run test:e2e
```

Run only smoke-tagged tests:

```bash
npm run test:e2e:smoke
```

Set `E2E_BASE_URL` when exercising a separately served build. Failure traces,
screenshots, videos and JUnit output are written below the ignored
`test-results/` and `playwright-report/` directories.
