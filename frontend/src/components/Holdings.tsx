import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useWalletContext } from "../contexts/WalletContext";
import { HoldingDataProps, HoldingsCardProps } from "../utils/type";
import { AxiosError } from "axios";
import UPGreenArrow from "../assets/upGreenArrow.svg";
import { formatNum } from "../config";

export function HoldingsCard({ holdingData }: HoldingsCardProps) {
    return (
        <section aria-label="Holdings Information" className="flex overflow-hidden flex-col p-5 mt-3.5 w-full leading-none rounded-2xl border-2 border-solid border-white border-opacity-10">
            <h2 className="text-sm font-medium text-white text-opacity-70">Your Holdings</h2>
            <div className="flex gap-10 justify-between items-center mt-3 w-full text-center">
                <div className="flex flex-col items-start self-stretch my-auto">
                    <div className="text-lg font-medium text-white">${formatNum(holdingData?.value?.usd)}</div>
                    <div className="mt-1 text-xs text-white text-opacity-80">
                        {formatNum(holdingData?.fundTokenBalance, 6)} {holdingData?.fund?.ticker}
                    </div>
                </div>
                <div
                    role="status"
                    aria-label={`Percentage change: ${holdingData?.profitLossPercentage}%`}
                    className="gap-2.5 flex self-stretch px-3 py-2.5 my-auto text-base font-medium text-green-400 whitespace-nowrap rounded-xl border-2 border-green-400 border-solid bg-green-400 bg-opacity-10"
                >
                    {holdingData?.profitLossPercentage}%
                    <img alt="up-arrow" src={UPGreenArrow} className="object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
                </div>
            </div>
        </section>
    );
}

export function Holdings({ contractAddress, setNoHolding, noholding }: { contractAddress: string; setNoHolding: Dispatch<SetStateAction<boolean>>; noholding: boolean }) {
    const { getAFundHoldingAPI } = useWalletContext();
    const [holdingData, setHoldingData] = useState<HoldingDataProps | null>(null);

    useEffect(() => {
        async function fetch() {
            try {
                const data = await getAFundHoldingAPI({ address: contractAddress });
                setHoldingData({ ...data?.holding, fund: data?.fund });
                setNoHolding(data?.success === false);
            } catch (error) {
                if (error instanceof AxiosError && error.response?.data?.success === false) setNoHolding(true);
                console.log(error);
            }
        }
        fetch();
    }, []);

    if (noholding) return <div className="flex overflow-hidden flex-col p-5 mt-3.5 w-full leading-none rounded-2xl border-2 border-solid border-white border-opacity-10 text-white/80">You don't have any holdings!</div>;

    return <HoldingsCard holdingData={holdingData!} />;
}
