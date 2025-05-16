import { FundResponse, GraphDataPoint, LegendItemProps, MarketMetricProps } from "../utils/type";
import { StatCard } from "./StatCard";
import { useMediaQuery } from "react-responsive";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useWalletContext } from "../contexts/WalletContext";
import Skeleton from "react-loading-skeleton";
import UpVector from "../assets/up_vector.svg";
import DownVector from "../assets/down_vector.svg";

export const MarketMetric: React.FC<MarketMetricProps> = ({ label, value, percentage, trend }) => {
    const trendClass = trend === "down" ? "text-red-500 bg-red-600" : "text-green-500 bg-green-600";
    const iconSrc = trend == "down" ? DownVector : UpVector;

    return (
        <div className="flex flex-col self-stretch my-auto min-w-[240px]" role="group" aria-labelledby={`${label}-label`}>
            <div id={`${label}-label`} className="text-sm leading-none text-white text-opacity-70">
                {label}
            </div>
            <div className="flex gap-3 items-center self-start mt-4 whitespace-nowrap">
                <div className="self-stretch my-auto text-3xl leading-none text-white" aria-label={`${label} value: ${value}`}>
                    {value}
                </div>
                <div className={`flex gap-1 items-center self-stretch px-1.5 py-1 my-auto text-sm leading-none ${trendClass} bg-opacity-20 rounded-lg`} aria-label={`${percentage} ${trend}`}>
                    <img loading="lazy" src={iconSrc} alt="" aria-hidden="true" className="object-contain shrink-0 self-stretch my-auto aspect-square w-[13px]" />
                    <div className="self-stretch my-auto">{percentage}</div>
                </div>
            </div>
        </div>
    );
};

export const LegendItem: React.FC<LegendItemProps> = ({ color, label }) => {
    return (
        <div className="flex gap-2.5 items-center self-stretch my-auto" role="listitem">
            <div className={`flex shrink-0 self-stretch my-auto w-3.5 h-3.5 ${color} rounded`} aria-hidden="true" />
            <div className="self-stretch my-auto">{label}</div>
        </div>
    );
};

export const MarketStats: React.FC<{ fundData: FundResponse; contractAddress: string; setTrigger: Dispatch<SetStateAction<number>>; trigger: number }> = ({ fundData, contractAddress, trigger }) => {
    const { getAFundGraphAPI } = useWalletContext();
    const [graphData, setGraphData] = useState<GraphDataPoint[] | null>([]);
    const isMobile = useMediaQuery({ query: "(max-width: 480px)" });
    const [loading, setLoading] = useState(true);

    const metrics = [
        {
            label: "AUM",
            value: "$" + Number(fundData?.performance?.aum?.usd).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            percentage: Number(fundData?.aumChange?.percentage).toLocaleString(undefined, { maximumFractionDigits: 2 }).replace("-", "") + "%",
            trend: Number(fundData?.aumChange?.percentage) >= 0 ? "up" : "down" as const,
        },
        {
            label: "Fund Token Price",
            value: "$" + Number(fundData?.performance?.tokenPrice?.usd).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            percentage: Number(fundData?.priceChange?.percentage).toLocaleString(undefined, { maximumFractionDigits: 2 }).replace("-", "") + "%",
            trend: Number(fundData?.priceChange?.percentage) >= 0 ? "up" : "down" as const,
        },
    ];

    const legendItems = [
        { color: "bg-green-600", label: "Fund Token Price" },
        { color: "bg-blue-500", label: "AUM" },
    ];

    // const chartData: DataPoint[] = [
    //     { name: "Jan", value: 200 },
    //     { name: "Feb", value: 30 },
    //     { name: "Mar", value: 300 },
    //     { name: "Apr", value: 200 },
    //     { name: "May", value: 700 },
    //     { name: "Jun", value: 400 },
    //     { name: "Jul", value: 500 },
    // ];

    useEffect(() => {
        async function fetch() {
            try {
                setLoading(true);
                const data = await getAFundGraphAPI({ address: contractAddress });
                setGraphData(data?.performanceData);
                // setHoldingData({ ...data?.holding, fund: data?.fund });
                // setNoHolding(data?.success === false);
            } catch (error) {
                // if (error instanceof s && error.response?.data?.success === false) setNoHolding(true);
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, [trigger]);

    return (
        <section className="flex flex-col items-start w-full font-medium max-md:mt-9 max-md:max-w-full" aria-label="Market Statistics Overview">
            <div className="flex flex-wrap gap-12 items-center" role="list" aria-label="Market Metrics">
                {metrics.map((metric, index) => (
                    <MarketMetric key={index} {...metric} />
                ))}
            </div>
            <div className="flex gap-5 items-center mt-10 text-sm leading-none text-center text-white max-md:mt-10" role="list" aria-label="Chart Legend">
                {legendItems.map((item, index) => (
                    <LegendItem key={index} {...item} />
                ))}
            </div>
            {loading ? (
                <Skeleton containerClassName="w-full" className="flex flex-1 flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 w-full mt-5" height={isMobile ? 300 : 400} />
            ) : (
                <StatCard data={graphData!} height={isMobile ? 300 : 400} />
            )}
        </section>
    );
};
