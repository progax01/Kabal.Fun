# Kabal Fund Frontend

> React-based web application for decentralized fund management on Solana

This directory contains the frontend application for the Kabal Fund protocol. The frontend provides an intuitive interface for users to create funds, make deposits, view poll results, and monitor fund performance.


## Website URL 

https://kabalfun.netlify.app/


## 📋 Key Features

- **Fund Discovery**: Browse and search for active funds
- **Fund Creation**: Create new funds with customizable parameters
- **SOL Deposits**: Contribute to funds via Solana wallet integration
- **Governance Visualization**: View active and past polls with results
- **Performance Tracking**: Monitor fund trading history and performance
- **Telegram Integration**: Seamless redirection to Telegram for voting

## 🛠️ Technical Architecture

### Technology Stack

- **React**: Core UI framework
- **TailwindCSS**: Utility-first CSS framework for styling
- **Solana Wallet Adapter**: Integration with Solana wallets
- **Web3.js**: Solana blockchain interaction
- **React Query**: Data fetching and state management
- **React Router**: Navigation and routing

### Key Components

```
src/
├── components/
│   ├── common/            # Reusable UI components
│   ├── fund/              # Fund-specific components
│   ├── governance/        # Poll and voting components
│   └── wallet/            # Wallet connection components
├── contexts/              # React contexts for state management
├── hooks/                 # Custom React hooks
├── pages/                 # Main application pages
├── services/              # API service integrations
├── utils/                 # Helper utilities
└── App.tsx                # Main application component
```

## 📱 Main Pages

### Fund Dashboard
- Overview of all available funds
- Performance metrics and statistics
- Filter and search functionality

### Fund Creation
- Step-by-step fund creation wizard
- Parameter configuration (lock-up period, etc.)
- Telegram group auto-creation flow

### Fund Details
- Comprehensive fund information
- Contributor list and deposit amounts
- Trading history with performance charts
- Active and past polls

### Deposit Interface
- SOL deposit form with wallet integration
- Lock-up period visualization
- Confirmation and receipt flow

## 🚀 Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (for local development)

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
# or
yarn dev
```

### Environment Variables

```
VITE_SOLANA_RPC_URL=<Solana RPC URL>
VITE_BACKEND_API_URL=<Backend API URL>
VITE_TELEGRAM_BOT_NAME=<Telegram Bot Username>
```

## 🔌 Integration Points

### Backend API Integration

The frontend communicates with the backend service through RESTful API endpoints:

- Fund creation and management
- Poll information retrieval
- Contributor data

### Blockchain Integration

Direct interaction with the Solana blockchain for:

- Wallet connections using Solana Wallet Adapter
- Transaction signing and submission
- Real-time fund data using on-chain account subscriptions

### Telegram Integration

- Deep linking to Telegram groups for fund governance
- Redirect flows for poll participation
- Integration with Telegram Web App capabilities

## 🎨 UI/UX Design

The interface follows these design principles:

- **Clean and Intuitive**: Straightforward navigation and clear information hierarchy
- **Responsive Design**: Optimized for all device sizes from mobile to desktop
- **Visual Feedback**: Loading states, transaction confirmations, and error handling
- **Educational Elements**: Tooltips and guides for blockchain concepts

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e

# Run component tests with Storybook
npm run storybook
```

## 🚀 Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```
