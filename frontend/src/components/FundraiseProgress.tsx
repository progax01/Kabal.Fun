import { showDayDate } from "../config";
import { FundraiseAmountProps, FundResponse, ProgressBarProps } from "../utils/type";

export function ProgressBar({ percentage, height = "h-3", color = "bg-green-500" }: ProgressBarProps) {
    return (
        <div className="flex flex-col items-start rounded bg-white bg-opacity-10 max-md:pr-5">
            <div className={`flex shrink-0 ${height} ${color} rounded`} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} style={{ width: `${percentage}%` }} />
        </div>
    );
}

export function FundraiseAmount({ current, target }: FundraiseAmountProps) {
    return (
        <div className="flex gap-10 justify-between items-center mt-3 w-full text-sm leading-none text-gray-400 whitespace-nowrap">
            <div className="self-stretch my-auto">{Number(current?.sol).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} SOL</div>
            <div className="self-stretch my-auto">{Number(target?.sol).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} SOL</div>
        </div>
    );
}

export function FundraiseProgress({ fundData }: { fundData: FundResponse }) {
    const currentAmount = fundData?.progress?.current!;
    const targetAmount = fundData?.progress?.target!;
    const percentage = Number(fundData?.progress?.percentage);
    const isTrading = fundData?.fundStatus === "trading";
    const startDate = new Date(fundData?.createdAt);
    let expiryDate = new Date(fundData?.createdAt);
    expiryDate.setMonth(expiryDate.getMonth() + 3);
    const currentDate = new Date();
    const totalDuration = expiryDate.getTime() - startDate.getTime();
    const elapsedTime = currentDate.getTime() - startDate.getTime();
    const remainingTime = expiryDate.getTime() - currentDate.getTime();

    // Calculate days remaining
    const daysRemaining = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

    // Calculate percentage
    const percentageCovered = Math.min(Math.max((elapsedTime / totalDuration) * 100, 0), 100);

    return (
        <div className="flex flex-col p-5 w-full rounded-2xl bg-white bg-opacity-10" role="region" aria-label="Fundraise Progress">
            <div className="flex gap-10 mb-3.5 justify-between items-center w-full text-base leading-none text-white">
                <div className="self-stretch my-auto">{isTrading ? "Fund Date Expiry" : "Fundraise Progress"}</div>
                <div className="self-stretch my-auto text-right">{isTrading ? showDayDate(expiryDate) : `${percentage}%`}</div>
            </div>
            <ProgressBar percentage={isTrading ? percentageCovered : percentage} />
            {isTrading ? <div className="flex gap-10 justify-between items-center mt-3 text-sm leading-none text-gray-400 whitespace-nowrap">{daysRemaining} days remaining</div> : <FundraiseAmount current={currentAmount} target={targetAmount} />}
        </div>
    );
}
