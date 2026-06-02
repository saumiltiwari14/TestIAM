# OPS IAM — Identity & Access Management

A web dashboard for the OPS team to manage employee application access across 30–40+ applications. Built with **HTML/CSS**, **Node.js**, and **MongoDB**.

## Features

- **Employee cards dashboard** — Browse 100+ employees with name, email, SSO ID, and active access count
- **Employee detail view** — Click any card to see all application access and full audit history
- **Grant & revoke access** — Record who performed the action, date/time, and JIRA ticket link
- **Access types** — Admin or Member per application
- **Applications management** — Add and browse all managed applications
- **Excel export** — Download user-wise or application-wise reports
- **Search & filter** — Find employees by name, email, SSO ID; filter by access status

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas connection string

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set your MongoDB URI:

   ```bash
   copy .env.example .env
   ```

   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/ops-iam
   ```

3. **Seed sample data** (optional)

   ```bash
   npm run seed
   ```

4. **Start the server**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
OPS IAM/
├── server.js              # Express server entry point
├── models/
│   ├── Employee.js        # Employee schema
│   ├── Application.js     # Application schema
│   └── AccessGrant.js     # Access grants with audit history
├── routes/
│   ├── employees.js       # Employee CRUD
│   ├── applications.js    # Application CRUD
│   ├── access.js          # Grant/revoke access
│   └── export.js          # Excel export
├── public/
│   ├── index.html         # Dashboard UI
│   ├── css/styles.css     # Styling
│   └── js/app.js          # Frontend logic
└── scripts/seed.js        # Sample data seeder
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees with active access |
| GET | `/api/employees/:id` | Employee details + all grants |
| POST | `/api/employees` | Create employee |
| GET | `/api/applications` | List applications |
| POST | `/api/applications` | Create application |
| POST | `/api/access/grant` | Grant access |
| POST | `/api/access/revoke` | Revoke access |
| GET | `/api/export/user-wise` | Download user Excel report |
| GET | `/api/export/application-wise` | Download application Excel report |
| GET | `/api/stats` | Dashboard statistics |

## Grant Access Example

```json
POST /api/access/grant
{
  "employeeId": "...",
  "applicationId": "...",
  "accessType": "admin",
  "performedBy": "Alex Thompson",
  "jiraTicketLink": "https://jira.company.com/browse/OPS-1234",
  "notes": "New team member onboarding"
}
```

Every grant and revoke is stored in the audit history with timestamp, OPS team member name, and JIRA ticket link.

## Development

```bash
npm run dev
```

Uses Node.js `--watch` for auto-restart on file changes.
