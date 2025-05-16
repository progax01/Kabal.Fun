import { createContext, useContext, ReactNode, useState, useEffect, Dispatch, SetStateAction } from "react";
import { useConnection, useWallet as useAdapterWallet, useWallet, useLocalStorage } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, web3, BN } from "@project-serum/anchor";
import { createAssociatedTokenAccountInstruction, createInitializeMintInstruction, getAssociatedTokenAddress, MINT_SIZE, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, NATIVE_MINT } from "@solana/spl-token";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import idl from "../config/idl.json";
import { Idl } from "@project-serum/anchor";
import { toast } from "react-toastify";
import axios, { AxiosError } from "axios";
import {
    AuthTokenRecord,
    FundData,
    FundDataApiResponse,
    FundDataRecordDetails,
    FundDetailResponse,
    FundraisingSortId,
    FundResponse,
    GraphDataPoint,
    HoldingDataProps,
    LeaderboardResponse,
    ListFilter,
    QuoteResponse,
    TradingSortId,
} from "../utils/type";
import "react-loading-skeleton/dist/skeleton.css";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { TokenList } from "../config";
import { useMediaQuery } from "react-responsive";

interface WalletContextType {
    wallet: any | null;
    connected: boolean;
    publicKey: PublicKey | null;
    connecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    createFund: (fundData: FundData) => Promise<void>;
    trigger: number;
    onTrigger: () => void;
    myBalance: number;
    depositLiquidity: (amount: number, fundId: string, fundContractAddress: string, targetRaiseAmount: string) => Promise<void>;
    redeemTokens: (amount: number, fundId: string, fundContractAddress: string) => Promise<void>;
    tradeTokens: (fundId: string, amount: number, inputTokenMint: string, outputTokenMint: string, inputSymbol: string, outputSymbol: string, fundContractAddress: string) => Promise<void>;
    createFundId: string | null;
    setCreateFundId: (fundId: string | null) => void;
    getAllFundAPI: ({ page, limit, filter, sort, signal }: { signal?: AbortSignal; page: number; limit: number; filter: ListFilter; sort: null | FundraisingSortId | TradingSortId }) => Promise<FundDataApiResponse>;
    loading: boolean;
    apiLoading: boolean;
    getAFundAPI: ({ address }: { address: string }) => Promise<{ fund: FundResponse; success: boolean; message?: string }>;
    getAFundGraphAPI: ({ address }: { address: string }) => Promise<{ fund: any; performanceData: GraphDataPoint[]; success: boolean; message?: string }>;
    getAFundHoldingAPI: ({ address }: { address: string }) => Promise<{ fund: any; holding: HoldingDataProps; success: boolean; message?: string }>;
    getTwitterAuthAPI: () => Promise<void>;
    getTopGainerFundAPI: ({ signal }: { signal?: AbortSignal }) => Promise<{ fund: FundResponse; success: boolean; message?: string }>;
    setApiLoading: Dispatch<SetStateAction<boolean>>;
    getLeaderboardAPI: () => Promise<LeaderboardResponse>;
    authToken: AuthTokenRecord | null;
    getFundTradeAPI: ({ address }: { address: string }) => Promise<{ fund: any; success: boolean; message?: string }>;
    getFundPortfolioAPI: ({ address }: { address: string }) => Promise<FundDetailResponse>;
    getManagerFundAPI: () => Promise<{ funds: any; success: boolean }>;
    setCurrentTicker: Dispatch<SetStateAction<FundResponse | null>>;
    currentTicker: FundResponse | null;
    checkAuthError: (error: any) => void;
    handleTelegramLogin: () => Promise<void>;
}

export const hedgeApi = axios.create({
    baseURL: "https://hedge-fun-72chp.ondigitalocean.app",
});

export const useWalletContext = () => useContext(WalletContext);

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export function WalletProvider({ children }: { children: ReactNode }) {
    const { connection } = useConnection();
    const { sendTransaction } = useWallet();
    const { setVisible, visible } = useWalletModal();
    const { publicKey, wallet, connected, connecting, signTransaction, disconnect: adapterDisconnect, signAllTransactions, signMessage } = useAdapterWallet();
    const [myBalance, setMyBalance] = useState<number>(0);
    const [apiLoading, setApiLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentTicker, setCurrentTicker] = useState<FundResponse | null>(null);
    const [authToken, setAuthToken] = useLocalStorage<AuthTokenRecord | null>("solana:auth", null);
    const [createFundId, setCreateFundId] = useLocalStorage<string | null>("solana:create-id", null);
    const [trigger, setTrigger] = useState(0);
    const isMobile = useMediaQuery({ query: "(max-width: 480px)" });
    console.log("connet--d", { connection, publicKey, createFundId, connecting, visible });

    const API_ENDPOINT = "https://quote-api.jup.ag/v6";
    const JUPITER_PROGRAM_ID = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
    const programId = new PublicKey("6Trk4KwsUJztAXAuHrPrp66VL8zW9Amru9jcehzTBfNB");

    const onTrigger = () => {
        setTrigger((p) => p + 1);
    };

    // console.log("selected", wallets);
    // let isNotInstalled = wallets.every((wallet) => wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable);
    // // await adapterConnect();
    // console.log("not install", isNotInstalled, wallet);

    const fetchBalance = async () => {
        if (publicKey) {
            // console.log("publd", publicKey.toBase58(), publicKey);
            // const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/UmaKn7VkJfE-tYiRAPDZasBgszl2-Yy5, "confirmed"');
            let balance = await connection.getBalance(publicKey);
            console.log("fecthingb-alance", balance, connection, publicKey.toBase58());
            setMyBalance(balance / LAMPORTS_PER_SOL);
        } else {
            setMyBalance(0);
        }
    };

    // Fetch balance when publicKey changes
    useEffect(() => {
        if (publicKey && connected) {
            try {
                fetchBalance();
            } catch (error) {
                console.log("Failed to login user in API:", error);
                toast.error("Failed to login user in API");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicKey, connected, trigger]);

    useEffect(() => {
        if (publicKey && connected) {
            handleSignMessage();
        }
    }, [connected, trigger]);

    // const refresh = async () => {
    //     if (!publicKey) return;
    //     await fetchBalance();
    // };
    let timeout: any;

    useEffect(() => {
        if (wallet?.readyState === WalletReadyState.NotDetected || wallet?.readyState === WalletReadyState.Loadable) {
            toast.error("Wallet Not Found. Redirecting to our Default Wallet - Phantom.");
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                disconnect();
                window.open("https://www.phantom.com/", "_blank");
            }, 4000);
        }
    }, [wallet]);

    const connect = async () => {
        try {
            setVisible(true);
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    };

    const disconnect = async () => {
        try {
            setAuthToken(null);
            await adapterDisconnect();
        } catch (error) {
            console.error("Failed to disconnect:", error);
        }
    };

    const checkAuthError = (error: any) => {
        if (error instanceof AxiosError && error?.response?.data?.message === "Unauthorized: Invalid or Expired auth token.") {
            if (publicKey && connected) handleSignMessage(true);
        }
    };

    const handleSignMessage = async (forceToken: boolean = false) => {
        try {
            console.log("auth token ", authToken);
            if (!forceToken && authToken?.token && new Date(authToken?.expiry) >= new Date() && authToken?.walletAddress === publicKey?.toString()) return;
            if (!publicKey) throw new Error("Wallet not connected!");
            const message = "This is to sign and verify your wallet connection!";
            const messageBytes = new TextEncoder().encode(message);
            const sig = await signMessage?.(messageBytes);
            const hexedSig = Buffer.from(sig!).toString("hex");
            const { data } = await hedgeApi.post("/user/login", { walletAddress: publicKey?.toString(), signature: hexedSig, message: message });
            setAuthToken({
                token: data?.user?.authToken,
                expiry: data?.user?.authExpiryDate,
                twitter: data?.user?.socials?.find((item: any) => item?.social === "twitter")?.username,
                telegram: data?.user?.socials?.find((item: any) => item?.social === "telegram")?.username,
                walletAddress: publicKey?.toString(),
            });
        } catch (err) {
            adapterDisconnect();
            throw new Error(err instanceof Error ? err.message : "Failed to sign message");
        }
    };

    const getAllFundAPI = async ({ signal, page, limit, filter, sort }: { signal?: AbortSignal; page: number; limit: number; filter: ListFilter; sort: null | FundraisingSortId | TradingSortId }) => {
        let isCancelled = false;
        try {
            setApiLoading(true);
            const response = await hedgeApi.get("/fund/list", { params: { page, limit, filter, sort }, signal });
            console.log("response", response.data);
            return response.data;
        } catch (error) {
            // Check if the error is due to an aborted request
            if (axios.isCancel(error)) {
                isCancelled = true;
                console.log("Request was cancelled:", error);
                return [];
            }
            checkAuthError(error);
            console.error("Failed to fetch funds from API:", error);
            toast.error("Failed to fetch funds from API");
            return [];
        } finally {
            if (isCancelled) return;
            setApiLoading(false);
        }
    };

    const getAFundAPI = async ({ address }: { address: string }) => {
        const response = await hedgeApi.get(`/fund/details/${address}`);
        // console.log("response", response.data);
        return response.data;
    };

    const getTopGainerFundAPI = async ({ signal }: { signal?: AbortSignal }) => {
        const response = await hedgeApi.get(`/fund/most-gaining`, { signal });
        // console.log("response", response.data);
        return response.data;
    };

    const getLeaderboardAPI = async () => {
        try {
            setApiLoading(true);
            const response = await hedgeApi.get(`/fund/leaderboard`, { params: { page: 1, limit: 20, sortby: "price" } });
            // console.log("response", response.data);
            return response.data;
        } catch (error) {
            checkAuthError(error);
        } finally {
            setApiLoading(false);
        }
    };

    const getFundTradeAPI = async ({ address }: { address: string }) => {
        try {
            setApiLoading(true);
            const response = await hedgeApi.get(`/manager/fund/${address}/details`, {
                headers: {
                    wallet_address: publicKey?.toBase58(),
                    auth_token: authToken?.token,
                },
            });
            // console.log("response", response.data);
            return response.data;
        } catch (error) {
            checkAuthError(error);
        } finally {
            setApiLoading(false);
        }
    };

    const getManagerFundAPI = async () => {
        try {
            setApiLoading(true);
            const response = await hedgeApi.get(`/manager/funds`, {
                headers: {
                    wallet_address: publicKey?.toBase58(),
                    auth_token: authToken?.token,
                },
            });
            // console.log("response", response.data);
            return response.data;
        } catch (error) {
            console.log("manafer fund", error);
            checkAuthError(error);
        } finally {
            setApiLoading(false);
        }
    };

    const getFundPortfolioAPI = async ({ address }: { address: string }) => {
        try {
            setApiLoading(true);
            const response = await hedgeApi.get(`/manager/fund/${address}/portfolio`, {
                headers: {
                    wallet_address: publicKey?.toBase58(),
                    auth_token: authToken?.token,
                },
            });
            // console.log("response", response.data);
            return response.data;
        } catch (e) {
        } finally {
            setApiLoading(false);
        }
    };

    const getFundSellQuoteAPI = async ({ fundAddress, amount }: { fundAddress: string; amount: string }) => {
        try {
            setApiLoading(true);
            const response = await hedgeApi.post(`/fund/sell-quote`, { fundAddress, amount });
            // console.log("response", response.data);
            return response.data;
        } catch (e) {
        } finally {
            setApiLoading(false);
        }
    };

    const getAFundGraphAPI = async ({ address }: { address: string }) => {
        const response = await hedgeApi.get(`/analytics/fund/${address}/performance`, {
            headers: {
                wallet_address: publicKey?.toBase58(),
                auth_token: authToken?.token,
            },
        });
        return response.data;
    };

    const getTwitterAuthAPI = async () => {
        if (!publicKey) toast.error("Wallet not connected!!");
        const response = await hedgeApi.get(`/user/twitter/auth/link`, {
            headers: {
                wallet_address: publicKey?.toBase58(),
                auth_token: authToken?.token,
            },
        });
        window.open(response.data?.url, "_self");
        // console.log("twitter data", response);
        // return response.data;
    };

    const getAFundHoldingAPI = async ({ address }: { address: string }) => {
        const response = await hedgeApi.get(`/user/holding/fund/${address}`, {
            headers: {
                wallet_address: publicKey?.toBase58(),
                auth_token: authToken?.token,
            },
        });
        return response.data;
    };

    const handleTelegramLogin = async () => {
        // setIsLoading(true);
        try {
            const botId = "7244080042";
            const domain = "kabalfun.netlify.app";
            const origin = "https://kabalfun.netlify.app/";

            const telegramAuthUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&domain=${domain}&origin=${encodeURIComponent(origin)}&request_access=write`;

            // Open Telegram auth in a popup window
            const width = isMobile ? 380 : 550;
            const height = 470;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const popup = window.open(telegramAuthUrl, "TelegramAuth", `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);

            // Handle the response through window message
            const handleMessage = async (event: MessageEvent) => {
                console.log("Received message:", event.data);
                if (event.origin !== window.location.origin && !event.origin.includes("telegram.org")) {
                    console.log("Ignored message from:", event.origin);
                    return;
                }
                try {
                    let userData = event.data && typeof event.data === "string" ? JSON.parse(event.data)?.result : event.data;
                    if (typeof userData === "string") {
                        try {
                            userData = JSON.parse(userData);
                        } catch (e) {
                            console.error("Failed to parse user data string:", e);
                        }
                    }
                    // Verify this is a valid Telegram auth response
                    if (!userData?.id || !userData?.auth_date || !userData?.hash) {
                        console.log("Invalid Telegram auth data:", userData);
                        return;
                    }
                    console.log("Processing Telegram auth data:", userData);
                    try {
                        const payload = typeof userData === "string" ? userData : JSON.stringify(userData);
                        console.log("Sending payload:", payload);
                        const headers = {
                            "Content-Type": "application/json",
                            wallet_address: publicKey?.toBase58(),
                            auth_token: authToken?.token,
                        };
                        console.log("auth", headers);
                        const response = await hedgeApi.post("/user/telegram/auth", payload, {
                            headers: headers,
                            withCredentials: false,
                        });
                        console.log("Server response:", response.data);
                        if (popup) popup.close();
                    } catch (error: any) {
                        console.error("Server error:", error.response || error);
                        // const errorMessage = error.response?.data?.message || error.message;
                        // setAuthError(`Failed to authenticate with server: ${errorMessage}`);
                    }
                    // login again for username
                    handleSignMessage(true);
                    // Remove event listener after processing
                    window.removeEventListener("message", handleMessage);
                } catch (err) {
                    console.error("Message processing error:", err);
                    // setAuthError("Failed to process authentication response");
                }
            };
            window.addEventListener("message", handleMessage);
        } catch (err) {
            console.error("Login error:", err);
            // setAuthError(err instanceof Error ? err.message : "Failed to authenticate");
        } finally {
            // setIsLoading(false);
        }
    };

    const createFundAPI = async (fundData: FundDataRecordDetails): Promise<void> => {
        console.log("sending backend", fundData);
        const formData = new FormData();
        Object.entries(fundData).forEach(([key, value]) => {
            if (value !== undefined) {
                formData.append(key, value instanceof File ? value : value.toString());
            }
        });

        const response = await hedgeApi.post("/fund/new", formData, {
            headers: {
                "Content-Type": "multipart/form-data", // Ensure the correct content type
                wallet_address: publicKey?.toBase58(),
                auth_token: authToken?.token,
            },
        });
        if (response?.data?.success) {
            console.log("Fund created successfully:", response.data);
        } else {
            throw new Error("Failed to create fund in API");
        }
    };

    const createLedgerAPI = async (fundAddress: string, amount: number, method: "buy" | "sell"): Promise<void> => {
        try {
            const response = await hedgeApi.post(
                "/ledger/new",
                { fundAddress, walletAddress: publicKey?.toString(), amount, method },
                {
                    headers: {
                        wallet_address: publicKey?.toBase58(),
                        auth_token: authToken?.token,
                    },
                }
            );
            if (response.status === 200) {
                console.log("Ledger created successfully:", response.data);
            }
        } catch (error) {
            console.error("Failed to create ledger in API:", error);
            toast.error("Failed to create ledger in API");
        }
    };

    const createTradeAPI = async (fundAddress: string, fromTokenAddress: string, toTokenAddress: string, fromTokenSymbol: string, toTokenSymbol: string, fromAmount: string, slippageBps: string): Promise<void> => {
        try {
            const response = await hedgeApi.post(
                `/trade/fund/${fundAddress}/execute`,
                { fromTokenAddress, toTokenAddress, fromTokenSymbol, toTokenSymbol, fromAmount, slippageBps },
                {
                    headers: {
                        wallet_address: publicKey?.toBase58(),
                        auth_token: authToken?.token,
                    },
                }
            );
            if (response.status === 200) {
                console.log("Ledger created successfully:", response.data);
            }
        } catch (error) {
            console.error("Failed to create ledger in API:", error);
            toast.error("Failed to create ledger in API");
        }
    };

    const createFund = async (fundData: FundData): Promise<void> => {
        if (!publicKey || !wallet) {
            toast.error("Wallet not connected");
            throw new Error("Wallet not connected");
        }

        try {
            setLoading(true);
            const walletAdapter = {
                publicKey,
                signTransaction: signTransaction!,
                signAllTransactions: signAllTransactions!,
            };
            const anchorProvider = new AnchorProvider(connection, walletAdapter, { commitment: "processed" });
            const program = new Program(idl as Idl, programId, anchorProvider);

            // Rest of the fund creation logic remains the same as in the previous implementation
            const timestamp = Date.now().toString();
            const last4Chars = publicKey?.toBase58()?.slice(-4);
            // Convert last 4 characters to a numeric value (Base36 to Base10)
            const numericPart = parseInt(last4Chars, 36).toString().slice(-4);
            const fund_id = timestamp + numericPart;
            console.log("fund_id ", fund_id);
            setCreateFundId(fund_id);

            //deriveFundPDAs
            const [fundDetails] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_details"), Buffer.from(fund_id), publicKey.toBuffer()], program.programId);

            // Generate a new mint (since wallet cannot provide a Signer)
            const mintKeypair = web3.Keypair.generate();

            const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
            let transaction = new web3.Transaction();
            //  Step 1: Create mint account
            transaction.add(
                web3.SystemProgram.createAccount({
                    fromPubkey: publicKey, // Wallet pays
                    newAccountPubkey: mintKeypair.publicKey, // Mint address
                    space: MINT_SIZE, // Token mint size
                    lamports, // Rent exemption
                    programId: TOKEN_PROGRAM_ID,
                })
            );

            // Step 2: Initialize mint
            transaction.add(
                createInitializeMintInstruction(
                    mintKeypair.publicKey, // Mint address
                    9, // Decimals
                    fundDetails, // Mint authority
                    null, // Freeze authority (optional)
                    TOKEN_PROGRAM_ID
                )
            );

            const fundTokenAccount = await getAssociatedTokenAddress(mintKeypair.publicKey, fundDetails, true);

            // Create the fund's associated token account
            const createAtaIx = createAssociatedTokenAccountInstruction(publicKey, fundTokenAccount, fundDetails, mintKeypair.publicKey);
            transaction.add(createAtaIx);

            console.log("Mint Created:", mintKeypair.publicKey.toBase58());

            const raiseAmountWithDecimals = new BN(Number(fundData.raiseAmount) * LAMPORTS_PER_SOL);
            const managementFeeWithDecimals = new BN(Number(fundData.managementFee) * LAMPORTS_PER_SOL);

            // const transaction1 = new web3.Transaction();
            transaction.add(
                await program.methods
                    .createFund(fund_id, raiseAmountWithDecimals, fundData.name.padEnd(10, " "), fundData.description.padEnd(32, " "), managementFeeWithDecimals)
                    .accounts({
                        fundDetails,
                        tokenMint: mintKeypair.publicKey,
                        fundTokenAccount,
                        user: publicKey,
                        systemProgram: web3.SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: web3.SYSVAR_RENT_PUBKEY,
                    })
                    .instruction()
            );

            // Sign and send transaction using wallet adapter
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
                commitment: "confirmed",
            });
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;
            const signature = await sendTransaction(transaction, connection, { signers: [mintKeypair] });
            const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
            if (confirmation.value.err) {
                throw new Error("Transaction Failed");
            }
            //call backend api
            await createFundAPI({
                fundName: fundData.name,
                fundTicker: fundData.ticker,
                fundDescription: fundData.description,
                targetRaiseAmount: fundData.raiseAmount,
                annualManagementFee: fundData.managementFee,
                logo: fundData.logo,
                websiteUrl: fundData.website,
                telegramUrl: fundData.telegram,
                twitterHandle: fundData.twitter,
                onChainFundId: fund_id,
                fundContractAddress: fundDetails.toString(),
                fundTokenAddress: mintKeypair.publicKey.toString(),
                managerAddress: publicKey?.toString(),
                managerTelegramUsername: authToken?.telegram,
            } as FundDataRecordDetails);
            // console.log("Fund created successfully:", signature);
            toast.success("Fund created successfully.");
            // await refresh();
            onTrigger();
        } catch (error) {
            console.error("Failed to create fund:", error);
            toast.error("Failed to create fund. Check console for more details.");
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const depositLiquidity = async (amount: number, fundId: string, fundContractAddress: string, targetRaiseAmount: string): Promise<void> => {
        if (!publicKey || !wallet) {
            toast.error("Wallet not connected or not compatible");
            throw new Error("Wallet not connected or not compatible");
        }

        try {
            setLoading(true);
            console.log("depositLiquidity fundId:", fundId, publicKey.toBase58(), fundContractAddress, targetRaiseAmount);

            // Set up Anchor provider and program using the wallet adapter.
            const walletAdapter = {
                publicKey,
                signTransaction: signTransaction!,
                signAllTransactions: signAllTransactions!,
            };
            const anchorProvider = new AnchorProvider(connection, walletAdapter, { commitment: "processed" });
            const program = new Program(idl as Idl, programId, anchorProvider);

            // In this flow, the fund creator is assumed to be the one who created the fund.
            // Here we assume it's the same as our connected wallet. Update if needed.
            const fundCreator = publicKey;

            // Derive fundDetails PDA using seeds: "fund_details", fundId, and the fund creator's public key.
            const [fundDetails] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_details"), Buffer.from(fundId), fundCreator.toBuffer()], program.programId);

            // Fetch the fund details account to obtain the token mint and current TVL.
            const fundDetailsAccount = await program.account.fundDetails.fetch(fundDetails);
            const tokenMint = fundDetailsAccount.fundTokenMint;
            console.log("Token Mint:", tokenMint.toBase58());

            // Derive the fundVault PDA using seeds: "fund_vault" and fundId.
            const [fundVault] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_vault"), Buffer.from(fundId)], program.programId);

            // Derive the associated token accounts for the fund and for the depositor.
            const fundTokenAccount = await getAssociatedTokenAddress(tokenMint, fundDetails, true);
            let userTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);

            // Check fund token account balance to ensure it has enough to mint tokens
            let fundTokenBalance = 0;
            try {
                const fundTokenAccountInfo = await getAccount(connection, fundTokenAccount);
                fundTokenBalance = Number(fundTokenAccountInfo.amount);
                console.log("Fund token account balance:", fundTokenBalance);

                // Check if this is an initial deposit by comparing with target raise amount
                const isInitialDeposit = fundTokenBalance === 0;
                console.log("Is initial deposit:", isInitialDeposit);

                // If not an initial deposit and the fund doesn't have enough tokens, warn the user
                if (!isInitialDeposit && fundTokenBalance < Number(amount) * LAMPORTS_PER_SOL) {
                    console.warn("Fund doesn't have enough tokens to complete this deposit");
                    toast.warning("This fund may not have enough tokens to complete your deposit. The transaction might fail.");
                }
            } catch (error) {
                console.log("Failed to get fund token account info, possibly a new fund:", error);
                // For new funds, this is expected as the token account might not exist yet
            }

            // (Optional) Create user's token account if it does not exist.
            try {
                await getAccount(connection, userTokenAccount);
                console.log("User token account exists:", userTokenAccount.toBase58());
            } catch (error) {
                console.log("User token account does not exist, creating...");
                const createAtaIx = createAssociatedTokenAccountInstruction(publicKey, userTokenAccount, publicKey, tokenMint);
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
                const ataTx = new web3.Transaction({
                    feePayer: publicKey,
                    blockhash,
                    lastValidBlockHeight,
                });
                ataTx.add(createAtaIx);
                const signature = await sendTransaction(ataTx, connection);
                const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
                if (confirmation.value.err) {
                    throw new Error("Transaction Failed");
                }
                // Re-fetch user token account if needed
                userTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
            }

            // Define manager address – update this value as needed.
            const managerAddress = new PublicKey("5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP");
            const [fundManagerPDA] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_manager"), managerAddress.toBuffer()], program.programId);

            // Convert the deposit amount (in SOL) to lamports with BN precision.
            const transferAmount = new BN(Number(amount) * LAMPORTS_PER_SOL);

            // Determine the current TVL from the fund details account.
            // Assuming totalDeposit is stored; otherwise default to 0.
            const currentTVL = targetRaiseAmount ? new BN(Number(targetRaiseAmount) * LAMPORTS_PER_SOL) : new BN(0);
            console.log("Current TVL (lamports):", currentTVL.toString());

            console.log("Deposit parameters:", {
                fundId,
                depositAmount: transferAmount.toString(),
                currentTVL: currentTVL.toString(),
                fundDetails: fundDetails.toBase58(),
                fundVault: fundVault.toBase58(),
                fundTokenAccount: fundTokenAccount.toBase58(),
                userTokenAccount: userTokenAccount.toBase58(),
                fundCreator: fundCreator.toBase58(),
                tokenMint: tokenMint.toBase58(),
                managerAddress: managerAddress.toBase58(),
                hedgeFundOwner: fundManagerPDA.toBase58(),
            });

            // Build the transaction by calling the depositLiquidity instruction.
            const tx = new web3.Transaction();

            // Add compute budget instructions for better success
            tx.add(
                web3.ComputeBudgetProgram.setComputeUnitLimit({
                    units: 400_000,
                })
            );
            tx.add(
                web3.ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 10_000,
                })
            );

            tx.add(
                await program.methods
                    .depositLiquidity(transferAmount, fundId, fundCreator, managerAddress, currentTVL)
                    .accounts({
                        fundDetails,
                        fundVault,
                        fundTokenAccount,
                        userTokenAccount,
                        user: publicKey,
                        fundCreatorAccount: fundCreator,
                        fundTokenMint: tokenMint,
                        systemProgram: web3.SystemProgram.programId,
                        hedgeFundOwner: fundManagerPDA,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: web3.SYSVAR_RENT_PUBKEY,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .instruction()
            );

            // Fetch a recent blockhash, set fee payer, and send the transaction.
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            console.log("Sending deposit transaction...");
            const signature = await sendTransaction(tx, connection, {
                signers: [],
                skipPreflight: true, // Skip preflight to let on-chain program handle the error
            });

            try {
                const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
                if (confirmation.value.err) {
                    throw new Error("Transaction Failed");
                }
                console.log("Liquidity deposited. Transaction signature:", signature);

                // Double check that the user received tokens
                let receivedTokens = false;
                try {
                    const userTokenAccountInfo = await getAccount(connection, userTokenAccount);
                    const userTokenBalance = Number(userTokenAccountInfo.amount);
                    receivedTokens = userTokenBalance > 0;
                    console.log("User token balance after deposit:", userTokenBalance);
                } catch (e) {
                    console.error("Failed to check user token balance:", e);
                }

                if (!receivedTokens) {
                    console.warn("Transaction succeeded but no tokens were received");
                    toast.warning("Your deposit was processed but you didn't receive tokens. Please contact support.");
                }
            } catch (confirmError) {
                console.error("Error confirming deposit transaction:", confirmError);

                // Check if the user's SOL was deducted but no tokens received
                const currentBalance = await connection.getBalance(publicKey);
                const balanceDecreased = currentBalance < myBalance * LAMPORTS_PER_SOL;

                if (balanceDecreased) {
                    toast.error("Deposit failed: Your SOL was deducted but you didn't receive tokens. This fund may have insufficient tokens.");
                } else {
                    toast.error("Deposit failed. Please try again with a smaller amount.");
                }
                throw confirmError;
            }
            await createLedgerAPI(fundContractAddress.toString(), amount, "buy");
            console.log("Liquidity deposited. Transaction signature:", signature);
            toast.success("Liquidity deposited successfully.");
            onTrigger();
        } catch (error) {
            console.error("Error during deposit:", error);
            toast.error("Error during deposit. Check console for details.");
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const redeemTokens = async (amount: number, fundId: string, fundContractAddress: string): Promise<void> => {
        if (!publicKey || !wallet) {
            toast.error("Wallet not connected or not compatible");
            throw new Error("Wallet not connected or not compatible");
        }

        try {
            setLoading(true);
            console.log("Starting hybrid USDC to SOL swap process...");

            // Setup provider and program
            const walletAdapter = {
                publicKey,
                signTransaction: signTransaction!,
                signAllTransactions: signAllTransactions!,
            };
            const anchorProvider = new AnchorProvider(connection, walletAdapter, { commitment: "confirmed" });
            const program = new Program(idl as Idl, programId, anchorProvider);

            // Get PDAs and important accounts
            const [programAuthority] = web3.PublicKey.findProgramAddressSync([Buffer.from("authority")], program.programId);

            // Check program authority balance
            console.log("Checking program authority balance...");
            const authBalance = await connection.getBalance(programAuthority);
            console.log(`Program authority balance: ${authBalance} lamports`);

            const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
            // Check if the user's WSOL account exists
            const walletWSOLAccount = await getAssociatedTokenAddress(WSOL_MINT, publicKey, false);

            let wsAccountExists = false;
            try {
                const accountInfo = await getAccount(connection, walletWSOLAccount);
                wsAccountExists = true;
                console.log("WSOL account exists:", walletWSOLAccount.toString(), accountInfo);
            } catch (error) {
                console.log("WSOL account doesn't exist, will create it");
                wsAccountExists = false;
            }

            if (!wsAccountExists) {
                console.log("Creating WSOL account for user...");
                try {
                    // Get a fresh blockhash for better chances of success
                    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });

                    // Create the transaction with the fresh blockhash
                    const createAtaIx = createAssociatedTokenAccountInstruction(publicKey, walletWSOLAccount, publicKey, WSOL_MINT);

                    const createAccountTx = new web3.Transaction({
                        feePayer: publicKey,
                        blockhash,
                        lastValidBlockHeight,
                    });
                    createAccountTx.add(createAtaIx);

                    const signature = await sendTransaction(createAccountTx, connection, {
                        skipPreflight: false,
                        maxRetries: 3,
                    });

                    const confirmation = await connection.confirmTransaction(
                        {
                            signature,
                            blockhash,
                            lastValidBlockHeight,
                        },
                        "confirmed"
                    );

                    console.log("Signature Explorer URL: https://solscan.io/tx/" + signature);
                    if (confirmation.value.err) {
                        throw new Error("Transaction Failed");
                    }
                    console.log("Created WSOL account:", walletWSOLAccount.toString());
                } catch (error) {
                    console.error("Error creating WSOL account:", error);
                    // If we failed to create it, check one more time if it exists now
                    try {
                        await getAccount(connection, walletWSOLAccount);
                        console.log("WSOL account exists after all:", walletWSOLAccount.toString());
                    } catch (e) {
                        // If it still doesn't exist, rethrow the original error
                        throw new Error("Failed to create WSOL account: " + error);
                    }
                }
            }

            // Constants
            const redeemAmountLamports = new BN(Number(amount) * LAMPORTS_PER_SOL);
            const fundQuoteDetails: QuoteResponse = await getFundSellQuoteAPI({ fundAddress: fundContractAddress, amount: String(redeemAmountLamports.toNumber()) });

            const tokens = fundQuoteDetails?.quote?.assetDeductions?.filter((i) => i?.tokenAddress?.toLowerCase() != NATIVE_MINT?.toBase58()?.toLowerCase());

            // Create transaction
            const transactionList: Array<web3.Transaction> = [];

            for (let item of tokens) {
                const transaction = new web3.Transaction();

                // Add compute budget instructions
                transaction.add(
                    web3.ComputeBudgetProgram.setComputeUnitLimit({
                        units: 1_400_000,
                    }),
                    web3.ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 1_000_000,
                    })
                );

                const INPUT_MINT_TOKEN = new PublicKey(item?.tokenAddress);
                // Fund's USDC token account (owned by program authority)
                const fundTokenAccount = await getAssociatedTokenAddress(INPUT_MINT_TOKEN, programAuthority, true);
                // Get or create user's USDC token account
                const userTokenAccount = await getAssociatedTokenAddress(INPUT_MINT_TOKEN, publicKey, false);

                console.log("Using source token account:", userTokenAccount.toString());

                // Verify the USDC token account exists
                try {
                    await getAccount(connection, userTokenAccount);
                    console.log("User USDC account exists");
                } catch (e) {
                    console.log("bONK token account doesn't exist. Creating a new one...");
                    const createAtaIx = createAssociatedTokenAccountInstruction(publicKey, userTokenAccount, publicKey, INPUT_MINT_TOKEN);
                    const ataTx = new web3.Transaction().add(createAtaIx);
                    const signature = await sendTransaction(ataTx, connection);
                    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
                    console.log("Created new bonk token account:", userTokenAccount.toString());
                }

                const decimal = TokenList?.find((token) => token?.symbol == item?.tokenSymbol)!.decimals;
                const amountTokenLamports = new BN(parseFloat(String(amount)) * 10 ** decimal);

                // Get Jupiter quote
                console.log("Getting Jupiter quote...");
                const quote = await getJupiterQuote(INPUT_MINT_TOKEN.toString(), WSOL_MINT.toString(), amountTokenLamports.toString());

                // Get PDAs needed for the transaction
                const [programWSOLAccount] = web3.PublicKey.findProgramAddressSync([Buffer.from("wsol")], program.programId);
                // const [fundVault] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_vault"), Buffer.from(fundId)], program.programId);

                // Get Jupiter swap instructions
                const swapInstructions = await getSimplifiedJupiterSwapInstructions(publicKey, walletWSOLAccount, quote);

                // Extract Jupiter data
                const jupiterSwapData = Buffer.from(swapInstructions.swapInstruction.data, "base64");

                // Modify Jupiter accounts
                const jupiterAccounts = swapInstructions.swapInstruction.accounts.map((acc: any) => {
                    if (acc.isSigner && acc.pubkey !== publicKey.toString()) {
                        console.log(`Removing signer requirement for: ${acc.pubkey}`);
                        return {
                            pubkey: new web3.PublicKey(acc.pubkey),
                            isSigner: false, // Force this to false
                            isWritable: acc.isWritable,
                        };
                    }
                    return {
                        pubkey: new web3.PublicKey(acc.pubkey),
                        isSigner: acc.isSigner,
                        isWritable: acc.isWritable,
                    };
                });

                // Build the swap instruction
                const swapInstruction = await program.methods
                    .usdcToSolTrade(fundId, amountTokenLamports, jupiterSwapData)
                    .accounts({
                        programAuthority,
                        destinationTokenAccount: userTokenAccount,
                        programWsolAccount: programWSOLAccount,
                        userAccount: publicKey,
                        fundVault: publicKey,
                        solMint: WSOL_MINT,
                        fundTokenAccount: fundTokenAccount,
                        usdcMint: INPUT_MINT_TOKEN,
                        jupiterProgram: new web3.PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: web3.SystemProgram.programId,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .remainingAccounts(jupiterAccounts)
                    .instruction();

                // Add swap instruction to transaction
                transaction.add(swapInstruction);
                transactionList.push(transaction);
            }
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });
            for (let transaction of transactionList) {
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;
            }
            const signedTransactions = await signAllTransactions!(transactionList);
            console.log("SIGNED TRANSACTIONS", signedTransactions, transactionList);

            for (let i = 0; i < transactionList.length; i++) {
                // Send and confirm transaction
                console.log("Sending transaction - " + (i + 1) + "");
                const signature = await connection.sendRawTransaction(signedTransactions[i].serialize(), {
                    skipPreflight: true,
                });
                console.log("First transaction sent:", signature);
                console.log(`🔗 Explorer URL: https://solscan.io/tx/${signature}`);
                const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

                if (confirmation.value.err) {
                    console.error("First transaction error:", confirmation.value.err);
                    throw new Error(`First transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }

                console.log("✅ Redemption successful:");
            }

            console.log("Combined transaction confirmed successfully!");

            // Record in ledger
            await createLedgerAPI(fundContractAddress.toString(), amount, "sell");

            toast.success("Tokens redeemed successfully!");
            onTrigger();
        } catch (error) {
            console.error("Error redeeming tokens:", error);
            toast.error("Failed to redeem tokens. Check console for details.");
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Helper function for Jupiter quote
    async function getJupiterQuote(inputMint: string, outputMint: string, amount: string, slippageBps = 50) {
        const response = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&onlyDirectRoutes=false&asLegacyTransaction=true&excludeDexes=Obric V2,obric`);

        if (!response.ok) {
            throw new Error(`Jupiter quote API error: ${await response.text()}`);
        }

        const data = await response.json();
        console.log(`Quote received: ${data.outAmount} output tokens for ${amount} input tokens`);
        return data;
    }

    // Helper function for Jupiter swap instructions
    async function getSimplifiedJupiterSwapInstructions(walletPublicKey: web3.PublicKey, destinationAccount: web3.PublicKey, quote: any, slippageBps = 50) {
        const response = await fetch("https://quote-api.jup.ag/v6/swap-instructions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: walletPublicKey.toString(),
                destinationTokenAccount: destinationAccount.toString(),
                wrapAndUnwrapSol: true,
                skipUserAccountsCreation: false,
                slippageBps: slippageBps,
            }),
        });

        if (!response.ok) {
            throw new Error(`Jupiter swap instructions error: ${await response.text()}`);
        }

        const swapData = await response.json();
        if (!swapData.swapInstruction) {
            throw new Error("No swap instruction returned from Jupiter");
        }

        return {
            swapInstruction: swapData.swapInstruction,
            setupInstructions: swapData.setupInstructions || [],
            cleanupInstructions: swapData.cleanupInstructions || [],
            addressLookupTableAddresses: swapData.addressLookupTableAddresses || [],
        };
    }

    // Frontend trade function using wallet adapter (e.g. Phantom)
    const tradeTokens = async (fundId: string, amount: number, inputTokenMint: string, outputTokenMint: string, inputSymbol: string, outputSymbol: string, fundContractAddress: string): Promise<void> => {
        if (!publicKey || !wallet) {
            toast.error("Wallet not connected");
            throw new Error("Wallet not connected");
        }

        try {
            setLoading(true);
            console.log("Trading tokens:", {
                fundId,
                amount,
                outputTokenMint,
                wallet: publicKey.toBase58(),
            });

            // Setup provider and program using wallet adapter
            const walletAdapter = {
                publicKey,
                signTransaction: signTransaction!,
                signAllTransactions: signAllTransactions!,
            };

            const anchorProvider = new AnchorProvider(connection, walletAdapter, { commitment: "processed" });
            const program = new Program(idl as Idl, programId, anchorProvider);

            // Define input token as SOL and convert output mint string to PublicKey
            const SOL = new PublicKey(inputTokenMint);
            // const outputMintPubkey = new PublicKey(outputTokenMint);

            // Define USDC mint
            const USDC_MINT = new PublicKey(outputTokenMint);

            // Convert trade amount from SOL to lamports
            const tradeAmount = Number(amount) * LAMPORTS_PER_SOL;

            // Pre-check fund balance to provide a better user experience
            const [fundDetails] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_details"), Buffer.from(fundId), publicKey.toBuffer()], program.programId);
            const [fundVault] = web3.PublicKey.findProgramAddressSync([Buffer.from("fund_vault"), Buffer.from(fundId)], program.programId);
            const [programAuthority] = web3.PublicKey.findProgramAddressSync([Buffer.from("authority")], program.programId);
            const [programWSOLAccount] = web3.PublicKey.findProgramAddressSync([Buffer.from("wsol")], program.programId);

            // Check fund vault balance
            const fundVaultBalance = await connection.getBalance(fundVault);
            if (fundVaultBalance < tradeAmount) {
                const availableSol = fundVaultBalance / LAMPORTS_PER_SOL;
                toast.error(`The fund doesn't have enough SOL to execute this trade. Available: ${availableSol.toFixed(4)} SOL`);
                throw new Error(`Insufficient fund balance. Required: ${amount} SOL, Available: ${availableSol} SOL`);
            }

            // Check user balance for fees and buffer
            const wsolRent = await connection.getMinimumBalanceForRentExemption(165);
            const buffer = 100_000; // 0.0001 SOL buffer
            const walletBalance = await connection.getBalance(publicKey);

            // Add a short delay to ensure all network operations are completed
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Execute the trade attempt
            try {
                // Create a transaction with all necessary instructions for the trade
                console.log(`🚀 Attempting trade: ${tradeAmount / LAMPORTS_PER_SOL} SOL`);

                // Calculate required amounts
                const requiredFundAmount = tradeAmount;
                const requiredUserAmount = wsolRent + buffer;

                console.log(`WSOL rent: ${wsolRent} lamports, Buffer: ${buffer} lamports`);
                console.log(`Fund required amount: ${requiredFundAmount} lamports (${requiredFundAmount / LAMPORTS_PER_SOL} SOL)`);
                console.log(`User required amount: ${requiredUserAmount} lamports (${requiredUserAmount / LAMPORTS_PER_SOL} SOL)`);

                // Verify the fund has enough to cover the trade amount
                if (fundVaultBalance < requiredFundAmount) {
                    throw new Error(`Insufficient fund vault balance. Required: ${requiredFundAmount}, Available: ${fundVaultBalance}`);
                }

                // Verify the user has enough to cover the buffer and rent
                if (walletBalance < requiredUserAmount) {
                    throw new Error(`Insufficient wallet balance for fees and buffer. Required: ${requiredUserAmount}, Available: ${walletBalance}`);
                }

                // Prepare destination token account (ATA) for USDC
                const fundTokenAccount = await getAssociatedTokenAddress(USDC_MINT, programAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
                console.log("Fund Token Account PDA:", fundTokenAccount.toBase58());

                // Ensure destination token account exists
                try {
                    await getAccount(connection, fundTokenAccount);
                    console.log("Fund token account already exists");
                } catch (e) {
                    console.log("Creating fund token account...");
                    const ataIx = createAssociatedTokenAccountInstruction(publicKey, fundTokenAccount, programAuthority, USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
                    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
                    const ataTx = new web3.Transaction({
                        feePayer: publicKey,
                        blockhash,
                        lastValidBlockHeight,
                    });
                    ataTx.add(ataIx);
                    const signature = await sendTransaction(ataTx, connection);
                    const confirmation = await connection.confirmTransaction(signature, "confirmed");
                    if (confirmation.value.err) {
                        throw new Error("Transaction Failed");
                    }
                    console.log("Created ATA:", signature);
                }

                // Get Jupiter quote
                console.log("Getting Jupiter quote...");
                const quoteParams = new URLSearchParams({
                    inputMint: String(SOL),
                    outputMint: String(USDC_MINT),
                    amount: String(tradeAmount),
                    slippageBps: String(100),
                    onlyDirectRoutes: "false",
                    asLegacyTransaction: "true",
                });
                const quoteResponse = await fetch(`${API_ENDPOINT}/quote?${quoteParams.toString()}`);
                if (!quoteResponse.ok) {
                    throw new Error(`Jupiter quote API error: ${await quoteResponse.text()}`);
                }
                const quote = await quoteResponse.json();
                if (!quote || !quote.routePlan || quote.routePlan.length === 0) {
                    throw new Error("Failed to get a valid Jupiter quote");
                }
                console.log(`Quote received: ${quote.outAmount} USDC tokens for ${tradeAmount} lamports`);

                // Get swap instructions from Jupiter
                const swapInstructions = await getSimplifiedJupiterSwapInstructions(publicKey, fundTokenAccount, quote);
                if (!swapInstructions || !swapInstructions.swapInstruction) {
                    throw new Error("Failed to get valid swap instructions");
                }

                // Create a transaction with all instructions
                const transaction = new web3.Transaction({
                    feePayer: publicKey,
                });

                // Add compute budget instructions with higher limits and priority fee
                transaction.add(
                    web3.ComputeBudgetProgram.setComputeUnitLimit({
                        units: 6_000_000,
                    })
                );

                transaction.add(
                    web3.ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 50_000,
                    })
                );

                // Add setup instructions if available
                if (swapInstructions.setupInstructions && swapInstructions.setupInstructions.length > 0) {
                    console.log(`Adding ${swapInstructions.setupInstructions.length} setup instructions`);
                    swapInstructions.setupInstructions.forEach((ix: any) => {
                        if (ix && ix.programId && ix.accounts && ix.data) {
                            const setupIx = new web3.TransactionInstruction({
                                programId: new PublicKey(ix.programId),
                                keys: ix.accounts.map((acc: any) => {
                                    if (acc.isSigner && acc.pubkey !== publicKey?.toString()) {
                                        return {
                                            pubkey: new web3.PublicKey(acc.pubkey),
                                            isSigner: false,
                                            isWritable: acc.isWritable,
                                        };
                                    }
                                    return {
                                        pubkey: new web3.PublicKey(acc.pubkey),
                                        isSigner: acc.isSigner,
                                        isWritable: acc.isWritable,
                                    };
                                }),
                                data: Buffer.from(ix.data, "base64"),
                            });
                            transaction.add(setupIx);
                        }
                    });
                }

                // Prepare the Jupiter swap instruction data
                const jupiterData = Buffer.from(swapInstructions.swapInstruction.data, "base64");

                // Prepare remaining accounts from Jupiter swap instruction
                const jupiterAccounts = swapInstructions.swapInstruction.accounts.map((acc: any) => {
                    if (acc.isSigner && acc.pubkey !== publicKey?.toString()) {
                        console.log(`Removing signer requirement for: ${acc.pubkey}`);
                        return {
                            pubkey: new web3.PublicKey(acc.pubkey),
                            isSigner: false, // Force this to false
                            isWritable: acc.isWritable,
                        };
                    }
                    return {
                        pubkey: new web3.PublicKey(acc.pubkey),
                        isSigner: acc.isSigner,
                        isWritable: acc.isWritable,
                    };
                });
                console.log(`Using ${jupiterAccounts.length} Jupiter accounts in the trade instruction`);

                // Build the trade instruction from your program
                const tradeIx = await program.methods
                    .trade(fundId, new BN(tradeAmount), jupiterData)
                    .accounts({
                        fundDetails: fundDetails,
                        programAuthority: programAuthority,
                        programWsolAccount: programWSOLAccount,
                        userAccount: publicKey,
                        fundVault: fundVault,
                        solMint: SOL,
                        destinationMint: USDC_MINT,
                        fundTokenAccount: fundTokenAccount,
                        jupiterProgram: JUPITER_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: web3.SystemProgram.programId,
                    })
                    .remainingAccounts(jupiterAccounts)
                    .instruction();

                // Add the trade instruction to transaction
                transaction.add(tradeIx);

                // Add any setup instructions from Jupiter if available
                if (swapInstructions.setupInstructions && swapInstructions.setupInstructions.length > 0) {
                    console.log(`Adding ${swapInstructions.setupInstructions.length} setup instructions`);
                    swapInstructions.setupInstructions.forEach((instruction: any) => {
                        const ix = new web3.TransactionInstruction({
                            programId: new PublicKey(instruction.programId),
                            keys: instruction.accounts.map((acc: any) => ({
                                pubkey: new PublicKey(acc.pubkey),
                                isSigner: acc.isSigner,
                                isWritable: acc.isWritable,
                            })),
                            data: Buffer.from(instruction.data, "base64"),
                        });
                        transaction.add(ix);
                    });
                }

                // Add cleanup instructions if available
                if (swapInstructions.cleanupInstructions && swapInstructions.cleanupInstructions.length > 0) {
                    console.log(`Adding ${swapInstructions.cleanupInstructions.length} cleanup instructions`);
                    swapInstructions.cleanupInstructions.forEach((ix: any) => {
                        if (ix && ix.programId && ix.accounts && ix.data) {
                            const cleanupAccounts = ix.accounts.map((acc: any) => {
                                if (acc.isSigner && acc.pubkey !== publicKey?.toString()) {
                                    return {
                                        pubkey: new web3.PublicKey(acc.pubkey),
                                        isSigner: false,
                                        isWritable: acc.isWritable,
                                    };
                                }
                                return {
                                    pubkey: new web3.PublicKey(acc.pubkey),
                                    isSigner: acc.isSigner,
                                    isWritable: acc.isWritable,
                                };
                            });

                            const cleanupIx = new web3.TransactionInstruction({
                                programId: new PublicKey(ix.programId),
                                keys: cleanupAccounts,
                                data: Buffer.from(ix.data, "base64"),
                            });
                            transaction.add(cleanupIx);
                        }
                    });
                }

                // Get recent blockhash and set fee payer
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;

                console.log("Transaction built successfully ✅");

                // Send the transaction
                console.log("Sending transaction...");
                const signature = await sendTransaction(transaction, connection, {
                    skipPreflight: true,
                    maxRetries: 5,
                });
                console.log("✅ Transaction sent:", signature);
                console.log(`🔗 Explorer URL: https://solscan.io/tx/${signature}`);

                // Confirm the transaction
                const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
                if (confirmation.value.err) {
                    throw new Error("Transaction Failed");
                }
                console.log("Transaction confirmed successfully!");

                // Call backend trade API to record the trade
                await createTradeAPI(fundContractAddress, inputTokenMint, outputTokenMint, inputSymbol, outputSymbol, amount.toString(), "500");

                toast.success(`Trade executed successfully! Swapped ${amount} ${inputSymbol} for ${outputSymbol}.`);
                onTrigger(); // Refresh balances/data
            } catch (error) {
                console.error("Error executing trade:", error);

                // Provide more specific error messages based on the error type
                if (error instanceof Error) {
                    const errorMessage = error.message;
                    if (errorMessage.includes("Insufficient fund balance")) {
                        toast.error("The fund doesn't have enough SOL to complete this trade.");
                    } else if (errorMessage.includes("Insufficient wallet balance")) {
                        toast.error("Your wallet doesn't have enough SOL to cover transaction fees.");
                    } else if (errorMessage.includes("Jupiter")) {
                        toast.error("Error from Jupiter exchange. Try again with a different amount.");
                    } else {
                        toast.error("Failed to execute trade: " + errorMessage);
                    }
                } else {
                    toast.error("Failed to execute trade. An unknown error occurred.");
                }

                throw error;
            }
        } catch (error) {
            console.error("Trade execution error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return (
        <WalletContext.Provider
            value={{
                wallet,
                connected,
                publicKey,
                connecting,
                connect,
                disconnect,
                createFund,
                trigger,
                onTrigger,
                myBalance,
                depositLiquidity,
                redeemTokens,
                tradeTokens,
                createFundId,
                setCreateFundId,
                getAllFundAPI,
                loading,
                apiLoading,
                getAFundAPI,
                getAFundGraphAPI,
                getAFundHoldingAPI,
                getTwitterAuthAPI,
                setApiLoading,
                getTopGainerFundAPI,
                authToken,
                getLeaderboardAPI,
                getFundTradeAPI,
                getFundPortfolioAPI,
                getManagerFundAPI,
                setCurrentTicker,
                currentTicker,
                checkAuthError,
                handleTelegramLogin,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
