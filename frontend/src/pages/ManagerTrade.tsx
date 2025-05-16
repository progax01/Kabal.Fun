import { Dispatch, SetStateAction, useEffect, useState } from "react";
// import SamplePic from "../assets/sample.png";
import CoinPic from "../assets/coin.png";
import SearchIcon from "../assets/search.svg";
import SwapIcon from "../assets/swap.svg";
// import SolanaIcon from "../assets/solana.png";
import WalletIcon from "../assets/wallet.svg";
import { useWalletContext } from "../contexts/WalletContext";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { FundAssets, TokenListData } from "../utils/type";
import { formatNum, formatNumWithSuffix } from "../config";
import { useSearchParams } from "react-router-dom";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
import { NATIVE_MINT } from "@solana/spl-token";
import { useDebounce } from "use-debounce";
import { TokenList } from "../config";
import { toast } from "react-toastify";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import Axios from "axios";
import { buildWebStorage, setupCache } from "axios-cache-interceptor";

const instance = Axios.create();

// Axios Cache Interceptor - as default uses im-memory-storage
export const axiosCache = setupCache(instance, {
    // debug: console.log,
    methods: ["get", "post"],
    storage: typeof window !== "undefined" ? buildWebStorage(localStorage, "solana-fund:") : undefined,
});

interface TokenData {
    amount: string;
    symbol: string;
    iconUrl: string;
    dollarValue: string;
    balance: string;
    enable: boolean;
}

interface TokenInputProps {
    label: string;
    tokenData: TokenData;
    input?: string;
    setInput?: Dispatch<SetStateAction<string>>;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
}

export interface SearchProps {
    value: string | undefined;
    onChange: (value: string) => void;
}

const TokenRow: React.FC<{ asset: FundAssets; index: number; setSelectedToken: (token: FundAssets) => void }> = ({ asset, index, setSelectedToken }) => {
    return (
        <tr className={`bg-white cursor-pointer ${index % 2 === 0 ? "bg-opacity-5" : "bg-opacity-10"} hover:bg-opacity-15 transition-colors`} onClick={() => setSelectedToken(asset)}>
            <td className="px-5 py-3">
                <div className="flex gap-2 items-center text-sm font-medium leading-none text-white whitespace-nowrap min-w-[140px]">
                    <img loading="lazy" src={asset?.fundLogo || CoinPic} alt={"assets"} className="object-contain rounded w-[18px] h-[18px]" />
                    <span>{asset?.name}</span>
                </div>
            </td>
            <td className="px-5 py-3">
                <div className="flex flex-col whitespace-nowrap w-[100px]">
                    <div className="flex gap-1 items-center text-sm font-medium text-white">
                        <img loading="lazy" src={asset?.logo || CoinPic} alt="Liquidity icon" className="size-4 rounded-full" />
                        <span>{formatNum(asset?.amount, 6)}</span>
                    </div>
                    <span className="mt-1.5 text-xs text-white text-opacity-50">${formatNum(Number(asset?.amount!) * Number(asset?.market?.price!))}</span>
                </div>
            </td>
            <td className="px-5 py-3">
                <div className="flex flex-col w-[130px]">
                    <span className="text-sm font-medium text-white">${formatNum(asset?.price?.usd)}</span>
                    <span className="mt-1.5 text-xs text-white text-opacity-50">FDV: ${formatNumWithSuffix(asset?.market?.fdv)}</span>
                </div>
            </td>
            <td className="px-5 py-3">
                <span className="text-sm font-medium text-white w-20">${formatNum(Number(asset?.amount!) * Number(asset?.market?.price!))}</span>
            </td>
            <td className="px-5 py-3">
                <span className={`text-sm font-medium w-[90px] ${asset?.market?.priceChange?.["1h"].includes("-") ? "text-red-500" : "text-emerald-300"}`}>{formatNum(asset?.market?.priceChange?.["1h"])}%</span>
            </td>
            <td className="px-5 py-3">
                <span className={`text-sm font-medium w-[90px] ${asset?.market?.priceChange?.["24h"].includes("-") ? "text-red-500" : "text-emerald-300"}`}>{formatNum(asset?.market?.priceChange?.["24h"])}%</span>
            </td>
            <td className="px-5 py-3">
                <span className={`text-sm font-medium w-[90px] ${asset?.market?.priceChange?.["7d"].includes("-") ? "text-red-500" : "text-emerald-300"}`}>{formatNum(asset?.market?.priceChange?.["7d"])}%</span>
            </td>
        </tr>
    );
};

const TokenSearch: React.FC<SearchProps> = ({ value, onChange }) => {
    return (
        <form role="search" className="flex gap-2 items-center px-2.5 py-1.5 rounded-[0.625rem] bg-white bg-opacity-10 min-w-[240px] w-[394px] focus:ring-2 hover:ring-white focus:ring-opacity-20">
            <label htmlFor="token-search" className="sr-only">
                Search tokens
            </label>
            <img loading="lazy" src={SearchIcon} alt="Search icon" className="w-4 h-4" />
            <input id="token-search" type="search" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm text-white border-none focus:outline-none" placeholder="Search..." aria-label="Search tokens" />
        </form>
    );
};

const TokenTable: React.FC<{ tradeList: FundAssets[]; setSelectedToken: (token: FundAssets) => void }> = ({ tradeList, setSelectedToken }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse" role="table">
                <thead>
                    <tr className="text-sm font-medium text-gray-400">
                        <th scope="col" className="px-5 py-4 text-left">
                            Token
                        </th>
                        <th scope="col" className="px-5 py-4 text-left">
                            Liquidity
                        </th>
                        <th scope="col" className="px-5 py-4 text-left">
                            Price
                        </th>
                        <th scope="col" className="px-5 py-4 text-left">
                            Volume
                        </th>
                        <th scope="col" className="px-5 py-4 text-left">
                            1H
                        </th>
                        <th scope="col" className="px-5 py-4 text-left">
                            1D
                        </th>
                        <th scope="col" className="px-5 py-4 text-left">
                            7D
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {tradeList?.length > 0 ? tradeList?.map((token, index) => <TokenRow key={index} index={index} asset={token} setSelectedToken={setSelectedToken} />) : <div className="opacity-80 text-sm ml-3 py-3">--- No Record Found</div>}
                </tbody>
            </table>
        </div>
    );
};

export const TokenInput: React.FC<TokenInputProps> = ({ label, tokenData, input, setInput, setIsDialogOpen }) => {
    return (
        <div className="flex z-0 flex-col p-5 w-full font-medium text-white rounded-xl bg-white bg-opacity-10">
            <span className="text-sm tracking-tight">{label}</span>
            <div className="flex gap-3 items-center mt-2.5 w-full whitespace-nowrap">
                {label === "Sell" ? (
                    <input
                        type="number"
                        value={input || tokenData.amount}
                        onChange={(e) => setInput?.(String(e.target.value))}
                        className="w-full text-2xl font-medium leading-none text-white bg-transparent border-none focus:outline-none"
                        placeholder="0.0"
                    />
                ) : (
                    <span className="flex-1 shrink self-stretch my-auto text-2xl leading-tight basis-7">{tokenData.amount}</span>
                )}
                <button className="flex gap-3 items-center self-stretch px-3.5 py-2.5 my-auto text-base leading-none text-center rounded-xl bg-white bg-opacity-10 shrink-0" onClick={() => tokenData?.enable && setIsDialogOpen(true)}>
                    <div className="flex gap-2.5 items-center self-stretch my-auto shrink-0">
                        <img loading="lazy" src={tokenData.iconUrl} alt={`${tokenData.symbol} token icon`} className="object-contain shrink-0 self-stretch my-auto rounded aspect-square w-[22px]" />
                        <span className="self-stretch my-auto">{tokenData.symbol}</span>
                    </div>
                    <img loading="lazy" src="https://cdn.prod.website-files.com/6729f35f83d5a08869675fb9/672d68ac53e98f2f3867eae4_Vectors-Wrapper.svg" alt="down-arrow" className="object-contain shrink-0 self-stretch my-auto w-3.5 aspect-square" />
                </button>
            </div>
            <div className="flex gap-10 justify-between items-center mt-2.5 w-full text-base leading-tight text-white text-opacity-50">
                <span className="self-stretch my-auto">$ {tokenData.dollarValue}</span>
                <div className="flex gap-2 items-end self-stretch my-auto whitespace-nowrap">
                    <img loading="lazy" src={WalletIcon} alt="Balance icon" className="object-contain shrink-0 w-5 aspect-square" />
                    <span>{formatNum(tokenData.balance, 6)}</span>
                </div>
            </div>
        </div>
    );
};

// interface QuoteParams {
//     inputMint: string;
//     outputMint: string;
//     amount: string; // Human-readable amount (e.g., "1.5" SOL)
//     slippageBps?: number;
//     onlyDirectRoutes?: boolean;
// }

interface QuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string; // Raw amount with decimals
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee: any;
    priceImpactPct: string;
    routePlan: any[];
    contextSlot: number;
    timeTaken: number;
    routeInfo?: any;
}

export const TradingInterface: React.FC<{ tradeList: FundAssets[] }> = ({ tradeList }) => {
    const { tradeTokens, currentTicker } = useWalletContext();
    // const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    // const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
    // console.log("list ", TokenList);
    const [selectedToken] = useState<TokenListData>(TokenList[0]);
    const [selectedToToken, setSelectedToToken] = useState<TokenListData>(TokenList[1]);
    const [usdPrice, setUsdPrice] = useState<{ token1: number; token2: number } | null>(null);
    const [input, setInput] = useState<string>("0.0");
    const [output, setOutput] = useState<number>(0.0);
    const [inputDebounced] = useDebounce(input, 1200);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [singleOut, setSingleOut] = useState<{ perQuote: number; token1: number; token2: number } | null>(null);

    async function getQuote(forcePerInput: boolean = false) {
        try {
            // Ensure the addresses are valid public keys
            // new PublicKey(params.inputMint);
            // new PublicKey(params.outputMint);

            // Default slippage to 1% if not provided
            const slippageBps = 50;

            // Convert input amount to raw amount with proper decimals
            const rawInputAmount = String(Number(forcePerInput ? 1 : input) * LAMPORTS_PER_SOL);
            if (!Boolean(rawInputAmount)) return;

            // Build query parameters
            const queryParams = new URLSearchParams({
                inputMint: NATIVE_MINT.toBase58(),
                outputMint: selectedToToken?.address,
                amount: rawInputAmount,
                slippageBps: slippageBps.toString(),
            });

            // Make request to Jupiter API
            const response = await axios.get(`https://quote-api.jup.ag/v6/quote?${queryParams.toString()}`);

            if (response.status !== 200) {
                throw new Error(`Jupiter API error: ${response.statusText}`);
            }

            const quoteResponse = response.data as QuoteResponse;
            let outAmount = String(Number(quoteResponse?.outAmount) / Math.pow(10, selectedToToken?.decimals));
            console.log("outrrr", quoteResponse, outAmount);
            !forcePerInput && setOutput(Number(outAmount));

            return Number(outAmount);
        } catch (error: any) {
            console.error("Error getting Jupiter quote:", error);
            throw new Error(`Failed to get Jupiter quote: ${error.message}`);
        }
    }

    const getUSDPrices = async (skipEffect: boolean = false) => {
        try {
            const ids = `${selectedToken?.extensions?.coingeckoId},${selectedToToken?.extensions?.coingeckoId}`;
            const { data } = await axiosCache.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, {
                id: "usd-rate:" + ids,
                cache: {
                    ttl: 10 * 60 * 1000, // 10 minutes
                },
            });
            console.log("my-tkn ", data?.[selectedToken?.extensions?.coingeckoId!].usd, data?.[selectedToToken?.extensions?.coingeckoId!]?.usd);
            !skipEffect &&
                setUsdPrice({
                    token1: data?.[selectedToken?.extensions?.coingeckoId!].usd!,
                    token2: data?.[selectedToToken?.extensions?.coingeckoId!]?.usd!,
                });
            return {
                token1: data?.[selectedToken?.extensions?.coingeckoId!].usd!,
                token2: data?.[selectedToToken?.extensions?.coingeckoId!]?.usd!,
            };
        } catch (error) {
            console.log("Error", error);
        }
    };

    useEffect(() => {
        const fetch = async () => {
            if (Boolean(input)) {
                await getQuote();
                await getUSDPrices();
            } else {
                setOutput(0);
                setUsdPrice(null);
            }
        };
        fetch();
    }, [inputDebounced, selectedToToken]);

    const sellTokenData: TokenData = {
        amount: "0", // changing using hook
        symbol: selectedToken?.symbol,
        iconUrl: selectedToken?.logoURI!,
        dollarValue: usdPrice?.token1 && input ? formatNum(Number(input) * Number(usdPrice?.token1)) : "0",
        balance: tradeList?.[0]?.amount || "0",
        enable: false,
    };

    const buyTokenData: TokenData = {
        amount: formatNum(output, 6),
        symbol: selectedToToken?.symbol,
        iconUrl: selectedToToken?.logoURI!,
        dollarValue: usdPrice?.token2 && output ? formatNum(Number(output) * Number(usdPrice?.token2)) : "0",
        balance: "0",
        enable: true,
    };

    useEffect(() => {
        const fetch = async () => {
            const perQuote = await getQuote(true);
            const usdPrice = await getUSDPrices(true);
            setSingleOut({ perQuote: perQuote!, token1: usdPrice?.token1, token2: usdPrice?.token2 });
        };
        if (selectedToToken) fetch();
    }, [selectedToToken]);

    return (
        <>
            <section className="flex flex-col min-w-[320px]">
                <h1 className="text-base tracking-tight text-white text-opacity-60">Trade</h1>
                <div className="flex flex-col mt-4 w-full">
                    <div className="flex relative flex-col w-full gap-3">
                        <TokenInput label="Sell" tokenData={sellTokenData} input={input} setInput={setInput} setIsDialogOpen={setIsDialogOpen} />
                        <TokenInput label="Buy" tokenData={buyTokenData} setIsDialogOpen={setIsDialogOpen} />
                        <div className="flex absolute top-2/4 left-2/4 z-0 gap-2.5 items-center p-1 size-12 rounded-full border-solid -translate-x-2/4 -translate-y-2/4 bg-neutral-700 border-[10px] border-[#0D1117] min-h-[28px]">
                            <img loading="lazy" src={SwapIcon} alt="Switch tokens" className="object-contain self-stretch my-auto aspect-square w-[16px] m-auto" />
                        </div>
                    </div>
                    <button
                        className="overflow-hidden disabled:bg-zinc-600 transition-all gap-5 self-stretch py-3.5 pr-3.5 pl-5 mt-5 w-full text-lg font-medium leading-none text-white whitespace-nowrap bg-green-700 rounded-xl min-h-[46px] filter hover:brightness-125 disabled:hover:brightness-100"
                        type="button"
                        disabled={!tradeList?.length}
                        onClick={async () => {
                            if (!input) {
                                toast?.error("Enter some amount to proceed!");
                                return;
                            }
                            await tradeTokens(currentTicker?.onChainFundId!, Number(input), selectedToken?.address, selectedToToken?.address, selectedToken?.symbol, selectedToToken?.symbol, currentTicker?.fundContractAddress!);
                        }}
                    >
                        {!tradeList?.length ? "No Assets to Swap" : "Swap"}
                    </button>
                    <p className="flex gap-1 items-start self-center mt-5 text-sm leading-none whitespace-nowrap text-white text-opacity-60">
                        1 <span className="font-medium text-white">{selectedToken?.symbol}</span>
                        <span>(${singleOut?.token1 ? formatNum(singleOut?.token1) : "0"})</span> = {singleOut?.perQuote ? formatNum(singleOut?.perQuote) : "0"}
                        <span className="font-medium text-white">{selectedToToken?.symbol}</span>
                        (${singleOut?.token2 ? formatNum(+singleOut?.perQuote * +singleOut?.token2) : "0"})
                    </p>
                </div>
            </section>
            {/* Headless UI Dialog */}
            <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} className="fixed z-10 inset-0 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen">
                    <DialogBackdrop className="fixed inset-0 bg-black opacity-30 size-full" />
                    <DialogPanel className="relative border border-[#2b3542] bg-[#19202a] max-w-lg mx-auto p-8 gap-y-6 w-full gap-2 flex flex-col rounded-2xl">
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-xl font-medium text-white">Select Token</DialogTitle>
                            <button onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-gray-300">
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        <div className="text-sm text-gray-400">Select from our list or search by symbol or address</div>

                        <div className="relative">
                            <input type="text" placeholder="Search Token" className="w-full bg-white/5 text-gray-300 py-3 px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-600" />
                            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5 bg-white/20 leading-none rounded-full flex items-center justify-center">
                                <span className="leading-none mb-[2px]">×</span>
                            </button>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {/* MOODENG Token */}
                            {/* <div className="flex items-center p-4 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                                <div className="w-8 h-8 mr-3 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center">
                                    <span className="text-xs text-white">M</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="font-medium text-white">MOODENG</div>
                                    <div className="text-sm text-gray-400">MOODENG</div>
                                </div>
                            </div> */}

                            {/* Solana Tokens */}
                            {TokenList?.map((item, index) => (
                                <button
                                    key={index}
                                    className="flex items-center p-4 w-full rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                                    onClick={() => {
                                        setSelectedToToken(item);
                                        setIsDialogOpen(false);
                                    }}
                                >
                                    <div className="w-8 h-8 mr-3 rounded-full overflow-hidden flex items-center justify-center">
                                        <img src={item?.logoURI || CoinPic} alt="Solana" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <div className="font-medium text-white">{item?.name}</div>
                                        <div className="text-sm text-gray-400">{item?.symbol?.toString()?.toUpperCase()}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default function ManagerTrade() {
    const [searchQuery, setSearchQuery] = useState("");
    const { getFundTradeAPI, publicKey, currentTicker, apiLoading, trigger } = useWalletContext();
    const [tradeList, setTradeList] = useState<FundAssets[]>([]);
    const [selectedToken, setSelectedToken] = useState<FundAssets | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const token = searchParams.get("token");

    const onSelectToken = (token: FundAssets) => {
        setSelectedToken(token);
        setSearchParams({ token: token?.name });
    };

    useEffect(() => {
        if (!searchParams?.get("token")) {
            setSelectedToken(null);
        }
    }, [searchParams]);

    // useEffect(() => {
    //     const handleBackButton = (event: PopStateEvent) => {
    //         event.preventDefault(); // Prevent going back
    //         if (selectedToken) {
    //             setSelectedToken(null); // Reset state
    //             window.history.pushState(null, "", window.location.href); // Keep the user on the same page
    //         }
    //     };

    //     window.history.pushState(null, "", window.location.href); // Add fake history entry
    //     window.addEventListener("popstate", handleBackButton);

    //     return () => {
    //         window.removeEventListener("popstate", handleBackButton);
    //     };
    // }, []);

    useEffect(() => {
        if (!currentTicker) return;
        async function fetch() {
            const result = await getFundTradeAPI({ address: currentTicker?.fundContractAddress! });
            // getFundPortfolioAPI({ address: publicKey?.toBase58()! });
            // getManagerFundAPI();
            let selectTokens = result?.fund?.assets?.map((i: any) => ({ ...i, fundLogo: result?.fund?.fundLogoUrl }));
            setTradeList(selectTokens);
            if (token) {
                setSelectedToken(selectTokens?.find((i: any) => i?.name == token));
            }
        }
        fetch();
    }, [currentTicker?._id, publicKey, trigger]);

    console.log("tokenslect", currentTicker, selectedToken);

    return (
        <div className="min-h-screen bg-[#0D1117] pt-20 pb-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Token List */}
                    <div className="lg:col-span-2">
                        <section className="flex flex-col py-6">
                            {selectedToken ? (
                                <>
                                    <div className="flex flex-wrap gap-2 justify-start items-center w-full text-base text-white text-opacity-60">
                                        <img src={selectedToken?.fundLogo} alt="token" className="size-6 shrink-0" />
                                        <h1 className="text-base uppercase">{selectedToken?.name}</h1>
                                        <div className="text-sm opacity-80">{selectedToken?.tokenSymbol}</div>
                                    </div>
                                    <div className="mt-8">
                                        <iframe
                                            scrolling="no"
                                            allowTransparency={true}
                                            frameBorder="0"
                                            src="https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#%7B%22autosize%22%3Atrue%2C%22symbol%22%3A%22NASDAQ%3AAAPL%22%2C%22interval%22%3A%22D%22%2C%22timezone%22%3A%22Etc%2FUTC%22%2C%22theme%22%3A%22dark%22%2C%22style%22%3A%221%22%2C%22allow_symbol_change%22%3Atrue%2C%22calendar%22%3Afalse%2C%22support_host%22%3A%22https%3A%2F%2Fwww.tradingview.com%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22utm_source%22%3A%22new-hedge-29c9ea.webflow.io%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22advanced-chart%22%2C%22page-uri%22%3A%22new-hedge-29c9ea.webflow.io%2Ffounder-project%22%7D"
                                            title="advanced chart TradingView widget"
                                            lang="en"
                                            style={{
                                                userSelect: "none",
                                                boxSizing: "border-box",
                                                display: "block",
                                                height: "400px",
                                                width: "100%",
                                            }}
                                        ></iframe>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-10 justify-between items-center w-full text-base text-white text-opacity-60">
                                        <h1 className="text-base">Screener</h1>
                                        <TokenSearch value={searchQuery} onChange={setSearchQuery} />
                                    </div>
                                    {apiLoading ? (
                                        <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                                            {new Array(1).fill(1).map((_, index) => (
                                                <Skeleton key={index} className="flex mt-5 flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 w-full h-[90px]" />
                                            ))}
                                        </SkeletonTheme>
                                    ) : (
                                        <div className="mt-5 rounded-xl border border-solid border-zinc-800 overflow-hidden">
                                            <TokenTable tradeList={tradeList} setSelectedToken={onSelectToken} />
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </div>

                    {/* Right Column - Trade Form */}
                    <div className="col-span-1">
                        <TradingInterface tradeList={tradeList} />
                    </div>
                </div>
            </div>
        </div>
    );
}
