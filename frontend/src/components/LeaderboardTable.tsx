import { Link } from "react-router-dom";
import { FundDataLeaderboard, MarketChangeCellProps, MarketRowProps, TwitterSocial } from "../utils/type";
import ArrowUpIcon from "../assets/green_up.svg";
import ArrowDownIcon from "../assets/red_down.svg";
import TwitterTick from "../assets/twitter_tick.png";
import { useWalletContext } from "../contexts/WalletContext";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import SortIcon from "../assets/sort-icon.svg";
import { formatNum } from "../config";

export function MarketRow({ data, highlighted, index }: MarketRowProps) {
    const twitterSocial = data?.fund?.manager?.socials?.find((social: TwitterSocial) => social.social === "twitter");
    // Determine if position change is positive (for styling)
    const positionChange = data?.positionChange || 0;
    const isPositive = positionChange >= 0;

    return (
        <Link to={`/fund/${data?.fund?.fundContractAddress}`} className="flex w-full overflow-hidden min-w-fit">
            <div className={`flex w-full rounded-xl hover:border-2 hover:border-green-500 hover:bg-green-500/10 border-2 border-transparent [&>div]:shrink-0 ${highlighted ? "bg-white/5" : ""}`}>
                <div className="flex gap-3 flex-nowrap h-[64px] w-[102px] pl-4">
                    <div className="my-auto text-white basis-0">{data?.position || index + 1}.</div>
                    {positionChange !== 0 && (
                        <div className={`flex gap-1 items-center p-1 my-auto rounded-md bg-opacity-10 text-sm ${isPositive ? "text-green-500 bg-green-500" : "text-red-500 bg-red-500"}`}>
                            <div className="self-stretch my-auto">
                                {isPositive ? "+" : ""}
                                {positionChange}
                            </div>
                            <img loading="lazy" src={isPositive ? ArrowUpIcon : ArrowDownIcon} alt="" className="object-contain shrink-0 self-stretch my-auto w-3.5 aspect-square" />
                        </div>
                    )}
                </div>
                <div className="flex flex-1 shrink gap-3 items-center self-stretch my-auto basis-0 min-w-[284px] w-full">
                    <img loading="lazy" src={data?.fund?.fundLogoUrl} alt={`${data?.fund?.fundName} logo`} className="object-contain shrink-0 self-stretch my-auto w-8 rounded-md aspect-square" />
                    <div className="flex flex-col justify-center self-stretch my-auto w-[193px]">
                        <div className="text-base leading-none mb-1 text-white">{data?.fund?.fundName}</div>
                        <div className="text-sm font-medium leading-none text-green-500">{data?.fund?.fundTicker}</div>
                    </div>
                </div>
                <div className="flex gap-1.5 items-center self-stretch my-auto w-[254px] h-[64px]">
                    <div className="flex gap-2.5 items-center self-stretch my-auto rounded-md justify-center">
                        {twitterSocial && <img loading="lazy" src={TwitterTick} alt="Verified creator" className="object-contain self-stretch my-auto w-5 aspect-square" />}
                    </div>
                    <img loading="lazy" src={twitterSocial?.image} alt={`${twitterSocial?.username} profile picture`} className="object-contain shrink-0 self-stretch my-auto w-5 rounded-3xl aspect-square" />
                    <div className="self-stretch my-auto text-sm leading-none text-white">{twitterSocial?.username}</div>
                </div>
                <div className="self-stretch my-auto text-base leading-tight text-white w-[140px] h-[64px] flex items-center">
                    ${Number(data?.fund?.performance?.aum?.sol).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="self-stretch my-auto text-base leading-tight text-white w-[140px] h-[64px] flex items-center ">
                    ${Number(data?.fund?.performance?.tokenPrice?.usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="h-[64px] flex pr-4 w-[288px] items-center">
                    <div className="flex gap-4 items-center justify-between w-full my-auto font-medium">
                        <MarketChangeCell label="1 day" value={String(data?.fund?.priceChange?.percentage || "0").replace("-", "")} iconSrc={String(data?.fund?.priceChange?.percentage || "0")?.includes("-") ? ArrowDownIcon : ArrowUpIcon} />
                        <MarketChangeCell label="7 day" value={String(data?.fund?.priceChange?.percentage || "0").replace("-", "")} iconSrc={String(data?.fund?.priceChange?.percentage || "0")?.includes("-") ? ArrowDownIcon : ArrowUpIcon} />
                        <MarketChangeCell label="All Time" value={String(data?.fund?.priceChange?.percentage || "0").replace("-", "")} iconSrc={String(data?.fund?.priceChange?.percentage || "0")?.includes("-") ? ArrowDownIcon : ArrowUpIcon} />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function LeaderboardTable({ leaderData }: { leaderData: FundDataLeaderboard[] }) {
    const { apiLoading } = useWalletContext();
    return (
        <div className="flex flex-col w-full !overflow-hidden" role="table" aria-label="Market Leaderboard">
            <div className="flex flex-col w-full overflow-x-auto" role="rowgroup">
                <div className="flex w-full min-w-fit text-sm overflow-hidden font-medium tracking-tight text-gray-400 [&>div]:shrink-0" role="row">
                    <div className="self-stretch h-[50px] flex items-center my-auto w-[102px] pl-3" role="columnheader">
                        Position
                    </div>
                    <div className="self-stretch h-[50px] flex items-center my-auto min-w-[284px] flex-1" role="columnheader">
                        Fund
                    </div>
                    <div className="self-stretch h-[50px] flex items-center my-auto w-[254px]" role="columnheader">
                        Creator
                    </div>
                    <div className="self-stretch h-[50px] flex gap-1 items-center my-auto w-[140px]" role="columnheader">
                        AUM <img src={SortIcon} className="object-contain shrink-0 self-stretch my-auto size-4" />
                    </div>
                    <div className="self-stretch h-[50px] flex gap-1 items-center my-auto w-[140px]" role="columnheader">
                        Price <img src={SortIcon} className="object-contain shrink-0 self-stretch my-auto size-4" />
                    </div>
                    <div className="self-stretch h-[50px] flex items-center justify-center my-auto min-w-[267px]" role="columnheader">
                        Price Change
                    </div>
                </div>
                {!apiLoading || leaderData?.length ? (
                    leaderData?.length > 0 ? (
                        leaderData?.map((data, index) => <MarketRow key={index} data={data} highlighted={index % 2 === 0} index={index} />)
                    ) : (
                        <div className="opacity-80 text-sm ml-3 py-4">--- No record found!</div>
                    )
                ) : (
                    <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                        {new Array(4).fill(1).map((_, index) => (
                            <Skeleton key={index} className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 w-full h-[64px]" />
                        ))}
                    </SkeletonTheme>
                )}
            </div>
        </div>
    );
}

export function MarketChangeCell({ label, value, iconSrc }: MarketChangeCellProps) {
    return (
        <div className="flex flex-col flex-1 shrink justify-center self-stretch my-auto basis-0">
            <div className="text-xs tracking-tight text-gray-400">{label}</div>
            <div className="flex gap-1 items-center self-start text-base leading-tight text-green-500 whitespace-nowrap">
                <div className="self-stretch my-auto">+{formatNum(value)}%</div>
                <img loading="lazy" src={iconSrc} alt="" className="object-contain shrink-0 self-stretch my-auto aspect-square w-[15px]" />
            </div>
        </div>
    );
}
