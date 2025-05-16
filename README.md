# Kabal Fund

> Decentralized Community-Driven Trading Funds on Solana

Kabal Fund is a fully on-chain fund management protocol built on Solana, where users can create decentralized funds, contribute SOL deposits, and collaboratively govern trading strategies through Telegram-integrated voting. These funds are actively traded by fund managers via CPI (Cross-Program Invocation) calls to the Jupiter Aggregator, Solana's premier liquidity routing protocol.


##

DEMO URL - https://kabalfun.netlify.app/


## 🧩 Core Features

- **Create Funds**: Any user can create a new fund, which generates a unique fund ID and a dedicated Telegram group.
- **Deposit SOL**: Users can deposit SOL into any active fund for a fixed lock-up period.
- **Telegram-Based Voting**: Each fund has a corresponding Telegram group with an admin bot for governance.
- **Decentralized Polling**: Fund admins can initiate token selection polls via the Telegram bot.
- **Fund Governance**: Only contributors can vote on polls that determine trading strategies.
- **CPI Integration with Jupiter Aggregator**: Seamless execution of optimal token swaps from within the fund's smart contract.

## 🏗️ Project Structure

This project consists of three main components:

- [Smart Contracts](./contracts/README.md) - Solana programs written in Rust using the Anchor framework
- [Backend Service](./backend/README.md) - Node.js/TypeScript server managing Telegram bot integration and data synchronization
- [Frontend Application](./frontend/README.md) - React application for fund management and user interactions

## ⚙️ Architecture Breakdown

This is a text representation of the architecture diagram. When implementing the project, this would be replaced with an actual diagram image.

Architecture Diagram for Kabal Fund:

                +---------------------------+                  +-------------------------+
                |                           |                  |                         |
                |   Frontend Application    |<---------------->|    Backend Service      |
                |   (React + TailwindCSS)   |     REST API     |    (Node.js/Express)    |
                |                           |                  |                         |
                +------------^--------------+                  +------------^------------+
                            |                                              |
                            |                                              |
                            |                                              |
                            |                                              |
                            |                                              |
                            |                                              v
                +------------v--------------+                  +-------------------------+
                |                           |                  |                         |
                |      Solana Wallet        |                  |     Telegram Bot API    |
                |                           |                  |                         |
                +------------^--------------+                  +-------------------------+
                            |
                            |
                            |
                            v
                +---------------------------+
                |                           |
                |     Solana Blockchain     |<---------------->+-------------------------+
                |                           |     CPI Calls    |                         |
                +---------------------------+                  |    Jupiter Aggregator   |
                                                            |                         |
                                                            +-------------------------+


Key Components:

1. Frontend Application: User interface for fund management and visualization
2. Backend Service: Manages Telegram bot and synchronizes blockchain state
3. Solana Blockchain: Hosts the smart contracts for fund management
4. Telegram Bot API: Enables group creation and poll management
5. Jupiter Aggregator: Provides optimal token swapping routes for fund trades

Data Flow:
- Users interact with the frontend to create funds and make deposits
- The frontend communicates with both the Solana blockchain and backend service
- The backend manages Telegram groups and polls through the Telegram Bot API
- Fund trades are executed on-chain via CPI calls to Jupiter Aggregator
- Poll results from Telegram influence trade execution on the blockchain 

### 🔗 Blockchain (Solana Smart Contracts)

- Written in Rust with Anchor framework
- Implements fund creation, SOL deposits, and CPI calls to Jupiter Aggregator
- Stores voting results and trade history on-chain

### 🧠 Backend

- Written in TypeScript/Node.js
- Manages Telegram bot integrations, polls, and contributor verification
- Syncs fund state from the blockchain

### 🎨 Frontend

- Built with React + TailwindCSS
- Displays fund dashboards, creation interfaces, and voting information
- Integrates with Solana wallets for transactions

## 🚀 Getting Started

Please refer to the component-specific README files for detailed setup and development instructions:

- [Smart Contracts Setup](./contracts/README.md)
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)

## 💡 Future Enhancements

- Multi-signature approvals for fund trades
- Voting power weighted by deposit size
- On-chain governance logs and analytics
- Integration with Solana Pay for easy entry/exit


