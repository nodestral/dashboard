# Nodestral Dashboard (Community Edition)

Self-hostable dashboard for Nodestral fleet management. Works with the [community edition backend](https://github.com/nodestral/backend) or the [hosted API](https://nodestral.web.id).

## Features

- Node list with status indicators
- Node detail with system specs
- Real-time metrics (CPU, RAM, Disk) with sparkline charts
- System discovery (services, packages, ports)
- Unclaimed node claiming
- Dark/light theme
- Responsive design

## Quick Start

```bash
npm install
npm run dev
```

Set the API URL:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API URL |

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Node list with status |
| `/dashboard/nodes/:id` | Node detail with metrics, discovery |

## What's Included

- Authentication (login/register with JWT)
- Node list with online/offline status
- Node claiming for unregistered agents
- Metrics dashboard with CSS sparkline charts
- System discovery viewer
- Dark/light theme with flash prevention

## What's Not Included (SaaS-only features)

Available on the [hosted platform](https://nodestral.web.id):

- Landing page with pricing
- Install page with agent download
- Billing and subscription management
- Free tier node limit enforcement
- Web terminal (SSH from browser)
- Bulk operations
- Backend switching (Grafana/Prometheus/Datadog)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- CSS variables for theming (no Tailwind)
- lucide-react for icons
- No external chart library (CSS sparklines)

## License

MIT
