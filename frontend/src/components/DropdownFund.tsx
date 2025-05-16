// import { useEffect, useState } from "react";
import DropDown from "./DropDown";
import { useWalletContext } from "../contexts/WalletContext";
import { FundResponse } from "../utils/type";
import { Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function DropdownFund({ tradeList }: { tradeList: FundResponse[] }) {
    const { currentTicker, setCurrentTicker, apiLoading, publicKey } = useWalletContext();
    const navigate = useNavigate();

    if (!publicKey) return null;

    return apiLoading && !tradeList?.length ? (
        <div className="relative flex items-center space-x-3 shrink-0">
            <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                <p className="h-[2.4987rem] overflow-hidden">
                    <Skeleton className="border-2 border-white/20 backdrop-blur-sm text-sm font-bold w-[7.375rem] h-[2.5rem] text-white  flex items-center gap-2 rounded-lg hover:bg-white/10 disabled:opacity-50 m-auto" />
                </p>
            </SkeletonTheme>
        </div>
    ) : (
        <DropDown
            containerClass="border border-white/20 w-full justify-center backdrop-blur-sm text-sm font-bold text-white h-[2.4987rem] px-2.5 pl-3 pr-4 flex items-center gap-2 rounded-lg hover:bg-white/10 disabled:opacity-50"
            label={
                <>
                    <div className="flex items-center">
                        {currentTicker?.fundName ? (
                            <>
                                <div className="w-6 h-6 mr-2">
                                    <img src={currentTicker?.fundLogoUrl} alt={`${currentTicker?.fundName} Icon`} className="w-full h-full rounded-md" />
                                </div>
                                <span className="font-medium">{currentTicker?.fundTicker}</span>
                            </>
                        ) : (
                            <div>No Funds</div>
                        )}
                    </div>
                </>
            }
            isArrow
        >
            {(toggle: any) => (
                <>
                    {tradeList?.map((item, idx: number) => (
                        <DropDown.Item
                            key={idx}
                            onClick={() => {
                                toggle();
                                setCurrentTicker(item);
                            }}
                        >
                            <div className={`flex w-full items-center text-white`}>
                                <img src={item?.fundLogoUrl} alt="Ticker Icon" className="w-6 h-6 mr-2 rounded-md" />
                                <span className="flex-grow text-left font-medium">{item?.fundTicker}</span>
                                {currentTicker?._id === item._id ? (
                                    <div className="size-4 rounded-full border bg-gray-200 pt-[1px] pr-[1px] flex items-center justify-center">
                                        <Check strokeWidth={4} className="size-3 text-gray-700" />
                                    </div>
                                ) : (
                                    <div className="size-4 rounded-full border border-gray-500" />
                                )}
                            </div>
                        </DropDown.Item>
                    ))}
                    <DropDown.Item onClick={() => navigate("/create-fund")}>
                        <div className={`flex w-full items-center text-green-500`}>
                            <Plus className="h-5 w-5 mr-2" />
                            <span className="font-medium">Create Fund</span>
                        </div>
                    </DropDown.Item>
                </>
            )}
        </DropDown>
    );
}

export default DropdownFund;
