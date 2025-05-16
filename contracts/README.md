
# Kabal Fund Smart Contracts

> Solana on-chain programs for decentralized fund management

This directory contains the smart contracts for the Kabal Fund protocol, implemented as Solana programs using the Anchor framework. These contracts enable the creation of community-driven trading funds with integrated CPI calls to Jupiter Aggregator.

## 📋 Key Components

- **Fund Program**: Core contract for fund creation, SOL deposits, and management
- **Vote Registry**: On-chain storage of poll results and governance decisions
- **Jupiter Integration**: CPI calls to execute token swaps through Jupiter Aggregator

## 🛠️ Technical Architecture

### Fund Program

The main program implements:

- Fund creation with configurable parameters (lock-up period, minimum deposit)
- SOL deposit logic with PDA (Program Derived Address) management
- Trade execution via Jupiter CPI calls
- Vote result validation and execution

### Account Structure

```
Fund
├── fund_id: String
├── creator: Pubkey
├── contributors: Vec<Contributor>
├── locked_amount: u64
├── lock_up_period: i64
├── creation_timestamp: i64
├── trading_history: Vec<Trade>
└── active_polls: Vec<PollReference>

Contributor
├── address: Pubkey
├── deposit_amount: u64
├── deposit_timestamp: i64
└── withdrawal_eligibility: i64

Trade
├── execution_timestamp: i64
├── token_from: Pubkey
├── token_to: Pubkey
├── amount_in: u64
├── amount_out: u64
└── poll_id: Option<String>
```

## 🚀 Development Setup

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (1.68.0+ recommended)
- [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools) (1.14.0+ recommended)
- [Anchor](https://project-serum.github.io/anchor/getting-started/installation.html) (0.27.0+ recommended)

### Installation

```bash
# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test
```

## 🔌 Jupiter Integration

The smart contract integrates with Jupiter Aggregator through Cross-Program Invocation (CPI) calls, enabling:

1. Optimal token routing for maximum capital efficiency
2. Access to Solana's deep liquidity across DEXes
3. Minimal slippage for fund trades

Example CPI integration:

```rust
// Simplified example of Jupiter CPI integration
pub fn swap_tokens(
    ctx: Context<SwapTokens>,
    amount_in: u64,
) -> Result<()> {
    // Prepare Jupiter swap accounts
    let jupiter_accounts = [
        // Account metadata for Jupiter CPI call
        // ...
    ];
    
    // Invoke Jupiter swap
    solana_program::program::invoke(
        &Instruction {
            program_id: jupiter_program::id(),
            accounts: jupiter_accounts,
            data: // Serialized swap instruction data
        },
        &[/* Account infos */],
    )?;
    
    // Record trade in fund history
    // ...
    
    Ok(())
}
```

## 📝 Usage

The smart contracts expose the following key instructions:

- `create_fund`: Create a new fund with specified parameters
- `deposit`: Contribute SOL to an existing fund
- `trade`: Execute a token trade based on poll results
- `swap`: Record the outcome of a Telegram governance poll
- `redeem`: Withdraw deposited SOL after lock-up period

## 🔒 Security Considerations

- All fund operations require appropriate signature verification
- Time-locked deposits enforce minimum commitment periods
- Only verified poll results can trigger trades
- Multiple validation checks for fund operations
