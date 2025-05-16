import { Link } from "react-router-dom";
// import SamplePic from "../assets/sample.png";
// import CreatorPic from "../assets/creator.png";
import { Key, useEffect, useState } from "react";
import { GainerBadge } from "../components/HomeIcons";
import { FundCard } from "../components/FundCard";
import { FundCardDetailed } from "../components/FundCardDetailed";
import { hedgeApi, useWalletContext } from "../contexts/WalletContext";
import { FundCardPropsDetailed, FundResponse } from "../utils/type";
import HomeBg from "../assets/home.png";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import DropDown from "../components/DropDown";
import { sortFilter } from "../config";
import { ChevronDown, Loader } from "lucide-react";
import { SearchProps } from "./ManagerTrade";
import SearchIcon from "../assets/search.svg";
import axios from "axios";
import { useLocalStorage } from "@solana/wallet-adapter-react";
import { useDebounce } from "use-debounce";
import RightArrow from "../assets/right-arrow.svg";

const TokenSearch: React.FC<SearchProps> = ({ value, onChange }) => {
    return (
        <form role="search" className="flex gap-2 items-center h-[2.4987rem] px-2.5 py-2.5 rounded-lg bg-transparent min-w-[240px] w-full #border #border-white border-opacity-10">
            <label htmlFor="token-search" className="sr-only">
                Search...
            </label>
            <img loading="lazy" src={SearchIcon} alt="Search icon" className="size-5" />
            <input id="token-search" type="search" value={value} onChange={(e) => onChange(e.target.value)} className="w-full mr-auto bg-transparent text-base text-white border-none focus:outline-none" placeholder="Search..." aria-label="Search Fund" />
        </form>
    );
};

export default function Home() {
    const recordPerPageLimit = 9;
    const [currentTab, setCurrentTab] = useState<"trending" | "fundraising" | "trading">("trending");
    const { apiLoading, getAllFundAPI, getTopGainerFundAPI, setApiLoading, authToken, publicKey, checkAuthError } = useWalletContext();
    const [searchloading, setSearchLoading] = useState(false);
    const [fundData, setFundData] = useState<any>([]);
    const [searchedData, setSearchedData] = useState<any>([]);
    const [page, setPage] = useState({
        currentPage: 1,
        totalRecords: 1,
    });
    const [search, setSearch] = useState("");
    const [searchDebounced] = useDebounce(search, 1000);
    // const totalPages = Math.ceil(page?.totalRecords / recordPerPageLimit);
    const currentRecord = (page?.currentPage - 1) * recordPerPageLimit + 1;
    const currentRecordMax = Math.min(page?.totalRecords, page?.currentPage * recordPerPageLimit);
    const [topGainerFund, setTopGainerFund] = useLocalStorage<any | null>("solana:topgainer", null);
    const [currentSorting, setCurrentSorting] = useState<{ id: string; name: string } | null>(null);

    const getAFundHoldingAPI = async ({ search }: { search: string }) => {
        try {
            setSearchLoading(true);
            const response: { data: { funds: FundResponse[] } } = await hedgeApi.get(`/fund/search/${search}`, {
                headers: {
                    wallet_address: publicKey?.toBase58(),
                    auth_token: authToken?.token,
                },
            });
            let result = response?.data?.funds?.map((item) => ({
                logo: item?.fundLogoUrl,
                name: item?.fundName,
                id: item?.fundContractAddress,
                symbol: item?.fundTicker,
                creator: {
                    avatar: item?.manager?.socials?.find((i: any) => i?.social === "twitter")?.image,
                    username: item?.manager?.socials?.find((i: any) => i?.social === "twitter")?.username,
                    followers: item?.manager?.socials?.find((i: any) => i?.social === "twitter")?.followers,
                },
                description: item?.fundDescription,
                isTrading: item?.fundStatus === "trading",
                progress: {
                    current: item?.progress?.current,
                    target: item?.progress?.target,
                    percentage: Number(item?.progress?.percentage),
                },
                performance: {
                    aum: item?.performance?.aum,
                    aumPercentage: item?.aumChange?.percentage,
                    tokenPrice: item?.performance?.tokenPrice,
                    tokenPercentage: item?.priceChange?.percentage,
                },
            }));
            setSearchedData(result);
        } catch (e) {
            checkAuthError(e);
        } finally {
            setSearchLoading(false);
        }
        // return response.data;
    };

    useEffect(() => {
        if (search) {
            getAFundHoldingAPI({ search: search });
        } else {
            setSearchedData([]);
        }
    }, [searchDebounced]);

    useEffect(() => {
        setCurrentSorting(sortFilter[currentTab]?.[0]!);
    }, [currentTab]);

    useEffect(() => {
        setApiLoading(true);
        const controller = new AbortController();
        let currentSort = null;
        if (currentSorting) currentSort = currentSorting?.id;
        else {
            //First time when no selection on tab change
            currentSort = currentTab !== "trending" ? sortFilter[currentTab]?.[0]?.id : null;
            setCurrentSorting(sortFilter[currentTab]?.[0]!);
        }
        const fetch = async () => {
            let isTopFundFoundError = false;
            try {
                const { fund } = await getTopGainerFundAPI({ signal: controller.signal });
                console.log("fund", fund);
                setTopGainerFund({
                    logo: fund?.fundLogoUrl,
                    name: fund?.fundName,
                    id: fund?.fundContractAddress,
                    symbol: fund?.fundTicker,
                    creator: {
                        avatar: fund?.manager?.socials?.find((i: any) => i?.social === "twitter")?.image,
                        username: fund?.manager?.socials?.find((i: any) => i?.social === "twitter")?.username,
                        followers: fund?.manager?.socials?.find((i: any) => i?.social === "twitter")?.followers,
                    },
                    isTrading: fund?.fundStatus === "trading",
                    progress: {
                        current: fund?.progress?.current,
                        target: fund?.progress?.target,
                        percentage: Number(fund?.progress?.percentage),
                    },
                    performance: {
                        aum: fund?.performance?.aum,
                        aumPercentage: fund?.aumChange?.percentage,
                        tokenPrice: fund?.performance?.tokenPrice,
                        tokenPercentage: fund?.priceChange?.percentage,
                    },
                });
            } catch (e) {
                console.log("error in top", e);
                if (axios.isCancel(e)) throw e;
                isTopFundFoundError = true;
            }

            const data = await getAllFundAPI({ limit: recordPerPageLimit, page: page?.currentPage, filter: currentTab, sort: currentSort as any, signal: controller.signal });
            console.log("myDat", data);
            let result = data?.funds?.map((item) => ({
                logo: item?.fundLogoUrl,
                name: item?.fundName,
                id: item?.fundContractAddress,
                symbol: item?.fundTicker,
                creator: {
                    avatar: item?.manager?.socials?.find((i: any) => i?.social === "twitter")?.image,
                    username: item?.manager?.socials?.find((i: any) => i?.social === "twitter")?.username,
                    followers: item?.manager?.socials?.find((i: any) => i?.social === "twitter")?.followers,
                },
                description: item?.fundDescription,
                isTrading: item?.fundStatus === "trading",
                progress: {
                    current: item?.progress?.current,
                    target: item?.progress?.target,
                    percentage: Number(item?.progress?.percentage),
                },
                performance: {
                    aum: item?.performance?.aum,
                    aumPercentage: item?.aumChange?.percentage,
                    tokenPrice: item?.performance?.tokenPrice,
                    tokenPercentage: item?.priceChange?.percentage,
                },
            }));
            isTopFundFoundError && setTopGainerFund(result?.[0]);
            setFundData(result);
            setPage({ ...page, totalRecords: data?.fundsCount! });
        };
        fetch();

        return () => {
            controller.abort();
        };
    }, [currentTab, currentSorting, page?.currentPage]);

    // console.log("current top gainer", topGainerFund);
    const filteredData = searchedData?.length ? searchedData : fundData;

    return (
        <div className="bg-[#0D1117] pb-12 flex flex-col">
            <div className="w-full px-4 h-fit sm:max-h-[min(50vh,400px)] sm:px-6 lg:px-8 sm:pt-60 pt-32 sm:pb-36 pb-8 flex flex-col gap-10 bg-no-repeat bg-cover bg-center relative items-center justify-center" style={{ backgroundImage: `url(${HomeBg})` }}>
                <div className="absolute z-10 w-full h-full inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0D1117]/40 to-70% to-[#0D1117]"></div>
                <div className="relative w-fit sm:m-auto z-20 flex flex-col items-center justify-center">
                    <div className="absolute top-[-20px] z-30 bg-black/20 left-[50%] translate-x-[-50%]">
                        <GainerBadge label="Top Gainer" multiplier="17x" />
                    </div>
                    <div className="relative flex justify-between items-center w-full">
                        {topGainerFund ? (
                            <FundCard {...topGainerFund} />
                        ) : (
                            <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                                <Skeleton className="flex flex-col p-4 rounded-2xl border-2 opacity-80 border-solid border-white border-opacity-10 sm:min-w-[442px] min-w-[390px] h-[212px]" />
                            </SkeletonTheme>
                        )}
                    </div>
                    <Link to="/create-fund" className="mx-auto z-20 mt-8">
                        <div className="h-12 px-5 py-3 bg-[#1e9c47] rounded-xl justify-center items-center gap-4 inline-flex overflow-hidden w-fit transition-all duration-200 shadow-[0px_0px_60px_20px_rgba(30,205,87,0.2)] hover:shadow-[0px_0px_60px_20px_rgba(30,205,87,0.3)] filter hover:brightness-110">
                            <div className="text-white text-lg font-medium font-['Test Untitled Sans'] leading-none">Create Your Fund</div>
                        </div>
                    </Link>
                </div>
            </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex sm:items-center items-end justify-between gap-4 w-full sm:flex-row flex-col py-6">
                <div className="space-x-4 flex sm:w-fit w-full">
                    <button
                        className={`flex gap-x-3 font-medium sm:w-fit w-full justify-center px-3 py-1.5 rounded-lg transition-all ${currentTab === "trending" && !search ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/40"}`}
                        onClick={() => setCurrentTab("trending")}
                    >
                        {/* <div className="object-contain shrink-0 self-stretch my-auto size-5">
                            <TrendingIcon isBlack={currentTab === "trending"} />
                        </div> */}
                        Trending
                    </button>
                    <button
                        className={`flex gap-x-3 font-medium sm:w-fit w-full justify-center px-3 py-1.5 rounded-lg transition-all ${currentTab === "fundraising" && !search ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/40"}`}
                        onClick={() => setCurrentTab("fundraising")}
                    >
                        {/* <div className="object-contain shrink-0 self-stretch my-auto size-5">
                            <FundraisingIcon isBlack={currentTab === "fundraising"} />
                        </div> */}
                        Fundraising
                    </button>
                    <button
                        className={`flex gap-x-3 font-medium sm:w-fit w-full justify-center px-3 py-1.5 rounded-lg transition-all ${currentTab === "trading" && !search ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/40"}`}
                        onClick={() => setCurrentTab("trading")}
                    >
                        {/* <div className="object-contain shrink-0 self-stretch my-auto size-5">
                            <LiveIcon isBlack={currentTab === "trading"} />
                        </div> */}
                        Trading
                    </button>
                </div>
                <TokenSearch
                    value={search}
                    onChange={(e) => {
                        setSearch(e);
                        setSearchLoading(true);
                    }}
                />
                {currentTab !== "trending" && (
                    <DropDown
                        containerClass="bg-white bg-opacity-15 h-[2.25rem] backdrop-blur-sm text-sm font-bold text-white px-3 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/20 disabled:opacity-50"
                        label={
                            <div className="flex gap-1 font-normal items-center">
                                Sorting : <span className="font-semibold">{currentSorting?.name}</span>
                                <ChevronDown className="size-4" />
                            </div>
                        }
                    >
                        {(toggle: any) =>
                            sortFilter[currentTab]?.map((item, idx) => (
                                <DropDown.Item
                                    key={idx}
                                    onClick={() => {
                                        setCurrentSorting(item);
                                        toggle();
                                    }}
                                >
                                    <span className="text-white">{item.name}</span>
                                </DropDown.Item>
                            ))
                        }
                    </DropDown>
                )}
            </div>
            <div className="h-full flex flex-col container mx-auto px-4 sm:px-6 lg:px-8 w-full pb-0">
                {/* {fundData?.length > 0 && fundData?.map((fund: any, id: number) => <img src={fund.logoUrl} alt={fund.name} id={fund.logoUrl} className="size-9" />)} */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* {new Array(6).fill(MOCK_CARD).map((fund, id) => (
                        <FundCardDetailed key={id} {...fund} />
                    ))} */}
                    {apiLoading ? (
                        // <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                        <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                            {new Array(3).fill(1).map((_, index) => (
                                <Skeleton key={index} className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 max-w-[499px] w-full h-[250px]" />
                            ))}
                        </SkeletonTheme>
                    ) : // </div>
                    fundData?.length > 0 ? (
                        search && !searchedData?.length ? (
                            <div>
                                {searchloading ? (
                                    <div className="flex gap-2 items-center">
                                        <Loader size={16} className="animate-spin" />
                                        Searching funds ...
                                    </div>
                                ) : (
                                    "No Search Results Found!"
                                )}
                            </div>
                        ) : (
                            filteredData?.map((fund: FundCardPropsDetailed, id: Key) => <FundCardDetailed key={id} {...fund} />)
                        )
                    ) : (
                        <div>No Records Found!</div>
                    )}
                </div>
                <div className="text-nowrap flex sm:flex-row flex-col justify-center items-center mt-10 gap-6" style={{ display: Boolean(search) ? "none" : "flex" }}>
                    <p className="opacity-65">
                        Showing pairs {currentRecord}-{page?.totalRecords < recordPerPageLimit ? page?.totalRecords : currentRecordMax || 9} of {page?.totalRecords || 1}
                    </p>

                    {apiLoading ? (
                        <div className="flex gap-3">
                            <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                                {page.currentPage > 1 && (
                                    <Skeleton className="w-[8.75rem] h-[2.4375rem] rounded-xl" />
                                )}
                            </SkeletonTheme>
                            <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                                <Skeleton className="w-[8.75rem] h-[2.4375rem] rounded-xl" />
                            </SkeletonTheme>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            {page.currentPage > 1 && (
                                <button
                                    className="pl-3.5 pr-5 py-2 text-sm border-2 border-white/20 hover:border-white/30 rounded-xl justify-center items-center gap-4 inline-flex overflow-hidden w-fit transition-all duration-200 filter disabled:opacity-70 disabled:hover:border-white/20 disabled:cursor-not-allowed"
                                    onClick={() => setPage({ ...page, currentPage: page?.currentPage - 1 })}
                                >
                                    <img src={RightArrow} className="w-5 h-5 relative overflow-hidden rotate-180" />
                                    Previous Page
                                </button>
                            )}
                            <button
                                className="pl-5 pr-3.5 py-2 text-sm border-2 border-white/20 hover:border-white/30 rounded-xl justify-center items-center gap-4 inline-flex overflow-hidden w-fit transition-all duration-200 filter disabled:opacity-70 disabled:hover:border-white/20 disabled:cursor-not-allowed"
                                disabled={currentRecordMax >= page?.totalRecords || apiLoading}
                                onClick={() => setPage({ ...page, currentPage: page?.currentPage + 1 })}
                            >
                                Next Page
                                <img src={RightArrow} className="w-5 h-5 relative overflow-hidden" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
