// import { toast } from "react-toastify";
import { addDateAndFormat, shortAddress } from "../config";
import { FundResponse } from "../utils/type";

export const FundDetailsInfo: React.FC<{ fundData: FundResponse }> = ({ fundData }) => {
    return (
        <div aria-label="Fund Details" className="flex flex-col justify-center w-full text-sm leading-nne text-center sm:mt-0 mt-4 px-1">
            <div className="py-5 border-white border-opacity-10 border-b-2">
                <div className="flex gap-10 justify-between items-center w-full">
                    <div className="self-stretch my-auto text-white text-opacity-70">Creator</div>
                    <a className="self-stretch my-auto font-medium text-white" href={`https://solscan.io/account/${fundData?.manager?.walletAddress!}`} target="_blank" rel="noreferrer noopenner">
                        {shortAddress(fundData?.manager?.walletAddress!)}
                    </a>
                    {/* <button
                        onClick={() => {
                            navigator.clipboard.writeText(fundData?.manager?.walletAddress!);
                            toast.success("Address copied!");
                        }}
                        className="self-stretch my-auto font-medium text-white"
                    >
                        {shortAddress(fundData?.manager?.walletAddress!)}
                    </button> */}
                </div>
            </div>
            <div className="py-5 border-white border-opacity-10 border-b-2">
                <div className="flex gap-10 justify-between items-center w-full">
                    <div className="self-stretch my-auto text-white text-opacity-70">Carry fee</div>
                    <p className="self-stretch my-auto font-medium text-white">{`${String(fundData?.annualManagementFee)}%`}</p>
                </div>
            </div>
            <div className="py-5 border-white border-opacity-10 border-b-2">
                <div className="flex gap-10 justify-between items-center w-full">
                    <div className="self-stretch my-auto text-white text-opacity-70">Fund address</div>
                    <a className="self-stretch my-auto font-medium text-white" href={`https://solscan.io/account/${fundData?.fundContractAddress!}`} target="_blank" rel="noreferrer noopenner">
                        {shortAddress(fundData?.fundContractAddress!)}
                    </a>
                    {/* <button
                        onClick={() => {
                            navigator.clipboard.writeText(fundData?.fundContractAddress);
                            toast.success("Address copied!");
                        }}
                        className="self-stretch my-auto font-medium text-white"
                    >
                        {shortAddress(fundData?.fundContractAddress)}
                    </button> */}
                </div>
            </div>
            <div className="py-5 border-white border-opacity-10 border-b-2">
                <div className="flex gap-10 justify-between items-center w-full">
                    <div className="self-stretch my-auto text-white text-opacity-70">Fund Token</div>
                    <a className="self-stretch my-auto font-medium text-white" href={`https://solscan.io/account/${fundData?.fundTokenAddress}`} target="_blank" rel="noreferrer noopenner">
                        {shortAddress(fundData?.fundTokenAddress)}
                    </a>
                    {/* <button
                        onClick={() => {
                            navigator.clipboard.writeText(fundData?.fundTokenAddress);
                            toast.success("Address copied!");
                        }}
                        className="self-stretch my-auto font-medium text-white"
                    >
                        {shortAddress(fundData?.fundTokenAddress)}
                    </button> */}
                </div>
            </div>
            <div className="py-5 border-white border-opacity-10">
                <div className="flex gap-10 justify-between items-center w-full">
                    <div className="self-stretch my-auto text-white text-opacity-70">Fundraise Expiry Date</div>
                    <p className="self-stretch my-auto font-medium text-white">{addDateAndFormat(fundData?.createdAt, 3)}</p>
                    {/* <button
                        onClick={() => {
                            navigator.clipboard.writeText(fundData?.fundTokenAddress);
                            toast.success("Address copied!");
                        }}
                        className="self-stretch my-auto font-medium text-white"
                    >
                        {shortAddress(fundData?.fundTokenAddress)}
                    </button> */}
                </div>
            </div>
        </div>
    );
};
