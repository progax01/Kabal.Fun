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

## Technical Architecture

The backend is built using:
- **Node.js** with TypeScript for type safety
- **MongoDB** for data storage with Mongoose ODM
- **Solana Web3.js** for blockchain interactions
- **Express.js** for API routing
- **CoinMarketCap API** for token pricing

## Data Models

### Fund Model
- Fund creator and basic details (name, ticker, description)
- Fund identifiers (fundId, fundContractAddress, fundTokenAddress)
- Financial parameters (targetRaiseAmount, managementFee, currentAUM)
- Social media and website links
- Status tracking (fundraising, trading, expired)
- Lifecycle management (thresholdDeadline, expirationDate)

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

### Fund Management
- Create fund with logo upload
- List funds with various filters (trending, fundraising, trading)
- Search funds by name
- Get fund details

### Transaction Processing
- Buy fund tokens with fee calculation
- Sell fund tokens (trading phase only)
- View transaction history

### User Portfolio
- View user holdings across funds
- Track investment performance

## Advanced Filtering and Sorting

### Fundraising Funds
- Most recent
- Least/most progress toward target
- Highest/lowest fundraising amount

### Trading Funds
- Most recent
- Highest/lowest token price
- Highest/lowest AUM

## Blockchain Integration

- Token metadata retrieval from Solana
- Price fetching from CoinMarketCap
- Transaction fee processing

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB
- Solana CLI tools (optional for local testing)
- CoinMarketCap API key

### Environment Variables