import React, { useEffect, useState } from "react";
import { AssetItemProps } from "../utils/type";
// import SolanaIcon from "../assets/solana.png";
import CoinIcon from "../assets/coin.png";
import CopyIcon from "../assets/copy.svg";
import { formatNum, shortAddress, TokenList } from "../config";
import { toast } from "react-toastify";
import CommentsTab from "./CommentTab";
import { CheckIcon } from "lucide-react";

export const AssetItem: React.FC<AssetItemProps> = ({ icon, name, amount, marketValue, address, highlighted }) => {
    const [check, setCheck] = useState(false);

    useEffect(() => {
        if (check) setTimeout(() => setCheck(false), 1500);
    }, [check]);

    return (
        <tr className={` ${highlighted ? "bg-white bg-opacity-20" : ""}`}>
            <td className="pl-3 py-3.5">
                <div className="flex gap-3 items-center self-stretch">
                    <img loading="lazy" src={icon} alt={`${name} icon`} className="object-contain shrink-0 self-stretch my-auto aspect-square w-[26px]" />
                    <div className="self-stretch my-auto">{name}</div>
                </div>
            </td>
            <td>
                <div>{amount}</div>
            </td>
            <td>
                <div>{marketValue}</div>
            </td>
            <td className="pr-3">
                {address && (
                    <button
                        className="flex gap-3 items-center cursor-pointer"
                        onClick={() => {
                            navigator.clipboard.writeText(address);
                            toast.success("Address copied!");
                            setCheck(true);
                        }}
                    >
                        <div className="self-stretch my-auto">{shortAddress(address)}</div>
                        {check ? <CheckIcon strokeWidth={4} className="size-4 text-green-300" /> : <img loading="lazy" src={CopyIcon} alt="Copy" className="object-contain shrink-0 self-stretch my-auto aspect-square w-[18px]" />}
                    </button>
                )}
            </td>
        </tr>
    );
};

interface TokenAsset {
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
    marketValue: string;
}

interface AssetsViewProps {
    assets: TokenAsset[];
    fundContract: string;
}

export const AssetsView: React.FC<AssetsViewProps> = ({ assets, fundContract }) => {
    const assetsList: AssetItemProps[] = assets
        ? assets?.map((asset) => {
              const token = TokenList?.find((token) => token.address === asset?.tokenAddress);
              return {
                  icon: token?.logoURI || CoinIcon,
                  name: asset?.tokenSymbol == "SOL" ? "SOL (Native)" : asset?.tokenSymbol,
                  amount: formatNum(asset?.amount, 6),
                  marketValue: `${asset?.marketValue ? formatNum(asset?.marketValue) : "--"}`,
                  address: asset?.tokenAddress,
              };
          })
        : [];
    const [currentTab, setCurrentTab] = React.useState<"assets" | "comments">("assets");
    return (
        <section className="flex overflow-hidden flex-col pt-4 mx-auto mt-1.5 w-full leading-none rounded-xl bg-white bg-opacity-10 max-md:mt-10 max-md:max-w-full">
            <div className="flex flex-col w-full font-medium max-md:max-w-full">
                <div className="flex flex-wrap justify-between items-center w-full text-base text-center text-white whitespace-nowrap px-3 gap-2">
                    <button className={`flex-1 shrink gap-2.5 self-stretch p-2.5 my-auto rounded-lg min-h-[36px] ${currentTab === "assets" ? "bg-white bg-opacity-20" : ""}`} onClick={() => setCurrentTab("assets")}>
                        Assets
                    </button>
                    <button className={`flex-1 shrink gap-2.5 self-stretch p-2.5 my-auto rounded-lg min-h-[36px] ${currentTab === "comments" ? "bg-white bg-opacity-20" : ""}`} onClick={() => setCurrentTab("comments")}>
                        Comments
                    </button>
                </div>

                <div className="shrink-0 mt-4 max-w-full h-px border border-solid border-white border-opacity-10 w-full" />
            </div>
            {currentTab === "assets" ? (
                <div className="overflow-x-auto overflow-y-hidden">
                    <table className="table-auto w-full">
                        <thead>
                            <tr className="text-white/60">
                                <th className="pl-3">
                                    <div className="text-left font-medium text-xs py-2.5 min-w-[240px] w-full">Asset</div>
                                </th>
                                <th>
                                    <div className="text-left font-medium text-xs py-2.5 min-w-[140px] w-full">Amount</div>
                                </th>
                                <th>
                                    <div className="text-left font-medium text-xs py-2.5 min-w-[140px] w-full">Market Value</div>
                                </th>
                                <th className="pr-3">
                                    <div className="text-left font-medium text-xs py-2.5 min-w-[140px] w-full">Address</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {assetsList?.length > 0 ? (
                                assetsList?.map((asset, index) => <AssetItem key={index} icon={asset.icon} name={asset.name} amount={asset.amount} marketValue={asset.marketValue} address={asset.address} highlighted={index % 2 === 0} />)
                            ) : (
                                <div className="px-3 py-5 text-sm text-white/60">-- No Records</div>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <CommentsTab fundContract={fundContract} />
            )}
        </section>
    );
};
