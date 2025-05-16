import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
// import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter } from "@solana/wallet-adapter-wallets";
// import { clusterApiUrl } from "@solana/web3.js";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { clusterApiUrl, Commitment } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export function SolanaProvider({ children }: { children: React.ReactNode }) {
    // You can change the network as needed (devnet, mainnet-beta, testnet)
    const network = WalletAdapterNetwork.Mainnet;
    // Configure the endpoint
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    const wsEndpoint = network === WalletAdapterNetwork.Mainnet ? "wss://mainnet.helius-rpc.com/?api-key=a3b0010e-c4b9-407b-8cb2-ecce8a26d5c6" : endpoint.replace("https", "wss");
    const solanaEndpoint = network === WalletAdapterNetwork.Mainnet ? "https://mainnet.helius-rpc.com/?api-key=a3b0010e-c4b9-407b-8cb2-ecce8a26d5c6" : endpoint;
    // const wsEndpoint = endpoint.replace("https", "wss");
    //https://mainnet.helius-rpc.com/?api-key=933ede55-3dc7-4d60-869b-51e973bdf7d1
    // console.log("mainnet-endpoint", endpoint);
    const config = useMemo(
        () => ({
            commitment: "confirmed" as Commitment,
            wsEndpoint,
        }),
        [wsEndpoint]
    );

    // Configure wallet adapters
    const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new TorusWalletAdapter()], []);

    return (
        <>
            <ConnectionProvider endpoint={solanaEndpoint} config={config}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>{children}</WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
            <ToastContainer pauseOnFocusLoss={false} style={{ top: "70px", userSelect: "none" }} theme="dark" position="top-right" autoClose={5000} hideProgressBar stacked toastClassName="bg-black/30 backdrop-blur-md border border-white/10" />
        </>
    );
}
