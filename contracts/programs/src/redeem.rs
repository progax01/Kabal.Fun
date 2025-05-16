// Rust implementation (redeem.rs)
use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, Approve, Burn, Mint, Token, TokenAccount, Transfer}};
use crate::FundDetails;
use solana_program::{
    native_token::LAMPORTS_PER_SOL, program::{invoke, invoke_signed}, system_instruction,
    clock::Clock
};

// Corrected redeem.rs with balanced lamport transfers

pub fn process_redeem(ctx: Context<RedeemLiquidity>, amount: u64, fund_id: String, fund_creator: Pubkey, manager_address: Pubkey) -> Result<()> {
    msg!("=== REDEEM PROCESS STARTED ===");
    
    // Import fund status constants
    use crate::{FUND_STATUS_ACTIVE, FUND_STATUS_TRADE, FUND_STATUS_EXPIRED, THREE_MONTHS_SECONDS, FundError};
    
    // Check fund expiration status
    let current_time = Clock::get()?.unix_timestamp;
    let fund_start_time = ctx.accounts.fund_details.start_time;
    let fund_age = current_time - fund_start_time;
    
    // Update status to expired if needed
    if fund_age > THREE_MONTHS_SECONDS && ctx.accounts.fund_details.status != FUND_STATUS_EXPIRED {
        ctx.accounts.fund_details.status = FUND_STATUS_EXPIRED;
        msg!("Fund has expired due to age over 3 months");
    }
    
    // Burn the user's tokens first
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    
    token::burn(burn_ctx, amount)?;
    
    let user_token_balance = amount;
    msg!("User's after token balance: {}", user_token_balance);
    
    if user_token_balance == 0 {
        return err!(FundError::InsufficientTokens);
    }
    
    let sol_amount = user_token_balance;
    
    // Calculate fee correctly to avoid overflow
    // Instead of dividing first (which can cause precision loss), we'll multiply by the percentage first
    let total_fee = sol_amount.checked_mul(1).ok_or(FundError::OverflowError)?.checked_div(100).ok_or(FundError::OverflowError)?;
    
    // Ensure we don't overflow by checking each calculation
    let user_receives = sol_amount.checked_sub(total_fee).ok_or(FundError::OverflowError)?;
    
    // Split fees - use saturating operations to prevent overflow
    let manager_fee = total_fee.saturating_mul(20).saturating_div(100);
    let owner_fee = total_fee.saturating_sub(manager_fee);
    
    // Verify fund has enough SOL
    let fund_lamports = ctx.accounts.fund_details.to_account_info().lamports();
    msg!("fund_lamports sol_amount {:?} {:?}", fund_lamports, sol_amount);
    
    if fund_lamports < sol_amount {
        return err!(FundError::InsufficientFunds);
    }
    
    // Defensive programming: ensure user_receives doesn't exceed fund_lamports
    if user_receives > fund_lamports {
        return err!(FundError::OverflowError);
    }
    
    // Transfer SOL using the explicit try_borrow_mut_lamports approach
    // IMPORTANT: Make sure we have enough lamports for rent exemption
    let min_rent = Rent::get()?.minimum_balance(ctx.accounts.fund_details.to_account_info().data_len());
    
    // Ensure we don't drop below rent exemption requirement
    if fund_lamports.saturating_sub(user_receives) < min_rent {
        return err!(FundError::InsufficientFunds);
    }
    
    // Transfer the exact amount user should receive
    **ctx.accounts.fund_details.to_account_info().try_borrow_mut_lamports()? = 
        fund_lamports.checked_sub(user_receives).ok_or(FundError::OverflowError)?;
    
    let user_lamports = ctx.accounts.user.to_account_info().lamports();
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = 
        user_lamports.checked_add(user_receives).ok_or(FundError::OverflowError)?;
    
    msg!("after transfer");
    
    // Update fund manager state
    let fund_details = &mut ctx.accounts.fund_details;
    
    // Make sure these operations can't underflow
    // fund_details.tokens_minted = fund_details.tokens_minted
    //     .checked_sub(user_token_balance)
    //     .ok_or(FundError::OverflowError)?;
    
    // fund_details.total_deposit = fund_details.total_deposit
    //     .checked_sub(sol_amount)
    //     .ok_or(FundError::OverflowError)?;
    
    msg!("=== REDEEM PROCESS COMPLETED ===");
    msg!("Tokens burned: {}", user_token_balance);
    msg!("SOL returned to user: {}", user_receives);
    msg!("Manager fee: {}", manager_fee);
    
    Ok(())
}

// pub fn process_redeem(ctx: Context<RedeemLiquidity>, amount: u64, fund_id: String, fund_creator: Pubkey,manager_address:Pubkey) -> Result<()> {
//     msg!("=== REDEEM PROCESS STARTED ===");
    
//     // Burn the user's tokens first
//     let burn_ctx = CpiContext::new(
//         ctx.accounts.token_program.to_account_info(),
//         Burn {
//             mint: ctx.accounts.token_mint.to_account_info(),
//             from: ctx.accounts.user_token_account.to_account_info(),
//             authority: ctx.accounts.user.to_account_info(),
//         },
//     );
    
//     token::burn(burn_ctx, amount)?;
    
//     let user_token_balance = amount;
//     msg!("User's after token balance: {}", user_token_balance);
    
//     if user_token_balance == 0 {
//         return err!(ErrorCode::InsufficientTokens);
//     }
    
//     let sol_amount = user_token_balance;
//     let total_fee = sol_amount.checked_div(100).ok_or(ErrorCode::OverflowError)?;
//     let user_receives = sol_amount.checked_sub(total_fee).ok_or(ErrorCode::OverflowError)?;
    
//     // Split fees
//     let manager_fee = total_fee.checked_mul(20).ok_or(ErrorCode::OverflowError)? / 100;
//     let owner_fee = total_fee.checked_sub(manager_fee).ok_or(ErrorCode::OverflowError)?;
    
//     // Verify fund has enough SOL
//     let fund_lamports = ctx.accounts.fund_details.to_account_info().lamports();
//     msg!("fund_lamports sol_amount {:?} {:?}", fund_lamports, sol_amount);
//     if fund_lamports < sol_amount {
//         return err!(ErrorCode::InsufficientFunds);
//     }
    
//     // Transfer the exact amount user should receive (user_receives instead of sol_amount)
//     **ctx.accounts.fund_details.to_account_info().try_borrow_mut_lamports()? = 
//         fund_lamports.checked_sub(user_receives).ok_or(ErrorCode::OverflowError)?;
    
//     let user_lamports = ctx.accounts.user.to_account_info().lamports();
//     **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = 
//         user_lamports.checked_add(user_receives).ok_or(ErrorCode::OverflowError)?;
    
//     msg!("after transfer");
    
//     // Handle the fee transfer separately using the system program
//     // No need to do a separate transfer from user to creator for the fee
//     // because you never transferred that portion to the user
    
//     // If you want the fund creator to get their fee, transfer directly from fund to creator
//     // let creator_lamports = ctx.accounts.fund_creator_account.lamports();
//     // **ctx.accounts.fund_creator_account.try_borrow_mut_lamports()? = 
//     //     creator_lamports.checked_add(manager_fee).ok_or(ErrorCode::OverflowError)?;
        
//     // // Reduce the fund balance by the manager fee
//     // **ctx.accounts.fund_details.to_account_info().try_borrow_mut_lamports()? = 
//     //     ctx.accounts.fund_details.to_account_info().lamports().checked_sub(manager_fee).ok_or(ErrorCode::OverflowError)?;
    

//    // Transfer hedge owner fee
// //    let owner_lamports = ctx.accounts.hedge_fund_owner.lamports();
// //    **ctx.accounts.hedge_fund_owner.try_borrow_mut_lamports()? = 
// //        owner_lamports.checked_add(owner_fee).ok_or(ErrorCode::OverflowError)?;
       
// //    // Reduce the fund balance by the manager fee
// //    **ctx.accounts.fund_details.to_account_info().try_borrow_mut_lamports()? = 
// //        ctx.accounts.fund_details.to_account_info().lamports().checked_sub(owner_fee).ok_or(ErrorCode::OverflowError)?;

//     // Transfer hedge owner fee
//     // invoke(
//     //     &system_instruction::transfer(
//     //         &ctx.accounts.user.key(),
//     //         &ctx.accounts.hedge_fund_owner.key(),
//     //         owner_fee,
//     //     ),
//     //     &[
//     //         ctx.accounts.user.to_account_info(),
//     //         ctx.accounts.hedge_fund_owner.to_account_info(),
//     //         ctx.accounts.system_program.to_account_info(),
//     //     ],
//     // )?;

    
//     // Update fund manager state
//     let fund_details = &mut ctx.accounts.fund_details;
//     fund_details.tokens_minted = fund_details.tokens_minted
//         .checked_sub(user_token_balance)
//         .ok_or(ErrorCode::OverflowError)?;
    
//     fund_details.total_deposit = fund_details.total_deposit
//         .checked_sub(sol_amount)
//         .ok_or(ErrorCode::OverflowError)?;
    
//     msg!("=== REDEEM PROCESS COMPLETED ===");
//     msg!("Tokens burned: {}", user_token_balance);
//     msg!("SOL returned to user: {}", user_receives);
//     msg!("Manager fee: {}", manager_fee);
    
//     Ok(())
// }


#[derive(Accounts)]
#[instruction(amount: u64, fund_id: String,fund_creator: Pubkey,manager_address:Pubkey)]
pub struct RedeemLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"fund_details", fund_id.as_bytes(), fund_creator.as_ref()],
        bump,
        has_one = fund_token_mint
    )]
    pub fund_details: Account<'info, FundDetails>,

    #[account(
        mut,
        associated_token::mint = fund_token_mint,
        associated_token::authority = fund_details
    )]
    pub fund_token_account: Account<'info, TokenAccount>,
 /// CHECK: This is the hedge fund owner account
    #[account(
        mut, 
        seeds = [b"fund_manager", manager_address.as_ref()],
        bump
    )]
    pub hedge_fund_owner: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = fund_token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: This is the fund creator's account to receive fees
    #[account(mut, constraint = fund_creator_account.key() == fund_creator)]
    pub fund_creator_account: AccountInfo<'info>,

    #[account(mut)]
    pub token_mint:Account<'info, Mint>,

    pub fund_token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// ErrorCode enum removed, using FundError from lib.rs instead