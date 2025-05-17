# Solana Hedge Fund Backend

## Overview

This backend system powers a Solana-based hedge fund platform, enabling fund creation, asset management, transaction tracking, and performance analytics. The system uses Solana wallet signatures for secure authentication and provides comprehensive APIs for fund management and investment operations.

## Core Features

- **Fund Management**: Create and manage hedge funds with detailed information
- **Asset Tracking**: Monitor fund assets and portfolio composition
- **Transaction Processing**: Handle buy and sell transactions with fee calculations
- **User Holdings**: Track individual user investments across funds
- **Performance Analytics**: Generate time-series data for AUM and token price
- **Wallet Authentication**: Secure user authorization via Solana wallet signatures
- **Advanced Fund Filtering**: Sort funds by various criteria (trending, fundraising progress, price)
- **Token Price Integration**: Real-time token pricing via CoinMarketCap API
- **Blockchain Integration**: Direct interaction with Solana for token metadata
- **Telegram Integration**: Create and manage Telegram groups for funds
- **Polling System**: Create and manage polls in Telegram groups

## Technical Architecture

The backend is built using:

- **Node.js** with TypeScript for type safety
- **MongoDB** for data storage with Mongoose ODM
- **Solana Web3.js** for blockchain interactions
- **Express.js** for API routing
- **CoinMarketCap API** for token pricing
- **Telegram Bot API** for group management and polls

## Data Models

### Fund Model

- Fund creator and basic details (name, ticker, description)
- Fund identifiers (fundId, fundContractAddress, fundTokenAddress)
- Financial parameters (targetRaiseAmount, managementFee, currentAUM)
- Social media and website links
- Status tracking (fundraising, trading, expired)
- Lifecycle management (thresholdDeadline, expirationDate)
- Telegram group integration

### User Holding Model

- User investment tracking
- Fund token balance
- Initial investment amount
- Entry price and token address
- Last updated timestamp

### Ledger Model

- Transaction history for buys and sells
- Token information (address, symbol)
- Price at transaction time
- User and fund references

### Fund Price History Model

- Time-series data for fund token prices
- AUM tracking over time

### Poll Model

- Telegram polls for fund governance
- Poll options and vote counts
- Poll status (open/closed)
- Association with specific funds

## Fund Lifecycle Management

1. **Fundraising Phase**:

   - Only SOL tokens accepted initially
   - 3-day threshold deadline to meet minimum target
   - Automatic status updates based on fundraising progress

2. **Trading Phase**:

   - Begins when fundraising target is met
   - Multiple token types accepted
   - Full buy/sell functionality enabled

3. **Expiration**:
   - Funds expire after 3 months
   - Automatic cleanup and status updates

## API Endpoints

### Authentication

- `POST /user/login` - Authenticate user with wallet signature
- `GET /user/twitter/auth/link` - Get Twitter authentication link
- `GET /user/twitter/callback` - Twitter authentication callback
- `POST /user/telegram/auth` - Authenticate with Telegram

### Fund Management

- `POST /fund/create` - Create a new fund with logo upload
- `GET /fund/list` - List all funds
- `GET /fund/list/fundraising` - List fundraising funds
- `GET /fund/list/trading` - List trading funds
- `GET /fund/list/trending` - List trending funds
- `GET /fund/search/:searchText` - Search funds by name
- `GET /fund/:fundAddress` - Get fund details
- `GET /fund/:fundAddress/holders` - Get fund token holders

### Transaction Processing

- `POST /ledger/new` - Create a new ledger entry (buy/sell)
- `GET /ledger/fund/:fundAddress` - Get ledger entries for a fund

### User Portfolio

- `GET /user/holding/fund/:fundAddress` - Get user holdings for a fund

### Fund Manager Operations

- `GET /manager/funds` - Get funds managed by the authenticated user
- `GET /manager/fund/:fundAddress/holders` - Get holders of a managed fund

### Trading Operations

- `POST /trade/fund/:fundAddress/execute` - Execute a trade
- `GET /trade/fund/:fundAddress/history` - Get trade history for a fund
- `GET /trade/market/prices` - Get market prices
- `GET /trade/manager/trades` - Get trades executed by the manager

### Token Operations

- `GET /token/list` - Get all registered tokens
- `GET /token/jupiter` - Get tokens supported by Jupiter
- `GET /token/:address` - Get token details
- `GET /token/:address/history` - Get token price history
- `GET /token/:address/change` - Get token price change

### Fund Asset Operations

- `GET /asset/fund/:fundAddress/history` - Get asset history for a fund
- `GET /asset/fund/:fundAddress/token/:tokenAddress/history` - Get history for a specific token
- `GET /asset/fund/:fundAddress/token/:tokenAddress/performance` - Get token performance

### Analytics

- `GET /analytics/fund/:fundAddress/performance` - Get fund performance data

### Comments

- `POST /comment/new` - Create a new comment
- `GET /comment/fund/:fundId` - Get comments for a fund
- `GET /comment/:commentId/replies` - Get replies to a comment
- `POST /comment/:commentId/like` - Like or unlike a comment
- `PUT /comment/:commentId` - Update a comment
- `DELETE /comment/:commentId` - Delete a comment

### Polls

- `POST /poll/create` - Create a new poll
- `GET /poll/fund/:fundId` - Get polls for a fund
- `GET /poll/fund/address/:fundAddress` - Get polls for a fund by address
- `GET /poll/:pollId` - Get a specific poll

## Telegram Bot Commands

The system includes a Telegram bot that can be added to fund groups with the following commands:

- `/poll Question? | Option 1 | Option 2 | ... | [minutes]` - Create a poll (admin only)
- `/help` - Show help message

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Solana CLI tools (optional for local testing)
- CoinMarketCap API key
- Telegram Bot token and API credentials

### Environment Variables

PORT=5000
MONGO_URI=mongodb://localhost:27017/solana-hedge-fund
JWT_SECRET=your_jwt_secret
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_SESSION=your_telegram_session
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username

## Setup Instructions

### 1. Clone the Repository
