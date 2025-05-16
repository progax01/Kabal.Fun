import { Link, useLocation } from "react-router-dom";
import { useWalletContext } from "../contexts/WalletContext";
import Logo from "../assets/logo4.svg";
import TwitterIcon from "../assets/twitter.svg";
import TelegramIcon from "../assets/telegram.svg";
import { memo, useEffect, useRef, useState } from "react";
import GraphIcon from "../assets/graph.svg";
import DisconnectIcon from "../assets/disconnect.svg";
// import { ChevronDown } from "lucide-react";
import DropdownFund from "./DropdownFund";
// import { toast } from "react-toastify";

import { FundResponse } from "../utils/type";
import DropdownMenu from "./DropdownMenu";
import { useLocalStorage } from "@solana/wallet-adapter-react";
import ConnectIcon from "../assets/connect.svg";
// import DisLink from "../assets/delink.svg";
import MenuIcon from "../assets/menu-icon.svg";

export function MenuOptions({ disconnect, connectTwitter }: { disconnect: () => void; connectTwitter: () => void }) {
    const { authToken } = useWalletContext();
    return (
        <div className="sm:w-64 w-full h-fit bg-[#2F353A] rounded-lg shadow-[0px_10px_24px_-5px_rgba(19,25,32,1.00)] backdrop-blur-xl flex-col justify-start items-start inline-flex">
            <Link to="/manager/trade" className="self-stretch px-3.5 sm:py-3 py-4 rounded-md justify-start items-center gap-2 inline-flex hover:bg-white/10">
                <img src={GraphIcon} className="w-5 h-5 relative  overflow-hidden" alt="menu-option" />
                <div className="text-white text-base font-medium leading-none">Manage your funds</div>
            </Link>
            <button className="self-stretch px-3.5 sm:py-3 py-4 rounded-md justify-start items-center gap-2 inline-flex hover:bg-white/10" onClick={() => (authToken?.twitter ? window.open(`https://x.com/${authToken?.twitter}`) : connectTwitter())}>
                <img src={TwitterIcon} className="w-5 h-5 relative" alt="menu-option" />
                <div className="text-white text-base font-medium leading-none">{authToken?.twitter ? `@${authToken?.twitter}` : "Connect Twitter"}</div>
                {authToken?.twitter && <img src={ConnectIcon} loading="lazy" width="20" height="20" alt="" className="ml-auto"></img>}
            </button>
            <button className="self-stretch px-3.5 sm:py-3 py-4 rounded-md justify-start items-center gap-2 inline-flex hover:bg-white/10" onClick={disconnect}>
                <img src={DisconnectIcon} className="w-5 h-5 relative  overflow-hidden" alt="menu-option" />
                <div className="text-rose-500 text-base font-medium leading-none">Disconnect Wallet</div>
            </button>
        </div>
    );
}
function Navbar() {
    const { connected, connecting, connect, publicKey, getTwitterAuthAPI, getManagerFundAPI, setCurrentTicker, trigger, authToken, handleTelegramLogin } = useWalletContext();
    const [isScrolled, setIsScrolled] = useState(false);
    // const navigate = useNavigate();
    const { pathname } = useLocation();
    const isManagerRoute = pathname.includes("/manager");
    const isTrade = pathname.includes("/manager/trade");
    const isPortfolio = pathname.includes("/manager/portfolio");
    const isHowItWorks = pathname.includes("/how-it-works");
    const isLeaderboard = pathname.includes("/leaderboard");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef: any = useRef();
    const [tradeList, setTradeList] = useLocalStorage<FundResponse[]>("solana:tradelist", []);
    // const [showMore, setShowMore] = useState(false);
    // const debounce = useDebouncedCallback((v: boolean) => setIsScrolled(v), 200);

    //useeffect to know window is scrollled or not
    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        if (!publicKey || !isManagerRoute) return;
        async function fetch() {
            console.log("callig trade");
            const result = await getManagerFundAPI();
            setTradeList(result?.funds);
            setCurrentTicker(result?.funds?.[result?.funds?.length - 1]);
        }
        fetch();
    }, [publicKey, connected, trigger, authToken, isManagerRoute]);

    const handleScroll = () => {
        if (window.scrollY >= 100) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if ((event.target as HTMLElement).id === "menu-icon") {
                return;
            }
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen]);

    const textHighlighted = (yes: boolean) => (yes ? "text-gray-100" : "text-gray-400");

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-[64px] transition-all duration-300" style={{ backgroundColor: isScrolled ? "#0D111788" : "transparent", backdropFilter: isScrolled ? "blur(10px)" : "none" }}>
            {/* DESKTOP VIEW */}

            <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="sm:hidden absolute inset-0 bg-[#0D1117] z-40"></div>
                <div className="flex justify-between h-16 items-center">
                    <div className={`flex items-center ${isManagerRoute ? "space-x-5" : "space-x-10"}`}>
                        <Link to="/" className="flex items-center">
                            <img src={Logo} className="max-h-[28px] z-40" />
                        </Link>
                        {isManagerRoute && <div className="h-7 px-3 py-1.5 bg-white/10 z-50 rounded-3xl justify-center items-center gap-2.5 flex text-[#8bf6ae] sm:text-sm text-xs font-medium uppercase tracking-tight">Fund Manager</div>}
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-2 items-center">
                            {isManagerRoute ? (
                                <>
                                    <Link to="/manager/trade" className={`${textHighlighted(isTrade)} hover:text-white px-2 rounded-md text-[0.9375rem] font-medium`}>
                                        Trade
                                    </Link>
                                    <Link to="/manager/portfolio" className={`${textHighlighted(isPortfolio)} hover:text-white px-2 rounded-md text-[0.9375rem] font-medium`}>
                                        Portfolio
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/how-it-works" className={`${textHighlighted(isHowItWorks)} hover:text-white px-2 rounded-md text-[0.9375rem] font-medium`}>
                                        How it works
                                    </Link>
                                    <Link to="/leaderboard" className={`${textHighlighted(isLeaderboard)} hover:text-white px-2 rounded-md text-[0.9375rem] font-medium`}>
                                        Leaderboard
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center justify-center space-x-3">
                        {isManagerRoute ? (
                            <DropdownFund tradeList={tradeList} />
                        ) : (
                            <div className="flex gap-1">
                                <button className="flex items-center bg-transparent text-gray-300 rounded-lg hover:bg-gray-800 p-2" onClick={handleTelegramLogin}>
                                    <img src={TelegramIcon} className="max-h-[30px] size-5" />
                                </button>
                                <button className="flex items-center bg-transparent text-gray-300 rounded-lg hover:bg-gray-800 p-2" onClick={getTwitterAuthAPI}>
                                    <img src={TwitterIcon} className="max-h-[30px] size-5" />
                                </button>
                            </div>
                        )}
                        {/* {connected ? ( */}
                        <DropdownMenu setIsMenuOpen={() => {}} grow={false} />
                        {/* ) : (
                            <button onClick={connect} disabled={connecting} className="bg-white/10 backdrop-blur-sm text-sm font-bold text-white px-4 py-2 rounded-lg hover:bg-white/20 disabled:opacity-50">
                                {connecting ? "Connecting..." : "Connect Wallet"}
                            </button>
                        )} */}
                    </div>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="z-40 sm:hidden" id="menu-icon">
                        <img src={MenuIcon} className="max-h-[30px] size-6 z-40" id="menu-icon" />
                    </button>
                </div>
            </div>

            {/* ------------ MOBILE VIEW ------------ */}

            <div className={`sm:hidden w-full min-h-[250px] z-10 flex flex-col justify-between pt-10 pb-4 px-4 text-white transition-all duration-300 bg-[#0D1117] ${isMenuOpen ? "" : "-translate-y-[calc(100%+64px)] opacity-10"}`} ref={menuRef}>
                <div className="flex flex-col gap-4" onClick={() => setIsMenuOpen(false)}>
                    {isManagerRoute ? (
                        <>
                            <Link to="/manager/trade" className={`${textHighlighted(isTrade)} hover:text-white rounded-md text-base font-normal`}>
                                Trade
                            </Link>
                            <Link to="/manager/portfolio" className={`${textHighlighted(isPortfolio)} hover:text-white rounded-md text-base font-normal`}>
                                Portfolio
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/how-it-works" className={`${textHighlighted(isHowItWorks)} hover:text-white rounded-md text-base font-normal`}>
                                How it works
                            </Link>
                            <Link to="/leaderboard" className={`${textHighlighted(isLeaderboard)} hover:text-white rounded-md text-base font-normal`}>
                                Leaderboard
                            </Link>
                        </>
                    )}
                </div>
                <div className="flex flex-col gap-5 justify-between">
                    {isManagerRoute ? (
                        <DropdownFund tradeList={tradeList} />
                    ) : (
                        <div className="flex gap-1">
                            <button className="flex items-center bg-transparent text-gray-300 rounded-lg hover:bg-gray-800 p-2">
                                <img src={TelegramIcon} className="max-h-[30px] size-5" />
                            </button>
                            <button className="flex items-center bg-transparent text-gray-300 rounded-lg hover:bg-gray-800 p-2" onClick={getTwitterAuthAPI}>
                                <img src={TwitterIcon} className="max-h-[30px] size-5" />
                            </button>
                        </div>
                    )}
                    {connected ? (
                        <DropdownMenu setIsMenuOpen={setIsMenuOpen} grow />
                    ) : (
                        <button onClick={connect} disabled={connecting} className="bg-white/10 backdrop-blur-sm text-sm font-bold text-white px-4 py-3 rounded-lg hover:bg-white/20 disabled:opacity-50">
                            {connecting ? "Connecting..." : "Connect Wallet"}
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default memo(Navbar);
