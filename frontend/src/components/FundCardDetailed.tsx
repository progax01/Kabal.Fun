import { Link } from "react-router-dom";
import { CreatorPropsDetailed, FundCardPropsDetailed, FundPerformance, FundProgressPropsDetailed } from "../utils/type";
import TwitterTick from "../assets/twitter_tick.png";
import { Dot } from "lucide-react";
import { formatNum } from "../config";

export const FundCreatorDetailed: React.FC<CreatorPropsDetailed> = ({ avatar, username, followers }) => {
    return (
        <div className="flex flex-col mt-3 max-w-full">
            <div className="text-xs font-medium leading-loose uppercase text-white text-opacity-50">Fund Creator:</div>
            <div className="flex gap-1.5 items-center mt-1 w-full flex-wrap text-[0.8125rem]">
                <img loading="lazy" src={TwitterTick} alt="Verified creator" className="object-contain self-stretch my-auto w-5 aspect-square" />
                {username ? (
                    <>
                        <img loading="lazy" src={avatar} alt={`${username}'s avatar`} className="object-contain shrink-0 self-stretch my-auto w-5 rounded-3xl aspect-square" />
                        <div className="self-stretch my-auto font-medium leading-none text-white break-all overflow-hidden">@{username}</div>
                        <div className="self-stretch my-auto leading-none text-white text-opacity-50">{followers} Followers</div>
                    </>
                ) : (
                    <div className="text-[0.6875rem] opacity-60">User has not connected his twitter account.</div>
                )}
                {/* <a>
                    <img loading="lazy" src={TwitterTick} alt="" className="object-contain self-stretch my-auto w-4 aspect-square" />
                </a> */}
            </div>
        </div>
    );
};

export const FundProgressDetailed: React.FC<FundProgressPropsDetailed> = ({ current, target, percentage }) => {
    return (
        <div className="flex flex-col mt-4 w-full max-md:max-w-full">
            <div className="flex gap-10 justify-between items-center w-full text-base leading-none text-white max-md:max-w-full">
                <div className="self-stretch my-auto">Fundraise Progress</div>
                <div className="self-stretch my-auto text-right opacity-80">{percentage}%</div>
            </div>
            <div className="flex flex-col mt-3 w-full rounded max-md:max-w-full">
                <div className="flex flex-col items-start rounded bg-white bg-opacity-10 max-md:pr-5 max-md:max-w-full">
                    <div
                        className="flex shrink-0 max-w-full h-3 bg-green-500 rounded shadow-[0px_0px_13px_rgba(30,205,87,0.27)]"
                        style={{ width: `${percentage}%` }}
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    />
                </div>
            </div>
            <div className="flex gap-10 justify-between items-center mt-2 w-full text-sm leading-loose opacity-80  whitespace-nowrap max-md:max-w-full">
                <div className="self-stretch my-auto">{String(current?.sol)?.toLocaleString()} SOL</div>
                <div className="self-stretch my-auto">{String(target?.sol)?.toLocaleString()} SOL</div>
            </div>
        </div>
    );
};

export const FundTradingDetailed: React.FC<FundPerformance> = ({ tokenPrice, aum, aumPercentage, tokenPercentage }) => {
    return (
        <div className="flex flex-col gap-2.5 w-full mt-4 text-base text-white">
            <div className="flex w-full justify-between items-center leading-none">
                <span>Fundraise Progress</span>
                <div className="flex font-medium items-center text-sm">
                    <Dot strokeWidth={8} className="text-red-500 size-4 mr-1" />
                    TRADING
                </div>
            </div>
            <div className="flex w-full justify-between items-center leading-none">
                <span>Price</span>
                <div className="flex gap-2 opacity-80 text-sm">
                    <span className={`${Number(tokenPercentage) >= 0 ? "text-green-500" : "text-red-500"} opacity-100`}>
                        {Number(tokenPercentage) >= 0 ? "+" : "-"}
                        {formatNum(tokenPercentage).replace("-", "")}%
                    </span>
                    ${formatNum(tokenPrice?.usd)}
                </div>
            </div>
            <div className="flex w-full justify-between items-center leading-none">
                <span>AUM</span>
                <div className="flex gap-2 opacity-80 text-sm">
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

export const FundCardDetailed: React.FC<FundCardPropsDetailed> = ({ id, logo, name, symbol, creator, description, progress, performance, isTrading }) => {
    return (
        <Link to={`/fund/${id}`}>
            <article className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 hover:bg-white/5 max-w-[499px] h-full">
                <div className="flex sm:flex-row flex-col gap-3 items-center w-full max-md:max-w-full">
                    <img loading="lazy" src={logo} alt={`${name} logo`} className="object-contain shrink-0 self-stretch my-auto rounded-xl aspect-square sm:w-[100px] w-[80px]" />
                    <div className="flex flex-col flex-1 shrink self-stretch my-auto basis-0">
                        <div className="flex flex-col w-full font-medium">
                            <h2 className="text-base tracking-normal leading-none text-white">{name}</h2>
                            <div className="mt-1.5 text-base leading-tight text-green-500">{symbol}</div>
                        </div>
                        <FundCreatorDetailed {...creator} />
                    </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/90 max-md:max-w-full mb-auto">{description}</p>
                <hr className="mt-4 w-full min-h-0 border-2 border-solid border-white border-opacity-10 max-md:max-w-full" />
                {isTrading ? <FundTradingDetailed {...performance} /> : <FundProgressDetailed {...progress} />}
            </article>
        </Link>
    );
};
