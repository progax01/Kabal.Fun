import { useParams } from "react-router-dom";
import { PawgCard } from "../components/PawgCard";
import { MarketStats } from "../components/MarketStats";
import { AssetsView } from "../components/AssetsView";
import { FundraiseProgress } from "../components/FundraiseProgress";
import { TradingInterface } from "../components/TradingInterface";
import { FundDetailsInfo } from "../components/FundDetailsInfo";
import { Holdings } from "../components/Holdings";
import { useWalletContext } from "../contexts/WalletContext";
import { useEffect, useState } from "react";
import { FundResponse } from "../utils/type";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { toast } from "react-toastify";

export default function FundDetails() {
    const { id: fundContract } = useParams();
    console.log("para", fundContract);
    const { getAFundAPI } = useWalletContext();
    const [trigger, setTrigger] = useState(0);
    const [fundData, setFundData] = useState<FundResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [noholding, setNoHolding] = useState<boolean>(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const data = await getAFundAPI({ address: fundContract! });
                // console.log("myUUDat", data);
                setFundData(data?.fund);
            } catch (error) {
                toast.error("Failed to fetch fund details from API");
            } finally {
                setLoading(false);
            }
        };
        if (fundContract) fetch();
    }, [fundContract, trigger]);

    return (
        <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
            <div className="min-h-screen bg-[#0D1117] pb-12 container">
                <div className="px-4 sm:px-6 lg:px-8 flex flex-col w-full pt-32 sm:pb-10 mx-auto">
                    {loading ? <Skeleton className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10  w-full h-[220px]" /> : <PawgCard fundData={fundData!} />}
                    <div className="border-solid border-b-2 border-white border-opacity-10 w-full"></div>
                </div>
                <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-12 gap-8 w-full mx-auto">
                    <div className="sm:col-span-8 col-span-12 flex flex-col gap-3">
                        {loading ? (
                            <>
                                <Skeleton className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10  w-full h-[120px]" />
                                <Skeleton className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10  w-full h-[280px]" />
                                <Skeleton className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10  w-full h-[320px]" />
                            </>
                        ) : (
                            <>
                                <MarketStats fundData={fundData!} contractAddress={fundContract!} setTrigger={setTrigger} trigger={trigger} />
                                <AssetsView assets={fundData?.assets!} fundContract={fundData?._id!} />
                            </>
                        )}
                    </div>
                    <div className="sm:col-span-4 col-span-12 flex flex-col gap-3">
                        {loading ? (
                            <>
                                <Skeleton className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10  w-full h-[280px]" />
                                <Skeleton className="flex flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10  w-full h-[320px]" />
                            </>
                        ) : (
                            <>
                                {" "}
                                <FundraiseProgress fundData={fundData!} />
                                <TradingInterface fundData={fundData!} setTrigger={setTrigger} noholding={noholding} />
                                <Holdings contractAddress={fundContract!} setNoHolding={setNoHolding} noholding={noholding} />
                                <FundDetailsInfo fundData={fundData!} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </SkeletonTheme>
    );
}
