pub use anchor_lang::prelude::*;


pub use anchor_spl::token::{self, Token, TokenAccount, Transfer};
pub use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use crate::FundDetails;
use crate::Mint;
use anchor_spl::token::MintTo;
use anchor_spl::associated_token::AssociatedToken;

use solana_program::system_instruction;
use solana_program::program::invoke;


use crate::{FUND_STATUS_ACTIVE, FUND_STATUS_TRADE, FUND_STATUS_EXPIRED, THREE_MONTHS_SECONDS, FundError, VAULT_SEED};

pub fn process_deposit(ctx: Context<DepositLiquidity>, amount: u64, fund_id: String, fund_creator: Pubkey, manager_address: Pubkey, tvl: u64) -> Result<()> {
    msg!("Deposit amount in lamports: {}", amount);
    msg!("Current TVL in lamports: {}", tvl);
    msg!("Printing all values of params amount {} fund id {}, manager {}  this is tvl ,{}" ,amount,fund_id, manager_address,tvl);
    let fund_threshold = ctx.accounts.fund_details.invest_threshold;
    let current_total = ctx.accounts.fund_details.total_deposit;
    
    // Check if fund is expired (more than 3 months old)
    let current_time = Clock::get()?.unix_timestamp;
    let fund_start_time = ctx.accounts.fund_details.start_time;
    let fund_age = current_time - fund_start_time;
    
    // Check if fund is expired
    if fund_age > THREE_MONTHS_SECONDS {
        ctx.accounts.fund_details.status = FUND_STATUS_EXPIRED;
        return err!(FundError::FundExpired);
    }
    
    // Only block deposits if the fund is EXPIRED
    if ctx.accounts.fund_details.status == FUND_STATUS_EXPIRED {
        return err!(FundError::InvalidFundStatus);
    }
   

    
    let total_fee = amount.checked_div(100).ok_or(FundError::OverflowError)?;
    let remaining_amount = amount.checked_sub(total_fee).ok_or(FundError::OverflowError)?;

    // Split fees (20% to manager, 80% to hedge owner)
    let manager_fee = total_fee.checked_mul(20).ok_or(FundError::OverflowError)? / 100;
    let owner_fee = total_fee.checked_sub(manager_fee).ok_or(FundError::OverflowError)?;

    // Transfer SOL from user to the VAULT (not to fund_details)
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.fund_vault.key(),
            remaining_amount,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.fund_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    msg!("Transferred {} lamports to fund vault", remaining_amount);

    // Transfer manager fee
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.fund_creator_account.key(),
            manager_fee,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.fund_creator_account.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Transfer hedge owner fee
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.hedge_fund_owner.key(),
            owner_fee,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.hedge_fund_owner.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    msg!("SOL transfers completed");

    let binding = fund_creator;
    let seeds = &[
        b"fund_details".as_ref(),
        fund_id.as_bytes().as_ref(),
        binding.as_ref(),
        &[*ctx.bumps.get("fund_details").unwrap()]  
    ];

    msg!("After SOL transfers completed");
    msg!("current_total, fund_threshold {:?} {:?}", current_total, fund_threshold);
    
    if current_total < fund_threshold {
        // Calculate FT price: TVL / Total FT Supply
        let total_ft_supply = ctx.accounts.fund_details.tokens_minted;
        if total_ft_supply == 0 {
            // Initial deposit case - 1:1 ratio
            let tokens_to_transfer = remaining_amount;
            
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.fund_token_account.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.fund_details.to_account_info(),
                    },
                    &[seeds]
                ),
                tokens_to_transfer
            )?;

            let fund_details = &mut ctx.accounts.fund_details;
            fund_details.tokens_minted = fund_details.tokens_minted.checked_sub(tokens_to_transfer)
                .ok_or(FundError::OverflowError)?;
        } else {
            // Calculate based on formula
            let ft_price = tvl.checked_div(total_ft_supply).ok_or(FundError::OverflowError)?;
            let tokens_to_transfer = remaining_amount.checked_div(ft_price).ok_or(FundError::OverflowError)?;

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.fund_token_account.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.fund_details.to_account_info(),
                    },
                    &[seeds]
                ),
                tokens_to_transfer
            )?;

            let fund_details = &mut ctx.accounts.fund_details;
            fund_details.tokens_minted = fund_details.tokens_minted.checked_sub(tokens_to_transfer)
                .ok_or(FundError::OverflowError)?;
        }
    } else {
        msg!("Inside else condition");
        // Calculate new tokens based on updated TVL
        let new_tvl = tvl.checked_add(remaining_amount).ok_or(FundError::OverflowError)?;
        let total_ft_supply = ctx.accounts.fund_details.tokens_minted;
        
        // Calculate new tokens to mint based on the formula
        let new_tokens = if total_ft_supply == 0 {
            remaining_amount // 1:1 ratio for initial deposit
        } else {
            let ft_price = new_tvl.checked_div(total_ft_supply).ok_or(FundError::OverflowError)?;
            remaining_amount.checked_div(ft_price).ok_or(FundError::OverflowError)?
        };

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.fund_token_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.fund_details.to_account_info(),
                },
                &[seeds]
            ),
            new_tokens,
        )?;

        let fund_details = &mut ctx.accounts.fund_details;
        fund_details.tokens_minted = fund_details.tokens_minted.checked_add(new_tokens)
            .ok_or(FundError::OverflowError)?;
        fund_details.current_fund_token = fund_details.tokens_minted;
    }

    // Update total deposit
    let fund_details = &mut ctx.accounts.fund_details;
    fund_details.total_deposit = fund_details.total_deposit.checked_add(amount)
        .ok_or(FundError::OverflowError)?;
    fund_details.current_depost = fund_details.total_deposit;
    
    // Check if the fund has reached its investment threshold and update status to TRADE if so
    if fund_details.total_deposit >= fund_details.invest_threshold && fund_details.status == FUND_STATUS_ACTIVE {
        fund_details.status = FUND_STATUS_TRADE;
        msg!("Fund has reached investment threshold. Status updated to TRADE.");
    }

    // Record user deposit
    let mut fund_id_bytes = [0u8; 32];
    fund_id_bytes[..fund_id.as_bytes().len()].copy_from_slice(fund_id.as_bytes());
    
    let user_deposit = UserDeposit {
        user: ctx.accounts.user.key(),
        deposit_amount: amount,
        fund_id: fund_id_bytes,
    };
    ctx.accounts.fund_details.user_deposits.push(user_deposit);

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, fund_id: String, fund_creator: Pubkey, manager_address: Pubkey, tvl: u64)]
pub struct DepositLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"fund_details", fund_id.as_bytes(), fund_creator.as_ref()],
        bump,
        has_one = fund_token_mint
    )]
    pub fund_details: Account<'info, FundDetails>,

    // Add the fund vault account
    #[account(
        mut,
        seeds = [VAULT_SEED, fund_id.as_bytes()],
        bump
    )]
    /// CHECK: This is a simple SOL vault owned by the system program
    pub fund_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = fund_token_mint,
        associated_token::authority = fund_details,
    )]
    pub fund_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = fund_token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is the fund creator's account to receive fees
    #[account(mut, constraint = fund_creator_account.key() == fund_creator)]
    pub fund_creator_account: AccountInfo<'info>,

    /// CHECK: This is the hedge fund owner account
    #[account(
        mut, 
        seeds = [b"fund_manager", manager_address.as_ref()],
        bump
    )]
    pub hedge_fund_owner: AccountInfo<'info>,

    // Make sure this is mutable to allow minting new tokens
    #[account(mut)]
    pub fund_token_mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UserDeposit {
    pub user: Pubkey,
    pub deposit_amount: u64,
    pub fund_id: [u8; 32],
}