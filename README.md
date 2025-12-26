# Handshake

P2P Lending Tracking Software.

## Description
Handshake is a software to track P2P lending from trustworthy people. It tracks interest for a period of time based on standard SBI home loan interest rates.

## Tech Stack
- Node.js v22
- Express.js
- EJS Templates
- SQLite3 (Local Database)

## Data Persistence
The application uses a local SQLite database file named `handshake.db` located in the project root.
- This file is **ignored by git** to protect your financial data.
- It is automatically created when you run the application for the first time.
- **Backup Strategy**: Since the database is not in version control, please manually back up `handshake.db` regularly if the data is important.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the server:
   ```bash
   npm start
   ```

3. Open http://localhost:3000
