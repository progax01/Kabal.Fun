// import { Link } from "react-router-dom";
import { FundCardProps, FundCreatorProps, FundPerformance, FundProgressProps } from "../utils/type";
import TwitterTick from "../assets/twitter_tick.png";
import { Dot } from "lucide-react";
import { Link } from "react-router-dom";
import { formatNum } from "../config";

export const FundCreator: React.FC<FundCreatorProps> = ({ avatar, username, followers }) => {
    return (
        <div className="flex flex-col max-w-full font-medium">
            <div className="text-[0.6875rem] leading-none uppercase text-white text-opacity-50">Fund Creator:</div>
            <div className="flex gap-2 items-center mt-1.5 text-[0.8125rem] leading-none">
                <img loading="lazy" src={TwitterTick} alt="Verified creator" className="object-contain self-stretch my-auto w-4 aspect-square" />
                {username ? (
                    <>
                        <img loading="lazy" src={avatar} alt={`${username}'s avatar`} className="object-contain shrink-0 self-stretch my-auto w-4 rounded-3xl aspect-square" />
                        <div className="self-stretch my-auto text-white">@{username}</div>
                        <div className="self-stretch font-semibold my-auto text-slate-500">{followers} Followers</div>
                    </>
                ) : (
                    <div className="text-[0.6875rem] opacity-60">User has not connected his twitter account.</div>
                )}
            </div>
        </div>
    );
};

export const FundCard: React.FC<FundCardProps> = ({ id, symbol, name, logo, isTrading, creator, progress, performance }) => {
    return (
        <Link to={`/fund/${id}`} className="flex w-full">
            <div className="flex flex-col p-3.5 rounded-xl hover:bg-slate-400/15 border border-white/15 transition-all duration-200 sm:min-w-[442px] min-w-[360px] backdrop-blur-2xl hover:shadow-[0_0_30px_10px_rgba(50,71,78,0.3)]">
                <div className="flex sm:flex-row flex-col gap-5 items-center w-full">
                    <img loading="lazy" src={logo} alt={`${name} fund logo`} className="object-contain shrink-0 self-stretch my-auto aspect-square w-[80px] rounded-xl" />
                    <div className="flex flex-col flex-1 shrink self-stretch my-auto basis-0 min-w-[240px]">
                        <div className="flex flex-col w-full gap-1">
                            <div className="text-lg font-medium tracking-normal leading-none text-white">{name}</div>
                            <div className="text-[0.8125rem] leading-none text-green-500 font-semibold">{symbol}</div>
                        </div>
                        <div className="mt-2.5">
                            <FundCreator {...creator} />
                        </div>
                    </div>
                </div>
                <div className="flex w-full mt-3">{!isTrading ? <FundProgress {...progress} /> : <FundTradingDetails {...performance} />}</div>
            </div>
        </Link>
    );
};

export const FundTradingDetails: React.FC<FundPerformance> = ({ tokenPrice, aum, aumPercentage, tokenPercentage }) => {
    // console.log("usdddd", tokenPrice, aum, aumPercentage, tokenPercentage, Number(tokenPercentage));
    return (
        <div className="flex flex-col gap-1 text-[0.8125rem] w-full">
            <div className="flex w-full justify-between items-center">
                <span>Fundraise Progress</span>
                <div className="flex font-semibold items-center leading-none">
                    <Dot strokeWidth={8} className="text-red-500 size-4 mr-1" />
                    TRADING
                </div>
            </div>
            <div className="flex w-full justify-between items-center">
                <span>Price</span>
                <div className="flex gap-2">
                    <span className={`${Number(tokenPercentage) >= 0 ? "text-green-500" : "text-red-500"} opacity-100`}>
                        {Number(tokenPercentage) >= 0 ? "+" : "-"}
                        {formatNum(tokenPercentage).replace("-", "")}%
                    </span>
                    ${formatNum(tokenPrice?.usd)}
                </div>
            </div>
            <div className="flex w-full justify-between items-center">
                <span>AUM</span>
                <div className="flex gap-2">
                    <span className={`${Number(aumPercentage) >= 0 ? "text-green-500" : "text-red-500"} opacity-100`}>
                        {Number(aumPercentage) >= 0 ? "+" : "-"}
                        {formatNum(aumPercentage).replace("-", "")}%
                    </span>
                    ${formatNum(aum?.usd)}
                </div>
            </div>
        </div>
    );
};

export const FundProgress: React.FC<FundProgressProps> = ({ current, target, percentage }) => {
    return (
        <div className="flex flex-col w-full">
            <div className="flex gap-10 justify-between items-center w-full text-base font-medium leading-none text-white">
                <div className="self-stretch my-auto">Fundraise Progress</div>
                <div className="self-stretch my-auto text-right">{percentage}%</div>
            </div>
            <div className="flex flex-col mt-2 w-full rounded-sm">
                <div className="flex flex-col items-start rounded-sm bg-white bg-opacity-10">
                    <div className="flex shrink-0 h-1 bg-green-500 rounded-sm" style={{ width: `${percentage}%` }} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} />
                </div>
            </div>
            <div className="flex gap-10 justify-between items-center mt-2 w-full text-sm leading-loose text-gray-400 whitespace-nowrap">
                <div className="self-stretch my-auto">${Number(current?.sol).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
                <div className="self-stretch my-auto">${Number(target?.sol).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
            </div>
        </div>
    );
};
