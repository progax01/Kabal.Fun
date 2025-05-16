# Kabal Fund Backend

> Node.js backend service with Telegram bot integration for decentralized fund governance

This directory contains the backend services for the Kabal Fund protocol. The backend is responsible for managing the Telegram bot integration, synchronizing on-chain fund data, and facilitating the governance process through polls.

## 📋 Key Components

- **Telegram Bot Service**: Creates and manages fund-specific Telegram groups
- **Blockchain Listener**: Monitors on-chain events and updates the database
- **API Service**: Exposes REST endpoints for the frontend
- **Poll Management**: Creates, tracks, and closes polls for fund governance

## 🛠️ Technical Architecture

### System Overview

```
                   ┌─────────────────┐
                   │  Solana Blockchain  │
                   └─────────┬───────┘
                             │
                             ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Telegram API │◄──┤  Backend Service  │───►│   Database   │
└─────────────┘    └─────────┬───────┘    └─────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │  Frontend App     │
                   └─────────────────┘
```

### Core Services

- **Fund Service**: Manages fund creation and tracking
- **Contributor Service**: Tracks contributors and their deposits
- **Poll Service**: Manages the lifecycle of governance polls
- **Telegram Service**: Handles bot interactions and group management
- **Blockchain Service**: Interacts with Solana RPC nodes

## 🚀 Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [PostgreSQL](https://www.postgresql.org/) (v13+ recommended)
- [Telegram Bot API Token](https://core.telegram.org/bots#creating-a-new-bot)
- Solana RPC endpoint (Mainnet or Devnet)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## 📝 API Endpoints

### Fund Management

- `POST /api/funds`: Create a new fund
- `GET /api/funds`: List all funds
- `GET /api/funds/:fundId`: Get fund details
- `GET /api/funds/:fundId/contributors`: List fund contributors
- `GET /api/funds/:fundId/trades`: List fund trading history

### Polls and Governance

- `GET /api/funds/:fundId/polls`: List all polls for a fund
- `GET /api/funds/:fundId/polls/:pollId`: Get poll details
- `POST /api/funds/:fundId/polls`: Create a new poll (admin only)
- `PUT /api/funds/:fundId/polls/:pollId/close`: Close an active poll (admin only)

## 🤖 Telegram Bot Integration

The Telegram bot automatically:

1. Creates a new group when a fund is created
2. Adds the bot as an administrator
3. Adds contributors to the group when they deposit
4. Creates polls based on admin requests
5. Processes and records votes
6. Closes polls and submits results to the blockchain

### Bot Commands

- `/create_poll [options]`: Create a new token selection poll (admin only)
- `/fund_info`: Display current fund information and statistics
- `/trades`: Show recent trading activity
- `/contributors`: List current fund contributors

## 🔄 Blockchain Integration

The backend maintains synchronization with the Solana blockchain through:

1. **Event Listeners**: Monitor for fund creation, deposits, and trades
2. **RPC Interactions**: Query fund states and account data
3. **Transaction Submission**: Submit poll results to the blockchain for trade execution

## 📊 Database Schema

The Mongo database stores:

- Fund metadata and configuration
- Contributor information
- Poll history and results
- Telegram group mappings
- Transaction history

## 🔐 Security Considerations

- All API endpoints require appropriate authentication
- Admin-only functions require special verification
- Telegram bot commands are restricted based on user roles
- Signed transactions utilize proper key management

