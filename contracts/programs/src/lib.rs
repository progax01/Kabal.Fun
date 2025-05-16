use std::str::FromStr;

use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, MintTo};
mod deposits;
mod redeem;
mod swap;

pub use deposits::*;
use solana_program::system_program;
pub use swap::ErrorCode;
pub use swap::*;

declare_id!("5FMQj6GpqSTFoRSzqP6d1P2Um4YLbzSvyJibuUusVs6Q");

pub const AUTHORITY_SEED: &[u8] = b"authority";
pub const WSOL_SEED: &[u8] = b"wsol";
pub const VAULT_SEED: &[u8] = b"fund_vault";
pub const FUND_TOKEN_SEED: &[u8] = b"fund_token";

#[program]
pub mod first {
    use super::*;
    pub use deposits::{process_deposit, DepositLiquidity, UserDeposit, LAMPORTS_PER_SOL};
    pub use swap::{sol_to_swap, swap_to_sol, SOLToSwap, SwapToSOL};

    pub fn create_fund_token_account(
        ctx: Context<CreateFundTokenAccount>,
        fund_id: String,
    ) -> Result<()> {
        msg!("Creating fund token account for fund_id: {}", fund_id);

        let authority_bump = *ctx.bumps.get("program_authority").unwrap();
        let authority_seeds = &[AUTHORITY_SEED, &[authority_bump]];

        let rent = Rent::get()?;
        let space = TokenAccount::LEN;
        let lamports = rent.minimum_balance(space);

        solana_program::program::invoke_signed(
            &solana_program::system_instruction::create_account(
                &ctx.accounts.payer.key(),
                &ctx.accounts.fund_token_account.key(),
                lamports,
                space as u64,
                &ctx.accounts.token_program.key(),
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.fund_token_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                FUND_TOKEN_SEED,
                fund_id.as_bytes(),
                ctx.accounts.usdc_mint.key().as_ref(),
                &[*ctx.bumps.get("fund_token_account").unwrap()],
            ]],
        )?;

        token::initialize_account(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::InitializeAccount {
                account: ctx.accounts.fund_token_account.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                authority: ctx.accounts.program_authority.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ))?;

        msg!("Fund token account created successfully");
        Ok(())
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        amount: u64,
        fund_id: String,
        fund_creator: Pubkey,
        manager_address: Pubkey,
        tvl: u64,
    ) -> Result<()> {
        let tokens_to_transfer = amount;
        process_deposit(
            ctx,
            tokens_to_transfer,
            fund_id,
            fund_creator,
            manager_address,
            tvl,
        )
    }

    // pub  fn redeem_liquidity(ctx: Context<RedeemLiquidity>,amount:u64,fund_id:String,fund_creator:Pubkey,manager_address:Pubkey) -> Result<()> {
    //     process_redeem(ctx,amount,fund_id,fund_creator,manager_address)
    // }

    pub fn get_all_funds(ctx: Context<GetAllFunds>) -> Result<Vec<CompleteFundInfo>> {
        // This will be handled client-side as we need to fetch all accounts
        Ok(Vec::new())
    }

    pub fn initialize(ctx: Context<Initialize>, hedge_fund: Pubkey) -> Result<()> {
        ctx.accounts.hedge_fund_owner.hedge_fund = hedge_fund;
        Ok(())
    }

    pub fn trade(ctx: Context<Trade>, fund_id: String, amount: u64, data: Vec<u8>) -> Result<()> {
        msg!("Trade instruction started for fund_id: {}", fund_id);
        msg!(
            "Fund total_deposit: {:?}",
            ctx.accounts.fund_details.total_deposit
        );

        let fund_details = &mut ctx.accounts.fund_details;

        // Calculate required SOL
        let rent = Rent::get()?;
        let wsol_rent = rent.minimum_balance(TokenAccount::LEN);
        let buffer = 5000; // Same buffer as in sol_to_swap for consistency
        let total_required = amount + wsol_rent + buffer;

        // Get balances
        let vault_balance = ctx.accounts.fund_vault.lamports();

        // Log detailed balances
        msg!("BALANCE CHECK:");
        msg!("- Vault balance: {} lamports", vault_balance);

        msg!("- Required amount: {} lamports", total_required);
        msg!(
            "- Fund accounting - total_deposit: {}",
            fund_details.total_deposit
        );
        msg!(
            "- Fund accounting - current_deposit: {}",
            fund_details.current_depost
        );

        if fund_details.current_depost >= amount {
            fund_details.current_depost = fund_details
                .current_depost
                .checked_sub(amount)
                .ok_or(FundError::OverflowError)?;
            msg!(
                "Updated fund accounting: current_depost -> {}",
                fund_details.current_depost
            );
        } else {
            msg!(
                "WARNING: Fund accounting shows insufficient funds. Actual: {}, Needed: {}",
                fund_details.current_depost,
                amount
            );
            // Set to zero to avoid underflow
            fund_details.current_depost = 0;
            msg!("Set fund current_depost to 0");
        }

        // Prepare context for swap
        let sol_to_swap_ctx = Context {
            program_id: ctx.program_id,
            accounts: &mut swap::SOLToSwap {
                fund_details: fund_details.clone(),
                program_authority: ctx.accounts.program_authority.clone(),
                program_wsol_account: ctx.accounts.program_wsol_account.clone(),
                user_account: ctx.accounts.user_account.clone(),
                fund_vault: ctx.accounts.fund_vault.clone(),
                sol_mint: ctx.accounts.sol_mint.clone(),
                destination_mint: ctx.accounts.destination_mint.clone(),
                fund_token_account: ctx.accounts.fund_token_account.clone(),
                jupiter_program: ctx.accounts.jupiter_program.clone(),
                token_program: ctx.accounts.token_program.clone(),
                system_program: ctx.accounts.system_program.clone(),
            },
            remaining_accounts: ctx.remaining_accounts,
            bumps: ctx.bumps.clone(),
        };

        // Execute the swap
        msg!("Calling sol_to_swap with amount: {}", amount);
        let result = swap::sol_to_swap(sol_to_swap_ctx, fund_id, amount, data);

        // Log result status
        match &result {
            Ok(_) => msg!("Trade completed successfully"),
            Err(e) => msg!("Trade failed with error: {:?}", e),
        }

        result
    }



    pub fn create_fund(
        ctx: Context<CreateFund>,
        fund_id: String,
        amount: u64,
        fund_name: String,
        description: String,
        invest_threshold: u64,
    ) -> Result<()> {
        let fund_details = &mut ctx.accounts.fund_details;

        fund_details.fund_token_mint = ctx.accounts.token_mint.key();

        fund_details.start_time = Clock::get()?.unix_timestamp;
        fund_details.tokens_minted = amount;
        fund_details.total_deposit = 0;
        let fund_id_bytes = fund_id.as_bytes();
        let mut fund_id_array = [0u8; 32];
        fund_id_array[..fund_id_bytes.len()].copy_from_slice(fund_id_bytes);
        fund_details.fund_id = fund_id_array;

        let name_bytes = fund_name.as_bytes();
        let mut name_array = [0u8; 10];
        let name_len = std::cmp::min(name_bytes.len(), 10);
        name_array[..name_len].copy_from_slice(&name_bytes[..name_len]);
        fund_details.fund_name = name_array;

        // Set description
        let desc_bytes = description.as_bytes();
        let mut desc_array = [0u8; 32];
        let desc_len = std::cmp::min(desc_bytes.len(), 32);
        desc_array[..desc_len].copy_from_slice(&desc_bytes[..desc_len]);
        fund_details.description = desc_array;

        fund_details.invest_threshold = invest_threshold;
        fund_details.authority = ctx.accounts.user.key();
        // Initialize status as active
        fund_details.status = FUND_STATUS_ACTIVE;
        // Then do the minting in a new scope
        let binding = ctx.accounts.user.key();
        let seeds = &[
            b"fund_details".as_ref(),
            fund_id.as_bytes().as_ref(),
            binding.as_ref(), // Add user's public key to seeds
            &[*ctx.bumps.get("fund_details").unwrap()],
        ];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.fund_token_account.to_account_info(),
                    authority: fund_details.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        fund_details.tokens_minted = amount;

        Ok(())
    }

    pub fn get_user_deposits(
        ctx: Context<GetUserDeposits>,
        fund_id: String,
        _fund_creator: Pubkey,
    ) -> Result<Vec<UserDeposit>> {
        let fund_details = &ctx.accounts.fund_details;
        Ok(fund_details.user_deposits.clone())
    }

    pub fn drain_all_funds(ctx: Context<DrainAllFunds>, fund_id: String) -> Result<()> {
        msg!("Starting to drain all funds...");

        // 1. Drain SOL from fund vault
        let vault_bump = *ctx.bumps.get("fund_vault").unwrap();
        let vault_seeds = &[VAULT_SEED, fund_id.as_bytes(), &[vault_bump]];
        let vault_balance = ctx.accounts.fund_vault.lamports();

        if vault_balance > 0 {
            msg!("Draining {} SOL from fund vault", vault_balance);
            solana_program::program::invoke_signed(
                &solana_program::system_instruction::transfer(
                    &ctx.accounts.fund_vault.key(),
                    &ctx.accounts.destination.key(),
                    vault_balance,
                ),
                &[
                    ctx.accounts.fund_vault.to_account_info(),
                    ctx.accounts.destination.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[vault_seeds],
            )?;
        }

        // 2. Drain USDC from fund token account
        let fund_token_bump = *ctx.bumps.get("fund_token_account").unwrap();
        let usdc_balance = ctx.accounts.fund_token_account.amount;

        if usdc_balance > 0 {
            msg!("Draining {} USDC tokens", usdc_balance);
            // Fix the borrowing issue by storing the key in a variable
            let usdc_mint_key = ctx.accounts.usdc_mint.key();
            let token_seeds = &[
                FUND_TOKEN_SEED,
                fund_id.as_bytes(),
                usdc_mint_key.as_ref(),
                &[fund_token_bump],
            ];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.fund_token_account.to_account_info(),
                        to: ctx.accounts.destination_token_account.to_account_info(),
                        authority: ctx.accounts.fund_token_account.to_account_info(),
                    },
                    &[token_seeds],
                ),
                usdc_balance,
            )?;
        }

        // 3. Drain SOL from program authority
        let authority_bump = *ctx.bumps.get("program_authority").unwrap();
        let authority_seeds = &[AUTHORITY_SEED, &[authority_bump]];
        let authority_balance = ctx.accounts.program_authority.lamports();
        let min_rent = Rent::get()?.minimum_balance(0);
        let transfer_amount = authority_balance.saturating_sub(min_rent);

        if transfer_amount > 0 {
            msg!(
                "Transferring {} SOL from program authority",
                transfer_amount
            );
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.program_authority.to_account_info(),
                        to: ctx.accounts.destination.to_account_info(),
                    },
                    &[authority_seeds],
                ),
                transfer_amount,
            )?;
        }

        msg!("All funds drained successfully");
        Ok(())
    }



    pub fn usdc_to_sol_trade(
        ctx: Context<UsdcToSolTrade>,
        fund_id: String,
        amount: u64,
        data: Vec<u8>,
    ) -> Result<()> {
        msg!(
            "USDC to SOL Trade instruction started for fund_id: {}",
            fund_id
        );

        // Get authority bump for signing
        let authority_bump = *ctx.bumps.get("program_authority").unwrap();
        let authority_seeds = &[AUTHORITY_SEED, &[authority_bump]];

        msg!("Transferring SOL from user to program authority for WSOL operations");
        let transfer_amount = 3000000; // 0.003 SOL for WSOL account creation and operations

        // Use the system program to transfer SOL from user to program authority
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_account.to_account_info(),
                    to: ctx.accounts.program_authority.to_account_info(),
                },
            ),
            transfer_amount,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.fund_token_account.to_account_info(),
                    to: ctx.accounts.destination_token_account.to_account_info(),
                    authority: ctx.accounts.program_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            amount,
        )?;

        // Approve Jupiter program to spend USDC tokens
        msg!("Approving Jupiter program to spend USDC tokens");
        token::approve(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Approve {
                    to: ctx.accounts.fund_token_account.to_account_info(),
                    delegate: ctx.accounts.jupiter_program.to_account_info(),
                    authority: ctx.accounts.program_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            amount,
        )?;

        // Prepare context for swap
        let swap_to_sol_ctx = Context {
            program_id: ctx.program_id,
            accounts: &mut swap::SwapToSOL {
                program_authority: ctx.accounts.program_authority.clone(),
                program_wsol_account: ctx.accounts.program_wsol_account.clone(),
                user_account: ctx.accounts.user_account.clone(),
                sol_mint: ctx.accounts.sol_mint.clone(),
                user_token_account: ctx.accounts.fund_token_account.clone(),
                fund_vault: ctx.accounts.fund_vault.clone(),
                jupiter_program: ctx.accounts.jupiter_program.clone(),
                token_program: ctx.accounts.token_program.clone(),
                system_program: ctx.accounts.system_program.clone(),
            },
            remaining_accounts: ctx.remaining_accounts,
            bumps: ctx.bumps.clone(),
        };

        // Execute the swap
        msg!("Calling swap_to_sol with amount: {}", amount);
        let result = swap::swap_to_sol(swap_to_sol_ctx, amount, data, authority_seeds)?;

        msg!("USDC to SOL trade completed successfully");
        Ok(())
    }


}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompleteFundInfo {
    pub fund_id: String,
    pub fund_name: String,
    pub description: String,
    pub invest_threshold: u64,
    pub total_deposit: u64,
    pub tokens_minted: u64,
    pub authority: Pubkey,
    pub start_time: i64,
    pub status: u8,
}

#[derive(Accounts)]
pub struct GetAllFunds<'info> {
    /// CHECK: Safe because we're just using it to derive PDAs
    pub user: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(hedge_fund:Pubkey)]
pub struct Initialize<'info> {
    #[account(
        seeds = [b"fund_manager",hedge_fund.as_ref()],
        bump,
        init,
        payer = payer,
        space = 8 + 32
    )]
    pub hedge_fund_owner: Account<'info, HedgeFundOwner>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct HedgeFundOwner {
    pub hedge_fund: Pubkey,
}


#[derive(Accounts)]
#[instruction(fund_id: String, amount: u64)]
pub struct Trade<'info> {
    #[account(
        seeds = [b"fund_details", fund_id.as_bytes(), user_account.key().as_ref()],
        bump,
        mut
    )]
    pub fund_details: Account<'info, FundDetails>,

    #[account(
        seeds = [b"fund_manager", fund_details.authority.as_ref()],
        bump,
        constraint = hedge_fund_owner.hedge_fund == user_account.key() @ FundError::UnauthorizedTrader
    )]
    pub hedge_fund_owner: Account<'info, HedgeFundOwner>,

    #[account(mut, seeds = [AUTHORITY_SEED], bump)]
    pub program_authority: SystemAccount<'info>,

    #[account(mut, seeds = [WSOL_SEED], bump)]
    /// CHECK: This is safe because we're only using it as a temp storage
    pub program_wsol_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub user_account: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, fund_id.as_bytes()],
        bump
    )]
    /// CHECK: This is a simple SOL vault owned by the system program
    pub fund_vault: UncheckedAccount<'info>,

    #[account(address = spl_token::native_mint::id())]
    pub sol_mint: Account<'info, Mint>,

    /// Destination token mint - the token we're swapping to
    pub destination_mint: Account<'info, Mint>,

    /// Fund token account to store swapped tokens (PDA)
    #[account(mut)]
    /// CHECK: Will be initialized if needed
    pub fund_token_account: UncheckedAccount<'info>,

    pub jupiter_program: Program<'info, Jupiter>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(fund_id: String)]
pub struct UsdcToSolTrade<'info> {
    #[account(mut, seeds = [AUTHORITY_SEED], bump)]
    pub program_authority: SystemAccount<'info>,

    #[account(mut)]
    pub destination_token_account: Account<'info, TokenAccount>,

    /// CHECK: program_wsol_account
    #[account(mut, seeds = [WSOL_SEED], bump)]
    pub program_wsol_account: UncheckedAccount<'info>,

    /// CHECK: Anyone can call this instruction
    pub user_account: AccountInfo<'info>, // Changed from Signer to AccountInfo

    /// CHECK:fund_vault
    #[account(mut)]
    pub fund_vault: UncheckedAccount<'info>,

    #[account(address = spl_token::native_mint::id())]
    pub sol_mint: Account<'info, Mint>,

    /// Fund's USDC token account (source of USDC)
    #[account(
        mut,
        // Only verify this is a token account with the correct mint and authority
        token::mint = usdc_mint,
        // IMPORTANT: Add constraint to ensure authority is program_authority
        constraint = fund_token_account.owner == program_authority.key() @ ErrorCode::IncorrectOwner
    )]
    pub fund_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub jupiter_program: Program<'info, Jupiter>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


#[derive(Accounts)]
#[instruction(fund_id: String)]
pub struct CreateFund<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8 + 32 + 10 + 32 + 8 + 8 + 8 + 1 + 4 + (4 + 32 + 8) * 10,
        seeds = [b"fund_details", fund_id.as_bytes(), user.key().as_ref()],
        bump
    )]
    pub fund_details: Account<'info, FundDetails>,
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = fund_details,
    )]
    pub fund_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(fund_id: String,fund_creator: Pubkey)]
pub struct GetUserDeposits<'info> {
    #[account(
        seeds = [b"fund_details", fund_id.as_bytes(), fund_creator.as_ref()],
        bump,
    )]
    pub fund_details: Account<'info, FundDetails>,
}

#[derive(Accounts)]
#[instruction(fund_id: String)]
pub struct DrainAllFunds<'info> {
    #[account(mut, seeds = [AUTHORITY_SEED], bump)]
    pub program_authority: SystemAccount<'info>,

    /// CHECK: This is a simple SOL vault owned by the system program, validated by PDA seeds
    #[account(
        mut,
        seeds = [VAULT_SEED, fund_id.as_bytes()],
        bump,
        owner = system_program::ID
    )]
    pub fund_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [FUND_TOKEN_SEED, fund_id.as_bytes(), usdc_mint.key().as_ref()],
        bump
    )]
    pub fund_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is safe because we're only using it as a temporary WSOL storage for swaps
    #[account(mut, seeds = [WSOL_SEED], bump)]
    pub program_wsol_account: UncheckedAccount<'info>,

    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: Hardcoded destination address verified in constraint
    #[account(
        mut,
        constraint = destination.key() == Pubkey::from_str("5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP").unwrap()
    )]
    pub destination: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = destination_token_account.owner == Pubkey::from_str("5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP").unwrap()
    )]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct FundDetails {
    pub authority: Pubkey,
    pub fund_token_mint: Pubkey, // The fund token mint address
    pub tokens_minted: u64,      // Total tokens minted so far
    pub start_time: i64,
    pub fund_id: [u8; 32],
    pub fund_name: [u8; 10],   // Moved from FundDetails
    pub description: [u8; 32], // Moved from FundDescription
    pub invest_threshold: u64, // Moved from FundDetails
    pub total_deposit: u64,
    pub current_fund_token: u64,
    pub current_depost: u64,
    pub user_deposits: Vec<UserDeposit>,
    pub status: u8, // 0 = Active, 1 = Trade, 2 = Expired
}

// Fund status constants
pub const FUND_STATUS_ACTIVE: u8 = 0;
pub const FUND_STATUS_TRADE: u8 = 1;
pub const FUND_STATUS_EXPIRED: u8 = 2;

// Three months in seconds (90 days)
pub const THREE_MONTHS_SECONDS: i64 = 60 * 60 * 24 * 90;

#[error_code]
pub enum FundError {
    #[msg("The provided token account is not owned by the user")]
    InvalidTokenAccount,
    #[msg("Token mint doesn't match the token account")]
    TokenMintMismatch,
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    #[msg("Cannot withdraw before 3 days from fund start")]
    WithdrawalTooEarly,
    #[msg("Cannot withdraw as investment threshold is already met")]
    ThresholdAlreadyMet,
    #[msg("No deposits found for this user in this fund")]
    NoDepositsFound,
    #[msg("Arithmetic overflow")]
    OverflowError,
    #[msg("InvalidWithdrawAmount ")]
    InvalidWithdrawAmount,
    #[msg("InsufficientFunds ")]
    InsufficientFunds,
    #[msg("Fund is expired (more than 3 months old)")]
    FundExpired,
    #[msg("Cannot deposit to an expired fund")]
    InvalidFundStatus,
    #[msg("Insufficient token balance")]
    InsufficientTokens,
    #[msg("Incorrect owner")]
    IncorrectOwner,
    #[msg("UnauthorizedTrader ")]
    UnauthorizedTrader
}

#[derive(Accounts)]
#[instruction(fund_id: String)]
pub struct CreateFundTokenAccount<'info> {
    #[account(mut, seeds = [AUTHORITY_SEED], bump)]
    pub program_authority: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [FUND_TOKEN_SEED, fund_id.as_bytes(), usdc_mint.key().as_ref()],
        bump
    )]
    /// CHECK: This account will be initialized as a token account
    pub fund_token_account: UncheckedAccount<'info>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
