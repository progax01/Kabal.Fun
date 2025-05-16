const anchor = require("@project-serum/anchor");
const {
  SystemProgram,
  PublicKey,
  AddressLookupTableAccount,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  Transaction,
  ComputeBudgetProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
} = anchor.web3;
const fs = require("fs");
const token = require("@solana/spl-token");
const path = require("path");
const {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
  NATIVE_MINT,
  createSyncNativeInstruction,
  createInitializeAccountInstruction,
} = require("@solana/spl-token");
const Table = require("cli-table3");
const fetch = require("node-fetch");
const BN = require("bn.js");
const bs58 = require("bs58");
const { Connection, Keypair } = require("@solana/web3.js");

// Configuration
const API_ENDPOINT = "https://quote-api.jup.ag/v6";
const MAX_RETRIES = 3;
// const RETRY_DELAY = 2000; // 2 seconds
const PROGRAM_ID = "6Trk4KwsUJztAXAuHrPrp66VL8zW9Amru9jcehzTBfNB";

// Add this somewhere at the top of the file, near other constants
const VAULT_SEED = "fund_vault";
const FUND_TOKEN_SEED = "fund_token";

// Setup and connection functions
async function setupConnection() {
  // Use your RPC endpoint here
  const connection = new anchor.web3.Connection(
    "https://mainnet.helius-rpc.com/?api-key=933ede55-3dc7-4d60-869b-51e973bdf7d1",
    "confirmed"
  );
  return connection;
}

async function setupWallet() {
  const walletPath = path.resolve("/Users/rachitsharma/.config/solana/id.json");
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );
  return walletKeypair;
}

async function setupProvider(connection, walletKeypair) {
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return provider;
}

async function loadProgram(provider) {
  // Load IDL file
  const idlPath = path.resolve("./target/idl/first.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  const programId = new anchor.web3.PublicKey(PROGRAM_ID);
  const program = new anchor.Program(idl, programId, provider);
  return program;
}

async function setupProgram() {
  const connection = await setupConnection();
  const walletKeypair = await setupWallet();
  const provider = await setupProvider(connection, walletKeypair);
  const program = await loadProgram(provider);

  // Common parameters
  const fundId = "12345";
  const fundCreator = walletKeypair.publicKey;
  const managerAddress = new PublicKey(
    "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
  );
  const { fundManagerPDA } = await getFundManagerPDA(
    managerAddress,
    program.programId
  );
  const { fundDetails } = await getFundDetailsPDA(
    fundId,
    fundCreator,
    program.programId
  );

  console.log("Fund ID:", fundId);
  console.log("Fund Creator:", fundCreator.toString());
  console.log("Manager Address:", managerAddress.toString());
  console.log("Fund Manager PDA:", fundManagerPDA.toString());
  console.log("Fund Details PDA:", fundDetails.toString());

  return { program, fundDetails };
}

// Get PDAs
async function getProgramAuthority(programId) {
  const [programAuthority] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("authority")],
    programId
  );
  return programAuthority;
}

async function getProgramWSOLAccount(programId) {
  const [programWSOLAccount] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("wsol")],
    programId
  );
  return programWSOLAccount;
}

async function getFundManagerPDA(managerAddress, programId) {
  const [fundManagerPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("fund_manager"), managerAddress.toBuffer()],
    programId
  );
  return { fundManagerPDA, bump };
}

async function getFundDetailsPDA(fundId, fundCreator, programId) {
  const [fundDetails, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("fund_details"), Buffer.from(fundId), fundCreator.toBuffer()],
    programId
  );
  return { fundDetails, bump };
}

// Fund manager initialization
async function initializeFundManager(program, walletKeypair, managerAddress) {
  try {
    const { fundManagerPDA, bump } = await getFundManagerPDA(
      managerAddress,
      program.programId
    );

    console.log("Initializing fund manager:", fundManagerPDA.toString());

    const tx = await program.methods
      .initialize(managerAddress)
      .accounts({
        hedgeFundOwner: fundManagerPDA,
        payer: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Fund manager initialized. Transaction:", tx);
    console.log("Fund manager initialized already");
    return { fundManagerPDA, bump };
  } catch (error) {
    console.error("Error initializing manager:", error);

    // If the error is about the account already existing, just return the PDA
    if (error.message.includes("already in use")) {
      console.log("Fund manager already initialized");
      const { fundManagerPDA, bump } = await getFundManagerPDA(
        managerAddress,
        program.programId
      );
      return { fundManagerPDA, bump };
    }

    throw error;
  }
}

// Fund creation functions
async function createFundMint(connection, walletKeypair, fundDetails) {
  try {
    console.log("Creating fund mint...");
    const mint = await createMint(
      connection,
      walletKeypair,
      fundDetails,
      null,
      9
    );
    console.log("Fund mint created:", mint.toString());
    return mint;
  } catch (error) {
    console.error("Error creating fund mint:", error);
    throw error;
  }
}

// This function needs to run before executing the USDC to SOL trade
async function createFundTokenAccount(
  connection,
  walletKeypair,
  mint,
  fundDetails
) {
  try {
    console.log("Creating fund token account...");
    const fundTokenAccount = await getAssociatedTokenAddress(
      mint,
      fundDetails,
      true
    );

    const createAtaIx = createAssociatedTokenAccountInstruction(
      walletKeypair.publicKey,
      fundTokenAccount,
      fundDetails,
      mint
    );

    const tx = new anchor.web3.Transaction().add(createAtaIx);
    const createAtaTxid = await connection.sendTransaction(tx, [walletKeypair]);
    await connection.confirmTransaction(createAtaTxid, "confirmed");

    console.log("Fund token account created:", fundTokenAccount.toString());
    return fundTokenAccount;
  } catch (e) {
    // If the error is because the account already exists, we can just get it
    if (e.message.includes("already in use")) {
      console.log("Fund token account already exists");
      const fundTokenAccount = await getAssociatedTokenAddress(
        mint,
        fundDetails,
        true
      );
      return fundTokenAccount;
    }

    console.log("Fund token account creation error:", e.message);
    throw e;
  }
}
async function initializeFund(
  program,
  connection,
  fundDetails,
  mint,
  fundTokenAccount,
  walletKeypair,
  fundId,
  targetAmount
) {
  try {
    console.log("Initializing fund...");
    const tx = await program.methods
      .createFund(
        fundId,
        new anchor.BN(targetAmount),
        "MyFund".padEnd(10, " "),
        "Fund Description".padEnd(32, " "),
        new anchor.BN(targetAmount)
      )
      .accounts({
        fundDetails: fundDetails,
        tokenMint: mint,
        fundTokenAccount: fundTokenAccount,
        user: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    await connection.confirmTransaction(tx);
    console.log("Fund initialized. Transaction:", tx);
    return tx;
  } catch (error) {
    console.error("Error initializing fund:", error);
    throw error;
  }
}

// Create token account for a depositor
async function createTokenAccount(connection, keypair, mint) {
  try {
    console.log("Creating token account...");
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey,
      true
    );

    try {
      await getAccount(connection, tokenAccount);
      console.log("Token account already exists:", tokenAccount.toString());
      return tokenAccount;
    } catch (e) {
      // Account doesn't exist, create it
      const createAtaIx = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        tokenAccount,
        keypair.publicKey,
        mint
      );

      const tx = new anchor.web3.Transaction().add(createAtaIx);
      const createAtaTxid = await connection.sendTransaction(tx, [keypair]);
      await connection.confirmTransaction(createAtaTxid, "confirmed");
      console.log("Token account created:", tokenAccount.toString());
      return tokenAccount;
    }
  } catch (e) {
    console.log("Token account creation error:", e.message);
    throw e;
  }
}

// Deposit liquidity function
async function depositLiquidity(
  program,
  fundDetails,
  fundTokenAccount,
  userTokenAccount,
  depositorKeypair,
  fundCreator,
  mint,
  fundManagerPDA,
  transferAmount,
  fundId,
  managerAddress
) {
  try {
    console.log("Depositing liquidity...");
    const connection = program.provider.connection;

    // const currentTVL = fundDetailsAccount.totalDeposit.toNumber();
    // ==========================   Tvl before target complete is always == to the target ============================================
    const currentTVL = anchor.web3.LAMPORTS_PER_SOL * 0.01;
    console.log(
      "Current TVL before deposit:",
      currentTVL / LAMPORTS_PER_SOL,
      "SOL"
    );

    // Add the fund vault to the accounts
    const [fundVault] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fund_vault"), Buffer.from(fundId)],
      program.programId
    );

    try {
      const vaultBalance = await connection.getBalance(fundVault);
      console.log(
        `Vault Balance before deposit: ${vaultBalance / LAMPORTS_PER_SOL} SOL`
      );
    } catch (e) {
      console.warn(
        "Vault may not exist yet. It will be created during the transaction."
      );
    }

    const tx = await program.methods
      .depositLiquidity(
        new anchor.BN(transferAmount),
        fundId,
        fundCreator,
        managerAddress,
        new anchor.BN(currentTVL)
      )
      .accounts({
        fundDetails: fundDetails,
        fundTokenAccount: fundTokenAccount,
        userTokenAccount: userTokenAccount,
        user: depositorKeypair.publicKey,
        fundCreatorAccount: fundCreator,
        fundTokenMint: mint,
        systemProgram: SystemProgram.programId,
        hedgeFundOwner: fundManagerPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        fundVault: fundVault,
      })
      .signers([depositorKeypair])
      .rpc();

    await connection.confirmTransaction(tx);
    console.log("Deposit successful. Transaction:", tx);
    return tx;
  } catch (error) {
    console.error("Error depositing liquidity:", error);
    throw error;
  }
}

// Redeem liquidity function
async function redeemLiquidity(
  program,
  fundDetails,
  fundTokenAccount,
  userTokenAccount,
  depositorKeypair,
  fundCreator,
  mint,
  fundManagerPDA,
  redeemAmount,
  fundId,
  managerAddress
) {
  try {
    console.log("Redeeming liquidity...");
    const tx = await program.methods
      .redeemLiquidity(
        new anchor.BN(redeemAmount),
        fundId,
        fundCreator,
        managerAddress
      )
      .accounts({
        fundDetails: fundDetails,
        fundTokenAccount: fundTokenAccount,
        userTokenAccount: userTokenAccount,
        user: depositorKeypair.publicKey,
        fundCreatorAccount: fundCreator,
        fundTokenMint: mint,
        tokenMint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        hedgeFundOwner: fundManagerPDA,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([depositorKeypair])
      .rpc();

    await program.provider.connection.confirmTransaction(tx);
    console.log("Redemption successful. Transaction:", tx);
    return tx;
  } catch (error) {
    console.error("Error redeeming liquidity:", error);
    throw error;
  }
}

// Trading functions
async function getAddressLookupTableAccounts(connection, addresses) {
  const lookupTableAccounts = [];

  for (const address of addresses) {
    try {
      const result = await connection.getAddressLookupTable(
        new PublicKey(address)
      );
      if (result.value) {
        lookupTableAccounts.push(result.value);
      }
    } catch (error) {
      console.warn(`Failed to fetch address lookup table ${address}:`, error);
    }
  }

  return lookupTableAccounts;
}

function instructionDataToTransactionInstruction(instructionPayload) {
  if (!instructionPayload) return null;

  const data = Buffer.from(instructionPayload.data, "base64");

  return new anchor.web3.TransactionInstruction({
    programId: new PublicKey(instructionPayload.programId),
    keys: instructionPayload.accounts.map((key) => {
      // Filter out signers you can't provide
      if (
        key.isSigner &&
        key.pubkey !== walletKeypairusdc.publicKey.toString()
      ) {
        return {
          pubkey: new PublicKey(key.pubkey),
          isSigner: false, // Set to false for accounts you can't sign for
          isWritable: key.isWritable,
        };
      }
      return {
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      };
    }),
    data,
  });
}

async function verifyAndPrepareForTrade(
  connection,
  fundDetails,
  walletKeypair,
  tradeAmount
) {
  console.log(
    `Verifying balances for trade of ${tradeAmount / LAMPORTS_PER_SOL} SOL...`
  );

  // Calculate required SOL (trade amount + rent for WSOL account + buffer)
  const wsol_rent = await connection.getMinimumBalanceForRentExemption(165); // TokenAccount size
  const buffer = 10000; // 0.00001 SOL buffer
  const requiredAmount = tradeAmount + wsol_rent + buffer;

  // Check balances
  const fundBalance = await connection.getBalance(fundDetails);
  const walletBalance = await connection.getBalance(walletKeypair.publicKey);

  console.log(`Fund balance: ${fundBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Wallet balance: ${walletBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Required amount: ${requiredAmount / LAMPORTS_PER_SOL} SOL`);
}

async function executeTradeAttempt(
  program,
  fundDetails,
  walletKeypair,
  fundId,
  connection,
  tradeAmount
) {
  // Define constants
  const SOL = new PublicKey("So11111111111111111111111111111111111111112");
  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  const JUPITER_PROGRAM_ID = new PublicKey(
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  );

  console.log(`🚀 Attempting trade: ${tradeAmount / LAMPORTS_PER_SOL} SOL`);

  try {
    // 1. Retrieve Program PDAs
    const [fundVault] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fund_vault"), Buffer.from(fundId)],
      program.programId
    );
    const [programAuthority] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("authority")],
      program.programId
    );
    const [programWSOLAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("wsol")],
      program.programId
    );

    // 2. Check and prepare accounts
    const authorityBalance = await connection.getBalance(programAuthority);
    const fundVaultBalance = await connection.getBalance(fundVault);
    console.log(`Program Authority Balance: ${authorityBalance} lamports`);
    console.log(`Fund Vault Balance: ${fundVaultBalance} lamports`);

    // 3. Calculate exact requirements
    const wsol_rent = await connection.getMinimumBalanceForRentExemption(165); // TokenAccount size
    const buffer = 100_000; // 0.0001 SOL buffer - increased for safety
    const requiredAmount = tradeAmount + wsol_rent + buffer;

    console.log(`WSOL rent: ${wsol_rent} lamports`);
    console.log(`Buffer: ${buffer} lamports`);
    console.log(`Total required: ${requiredAmount} lamports`);

    // 5. Prepare destination token account (ATA)
    const fundTokenAccount = await token.getAssociatedTokenAddress(
      USDC, // destination token
      programAuthority, // owner
      true, // allow owner to be a PDA
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("Fund Token Account PDA:", fundTokenAccount.toBase58());

    // 4. Verify sufficient fund vault balance
    if (fundVaultBalance < requiredAmount) {
      throw new Error(
        `Insufficient fund vault balance. Required: ${requiredAmount}, Available: ${fundVaultBalance}`
      );
    }

    // 6. Ensure destination token account exists
    try {
      await token.getAccount(connection, fundTokenAccount);
      console.log("Fund token account already exists");
    } catch (e) {
      console.log("Creating fund token account...");
      const ataIx = token.createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey, // payer
        fundTokenAccount, // ata address
        programAuthority, // owner
        USDC, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const ataTx = new anchor.web3.Transaction().add(ataIx);
      try {
        const ataSig = await connection.sendTransaction(ataTx, [walletKeypair]);
        await connection.confirmTransaction(ataSig);
        console.log("Created ATA:", ataSig);
      } catch (createError) {
        console.log(
          "ATA creation failed, might already exist:",
          createError.message
        );
      }
    }

    // 7. Get Jupiter quote with more conservative parameters
    console.log("Getting Jupiter quote...");
    const quote = await getJupiterQuote(SOL, USDC, tradeAmount);
    console.log("quote", quote);
    if (!quote || !quote.routePlan || quote.routePlan.length === 0) {
      throw new Error("Failed to get a valid Jupiter quote");
    }

    console.log(
      `Quote received: ${quote.outAmount} USDC tokens for ${tradeAmount} lamports`
    );

    // 8. Get Swap Instructions with simplified parameters
    console.log("Getting swap instructions...");
    const swapInstructions = await getSimplifiedJupiterSwapInstructions(
      walletKeypair.publicKey,
      fundTokenAccount,
      quote
    );

    if (!swapInstructions || !swapInstructions.swapInstruction) {
      throw new Error("Failed to get valid swap instructions");
    }

    // Fund the specific WSOL account that Jupiter expects to use
    const jupiterWSOLAccount = new PublicKey(
      "78cw2P3oJCGwER3m7bHn8zc8mEXZcfJGvHfcPaK9Gott"
    );
    console.log(
      "Jupiter expects to use WSOL account:",
      jupiterWSOLAccount.toString()
    );

    // Create a transaction to fund this account
    const fundingTx = new anchor.web3.Transaction();

    // Create account if it doesn't exist
    try {
      await token.getAccount(connection, jupiterWSOLAccount);
      console.log("Jupiter WSOL account already exists");
    } catch (e) {
      // Create account if needed
      console.log("Creating Jupiter WSOL account");
      const createAtaIx = token.createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey,
        jupiterWSOLAccount,
        walletKeypair.publicKey,
        SOL,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      fundingTx.add(createAtaIx);
    }

    // Add SOL to the account
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: walletKeypair.publicKey,
      toPubkey: jupiterWSOLAccount,
      lamports: tradeAmount,
    });
    fundingTx.add(transferIx);

    // Sync to ensure the WSOL tokens are available
    const syncIx = token.createSyncNativeInstruction(jupiterWSOLAccount);
    fundingTx.add(syncIx);

    // Send and confirm the funding transaction
    console.log("Funding Jupiter's expected WSOL account...");
    const { blockhash: fundingBlockhash } = await connection.getLatestBlockhash(
      "confirmed"
    );
    fundingTx.recentBlockhash = fundingBlockhash;
    fundingTx.feePayer = walletKeypair.publicKey;

    fundingTx.partialSign(walletKeypair);
    const fundingSignature = await connection.sendRawTransaction(
      fundingTx.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      }
    );
    await connection.confirmTransaction(fundingSignature);
    console.log(
      "Successfully funded Jupiter's WSOL account:",
      fundingSignature
    );

    const allInstructions = [];

    // First add compute budget instruction
    const computeBudgetIx =
      anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 6000000,
      });
    allInstructions.push(computeBudgetIx);

    const computeBudgetPriceIx =
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 20000, // Adjust this fee as needed
      });
    allInstructions.push(computeBudgetPriceIx);

    // Then add any setup instructions from Jupiter
    if (
      swapInstructions.setupInstructions &&
      swapInstructions.setupInstructions.length > 0
    ) {
      console.log(
        `Adding ${swapInstructions.setupInstructions.length} Jupiter setup instructions`
      );
      swapInstructions.setupInstructions.forEach((ix) => {
        if (ix && ix.programId && ix.accounts && ix.data) {
          const setupIx = new anchor.web3.TransactionInstruction({
            programId: new PublicKey(ix.programId),
            keys: ix.accounts.map((acc) => ({
              pubkey: new PublicKey(acc.pubkey),
              isSigner: acc.isSigner,
              isWritable: acc.isWritable,
            })),
            data: Buffer.from(ix.data, "base64"),
          });
          allInstructions.push(setupIx);
        }
      });
    }

    const jupiterData = Buffer.from(
      swapInstructions.swapInstruction.data,
      "base64"
    );

    // Make sure we're using the correct remaining accounts from Jupiter
    const jupiterAccounts = swapInstructions.swapInstruction.accounts.map(
      (acc) => ({
        pubkey: new PublicKey(acc.pubkey),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable,
      })
    );

    console.log(
      `Using ${jupiterAccounts.length} Jupiter accounts in the trade instruction`
    );

    const tradeIx = await program.methods
      .trade(fundId, new anchor.BN(tradeAmount), jupiterData)
      .accounts({
        fundDetails: fundDetails,
        programAuthority: programAuthority,
        programWsolAccount: programWSOLAccount,
        userAccount: walletKeypair.publicKey,
        fundVault: fundVault,
        solMint: SOL,
        destinationMint: USDC,
        fundTokenAccount: fundTokenAccount,
        jupiterProgram: JUPITER_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(jupiterAccounts)
      .instruction();

    allInstructions.push(tradeIx);

    // Create transaction with all instructions
    const transaction = new anchor.web3.Transaction();
    allInstructions.forEach((ix) => transaction.add(ix));

    // Add any setup instructions from Jupiter if available
    if (
      swapInstructions.setupInstructions &&
      swapInstructions.setupInstructions.length > 0
    ) {
      console.log(
        `Adding ${swapInstructions.setupInstructions.length} setup instructions`
      );
      swapInstructions.setupInstructions.forEach((instruction) => {
        const ix = new anchor.web3.TransactionInstruction({
          programId: new PublicKey(instruction.programId),
          keys: instruction.accounts.map((acc) => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner,
            isWritable: acc.isWritable,
          })),
          data: Buffer.from(instruction.data, "base64"),
        });
        transaction.add(ix);
      });
    }

    // Add the main trade instruction

    // Add any cleanup instructions if available
    // if (swapInstructions.cleanupInstructions && swapInstructions.cleanupInstructions.length > 0) {
    //   console.log(`Adding ${swapInstructions.cleanupInstructions.length} cleanup instructions`);
    //   swapInstructions.cleanupInstructions.forEach(instruction => {
    //     const cleanupAccounts = instruction.accounts.map(acc => {
    //       if (acc.isSigner && acc.pubkey !== walletKeypairusdc.publicKey.toString()) {
    //         return {
    //           pubkey: new PublicKey(acc.pubkey),
    //           isSigner: false,  // IMPORTANT: Set to false for accounts we can't sign
    //           isWritable: acc.isWritable
    //         };
    //       }
    //       return {
    //         pubkey: new PublicKey(acc.pubkey),
    //         isSigner: acc.isSigner,
    //         isWritable: acc.isWritable
    //       };
    //     });

    //     const ix = new anchor.web3.TransactionInstruction({
    //       programId: new PublicKey(instruction.programId),
    //       keys: cleanupAccounts,
    //       data: Buffer.from(instruction.data, 'base64')
    //     });
    //     transaction.add(ix);
    //   });
    // }

    // 13. Get recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    // 14. Sign the transaction
    transaction.sign(walletKeypair);

    // 15. Send Transaction with preflight disabled for debugging
    console.log("Sending transaction...");
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: true,
        maxRetries: 5,
      }
    );

    console.log("✅ Transaction sent:", signature);
    console.log(`🔗 Explorer URL: https://solscan.io/tx/${signature}`);

    // 16. Confirm Transaction
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );

    console.log("Transaction confirmed successfully!");
    return signature;
  } catch (error) {
    console.error("❌ Trade Execution Failed:", error);

    if (error.logs) {
      console.error("Transaction Logs:", error.logs);
    }

    throw error;
  }
}

async function getSimplifiedJupiterSwapInstructionsUSDC(
  walletPublicKey,
  fundTokenAccount,
  quote,
  programWsolAccount,
  programAuthority
) {
  try {
    console.log("Getting Jupiter swap instructions for USDC to SOL...");

    // Add delay before making the API call
    await sleep(2000);

    // Use swap-instructions endpoint for detailed instructions
    const swapRequestUrl = `${API_ENDPOINT}/swap-instructions`;

    console.log(
      "fundTokenAccount,fundVault,programAuthority",
      fundTokenAccount,
      programAuthority
    );
    // Create request with proper parameters for a USDC -> SOL swap
    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: walletPublicKey.toString(),
      destinationTokenAccount: programWsolAccount.toString(),
      wrapAndUnwrapSol: true,
      skipUserAccountsCreation: true,
      slippageBps: 100,
    };

    console.log("Swap request:", JSON.stringify(swapRequest, null, 2));

    // Get the swap instructions from Jupiter
    const swapResponse = await fetch(swapRequestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swapRequest),
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      console.error("Swap instruction fetch error:", errorText);

      // If rate limited, add extra delay and retry
      if (swapResponse.status === 429) {
        console.log(
          "Rate limited by Jupiter API. Waiting 5 seconds before retry..."
        );
        await sleep(5000);
        return getSimplifiedJupiterSwapInstructionsUSDC(
          walletPublicKey,
          fundTokenAccount,
          quote,
          fundVault,
          programAuthority
        );
      }

      throw new Error(`Failed to get swap instructions: ${errorText}`);
    }

    const swapData = await swapResponse.json();

    if (!swapData.swapInstruction) {
      throw new Error("No swap instruction returned from Jupiter");
    }

    console.log(
      "Jupiter returned a valid swap instruction with",
      swapData.swapInstruction.accounts.length,
      "accounts"
    );

    return {
      swapInstruction: swapData.swapInstruction,
      setupInstructions: swapData.setupInstructions || [],
      cleanupInstructions: swapData.cleanupInstructions || [],
      addressLookupTableAddresses: swapData.addressLookupTableAddresses || [],
    };
  } catch (error) {
    console.error("Error getting Jupiter swap instructions:", error);
    throw error;
  }
}

async function getSimplifiedJupiterSwapInstructions(
  walletPublicKey,
  fundTokenAccount,
  quote
) {
  try {
    console.log("Getting Jupiter swap instructions...");

    // Use swap-instructions endpoint for detailed instructions
    const swapRequestUrl = `${API_ENDPOINT}/swap-instructions`;

    // Create request with proper parameters for a SOL -> USDC swap
    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: walletPublicKey.toString(),
      // Important: For SOL -> USDC, specify the destination correctly
      destinationTokenAccount: fundTokenAccount.toString(),
      // Critical: For SOL swaps, we need to let Jupiter handle wrapping/unwrapping
      wrapAndUnwrapSol: true,
      // Never skip account creation for Jupiter
      skipUserAccountsCreation: false,
      // Increase slippage tolerance slightly for better success rate
      slippageBps: 100,
    };

    console.log("Swap request:", JSON.stringify(swapRequest, null, 2));

    // Get the swap instructions from Jupiter
    const swapResponse = await fetch(swapRequestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swapRequest),
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      console.error("Swap instruction fetch error:", errorText);
      throw new Error(`Failed to get swap instructions: ${errorText}`);
    }

    const swapData = await swapResponse.json();

    if (!swapData.swapInstruction) {
      throw new Error("No swap instruction returned from Jupiter");
    }

    console.log(
      "Jupiter returned a valid swap instruction with",
      swapData.swapInstruction.accounts.length,
      "accounts"
    );

    return {
      // Return the complete swapData object to use all parts
      swapInstruction: swapData.swapInstruction,
      setupInstructions: swapData.setupInstructions || [],
      cleanupInstruction: swapData.cleanupInstruction,
      addressLookupTableAddresses: swapData.addressLookupTableAddresses || [],
      // Include the compute budget instruction that Jupiter recommends
      computeBudgetInstructions: swapData.computeBudgetInstructions || [],
    };
  } catch (error) {
    console.error("Error getting Jupiter swap instructions:", error);
    throw error;
  }
}

// Add these helper functions if not already defined
async function getProgramAuthority(programId) {
  const [programAuthority] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("authority")],
    programId
  );
  return programAuthority;
}

async function getProgramWSOLAccount(programId) {
  const [programWSOLAccount] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("wsol")],
    programId
  );
  return programWSOLAccount;
}

// Display and reporting functions
async function displayFundDetails(program, fundId, fundCreator) {
  try {
    const { fundDetails } = await getFundDetailsPDA(
      fundId,
      fundCreator,
      program.programId
    );
    const fundDetailsAccount = await program.account.fundDetails.fetch(
      fundDetails
    );
    const connection = program.provider.connection;

    // Calculate TVL (total value locked)
    const solBalance = await connection.getBalance(fundDetails);

    const fundTable = new Table({
      head: [
        "Fund ID",
        "Name",
        "Description",
        "Total Deposit",
        "TVL (SOL)",
        "Investment Threshold",
        "Tokens Minted",
      ],
      colWidths: [10, 20, 30, 20, 15, 25, 20],
    });

    fundTable.push([
      fundId,
      Buffer.from(fundDetailsAccount.fundName)
        .toString("utf8")
        .replace(/\0/g, ""),
      Buffer.from(fundDetailsAccount.description)
        .toString("utf8")
        .replace(/\0/g, ""),
      (fundDetailsAccount.totalDeposit / LAMPORTS_PER_SOL).toString(),
      (solBalance / LAMPORTS_PER_SOL).toFixed(4),
      (fundDetailsAccount.investThreshold / LAMPORTS_PER_SOL).toString(),
      fundDetailsAccount.tokensMinted.toString(),
    ]);

    console.log("\n=== Fund Details ===");
    console.log(fundTable.toString());

    return fundDetailsAccount;
  } catch (error) {
    console.error("Error displaying fund details:", error);
    throw error;
  }
}

async function displayDepositorDetails(depositorData) {
  const depositorTable = new Table({
    head: [
      "Fund ID",
      "Depositor",
      "Address",
      "Before SOL Balance",
      "SOL Deposited",
      "After SOL Balance",
      "Before Token Balance",
      "After Token Balance",
      "TVL After Deposit",
      "Token Account",
      "Transaction Signature",
    ],
    colWidths: [10, 20, 44, 20, 20, 20, 20, 20, 20, 44, 44],
  });

  depositorData.forEach((data) => {
    depositorTable.push([
      data.fundId,
      data.name,
      data.address,
      data.beforeSOL,
      data.depositedSOL,
      data.afterSOL,
      data.beforeToken,
      data.afterToken,
      data.tvlAfterDeposit || "N/A",
      data.tokenAccount,
      data.tx,
    ]);
  });

  console.log("\n=== Depositor Details ===");
  console.log(depositorTable.toString());
}

async function displayRedeemDetails(redeemData) {
  const redeemTable = new Table({
    head: [
      "Fund ID",
      "Depositor",
      "Before SOL Balance",
      "After SOL Balance",
      "Before Token Balance",
      "After Token Balance",
      "Transaction Signature",
    ],
    colWidths: [10, 44, 20, 20, 20, 20, 44],
  });

  redeemData.forEach((data) => {
    redeemTable.push([
      data.fundId,
      data.address,
      data.beforeSOL,
      data.afterSOL,
      data.beforeToken,
      data.afterToken,
      data.tx || "N/A",
    ]);
  });

  console.log("\n=== Redeem Details ===");
  console.log(redeemTable.toString());
}
// / // Function to execute redeem trade (added separately)
async function executeRedeemTrade(
  program,
  fundDetails,
  walletKeypair,
  fundId,
  connection,
  redeemAmount
) {
  console.log(`Starting redeem-trade with amount: ${redeemAmount}`);

  // Define tokens
  const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
  const SOL = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL

  // Get PDAs
  const programAuthority = await getProgramAuthority(program.programId);
  const programWSOLAccount = await getProgramWSOLAccount(program.programId);
  const managerAddress = new anchor.web3.PublicKey(
    "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
  );
  const { fundManagerPDA } = await getFundManagerPDA(
    managerAddress,
    program.programId
  );

  console.log("Program Authority PDA:", programAuthority.toBase58());
  console.log("Program WSOL Account PDA:", programWSOLAccount.toBase58());
  console.log("Fund Manager PDA:", fundManagerPDA.toBase58());

  // Get fund details
  const fundDetailsAccount = await program.account.fundDetails.fetch(
    fundDetails
  );
  console.log(
    "Fund current_depost:",
    fundDetailsAccount.currentDepost
      ? fundDetailsAccount.currentDepost.toString()
      : "0",
    "lamports"
  );

  // If redeemAmount is greater than current_depost, adjust it
  if (
    fundDetailsAccount.currentDepost &&
    new anchor.BN(redeemAmount).gt(fundDetailsAccount.currentDepost)
  ) {
    console.log(
      `Adjusting redeem amount to match fund's current_depost: ${fundDetailsAccount.currentDepost.toString()}`
    );
    redeemAmount = fundDetailsAccount.currentDepost.toNumber();
  }

  // Get fund token accounts
  const fundTokenMint = fundDetailsAccount.fundTokenMint;
  const userTokenAccount = await getAssociatedTokenAddress(
    fundTokenMint,
    walletKeypair.publicKey
  );
  const fundTokenAccount = await getAssociatedTokenAddress(
    fundTokenMint,
    fundDetails,
    true
  );

  // Make sure wallet's SOL token account exists
  const walletSOLAccount = await getAssociatedTokenAddress(
    SOL,
    walletKeypair.publicKey
  );

  try {
    await getAccount(connection, walletSOLAccount);
    console.log(
      "Wallet SOL token account exists:",
      walletSOLAccount.toString()
    );
  } catch (e) {
    console.log("Creating wallet SOL token account...");
    const createAtaIx = createAssociatedTokenAccountInstruction(
      walletKeypair.publicKey,
      walletSOLAccount,
      walletKeypair.publicKey,
      SOL
    );

    const tx = new anchor.web3.Transaction().add(createAtaIx);
    const createAtaTxid = await connection.sendTransaction(tx, [walletKeypair]);
    await connection.confirmTransaction(createAtaTxid, "confirmed");
    console.log("Wallet SOL token account created");
  }

  console.log("Getting Jupiter quote for USDC to SOL swap...");
  // Get quote from Jupiter for USDC to SOL
  try {
    const response = await fetch(
      `${API_ENDPOINT}/quote?inputMint=${USDC.toString()}&outputMint=${SOL.toString()}&amount=${redeemAmount}&slippageBps=500`
    );

    if (!response.ok) {
      throw new Error(`Jupiter quote API error: ${await response.text()}`);
    }

    const quote = await response.json();
    console.log("Quote received successfully!");
    console.log(
      `Input: ${quote.inAmount} USDC microtokens (${quote.inAmount / 1e6} USDC)`
    );
    console.log(
      `Output: ${quote.outAmount} lamports (${quote.outAmount / 1e9} SOL)`
    );
    console.log(`Price Impact: ${quote.priceImpactPct}%`);

    // Get swap instructions from Jupiter
    console.log("Getting swap instructions...");
    const jupiterProgramId = new PublicKey(
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
    );
    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: walletKeypair.toBase58(),
      destinationTokenAccount: outputTokenAccount.toBase58(),
      useSharedAccounts: true, // Changed from false
      skipUserAccountsCreation: true, // May need to be false to create accounts properly
      onlyDirectRoutes: false, // Changed from true
      slippageBps: 6000, // Increased from 50 to 1000 (10%)
      platformFeeBps: 0,
    };

    const swapResponse = await fetch(`${API_ENDPOINT}/swap-instructions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(swapRequest),
    });

    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap API error: ${await swapResponse.text()}`);
    }

    const swapData = await swapResponse.json();
    console.log("Swap instructions received!");
    console.log(
      "Lookup Tables:",
      swapData.addressLookupTableAddresses?.length || 0
    );
    console.log("Setup Instructions:", swapData.setupInstructions?.length || 0);

    // Extract the Jupiter swap data
    const jupiterData = Buffer.from(swapData.swapInstruction.data, "base64");

    // Convert Jupiter's accounts to AccountMeta format
    const jupiterAccounts = swapData.swapInstruction.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    }));

    console.log(
      `Adding ${jupiterAccounts.length} accounts to Jupiter swap instruction`
    );

    // Try executing the redeem trade with minimal amount first for testing
    const testAmount = 100; // 100 lamports
    console.log(`First trying with minimal amount (${testAmount})...`);

    try {
      // Create the redeem trade transaction
      const testTx = await program.methods
        .redeemTrade(fundId, new anchor.BN(testAmount), jupiterData)
        .accounts({
          fundDetails: fundDetails,
          programAuthority: programAuthority,
          programWsolAccount: programWSOLAccount,
          userAccount: walletKeypair.publicKey,
          solMint: SOL,
          userTokenAccount: userTokenAccount,
          fundTokenAccount: fundTokenAccount,
          jupiterProgram: jupiterProgramId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(jupiterAccounts)
        .rpc();

      console.log("Test transaction successful:", testTx);

      // If test was successful, try with actual amount
      if (testAmount < redeemAmount) {
        console.log(`Now executing with full amount (${redeemAmount})...`);

        const tx = await program.methods
          .redeemTrade(fundId, new anchor.BN(redeemAmount), jupiterData)
          .accounts({
            fundDetails: fundDetails,
            programAuthority: programAuthority,
            programWsolAccount: programWSOLAccount,
            userAccount: walletKeypair.publicKey,
            solMint: SOL,
            userTokenAccount: userTokenAccount,
            fundTokenAccount: fundTokenAccount,
            jupiterProgram: jupiterProgramId,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .remainingAccounts(jupiterAccounts)
          .rpc();

        console.log("Full transaction successful:", tx);
        console.log(`Explorer URL: https://solscan.io/tx/${tx}`);
        return tx;
      }

      console.log(`Explorer URL: https://solscan.io/tx/${testTx}`);
      return testTx;
    } catch (err) {
      console.error("Transaction failed:", err);

      if (err.logs) {
        console.error("Transaction logs:", err.logs);

        // Check if it's a deserialization issue
        if (
          err.logs.some((log) => log.includes("InstructionDidNotDeserialize"))
        ) {
          console.log(
            "Instruction did not deserialize. Trying with a different approach..."
          );

          // Try with a versioned transaction approach using Address Lookup Tables
          try {
            console.log(
              "Trying with versioned transaction and lookup tables..."
            );

            // Get lookup tables
            const lookupTableAccounts = await getAddressLookupTableAccounts(
              connection,
              swapData.addressLookupTableAddresses || []
            );

            console.log(
              `Retrieved ${lookupTableAccounts.length} lookup tables`
            );

            // Create instructions array
            const instructions = [];

            // Add compute budget instructions
            if (swapData.computeBudgetInstructions) {
              swapData.computeBudgetInstructions.forEach((ix) => {
                instructions.push(instructionDataToTransactionInstruction(ix));
              });
            }

            // Add setup instructions
            if (swapData.setupInstructions) {
              swapData.setupInstructions.forEach((ix) => {
                instructions.push(instructionDataToTransactionInstruction(ix));
              });
            }

            // Create the redeem trade instruction
            const redeemTradeIx = await program.methods
              .redeemTrade(fundId, new anchor.BN(redeemAmount), jupiterData)
              .accounts({
                fundDetails: fundDetails,
                programAuthority: programAuthority,
                programWsolAccount: programWSOLAccount,
                userAccount: walletKeypair.publicKey,
                solMint: SOL,
                userTokenAccount: userTokenAccount,
                fundTokenAccount: fundTokenAccount,
                jupiterProgram: jupiterProgramId,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
              })
              .remainingAccounts(jupiterAccounts)
              .instruction();

            // Add our instruction
            instructions.push(redeemTradeIx);

            // Add cleanup instruction if needed
            if (swapData.cleanupInstruction) {
              instructions.push(
                instructionDataToTransactionInstruction(
                  swapData.cleanupInstruction
                )
              );
            }

            // Get latest blockhash
            const blockhash = (await connection.getLatestBlockhash("confirmed"))
              .blockhash;

            // Create versioned transaction
            const messageV0 = new TransactionMessage({
              payerKey: walletKeypair.publicKey,
              recentBlockhash: blockhash,
              instructions,
            }).compileToV0Message(lookupTableAccounts);

            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([walletKeypair]);

            // Send the transaction
            console.log("Sending versioned transaction...");
            const signature = await connection.sendTransaction(transaction, {
              skipPreflight: true,
            });

            console.log("Versioned transaction sent:", signature);
            console.log(`Explorer URL: https://solscan.io/tx/${signature}`);

            // Wait for confirmation
            await connection.confirmTransaction(
              {
                signature,
                blockhash,
                lastValidBlockHeight: (
                  await connection.getLatestBlockhash()
                ).lastValidBlockHeight,
              },
              "confirmed"
            );

            console.log("Transaction confirmed!");
            return signature;
          } catch (versionedErr) {
            console.error("Versioned transaction also failed:", versionedErr);
            throw versionedErr;
          }
        }
      }

      throw err;
    }
  } catch (error) {
    console.error("Error in executeRedeemTrade:", error);
    throw error;
  }
}

async function transferAllFundsFromVault(
  program,
  fundId,
  walletKeypair,
  connection
) {
  try {
    console.log(
      `Starting transfer of all funds from vault for fund: ${fundId}`
    );

    // Destination address to receive funds
    const destinationAddress = new anchor.web3.PublicKey(
      "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
    );
    console.log(`Destination address: ${destinationAddress.toString()}`);

    // Get fund vault PDA
    const [fundVault] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fund_vault"), Buffer.from(fundId)],
      program.programId
    );
    console.log(`Fund vault address: ${fundVault.toString()}`);

    // Check vault balance
    const vaultBalance = await connection.getBalance(fundVault);
    console.log(
      `Fund vault balance: ${vaultBalance} lamports (${
        vaultBalance / anchor.web3.LAMPORTS_PER_SOL
      } SOL)`
    );

    if (vaultBalance <= 0) {
      console.log("Vault has no funds to transfer");
      return null;
    }

    // Transfer the entire balance
    const transferAmount = vaultBalance;
    console.log(
      `Transferring entire balance: ${transferAmount} lamports (${
        transferAmount / anchor.web3.LAMPORTS_PER_SOL
      } SOL)`
    );

    // Create withdrawal instruction
    const withdrawIx = await program.methods
      .withdrawAllFunds(fundId)
      .accounts({
        fundVault: fundVault,
        destination: destinationAddress,
        user: walletKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    // Create transaction and add instruction
    const transaction = new anchor.web3.Transaction().add(withdrawIx);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    // Sign and send transaction
    console.log("Sending withdrawal transaction...");
    const signedTransaction = await anchor.web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair],
      {
        skipPreflight: false,
        commitment: "confirmed",
        maxRetries: 5,
      }
    );

    console.log(`✅ Transfer completed successfully!`);
    console.log(`Transaction: ${signedTransaction}`);
    console.log(`Explorer URL: https://solscan.io/tx/${signedTransaction}`);

    // Verify the transfer
    const newVaultBalance = await connection.getBalance(fundVault);
    const destinationBalance = await connection.getBalance(destinationAddress);

    console.log(`\nFinal Balances:`);
    console.log(
      `Fund vault balance after transfer: ${newVaultBalance} lamports (${
        newVaultBalance / anchor.web3.LAMPORTS_PER_SOL
      } SOL)`
    );
    console.log(
      `Destination balance after transfer: ${destinationBalance} lamports (${
        destinationBalance / anchor.web3.LAMPORTS_PER_SOL
      } SOL)`
    );

    if (newVaultBalance > 0) {
      console.log(
        `\n⚠️ Warning: Vault still has ${newVaultBalance} lamports remaining`
      );
    } else {
      console.log(`\n✅ Vault successfully drained`);
    }

    return signedTransaction;
  } catch (error) {
    console.error("❌ Error transferring funds from vault:", error);

    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }

    throw error;
  }
}
async function withdrawFundUsdc(program, fundId, walletKeypair, connection) {
  try {
    console.log(
      `Starting USDC withdrawal from fund token PDA for fund: ${fundId}`
    );

    // Constants
    const USDC_MINT = new anchor.web3.PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    const destinationAddress = new anchor.web3.PublicKey(
      "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
    );

    // Get fund token PDA
    const [fundTokenAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fund_token"), Buffer.from(fundId), USDC_MINT.toBuffer()],
      program.programId
    );

    console.log(`Fund token PDA: ${fundTokenAccount.toString()}`);

    // Get or create destination USDC ATA
    const destinationAta = await token.getAssociatedTokenAddress(
      USDC_MINT,
      destinationAddress,
      false
    );

    // Check if destination ATA exists, if not create it
    try {
      await token.getAccount(connection, destinationAta);
      console.log("Destination USDC ATA exists:", destinationAta.toString());
    } catch (e) {
      console.log("Creating destination USDC ATA...");
      const createAtaIx = token.createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey, // payer
        destinationAta, // ata
        destinationAddress, // owner
        USDC_MINT // mint
      );

      const tx = new anchor.web3.Transaction().add(createAtaIx);
      const createAtaTxid = await connection.sendTransaction(tx, [
        walletKeypair,
      ]);
      await connection.confirmTransaction(createAtaTxid, "confirmed");
      console.log("Destination USDC ATA created");
    }

    // Check USDC balance in fund token account
    try {
      const fundTokenAccountInfo = await token.getAccount(
        connection,
        fundTokenAccount
      );
      console.log(
        `Fund token account USDC balance: ${
          fundTokenAccountInfo.amount
        } USDC microtokens (${Number(fundTokenAccountInfo.amount) / 1e6} USDC)`
      );

      if (fundTokenAccountInfo.amount === BigInt(0)) {
        console.log("No USDC to withdraw");
        return null;
      }
    } catch (e) {
      console.log(
        "No USDC account found or error checking balance:",
        e.message
      );
      return null;
    }

    // Create withdrawal instruction
    const withdrawIx = await program.methods
      .withdrawFundUsdc(fundId)
      .accounts({
        fundTokenAccount: fundTokenAccount,
        destination: destinationAta,
        usdcMint: USDC_MINT,
        user: walletKeypair.publicKey,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .instruction();

    // Create transaction
    const transaction = new anchor.web3.Transaction().add(withdrawIx);

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    // Sign transaction
    transaction.sign(walletKeypair);

    // Send and confirm transaction
    console.log("Sending withdrawal transaction...");
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      }
    );

    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log("✅ USDC withdrawal successful!");
    console.log(`Transaction signature: ${signature}`);
    console.log(`Explorer URL: https://solscan.io/tx/${signature}`);

    // Verify final balances
    try {
      const finalFundBalance = await token.getAccount(
        connection,
        fundTokenAccount
      );
      const finalDestBalance = await token.getAccount(
        connection,
        destinationAta
      );

      console.log("\nFinal Balances:");
      console.log(
        `Fund token account USDC: ${finalFundBalance.amount} microtokens (${
          Number(finalFundBalance.amount) / 1e6
        } USDC)`
      );
      console.log(
        `Destination USDC: ${finalDestBalance.amount} microtokens (${
          Number(finalDestBalance.amount) / 1e6
        } USDC)`
      );

      if (finalFundBalance.amount > BigInt(0)) {
        console.log(
          `⚠️ Warning: Fund token account still has ${finalFundBalance.amount} USDC microtokens remaining`
        );
      } else {
        console.log("✅ Fund token account successfully drained");
      }
    } catch (e) {
      console.log("Error checking final balances:", e.message);
    }

    return signature;
  } catch (error) {
    console.error("Error in withdrawFundUsdc:", error);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    throw error;
  }
}

async function getAddressLookupTableAccounts(connection, addresses) {
  const lookupTableAccounts = [];

  if (!addresses || addresses.length === 0) {
    console.log("No lookup table addresses provided");
    return lookupTableAccounts;
  }

  console.log(`Fetching ${addresses.length} address lookup tables...`);

  for (const address of addresses) {
    try {
      const lookupTableAccount = new PublicKey(address);
      const response = await connection.getAddressLookupTable(
        lookupTableAccount
      );

      if (response && response.value) {
        console.log(
          `Successfully fetched lookup table: ${address.substring(0, 10)}...`
        );
        lookupTableAccounts.push(response.value);
      } else {
        console.warn(`No lookup table found for address ${address}`);
      }
    } catch (error) {
      console.warn(`Error fetching lookup table ${address}:`, error.message);
    }
  }

  console.log(
    `Successfully fetched ${lookupTableAccounts.length} lookup tables`
  );
  return lookupTableAccounts;
}

// Get all deposits for a specific fund
async function getAllFundDeposits(program, fundId, fundCreator) {
  try {
    console.log(`Fetching deposits for fund: ${fundId}`);

    // Get the fund details PDA
    const { fundDetails } = await getFundDetailsPDA(
      fundId,
      fundCreator,
      program.programId
    );

    // Call the get_user_deposits instruction to fetch all deposits
    const userDeposits = await program.methods
      .getUserDeposits(fundId, fundCreator) // Pass both fundId and fundCreator
      .accounts({
        fundDetails: fundDetails,
      })
      .view();

    if (!userDeposits || userDeposits.length === 0) {
      console.log(`No deposits found for fund ${fundId}`);
      return {
        totalDeposits: 0,
        uniqueUsers: 0,
        totalAmount: 0,
        deposits: [],
      };
    }

    // Process the deposits
    console.log(`Found ${userDeposits.length} deposits for fund ${fundId}`);

    // Calculate unique users and total amount
    const uniqueUserMap = new Map();
    let totalAmount = 0;

    const formattedDeposits = userDeposits.map((deposit) => {
      const depositAmount = deposit.depositAmount.toNumber() / LAMPORTS_PER_SOL;
      totalAmount += depositAmount;

      const userAddress = deposit.user.toString();
      if (!uniqueUserMap.has(userAddress)) {
        uniqueUserMap.set(userAddress, {
          address: userAddress,
          totalAmount: depositAmount,
        });
      } else {
        const userData = uniqueUserMap.get(userAddress);
        userData.totalAmount += depositAmount;
        uniqueUserMap.set(userAddress, userData);
      }

      return {
        user: userAddress,
        amount: depositAmount,
        amountInLamports: deposit.depositAmount.toNumber(),
      };
    });

    const uniqueUsers = Array.from(uniqueUserMap.values());

    // Create a summary object
    const summary = {
      totalDeposits: userDeposits.length,
      uniqueUsers: uniqueUsers.length,
      totalAmount: totalAmount,
      deposits: formattedDeposits,
      uniqueUserDetails: uniqueUsers,
    };

    // Display the results in a nice table
    const table = new Table({
      head: ["User", "Amount (SOL)"],
      colWidths: [44, 20],
    });

    uniqueUsers.forEach((user) => {
      table.push([user.address, user.totalAmount.toFixed(9)]);
    });

    console.log("Fund Deposit Summary:");
    console.log(`Total Deposits: ${summary.totalDeposits}`);
    console.log(`Unique Users: ${summary.uniqueUsers}`);
    console.log(`Total Amount: ${summary.totalAmount.toFixed(9)} SOL`);
    console.log("\nDeposit Details by User:");
    console.log(table.toString());

    return summary;
  } catch (error) {
    console.error("Error fetching deposits:", error);
    throw error;
  }
}

async function executeUsdcToSolTrade(
  program,
  fundId,
  connection,
  walletKeypair,
  amount = "0.0001"
) {
  try {
    console.log("Starting USDC to SOL trade execution...");
    console.log(`Fund ID: ${fundId}, Amount: ${amount} USDC`);

    // Convert amount to USDC tokens (6 decimals)
    const amountLamports = new BN(parseFloat(amount) * 1_000_000);
    console.log(`Amount in microtokens: ${amountLamports.toString()}`);

    // Get PDAs
    const [programAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("authority")],
      program.programId
    );
    const [fundVault] = await PublicKey.findProgramAddress(
      [Buffer.from("fund_vault"), Buffer.from(fundId)],
      program.programId
    );
    const [programWSOLAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("wsol")],
      program.programId
    );

    // Constants
    const USDC_MINT = new PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    const NATIVE_MINT = new PublicKey(
      "So11111111111111111111111111111111111111112"
    );

    // Get fund's USDC token account (owned by program authority)
    // const fundTokenAccount = await token.getAssociatedTokenAddress(
    //   USDC_MINT,
    //   programAuthority,
    //   true
    // );

    // Correctly derive the fund token account PDA
const [fundTokenAccount] = await PublicKey.findProgramAddress(
  [
    Buffer.from("fund_token"),
    Buffer.from(fundId),
    USDC_MINT.toBuffer()
  ],
  program.programId
);

    console.log("Accounts used:");
    console.log(`- Program Authority: ${programAuthority.toString()}`);
    console.log(`- Fund Token Account: ${fundTokenAccount.toString()}`);
    console.log(`- Fund Vault: ${fundVault.toString()}`);

    // Get Jupiter quote
    console.log("Getting Jupiter quote...");
    const quote = await getJupiterQuote(
      USDC_MINT.toString(),
      NATIVE_MINT.toString(),
      amountLamports.toString()
    );
    console.log(
      `Quote received: ${quote.outAmount} lamports from ${amountLamports} USDC microtokens`
    );

    // Get Jupiter swap instructions
    const swapInstructions = await getSimplifiedJupiterSwapInstructionsUSDC(
      walletKeypair.publicKey,
      fundTokenAccount,
      quote,
      fundVault,
      programAuthority
    );

    // Extract Jupiter data
    const jupiterSwapData = Buffer.from(
      swapInstructions.swapInstruction.data,
      "base64"
    );

    // Filter Jupiter accounts to remove signer requirements except for our wallet
    const jupiterAccounts = swapInstructions.swapInstruction.accounts.map(
      (acc) => ({
        pubkey: new PublicKey(acc.pubkey),
        isSigner:
          acc.isSigner && acc.pubkey === walletKeypair.publicKey.toString(),
        isWritable: acc.isWritable,
      })
    );

    // Call our on-chain instruction
    console.log("Calling on-chain usdcToSolTrade instruction...");
    const txId = await program.methods
      .usdcToSolTrade(fundId, amountLamports, jupiterSwapData)
      .accounts({
        programAuthority,
        programWsolAccount: programWSOLAccount,
        userAccount: walletKeypair.publicKey,
        fundVault,
        solMint: NATIVE_MINT,
        fundTokenAccount: fundTokenAccount,
        usdcMint: USDC_MINT,
        jupiterProgram: new PublicKey(
          "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(jupiterAccounts)
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }),
      ])
      .rpc({
        skipPreflight: true,
        maxRetries: 3,
      });

    console.log("✅ Transaction sent:", txId);
    console.log(`🔗 Explorer URL: https://solscan.io/tx/${txId}`);

    return txId;
  } catch (error) {
    console.error("Error executing USDC to SOL trade:", error);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    throw error;
  }
}

async function drainAllFunds(program, fundId, walletKeypair, connection) {
  try {
    console.log(`Starting to drain funds from fund ${fundId}...`);

    const destinationAddress = new anchor.web3.PublicKey(
      "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
    );
    const USDC_MINT = new anchor.web3.PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );

    // Get all required PDAs
    const [fundVault] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("fund_vault"), Buffer.from(fundId)],
      program.programId
    );

    const [programAuthority] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("authority")],
      program.programId
    );

    const [programWSOLAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("wsol")],
      program.programId
    );

    const [fundTokenAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [
        // The constant FUND_TOKEN_SEED from your Rust code - you need the exact same bytes
        Buffer.from("fund_token"), // Must match FUND_TOKEN_SEED in Rust
        Buffer.from(fundId), // fund_id as bytes
        USDC_MINT.toBuffer(), // usdc_mint public key as bytes
      ],
      program.programId
    );

    // Get destination USDC ATA
    const destinationAta = await token.getAssociatedTokenAddress(
      USDC_MINT,
      destinationAddress,
      false
    );

    // Check USDC balance in fund token account
    try {
      const fundTokenAccountInfo = await token.getAccount(
        connection,
        fundTokenAccount
      );
      console.log(
        `Fund token account USDC balance: ${
          fundTokenAccountInfo.amount
        } USDC microtokens (${Number(fundTokenAccountInfo.amount) / 1e6} USDC)`
      );
    } catch (e) {
      console.log("Error checking USDC balance:", e.message);
    }

    // Check SOL balance
    const vaultBalance = await connection.getBalance(fundVault);
    console.log(
      `Fund vault SOL balance: ${vaultBalance / LAMPORTS_PER_SOL} SOL`
    );

    // Create drain instruction
    const drainIx = await program.methods
      .drainAllFunds(fundId)
      .accounts({
        programAuthority,
        fundVault,
        fundTokenAccount,
        programWsolAccount: programWSOLAccount,
        usdcMint: USDC_MINT,
        destination: destinationAddress,
        destinationTokenAccount: destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        user: walletKeypair.publicKey,
      })
      .instruction();

    // Create and send transaction
    const transaction = new anchor.web3.Transaction().add(drainIx);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    // Sign and send
    transaction.sign(walletKeypair);
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        maxRetries: 7,
      }
    );

    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log("\n✅ Drain completed successfully!");
    console.log(`Transaction: ${signature}`);
    console.log(`Explorer URL: https://solscan.io/tx/${signature}`);

    // Verify final balances
    const finalVaultBalance = await connection.getBalance(fundVault);
    console.log("\nFinal Balances:");
    console.log(`Fund Vault SOL: ${finalVaultBalance / LAMPORTS_PER_SOL} SOL`);

    try {
      const finalUsdcBalance = await token.getAccount(
        connection,
        fundTokenAccount
      );
      console.log(`Fund USDC: ${Number(finalUsdcBalance.amount) / 1e6} USDC`);
    } catch (e) {
      console.log("No USDC balance or account not initialized");
    }

    return signature;
  } catch (error) {
    console.error("Error in drainAllFunds:", error);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    // Basic setup
    console.log("Setting up connection and wallet...");
    const connection = await setupConnection();
    const walletKeypair = await setupWallet();
    const provider = await setupProvider(connection, walletKeypair);
    const program = await loadProgram(provider);

    // Common parameters
    const fundId = "23";
    const fundCreator = walletKeypair.publicKey;
    const managerAddress = new anchor.web3.PublicKey(
      "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
    );
    const { fundManagerPDA } = await getFundManagerPDA(
      managerAddress,
      program.programId
    );
    const { fundDetails } = await getFundDetailsPDA(
      fundId,
      fundCreator,
      program.programId
    );

    console.log("Fund ID:", fundId);
    console.log("Fund Creator:", fundCreator.toString());
    console.log("Manager Address:", managerAddress.toString());
    console.log("Fund Manager PDA:", fundManagerPDA.toString());
    console.log("Fund Details PDA:", fundDetails.toString());

    if (command === "init") {
      // Initialize fund manager
      await initializeFundManager(program, walletKeypair, managerAddress);

      // Create fund
      const target = 10_000_000; // 0.001 SOL in lamports 1,000,000
      //  0.01 SOL = 10_000_000
      const mint = await createFundMint(connection, walletKeypair, fundDetails);
      const fundTokenAccount = await createFundTokenAccount(
        connection,
        walletKeypair,
        mint,
        fundDetails
      );
      await initializeFund(
        program,
        connection,
        fundDetails,
        mint,
        fundTokenAccount,
        walletKeypair,
        fundId,
        target
      );

      console.log("\nFund initialization complete!");
      await displayFundDetails(program, fundId, fundCreator);
    } else if (command === "deposit") {
      // Get deposit amount from args or use default
      const depositAmount = args[1]
        ? parseFloat(args[1]) * LAMPORTS_PER_SOL
        : 0.001 * LAMPORTS_PER_SOL;

      // Get fund details to check if it exists
      try {
        await program.account.fundDetails.fetch(fundDetails);
      } catch (e) {
        console.error("Fund doesn't exist. Please initialize it first.");
        return;
      }

      // Get the mint from fund details
      const fundDetailsAccount = await program.account.fundDetails.fetch(
        fundDetails
      );
      const mint = fundDetailsAccount.fundTokenMint;

      // Get fund token account
      const fundTokenAccount = await getAssociatedTokenAddress(
        mint,
        fundDetails,
        true
      );

      // Create token account for depositor
      const depositorTokenAccount = await createTokenAccount(
        connection,
        walletKeypair,
        mint
      );

      // Get initial balances
      const initialSOLBalance = await connection.getBalance(
        walletKeypair.publicKey
      );
      const initialTokenAccount = await getAccount(
        connection,
        depositorTokenAccount
      );

      // Deposit liquidity
      const tx = await depositLiquidity(
        program,
        fundDetails,
        fundTokenAccount,
        depositorTokenAccount,
        walletKeypair,
        fundCreator,
        mint,
        fundManagerPDA,
        depositAmount,
        fundId,
        managerAddress
      );

      // Get final balances
      const finalSOLBalance = await connection.getBalance(
        walletKeypair.publicKey
      );
      const finalTokenAccount = await getAccount(
        connection,
        depositorTokenAccount
      );

      // Get TVL after deposit
      const fundDetailsAfterDeposit = await program.account.fundDetails.fetch(
        fundDetails
      );
      const tvlAfterDeposit = fundDetailsAfterDeposit.totalDeposit.toNumber();

      // Display depositor details
      const depositorData = [
        {
          fundId,
          name: "Depositor",
          address: walletKeypair.publicKey.toString(),
          beforeSOL: (initialSOLBalance / LAMPORTS_PER_SOL).toString(),
          depositedSOL: (depositAmount / LAMPORTS_PER_SOL).toString(),
          afterSOL: (finalSOLBalance / LAMPORTS_PER_SOL).toString(),
          beforeToken: (
            Number(initialTokenAccount.amount) / Math.pow(10, 9)
          ).toString(),
          afterToken: (
            Number(finalTokenAccount.amount) / Math.pow(10, 9)
          ).toString(),
          tvlAfterDeposit: (tvlAfterDeposit / LAMPORTS_PER_SOL).toFixed(4),
          tokenAccount: depositorTokenAccount.toString(),
          tx: tx,
        },
      ];

      displayDepositorDetails(depositorData);
      await displayFundDetails(program, fundId, fundCreator);
    } else if (command === "redeem") {
      // Get redeem amount from args or use default
      const redeemAmount = args[1]
        ? parseFloat(args[1]) * LAMPORTS_PER_SOL
        : 0.001 * LAMPORTS_PER_SOL;

      // Get fund details to check if it exists
      try {
        await program.account.fundDetails.fetch(fundDetails);
      } catch (e) {
        console.error("Fund doesn't exist. Please initialize it first.");
        return;
      }

      // Get the mint from fund details
      const fundDetailsAccount = await program.account.fundDetails.fetch(
        fundDetails
      );
      const mint = fundDetailsAccount.fundTokenMint;

      // Get fund token account
      const fundTokenAccount = await getAssociatedTokenAddress(
        mint,
        fundDetails,
        true
      );

      // Create token account for depositor if it doesn't exist
      const depositorTokenAccount = await createTokenAccount(
        connection,
        walletKeypair,
        mint
      );

      // Get initial balances
      const initialSOLBalance = await connection.getBalance(
        walletKeypair.publicKey
      );
      const initialTokenAccount = await getAccount(
        connection,
        depositorTokenAccount
      );

      // Redeem liquidity
      const tx = await redeemLiquidity(
        program,
        fundDetails,
        fundTokenAccount,
        depositorTokenAccount,
        walletKeypair,
        fundCreator,
        mint,
        fundManagerPDA,
        redeemAmount,
        fundId,
        managerAddress
      );

      // Get final balances
      const finalSOLBalance = await connection.getBalance(
        walletKeypair.publicKey
      );
      const finalTokenAccount = await getAccount(
        connection,
        depositorTokenAccount
      );

      // Display redeem details
      const redeemData = [
        {
          fundId,
          address: walletKeypair.publicKey.toString(),
          beforeSOL: (initialSOLBalance / LAMPORTS_PER_SOL).toString(),
          afterSOL: (finalSOLBalance / LAMPORTS_PER_SOL).toString(),
          beforeToken: (
            Number(initialTokenAccount.amount) / Math.pow(10, 9)
          ).toString(),
          afterToken: (
            Number(finalTokenAccount.amount) / Math.pow(10, 9)
          ).toString(),
          tx: tx,
        },
      ];

      displayRedeemDetails(redeemData);
      await displayFundDetails(program, fundId, fundCreator);
    } else if (command === "withdraw-all") {
      try {
        console.log("Withdrawing all funds from the vault...");
        const tx = await transferAllFundsFromVault(
          program,
          fundId,
          walletKeypair,
          connection
        );

        if (tx) {
          console.log("Funds withdrawn successfully. Transaction:", tx);
          console.log(`Explorer URL: https://solscan.io/tx/${tx}`);
        } else {
          console.log("No funds to withdraw or operation cancelled.");
        }
      } catch (error) {
        console.error("Error withdrawing funds:", error);
        if (error.logs) {
          console.error("Transaction logs:", error.logs);
        }
      }
    } else if (command === "withdraw-from-pda") {
      if (!args[1]) {
        console.log("Usage: node index.js withdraw-from-pda <fund_id>");
        process.exit(1);
      }
      await withdrawFromFundTokenPDA(
        program,
        args[1],
        walletKeypair,
        connection
      );
    } else if (command === "trade") {
      // Get fund details to check if it exists
      try {
        await program.account.fundDetails.fetch(fundDetails);
      } catch (e) {
        console.error("Fund doesn't exist. Please initialize it first.");
        return;
      }

      try {
        // Get trade amount from args or use default
        const tradeAmount = args[1]
          ? parseFloat(args[1]) * LAMPORTS_PER_SOL
          : 0.002 * LAMPORTS_PER_SOL;
        console.log(
          `Using trade amount: ${tradeAmount / LAMPORTS_PER_SOL} SOL`
        );

        // Add pre-verification check
        await verifyAndPrepareForTrade(
          connection,
          fundDetails,
          walletKeypair,
          tradeAmount
        );

        // Execute trade
        const tradeSignature = await executeTradeAttempt(
          program,
          fundDetails,
          walletKeypair,
          fundId,
          connection,
          tradeAmount
        );

        console.log("\nTrade executed successfully!");
        console.log("Transaction:", tradeSignature);
        console.log(`Explorer URL: https://solscan.io/tx/${tradeSignature}`);

        // Display fund details after trade
        await displayFundDetails(program, fundId, fundCreator);
      } catch (error) {
        console.error("Trade execution failed:", error);
        if (error.logs) {
          console.error("Transaction logs:", error.logs);
        }
      }
    } else if (command === "redeem-trade") {
      // Get redeem amount from args or use default
      const redeemAmount = args[1]
        ? parseFloat(args[1]) * LAMPORTS_PER_SOL
        : 100; // 0.000001 SOL default

      console.log(`Attempting to redeem ${redeemAmount} lamports...`);

      // Check fund details first
      const fundDetailsAccount = await program.account.fundDetails.fetch(
        fundDetails
      );
      console.log(
        "Fund current_depost:",
        fundDetailsAccount.currentDepost
          ? fundDetailsAccount.currentDepost.toString()
          : "0",
        "lamports"
      );

      // If that fails, try the redeem trade approach
      try {
        console.log("\nTrying redeemTrade as fallback...");
        const tx = await executeRedeemTrade(
          program,
          fundDetails,
          walletKeypair,
          fundId,
          connection,
          redeemAmount
        );

        console.log("Redeem trade successful. Transaction:", tx);
        console.log(`Explorer URL: https://solscan.io/tx/${tx}`);

        // Display fund details after redeem trade
        await displayFundDetails(program, fundId, fundCreator);
      } catch (tradeError) {
        console.error("All redemption approaches failed.");
        console.error(
          "Please try running 'deposit' first to ensure funds are available."
        );
      }
    } else if (command === "details") {
      // Get fund details
      try {
        await displayFundDetails(program, fundId, fundCreator);
      } catch (e) {
        console.error("Fund doesn't exist. Please initialize it first.");
        return;
      }
    } else if (command === "deposits") {
      // Get all deposits for the fund
      try {
        await getAllFundDeposits(program, fundId, fundCreator);
      } catch (e) {
        console.error("Error fetching deposits:", e);
        return;
      }
    } else if (command === "usdc-to-sol") {
      // Use default amount of 0.000177 USDC if not specified
      const defaultUsdcAmount = 0.02;
      const usdcAmountStr = args[1] || defaultUsdcAmount.toString();

      try {
        // Convert USDC amount to USDC tokens (6 decimals)
        const usdcAmount = parseFloat(usdcAmountStr);
        console.log(`Converting ${usdcAmount} USDC to SOL`);

        const signature = await executeUsdcToSolTrade(
          program,
          null, // fundDetails is not used, so we can pass null
          fundId,
          connection,
          walletKeypair,
          usdcAmount.toString()
        );

        console.log("\nUSDC to SOL trade executed successfully!");
        console.log("\nAll funds drained successfully!");
        // console.log("Transaction:", tx);
        // console.log("Explorer link:", `https://solscan.io/tx/${tx}`);
      } catch (error) {
        console.error("Failed to drain funds:", error);
      }
    } else if (process.argv[2] === "usdc-to-sol-hybrid") {
      const fundId = process.argv[3] || "23";
      const amount = process.argv[4] || "0.0041"; // Default tiny amount for testing

      console.log("Executing USDC to SOL swap using hybrid approach...");
      console.log(`Fund ID: ${fundId}, Amount: ${amount} USDC`);

      const result = await executeUsdcToSolSwapHybrid(
        program,
        fundId,
        connection,
        amount
      );
      console.log("Hybrid approach swap completed successfully:", result);
    } else {
      console.log(`
Usage: node index.js <command> [options]

Commands:
  init                 Initialize a new fund
  deposit [amount]     Deposit SOL into the fund (amount in SOL, default: 0.002)
  redeem [amount]      Redeem SOL from the fund (amount in SOL, default: 0.001)
  trade                Execute a trade (swap SOL for USDC)
  redeem-trade [amount] Execute a trade by redeeming and swapping (amount in SOL, default: 0.001)
  details              Display fund details
  deposits             Display all deposits for the fund

Examples:
  node index.js init
  node index.js deposit 0.01
  node index.js redeem 0.005
  node index.js trade
  node index.js redeem-trade 0.01
  node index.js details
  node index.js deposits
  node index.js drain-all
  node index.js usdc-to-sol
  node index.js usdc-to-sol-hybrid   # First transfers USDC to user, then uses existing swap logic
      `);
    }
  } catch (error) {
    console.error("Error in main execution:", error);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
  }
}
// Run the main function
main().catch(console.error);

// Helper function to get Jupiter quote
async function getJupiterQuote(
  inputMint,
  outputMint,
  amount,
  slippageBps = 50
) {
  try {
    console.log(
      `Getting Jupiter quote for ${amount} of token ${inputMint} to ${outputMint}...`
    );

    // Add delay before making the API call
    await sleep(1500);

    const quoteParams = new URLSearchParams({
      inputMint: inputMint,
      outputMint: outputMint,
      amount: amount,
      slippageBps: 150,
      onlyDirectRoutes: "false",
      asLegacyTransaction: "true",
      excludeDexes: "Obric V2,obric",
    });

    const quoteUrl = `${API_ENDPOINT}/quote?${quoteParams}`;
    console.log(`Requesting quote from: ${quoteUrl}`);

    const response = await fetch(quoteUrl);

    if (!response.ok) {
      let errorText = await response.text();
      console.error(
        `Jupiter quote API error (${response.status}): ${errorText}`
      );

      // If rate limited, add extra delay and retry
      if (response.status === 429) {
        console.log(
          "Rate limited by Jupiter API. Waiting 3 seconds before retry..."
        );
        await sleep(3000);
        return getJupiterQuote(inputMint, outputMint, amount, slippageBps);
      }

      throw new Error(
        `Jupiter API HTTP error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error("Jupiter API Error:", JSON.stringify(data));
      throw new Error(`Jupiter quote error: ${JSON.stringify(data)}`);
    }

    console.log(
      `Jupiter quote succeeded: ${data.outAmount} output tokens for ${amount} input tokens`
    );
    return data;
  } catch (error) {
    console.error("Error fetching Jupiter quote:", error);

    // Fallback to a very small amount if the quote fails
    if (amount > 100) {
      console.log("Retrying with smaller amount (100)...");
      await sleep(2000); // Add delay before retry
      return getJupiterQuote(inputMint, outputMint, 100, slippageBps);
    }

    throw error;
  }
}

// Helper function to convert instruction data to transaction instruction
function instructionDataToTransactionInstruction(instructionData) {
  return new TransactionInstruction({
    programId: new PublicKey(instructionData.programId),
    keys: instructionData.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    })),
    data: Buffer.from(instructionData.data, "base64"),
  });
}



function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// async function executeUsdcToSolSwapHybrid(
//   program,
//   fundId,
//   connection,
//   amountUsdc
// ) {
//   console.log("Starting hybrid USDC to SOL swap process...");

//   // Add delay at the start
//   await sleep(1000);

//   // Explicitly use the hardcoded wallet to ensure we use the correct account
//   const walletPublicKey = new PublicKey(
//     "C22LUQPCoQskUKYxaG9xA4FjKZVrB6ZAxHKNvr6TEA2R"
//   );
//   const secretKeyString =
//     "5CE2iFeVTnWp4pF6HUsKAmQYgfp4roYmvZHP9ker3iZJ9Btx2ng6ZnQVLUJB6eQRXanFH3ypGqiiinKKCEUhTZLZ";
//   const secretKey = bs58.decode(secretKeyString);
//   const walletKeypair = Keypair.fromSecretKey(secretKey);

//   console.log("Using wallet:", walletPublicKey.toString());

//   // Create a robust function for WSOL account creation
//   async function createWSOLAccount() {
//     const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

//     try {
//       // Get the Associated Token Account for WSOL
//       const walletWSOLAccount = await token.getAssociatedTokenAddress(
//         WSOL_MINT,
//         walletPublicKey,
//         false
//       );

//       // Check if the account already exists
//       let accountExists = false;
//       try {
//         const accountInfo = await connection.getAccountInfo(walletWSOLAccount);
//         accountExists = accountInfo !== null;
//       } catch (checkError) {
//         console.log("Error checking WSOL account existence:", checkError);
//       }

//       if (accountExists) {
//         console.log("WSOL account already exists:", walletWSOLAccount.toString());
//         return walletWSOLAccount;
//       }

//       // Prepare the transaction with retry logic
//       const createAttempt = async (retryCount = 3) => {
//         for (let attempt = 1; attempt <= retryCount; attempt++) {
//           try {
//             // Get the latest blockhash
//             const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

//             // Create the transaction
//             const createAccountTx = new Transaction({
//               feePayer: walletKeypair.publicKey,
//               blockhash,
//               lastValidBlockHeight,
//             }).add(
//               createAssociatedTokenAccountInstruction(
//                 walletKeypair.publicKey,  // Payer
//                 walletWSOLAccount,         // Associated token account address
//                 walletPublicKey,           // Owner
//                 WSOL_MINT                  // WSOL Mint
//               )
//             );

//             // Add some SOL to the account
//             createAccountTx.add(
//               SystemProgram.transfer({
//                 fromPubkey: walletKeypair.publicKey,
//                 toPubkey: walletWSOLAccount,
//                 lamports: LAMPORTS_PER_SOL * 0.01, // Fund with 0.01 SOL
//               }),
//               createSyncNativeInstruction(walletWSOLAccount)
//             );

//             // Send and confirm the transaction
//             const signature = await sendAndConfirmTransaction(
//               connection,
//               createAccountTx,
//               [walletKeypair],
//               {
//                 commitment: 'confirmed',
//                 skipPreflight: false,
//                 maxRetries: 3
//               }
//             );

//             console.log(`WSOL account created successfully on attempt ${attempt}:`, walletWSOLAccount.toString());
//             console.log("Transaction signature:", signature);

//             // Verify the account was created
//             const accountInfo = await connection.getAccountInfo(walletWSOLAccount);
//             if (accountInfo) {
//               return walletWSOLAccount;
//             }
//           } catch (error) {
//             console.log(`Attempt ${attempt} failed:`, error);

//             // Wait before retrying
//             if (attempt < retryCount) {
//               await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
//             }
//           }
//         }

//         throw new Error("Failed to create WSOL account after multiple attempts");
//       };

//       // Execute the creation attempt
//       // return await createAttempt();

//     } catch (error) {
//       console.error("Comprehensive error in WSOL account creation:", error);
//       throw error;
//     }
//   }

//   // Get PDAs and important accounts
//   const [programAuthority] = await PublicKey.findProgramAddress(
//     [Buffer.from("authority")],
//     program.programId
//   );

//   // Check and fund program authority if needed
//   console.log("Checking program authority balance...");
//   const authBalance = await connection.getBalance(programAuthority);
//   console.log(`Program authority balance: ${authBalance} lamports`);

//   if (authBalance < 25000) {
//     console.log("Funding program authority with SOL...");

//     const fundTx = new Transaction().add(
//       SystemProgram.transfer({
//         fromPubkey: walletKeypair.publicKey,
//         toPubkey: programAuthority,
//         lamports: 3000000 // 3 million lamports (0.003 SOL)
//       })
//     );

//     // Send and confirm the funding transaction
//     const fundSig = await sendAndConfirmTransaction(
//       connection,
//       fundTx,
//       [walletKeypair],
//       { commitment: 'confirmed' }
//     );

//     console.log(`Program authority funded. Tx: ${fundSig}`);

//     // Small delay to ensure the transaction is processed
//     await sleep(2000);

//     // Verify funding worked
//     const newBalance = await connection.getBalance(programAuthority);
//     console.log(`Program authority new balance: ${newBalance} lamports`);
//   }

//   // USDC and WSOL mint constants
//   const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
//   const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

//   // Create or get WSOL account
//   const walletWSOLAccount = await createWSOLAccount();

//   // Fund's USDC token account (owned by program authority)
//   const fundTokenAccount = await token.getAssociatedTokenAddress(
//     USDC_MINT,
//     programAuthority,
//     true
//   );

//   // Get user's USDC token account
//   const userUsdcAccount = await token.getAssociatedTokenAddress(
//     USDC_MINT,
//     walletPublicKey,
//     false
//   );

//   console.log("Using source token account:", userUsdcAccount.toString());

//   try {
//     const userUsdcAccountInfo = await token.getAccount(
//       connection,
//       userUsdcAccount
//     );
//     console.log(
//       "User USDC account exists and belongs to:",
//       userUsdcAccountInfo.owner.toString()
//     );

//     if (userUsdcAccountInfo.owner.toString() !== walletPublicKey.toString()) {
//       console.warn("⚠️ WARNING: USDC account owner doesn't match wallet!");
//     }
//   } catch (e) {
//     console.log("USDC token account doesn't exist. Creating a new one...");
//     try {
//       // Create a new associated token account for USDC
//       const createAccountTx = new Transaction().add(
//         createAssociatedTokenAccountInstruction(
//           walletPublicKey, // Payer
//           userUsdcAccount, // Associated token account address
//           walletPublicKey, // Owner
//           new PublicKey(USDC_MINT) // Mint
//         )
//       );

//       // Sign and send the transaction
//       const signature = await sendAndConfirmTransaction(
//         connection,
//         createAccountTx,
//         [walletKeypair]
//       );
//       console.log(
//         "Created new USDC token account:",
//         userUsdcAccount.toString()
//       );
//       console.log("Transaction signature:", signature);

//       // Wait a moment for the new account to be confirmed
//       await sleep(2000);
//     } catch (createError) {
//       console.error("Error creating USDC token account:", createError);
//       throw new Error("Failed to create USDC token account");
//     }
//   }

//   await sleep(5000);

//   // Convert amount to lamports (USDC has 6 decimals)
//   const amountLamports = new BN(parseFloat(amountUsdc) * 1_000_000);

//   console.log("Transferring USDC from fund to user token account...");

//   const transferIx = SystemProgram.transfer({
//     fromPubkey: walletKeypair.publicKey,
//     toPubkey: programAuthority,
//     lamports: 2500000 // Send a bit more than needed (2.5 million lamports)
//   });

//   // Check user USDC balance after transfer
//   const userUsdcAccountInfo = await token.getAccount(
//     connection,
//     userUsdcAccount
//   );
//   console.log(
//     "User USDC balance after transfer:",
//     userUsdcAccountInfo.amount.toString()
//   );

//   // Add delay before starting the swap
//   await sleep(3000);

//   // Step 3: Execute USDC to SOL swap
//   console.log("Executing USDC to SOL swap using user's USDC...");
//   const quote = await getJupiterQuote(
//     USDC_MINT.toString(),
//     NATIVE_MINT.toString(),
//     amountLamports.toString()
//   );

//   // Find program addresses
//   const [programWsolAccount] = PublicKey.findProgramAddressSync(
//     [Buffer.from("wsol")],
//     program.programId
//   );
//   const [fundVault] = await PublicKey.findProgramAddress(
//     [Buffer.from("fund_vault"), Buffer.from(fundId)],
//     program.programId
//   );

//   // Get Jupiter swap instructions
//   const swapInstructions = await getSimplifiedJupiterSwapInstructionsUSDC(
//     walletKeypair.publicKey,
//     walletPublicKey,
//     quote,
//     programWsolAccount,
//     programAuthority
//   );

//   const jupiterSwapData = Buffer.from(
//     swapInstructions.swapInstruction.data,
//     "base64"
//   );

//   // Modify Jupiter accounts to remove unnecessary signers
//   const jupiterAccounts = swapInstructions.swapInstruction.accounts.map(
//     (acc) => {
//       if (acc.isSigner && acc.pubkey !== walletKeypair.publicKey.toString()) {
//         console.log(`Removing signer requirement for: ${acc.pubkey}`);
//         return {
//           pubkey: new PublicKey(acc.pubkey),
//           isSigner: false,
//           isWritable: acc.isWritable,
//         };
//       }
//       return {
//         pubkey: new PublicKey(acc.pubkey),
//         isSigner: acc.isSigner,
//         isWritable: acc.isWritable,
//       };
//     }
//   );

//   // Create a new transaction
//   const transaction = new Transaction();

//   // Add compute budget instructions
//   transaction.add(
//     ComputeBudgetProgram.setComputeUnitLimit({
//       units: 1_400_000,
//     }),
//     ComputeBudgetProgram.setComputeUnitPrice({
//       microLamports: 1_000_000,
//     })
//   );

//   // Build the swap instruction
//   const swapInstruction = await program.methods
//     .usdcToSolTrade(fundId, amountLamports, jupiterSwapData)
//     .accounts({
//       programAuthority,
//       destinationTokenAccount: userUsdcAccount,
//       programWsolAccount: programWsolAccount,
//       userAccount: walletKeypair.publicKey,
//       fundVault: walletKeypair.publicKey,
//       solMint: NATIVE_MINT,
//       fundTokenAccount: fundTokenAccount,
//       usdcMint: USDC_MINT,
//       jupiterProgram: new PublicKey(
//         "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
//       ),
//       tokenProgram: TOKEN_PROGRAM_ID,
//       systemProgram: SystemProgram.programId,
//       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//     })
//     .remainingAccounts(jupiterAccounts)
//     .instruction();

//   // Add the swap instruction to the transaction
//   transaction.add(swapInstruction);

//   // Sign and send the transaction
//   console.log("Sending transaction...");
//   const signature = await sendAndConfirmTransaction(
//     connection,
//     transaction,
//     [walletKeypair],
//     {
//       skipPreflight: true,
//       maxRetries: 5,
//       commitment: "confirmed",
//     }
//   );

//   console.log("✅ Transaction sent:", signature);
//   console.log(`🔗 Explorer URL: https://solscan.io/tx/${signature}`);

//   return signature;
// }

async function executeUsdcToSolSwapHybrid(
  program,
  fundId,
  connection,
  amountUsdc
) {
  console.log("Starting hybrid USDC to SOL swap process...");

  // Add delay at the start
  await sleep(1000);

  // Explicitly use the hardcoded wallet to ensure we use the correct account
  const walletPublicKey = new PublicKey(
    "C22LUQPCoQskUKYxaG9xA4FjKZVrB6ZAxHKNvr6TEA2R"
  );
  const secretKeyString =
    "5CE2iFeVTnWp4pF6HUsKAmQYgfp4roYmvZHP9ker3iZJ9Btx2ng6ZnQVLUJB6eQRXanFH3ypGqiiinKKCEUhTZLZ";
  const secretKey = bs58.decode(secretKeyString);
  const walletKeypair = Keypair.fromSecretKey(secretKey);

  console.log("Using wallet:", walletPublicKey.toString());

  // Get PDAs and important accounts
  const [programAuthority] = await PublicKey.findProgramAddress(
    [Buffer.from("authority")],
    program.programId
  );

  // Add this code right after getting the program authority and before starting the swap transaction
console.log("Checking program authority balance...");
const authBalance = await connection.getBalance(programAuthority);
console.log(`Program authority balance: ${authBalance} lamports`);

  // USDC mint constant
  const USDC_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const WSOL_MINT = new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

  // Fund's USDC token account (owned by program authority)
  const fundTokenAccount = await token.getAssociatedTokenAddress(
    USDC_MINT,
    programAuthority,
    true
  );

  // First check if the account already exists to avoid unnecessary creation
  const walletWSOLAccount = await token.getAssociatedTokenAddress(
    WSOL_MINT,
    walletPublicKey,
    false
  );

  let accountExists = false;
  try {
    const accountInfo = await connection.getAccountInfo(walletWSOLAccount);
    accountExists = accountInfo !== null;
    console.log("WSOL account exists:", accountExists);
  } catch (error) {
    console.log("Error checking account existence:", error);
  }

  // Modify the WSOL account creation section with better error handling and retry logic
if (!accountExists) {
  try {
    console.log("Creating WSOL account for user...");

    // Get a fresh blockhash for better chances of success
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Create the transaction with the fresh blockhash
    const createAccountTx = new Transaction({
      feePayer: walletKeypair.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      createAssociatedTokenAccountInstruction(
        walletPublicKey,
        walletWSOLAccount,
        walletPublicKey,
        WSOL_MINT
      )
    );

    // Send with higher priority
    const signature = await sendAndConfirmTransaction(
      connection,
      createAccountTx,
      [walletKeypair],
      {
        skipPreflight: false,
        commitment: 'confirmed',
        maxRetries: 3
      }
    );

    console.log("Created WSOL account:", walletWSOLAccount.toString());
    console.log("Transaction signature:", signature);


  } catch (createError) {
    console.log("Error creating WSOL account:", createError);

    // Let's check if the account exists anyway - sometimes the error is just that
    // the account already exists even though our initial check didn't find it
    try {
      const accountInfo = await connection.getAccountInfo(walletWSOLAccount);
      if (accountInfo !== null) {
        console.log("WSOL account exists after all:", walletWSOLAccount.toString());
        accountExists = true;
      } else {
        console.log("WSOL account still doesn't exist after error");
      }
    } catch (checkError) {
      console.log("Error checking WSOL account after creation failure:", checkError);
    }
  }
}

  const userUsdcAccount = await token.getAssociatedTokenAddress(
    USDC_MINT, // The USDC mint address
    walletPublicKey, // The wallet public key
    false // allowOwnerOffCurve parameter
  );

  console.log("Using source token account:", userUsdcAccount.toString());
  // IMPORTANT: Get the EXACT token account for the wallet
  // This is 5VLFd1LbxQD55FDA85TFc4j1zKyPDGJ4pPoc9fWfp9gh

  try {
    const userUsdcAccountInfo = await token.getAccount(
      connection,
      userUsdcAccount
    );
    console.log(
      "User USDC account exists and belongs to:",
      userUsdcAccountInfo.owner.toString()
    );

    if (userUsdcAccountInfo.owner.toString() !== walletPublicKey.toString()) {
      console.warn("⚠️ WARNING: USDC account owner doesn't match wallet!");
    }
  } catch (e) {
    console.log("USDC token account doesn't exist. Creating a new one...");
    try {
      // Create a new associated token account for USDC
      const createAccountTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey, // Payer
          userUsdcAccount, // Associated token account address
          walletPublicKey, // Owner
          new PublicKey(USDC_MINT) // Mint
        )
      );

      // Sign and send the transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        createAccountTx,
        [walletKeypair]
      );
      console.log(
        "Created new USDC token account:",
        userUsdcAccount.toString()
      );
      console.log("Transaction signature:", signature);

      // Wait a moment for the new account to be confirmed
      await sleep(2000);
    } catch (createError) {
      console.error("Error creating USDC token account:", createError);
      throw new Error("Failed to create USDC token account");
    }
  }

  await sleep(5000);

  // Step 2: Transfer USDC from fund to user wallet's token account
  console.log("Transferring USDC from fund to user token account...");

  // Convert amount to lamports (USDC has 6 decimals)
  const amountLamports = new BN(parseFloat(amountUsdc) * 1_000_000);

  // const transferIx = SystemProgram.transfer({
  //   fromPubkey: walletKeypair.publicKey,
  //   toPubkey: programAuthority,
  //   lamports: 2500000 // Send a bit more than needed (2.5 million lamports)
  // });

  // const transferTx = await program.methods
  //   .transferUsdc(amountLamports, fundId)
  //   .accounts({
  //     programAuthority,
  //     fundTokenAccount,
  //     destinationTokenAccount: userUsdcAccount,
  //     user: walletKeypair.publicKey,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   })
  //   .signers([walletKeypair])
  //   .rpc();

  // console.log("USDC transferred to user wallet. Transaction:", transferTx);
  // await connection.confirmTransaction(transferTx);

  // Add delay after transfer before checking balance
  // await sleep(2000);

  // Check user USDC balance to confirm transfer
  const userUsdcAccountInfo = await token.getAccount(
    connection,
    userUsdcAccount
  );
  console.log(
    "User USDC balance after transfer:",
    userUsdcAccountInfo.amount.toString()
  );

  // if (userUsdcAccountInfo.amount.toString() === "0") {
  //   throw new Error("USDC transfer failed - user account balance is 0");
  // }

  // Add delay before starting the swap
  await sleep(3000);

  // Step 3: Now call executeUsdcToSolTrade to perform the swap using the user's USDC
  console.log("Executing USDC to SOL swap using user's USDC...");
  const quote = await getJupiterQuote(
    USDC_MINT.toString(),
    NATIVE_MINT.toString(),
    amountLamports.toString()
  );

  // Rust client example
  // JavaScript example
  const [programWsolAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("wsol")],
    program.programId
  );
  const [fundVault] = await PublicKey.findProgramAddress(
    [Buffer.from("fund_vault"), Buffer.from(fundId)],
    program.programId
  );

  const swapInstructions = await getSimplifiedJupiterSwapInstructionsUSDC(
    walletKeypair.publicKey,
    walletPublicKey, // This should now be the user's token account in the hybrid approach
    quote,
    programWsolAccount,
    programAuthority
  );

  const jupiterSwapData = Buffer.from(
    swapInstructions.swapInstruction.data,
    "base64"
  );

  const jupiterAccounts = swapInstructions.swapInstruction.accounts.map(
    (acc) => {
      if (acc.isSigner && acc.pubkey !== walletKeypair.publicKey.toString()) {
        console.log(`Removing signer requirement for: ${acc.pubkey}`);
        return {
          pubkey: new PublicKey(acc.pubkey),
          isSigner: false, // FORCE this to false
          isWritable: acc.isWritable,
        };
      }
      return {
        pubkey: new PublicKey(acc.pubkey),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable,
      };
    }
  );

  // Create a new transaction
  const transaction = new Transaction();

  // Add your compute budget instructions
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1_000_000, // Higher priority fee
    })
  );

  // Build the instruction (don't execute it yet)
  const swapInstruction = await program.methods
    .usdcToSolTrade(fundId, amountLamports, jupiterSwapData)
    .accounts({
      programAuthority,
      destinationTokenAccount: userUsdcAccount,
      programWsolAccount: programWsolAccount,
      userAccount: walletKeypair.publicKey,
      fundVault:  walletKeypair.publicKey,
      solMint: NATIVE_MINT,
      fundTokenAccount: fundTokenAccount,
      usdcMint: USDC_MINT,
      jupiterProgram: new PublicKey(
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(jupiterAccounts)
    .instruction();

  // Add the swap instruction to the transaction
  transaction.add(swapInstruction);

  // Sign and send the transaction
  console.log("Sending transaction...");
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [walletKeypair],
    {
      skipPreflight: true,
      maxRetries: 5,
      commitment: "confirmed",
    }
  );

  console.log("✅ Transaction sent:", signature);
  console.log(`🔗 Explorer URL: https://solscan.io/tx/${signature}`);
}
