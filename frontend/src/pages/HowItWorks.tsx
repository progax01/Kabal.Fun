import { useState } from "react";
import { FundProcess } from "../components/FundProcess";
import HIM1 from "../assets/HIM1.png";
import INV2 from "../assets/inv1.jpg";
import INV3 from "../assets/inv3.jpg";
import MANA1 from "../assets/mana1.png";
import MANA2 from "../assets/mana2.jpg";
// import MANA3 from "../assets/mana3.jpg";
import { ConfigProvider, Popover, theme } from "antd";

const fundStepsInvestors = [
    {
        number: "1",
        title: "Fund Selection",
        description: `Investors pick a fund they like that is currently fundraising or has already completed fundraising.`,
        additionalContent: (
            <>
                <p className="mt-4">Investors can assess different funds based on their creator, their performance and their asset allocation.</p>
            </>
        ),
        imageSrc: INV2,
        imagePosition: "bottom-right" as const,
    },
    {
        number: "2",
        title: "Joining Fundraising",
        description: "Investors can join a fund’s fundraising. If the fundraising target isn’t met, they’re fully reimbursed.",
        additionalContent: (
            <>
                <p className="mt-4">Upon completion, investors receive "Fund Tokens" matching their full Solana investment, representing their stake in the fund.</p>
            </>
        ),
        imageSrc: HIM1,
        imagePosition: "bottom-right" as const,
    },
    {
        number: "3",
        title: "Trading Fund Tokens",
        description: `Investors can easily trade “Fund Tokens” at any time via a Funds dashboard. Every funds "Fund Token" starts at a price of $1.`,
        additionalContent: (
            <>
                <ConfigProvider
                    theme={{
                        components: {
                            Popover: {
                                colorBgElevated: "#333333",
                            },
                        },
                        algorithm: theme.darkAlgorithm,
                    }}
                >
                    <Popover
                        content={
                            <div className="w-[360px]">
                                When an investor sells their Fund Tokens, their share of the fund’s assets is sold, the fund tokens are burned, and they receive SOL in return. Conversely, when an investor purchases Fund Tokens with SOL, new fund
                                tokens are minted representing thier share in the funds assets, and the SOL is added to the fund’s capital for the fund manager to trade.
                            </div>
                        }
                    >
                        <p className="mt-4">
                            Trading works through a <span className="opacity-70">creation and redemption mechanism.</span>*
                        </p>
                    </Popover>
                </ConfigProvider>
                <p className="mt-4">Funds have a limited lifespan and can last for up to 12 weeks</p>
            </>
        ),
        imageSrc: INV3,
        imagePosition: "bottom-right" as const,
    },
];

const fundStepsFundManagers = [
    {
        number: "1",
        title: "Fund Creation",
        description: `Fund managers connect their X account and wallet to create a fund in a few clicks for free via the "Create Fund" section.`,
        additionalContent: (
            <>
                <p className="mt-4">To create a fund, fund managers set a raise amount and have 3 days to meet it.</p>
            </>
        ),
        imageSrc: MANA1,
        imagePosition: "bottom-right" as const,
    },
    {
        number: "2",
        title: "Fund Goes Live",
        description: "After fundraising, fund managers can invest the raised Solana in Solana coins through the “Fund Manager” section.",
        additionalContent: (
            <>
                <p className="mt-4">Fund managers are only able to buy and sell coins and are not able to send them to a different wallet.</p>
                <p className="mt-4">Funds have a limited lifespan and can last for up to 12 weeks.</p>
            </>
        ),
        imageSrc: MANA2,
        imagePosition: "bottom-center" as const,
    },
    {
        number: "3",
        title: "Manager Compensation",
        description: `Fund managers receive a carry fee, which is a cut of the profits their fund makes. In addition, they earn a portion of the trading fees every time their “Fund Tokens” are bought or sold by investors.`,
        additionalContent: (
            <>
                <p className="mt-4">Both the carry fee and the trading fee is distributed to the fund manager after the fund expires.</p>
            </>
        ),
        // imageSrc: MANA3,
        imagePosition: "bottom-center" as const,
    },
];

const fundSteps = {
    investors: fundStepsInvestors,
    fundManagers: fundStepsFundManagers,
};

export default function HowItWorks() {
    const [currentTab, setCurrentTab] = useState<"investors" | "fundManagers">("investors");
    return (
        <div className="min-h-screen bg-[#0D1117] pb-12">
            <div className="relative w-full px-4 max-h-[min(50vh,400px)] sm:px-6 lg:px-8 pt-36 pb-28 flex flex-col gap-10 bg-no-repeat bg-cover bg-center items-center justify-center bg-[url('./assets/howItWorksbg.jpg')]">
                <div className="absolute w-full h-full inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0D1117]/80 to-70% to-[#0D1117]"></div>
                <h1 className="text-center z-10 text-white text-2xl sm:text-5xl font-medium">How It Works</h1>
                <div className="h-fit w-fit z-10 p-1.5 bg-white/15 rounded-xl backdrop-blur-2xl justify-start items-center gap-1 flex mx-auto font-medium">
                    <button className={`px-4 py-2.5 rounded-lg justify-center items-center flex ${currentTab === "investors" ? "bg-white/20 text-white" : "text-white"}`} onClick={() => setCurrentTab("investors")}>
                        For Investors
                    </button>
                    <button className={`px-4 py-2.5 rounded-lg justify-center items-center flex ${currentTab === "fundManagers" ? "bg-white/20 text-white" : "text-white"}`} onClick={() => setCurrentTab("fundManagers")}>
                        For Fund Managers
                    </button>
                </div>
            </div>
            <div className="container px-4 sm:px-6 lg:px-8 flex w-full mx-auto -translate-y-2">
                <FundProcess currentTab={currentTab} fundSteps={fundSteps[currentTab]} />
            </div>
        </div>
    );
}
