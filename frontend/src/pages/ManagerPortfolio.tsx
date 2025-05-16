import { useEffect, useState } from "react";
import { useWalletContext } from "../contexts/WalletContext";
import { FundAssetDetail, FundDetailResponse } from "../utils/type";
import { formatNum } from "../config";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import UpGreen from "../assets/up_vector.svg";
import DownRed from "../assets/down_vector.svg";
import CoinIcon from "../assets/coin.png";

export interface MetricData {
    label: string;
    value: string;
}

export interface PortfolioAsset {
    name: string;
    symbol: string;
    icon: string;
    amount: string;
    marketValue: {
        usd: string;
        native: string;
    };
    changes: {
        hour: string;
        day: string;
        week: string;
    };
    fundShare: string;
    profitLoss: {
        amount: string;
        percentage: string;
    };
}

export type ActionButtonVariant = "buy" | "sell";

interface ActionButtonProps {
    variant: ActionButtonVariant;
    onClick?: () => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ variant, onClick }) => {
    const bgColor = variant === "buy" ? "bg-[#1aec5d29]" : "bg-red-500";
    const textColor = variant === "buy" ? "text-teal-300" : "text-red-200";

    return (
        <button onClick={onClick} className={`${bgColor} ${textColor} bg-opacity-40 px-5 py-2 rounded-lg text-sm font-medium `} aria-label={`${variant} asset`}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </button>
    );
};

export const MetricCard: React.FC<MetricData> = ({ label, value }) => {
    return (
        <article className="flex flex-1 shrink gap-10 justify-between items-center self-stretch px-4 py-3 rounded-lg basis-0 bg-white bg-opacity-10 min-w-60">
            <p className="self-stretch my-auto leading-relaxed opacity-80">{label}</p>
            <p className="self-stretch my-auto font-medium leading-none">{value}</p>
        </article>
    );
};

export const MetricsSection: React.FC<{ tradeList: FundDetailResponse }> = ({ tradeList }) => {
    const metrics = [
        { label: "AUM", value: tradeList?.keyMetrics?.aum ? `$${formatNum(tradeList?.keyMetrics?.aum)}` : "$0" },
        { label: "Carry Fee", value: tradeList?.keyMetrics?.managementFee ? `$${formatNum(tradeList?.keyMetrics?.managementFee)}` : "$0" },
        { label: "Your Trading Fees", value: tradeList?.keyMetrics?.tradingFee ? `${formatNum(tradeList?.keyMetrics?.tradingFee)}%` : "0%" },
        { label: "Overall PNL", value: tradeList?.keyMetrics?.pnl?.usd ? `$${formatNum(tradeList?.keyMetrics?.pnl?.usd)}` : "$0" },
    ];
    return (
        <section>
            <h2 className="text-base tracking-tight opacity-60">Key Metrics</h2>
            <div className="flex flex-wrap gap-3 items-center mt-4 w-full text-base">
                {metrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>
        </section>
    );
};

export const PortfolioTableRow: React.FC<{
    asset: FundAssetDetail;
    isAlternate?: boolean;
}> = ({ asset, isAlternate }) => {
    const navigate = useNavigate();
    return (
        <tr className={`hover:bg-opacity-15 cursor-pointer transition-all duration-200 ${isAlternate ? "bg-white bg-opacity-10" : "bg-white bg-opacity-5"}`} onClick={() => navigate(`/manager/trade?token=${asset?.name}`)}>
            <td className="px-5 py-3">
                <div className="flex gap-3 items-center text-sm font-medium leading-none">
                    <img src={asset?.logo || CoinIcon} alt={`${asset?.name} icon`} className="w-[18px] aspect-square" />
                    <span className="flex gap-1.5 items-center">
                        <span>{asset?.name}</span>
                        <span className="opacity-50">{asset?.symbol}</span>
                    </span>
                </div>
            </td>
            <td className="px-5 py-3 text-sm font-medium">${formatNum(asset?.price?.usd)}</td>
            <td className={`px-5 py-3 text-sm font-medium ${Number(asset?.price?.change?.["1h"]) >= 0 ? "text-teal-300" : "text-red-500"}`}>{formatNum(asset?.price?.change?.["1h"])}%</td>
            <td className={`px-5 py-3 text-sm font-medium ${Number(asset?.price?.change?.["24h"]) >= 0 ? "text-teal-300" : "text-red-500"}`}>{formatNum(asset?.price?.change?.["24h"])}%</td>
            <td className={`px-5 py-3 text-sm font-medium ${Number(asset?.price?.change?.["7d"]) >= 0 ? "text-teal-300" : "text-red-500"}`}>{formatNum(asset?.price?.change?.["7d"])}%</td>
            <td className="px-5 py-3">
                <div className="flex flex-col">
                    <span className="text-sm font-medium">${formatNum(asset?.holdings?.usd)}</span>
                    <span className="text-xs leading-loose opacity-60">{asset?.holdings?.token} SOL</span>
                </div>
            </td>
            <td className="px-5 py-3 text-sm font-medium">${formatNum(asset?.averageEntry)}</td>
            <td className="px-5 py-3 text-sm font-medium">{formatNum(asset?.sharePercentage)}%</td>
            <td className="px-5 py-3">
                <div className="flex flex-col font-medium">
                    <span className={`text-sm ${Number(asset?.profitLoss?.usd) >= 0 ? "text-teal-300" : "text-red-500"}`}>${formatNum(asset?.profitLoss?.usd)}</span>
                    <div className="flex gap-1 items-center text-xs leading-loose">
                        <img src={Number(asset?.profitLoss?.percentage) >= 0 ? UpGreen : DownRed} alt="Trend indicator" className="w-[11px] aspect-square" />
                        <span className={`${Number(asset?.profitLoss?.percentage) >= 0 ? "text-teal-300" : "text-red-500"}`}>{formatNum(asset?.profitLoss?.percentage)}%</span>
                    </div>
                </div>
            </td>
            <td className="pl-5 py-3">
                <div className="flex gap-2">
                    <ActionButton variant="buy" />
                    <ActionButton variant="sell" />
                </div>
            </td>
        </tr>
    );
};

// const mockAssets: PortfolioAsset[] = [
//     {
//         name: "Solana",
//         symbol: "$SOL",
//         icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/19f839166a0f128a75e78bd0d1a256cc0ef31cee57f9352235692c6d6ea4b639",
//         amount: "234.5",
//         marketValue: {
//             usd: "$345,467",
//             native: "234.5 SOL",
//         },
//         changes: {
//             hour: "-0.32%",
//             day: "-0.32%",
//             week: "-0.32%",
//         },
//         fundShare: "43.56%",
//         profitLoss: {
//             amount: "-$670.59",
//             percentage: "26.72%",
//         },
//     },
// ];

export const PortfolioTable: React.FC<{ tradeList: FundDetailResponse }> = ({ tradeList }) => {
    return (
        <div className="overflow-hidden rounded-xl border border-solid border-zinc-800">
            <table className="w-full">
                <thead>
                    <tr className="text-sm font-medium tracking-tight">
                        <th className="px-5 py-4 text-left">Asset</th>
                        <th className="px-5 py-4 text-left">Price</th>
                        <th className="px-5 py-4 text-left">1h</th>
                        <th className="px-5 py-4 text-left">24h</th>
                        <th className="px-5 py-4 text-left">7d</th>
                        <th className="px-5 py-4 text-left">Holdings</th>
                        <th className="px-5 py-4 text-left">Avg. Entry</th>
                        <th className="px-5 py-4 text-left">Fund Share</th>
                        <th className="px-5 py-4 text-left">Profit/Loss</th>
                        <th className="px-5 py-4 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tradeList?.assets?.length > 0 ? (
                        tradeList?.assets?.map((asset, index) => <PortfolioTableRow key={`${asset.symbol}-${index}`} asset={asset} isAlternate={index % 2 === 1} />)
                    ) : (
                        <div className="opacity-80 text-sm px-3 pb-3">--- No Record Found</div>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export const FundPortfolio: React.FC<{ tradeList: FundDetailResponse }> = ({ tradeList }) => {
    const { apiLoading } = useWalletContext();
    return (
        <section className="mt-8 w-full">
            <h2 className="text-base tracking-tight opacity-60">Portfolio Overview</h2>
            {apiLoading ? (
                <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                    {new Array(1).fill(1).map((_, index) => (
                        <Skeleton key={index} className="flex mt-5 flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 w-full h-[90px]" />
                    ))}
                </SkeletonTheme>
            ) : (
                <div className="mt-4">
                    <PortfolioTable tradeList={tradeList} />
                </div>
            )}
        </section>
    );
};

export default function ManagerPortfolio() {
    // const [searchQuery, setSearchQuery] = useState("");
    // const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { getFundPortfolioAPI, currentTicker, trigger, publicKey } = useWalletContext();
    const [tradeList, setTradeList] = useState<FundDetailResponse | null>(null);

    useEffect(() => {
        if (!currentTicker) return;
        async function fetch() {
            const result = await getFundPortfolioAPI({ address: currentTicker?.fundContractAddress! });
            setTradeList(result);
        }
        fetch();
    }, [currentTicker?._id, trigger, publicKey]);

    return (
        <div className="min-h-screen bg-[#0D1117] text-white pt-20 pb-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <MetricsSection tradeList={tradeList!} />
                <FundPortfolio tradeList={tradeList!} />
            </div>
        </div>
    );
}
