import React, { Dispatch, SetStateAction } from "react";
import { useWalletContext } from "../contexts/WalletContext";
import { AmountButtonProps, AmountInputProps, CryptoSelectorProps, FundResponse } from "../utils/type";
import SettingIcon from "../assets/settings.svg";
import SolanaIcon from "../assets/solana.png";
import { toast } from "react-toastify";
import { Loader } from "lucide-react";
import { formatNum } from "../config";
// import { Loader } from "lucide-react";

type SelectTabsProps = "buy" | "sell" | "setting";

export const CryptoSelector: React.FC<CryptoSelectorProps> = ({ icon, symbol }) => (
    <div className="flex gap-2 items-center self-stretch my-auto text-sm leading-none text-center text-white">
        <img loading="lazy" src={icon} alt={`${symbol} cryptocurrency icon`} className="object-contain shrink-0 self-stretch my-auto w-5 aspect-square" />
        <div className="self-stretch my-auto">{symbol}</div>
    </div>
);

export const AmountButton: React.FC<AmountButtonProps> = ({ value, unit, setAmount }) => (
    <div
        role="button"
        className="flex-1 shrink gap-2.5 self-stretch px-3 sm:py-2 py-2.5 my-auto rounded-lg border-2 border-solid border-white border-opacity-10 text-[0.8125rem] font-medium text-nowrap leading-none text-center text-white text-opacity-60"
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
            }
        }}
        onClick={() => setAmount(value)}
    >
        {value} {unit}
    </div>
);

export const AmountInput: React.FC<AmountInputProps> = ({ availableAmount, cryptoIcon, cryptoSymbol, amount, setAmount, currentTab }) => (
    <div className="flex flex-col w-full">
        <div className="flex gap-2 items-center w-full text-sm">
            <label htmlFor="amountInput" className="flex-1 shrink self-stretch my-auto font-medium tracking-tight text-white basis-0">
                {(currentTab as SelectTabsProps) === "setting" ? "Set Slippage" : "Amount"}
            </label>
            {(currentTab as SelectTabsProps) !== "setting" && <div className="self-stretch my-auto leading-none text-white text-opacity-80">{availableAmount} Available</div>}
        </div>
        <div className="flex gap-2.5 items-center px-3.5 py-3 mt-3 w-full font-medium whitespace-nowrap rounded-xl bg-white bg-opacity-10 min-h-[44px] text-white text-opacity-60">
            <input
                id="amountInput"
                placeholder={(currentTab as SelectTabsProps) === "setting" ? "Set Percentage" : "Enter amount"}
                className="flex-1 shrink self-stretch my-auto text-base leading-none basis-3 bg-transparent border-none outline-none w-[100px] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none appearance-none"
                aria-label="Enter amount"
                value={amount!}
                onChange={(e) => setAmount(e.target.value)}
            />
            {(currentTab as SelectTabsProps) !== "setting" && (
                <>
                    <div
                        role="button"
                        tabIndex={0}
                        className="gap-2.5 transition-all self-stretch px-1.5 py-1 my-auto text-sm leading-none rounded-md bg-white bg-opacity-10 filter hover:bg-opacity-20"
                        onClick={() => setAmount(String((Number(availableAmount) * 99) / 100))}
                    >
                        Max
                    </div>
                    <CryptoSelector icon={cryptoIcon} symbol={cryptoSymbol} />
                </>
            )}
        </div>
    </div>
);

export const TradingInterface: React.FC<{ fundData: FundResponse; setTrigger: Dispatch<SetStateAction<number>>; noholding?: boolean }> = ({ fundData, setTrigger }) => {
    const { myBalance, depositLiquidity, redeemTokens, loading } = useWalletContext();
    const [currentTab, setCurrentTab] = React.useState<SelectTabsProps>(fundData?.fundStatus != "trading" ? "buy" : "sell");
    const [amount, setAmount] = React.useState<string | null>(null);
    const amountBuyButtons = [
        { value: "0.1", unit: "SOL" },
        { value: "0.5", unit: "SOL" },
        { value: "1", unit: "SOL" },
        { value: "5", unit: "SOL" },
    ];

    const amountSellButton = [
        { value: "5", unit: "%" },
        { value: "10", unit: "%" },
        { value: "25", unit: "%" },
        { value: "50", unit: "%" },
        { value: "100", unit: "%" },
    ];

    return (
        <section className="flex overflow-hidden flex-col mt-2.5 w-full rounded-2xl bg-white bg-opacity-10">
            <nav className="flex justify-between items-center px-5 pt-5 w-full gap-2" role="navigation">
                <button
                    className={`flex-1 shrink disabled:cursor-not-allowed gap-2.5 self-stretch px-2.5 py-3 my-auto text-base text-center font-medium leading-none whitespace-nowrap rounded-xl min-h-[40px] text-white ${
                        currentTab === "buy" ? "bg-white bg-opacity-10" : ""
                    }`}
                    onClick={() => {
                        setCurrentTab("buy");
                        setAmount(null);
                    }}
                >
                    Buy
                </button>
                <button
                    className={`overflow-hidden disabled:cursor-not-allowed flex-1 shrink gap-2.5 self-stretch px-2.5 py-3 my-auto text-base font-medium leading-none whitespace-nowrap rounded-lg min-h-[40px] text-center ${
                        currentTab === "sell" ? "bg-white bg-opacity-10" : ""
                    }`}
                    // disabled={fundData?.fundStatus != "trading"}
                    onClick={() => {
                        setCurrentTab("sell");
                        setAmount(null);
                    }}
                >
                    Sell
                </button>
                <button
                    className={`flex gap-2.5 items-center self-stretch p-2.5 my-auto w-10 h-10 rounded-xl bg-green-700 bg-opacity-20 ${currentTab === "setting" ? "shadow-inner ring-2 ring-green-600" : ""}`}
                    onClick={() => setCurrentTab("setting")}
                >
                    <img loading="lazy" src={SettingIcon} alt="" className="object-contain self-stretch my-auto w-5 aspect-square" />
                </button>
            </nav>
            <section className="flex flex-col p-5 mt-5 w-full bg-white bg-opacity-10">
                <form className="flex flex-col w-full">
                    <AmountInput key={currentTab} amount={amount} setAmount={setAmount} availableAmount={Number(myBalance).toFixed(4)} cryptoIcon={SolanaIcon} cryptoSymbol="SOL" currentTab={currentTab} />

                    <div className={`grid grid-cols-2 gap-1.5 items-center mt-5 w-full text-sm font-medium leading-none text-center text-white text-opacity-60 ${currentTab === "buy" ? "sm:grid-cols-4" : "sm:grid-cols-5"}`}>
                        {currentTab === "buy"
                            ? amountBuyButtons.map((button, index) => <AmountButton key={index} value={button.value} unit={button.unit} setAmount={(e) => setAmount(e)} />)
                            : amountSellButton.map((button, index) => <AmountButton key={index} value={button.value} unit={button.unit} setAmount={(e) => setAmount(formatNum((Number(fundData?.fundTokens) * Number(e)) / 100, 7))} />)}
                    </div>

                    <button
                        type="submit"
                        className={`overflow-hidden flex disabled:cursor-not-allowed gap-2 items-center justify-center filter hover:brightness-110 self-stretch py-3.5 pr-3.5 pl-5 mt-6 w-full text-lg font-medium leading-none text-white ${
                            currentTab === "setting" ? "bg-[#ffffff1a]" : currentTab === "buy" ? "bg-green-700" : "bg-red-700"
                        } rounded-xl min-h-[46px]`}
                        // disabled={loading || (currentTab === "sell" && noholding)}
                        onClick={async (e) => {
                            e?.preventDefault();
                            if (!/^\d*\.?\d*$/.test(amount || "")) {
                                toast.error("Please enter numbers only!");
                                return;
                            }
                            if (!Boolean(fundData?.onChainFundId)) {
                                toast.error("Please create a fund first");
                                return;
                            }
                            if (!Boolean(amount)) {
                                toast.error("Please enter an amount");
                                return;
                            }
                            currentTab === "buy"
                                ? await depositLiquidity(Number(amount), fundData?.onChainFundId!, fundData?.fundContractAddress, fundData?.targetRaiseAmount)
                                : await redeemTokens(Number(amount), fundData?.onChainFundId!, fundData?.fundContractAddress);
                            setTrigger((p) => p + 1);
                            setAmount(null);
                        }}
                    >
                        {loading && <Loader size={16} className="animate-spin" />}
                        {currentTab === "setting" ? "Set Slippage" : `${currentTab === "buy" ? "Buy" : "Sell"} ${fundData?.fundTicker}`}
                    </button>
                </form>
            </section>
        </section>
    );
};
