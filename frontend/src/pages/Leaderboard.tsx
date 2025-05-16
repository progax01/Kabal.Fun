import { useEffect } from "react";
import LeaderboardBg from "../assets/leaderboard.png";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { useWalletContext } from "../contexts/WalletContext";
import { FundDataLeaderboard } from "../utils/type";
import { useLocalStorage } from "@solana/wallet-adapter-react";

export default function Leaderboard() {
    const { getLeaderboardAPI } = useWalletContext();
    const [leaderData, setLeaderData] = useLocalStorage<FundDataLeaderboard[]>("solana:leaderboard", []);

    useEffect(() => {
        async function fetch() {
            const result = await getLeaderboardAPI();
            setLeaderData(result?.funds);
        }
        fetch();
    }, []);
    // const [currentTab, setCurrentTab] = useState<"topGainers" | "aum">("topGainers");
    return (
        <div className="min-h-screen bg-[#131920] pb-12">
            <div
                className="relative mx-auto max-h-[min(50vh,340px)] items-center justify-center px-4 sm:px-6 lg:px-8 pt-36 pb-36 flex flex-col gap-10 bg-no-repeat bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(180deg, #131920,#131920e3 46%, #131920), url(${LeaderboardBg})`, backgroundPosition: "0 0, 50% 0" }}
            >
                {/* <div className="absolute w-full h-full inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0D1117]/70 to-70% to-[#0D1117]"></div> */}
                <h1 className="text-center z-10 text-white text-2xl sm:text-5xl font-medium leading-none">Leaderboard</h1>
                {/* <div className="h-fit w-fit p-1.5 bg-white/15 rounded-xl backdrop-blur-sm justify-start items-center gap-1 flex mx-auto">
                    <button className={`px-4 py-2.5 rounded-lg justify-center items-center font-semibold flex ${currentTab === "topGainers" ? "bg-white text-black" : "text-white"}`} onClick={() => setCurrentTab("topGainers")}>
                        <span className="text-base">Top Gainers</span>
                    </button>
                    <button className={`px-4 py-2.5 rounded-lg justify-center items-center font-semibold flex ${currentTab === "aum" ? "bg-white text-black" : "text-white"}`} onClick={() => setCurrentTab("aum")}>
                        <span className="text-base">AUM</span>
                    </button>
                </div> */}
            </div>
            <div className="container px-4 sm:px-6 lg:px-8 flex w-full mx-auto -translate-y-12">
                <LeaderboardTable leaderData={leaderData} />
            </div>
        </div>
    );
}
