// import { useEffect, useState } from "react";
import DropDown from "./DropDown";
import { useWalletContext } from "../contexts/WalletContext";
// import { FundResponse } from "../utils/type";
import { Link } from "react-router-dom";
import "react-loading-skeleton/dist/skeleton.css";
import GraphIcon from "../assets/graph.svg";
import DisconnectIcon from "../assets/disconnect.svg";
import TwitterIcon from "../assets/twitter.svg";
import DisLink from "../assets/delink.svg";
import DisLinkW from "../assets/delinkw.svg";

function DropdownMenu({ setIsMenuOpen, grow }: { setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>; grow: boolean }) {
    const { publicKey, authToken, getTwitterAuthAPI, disconnect, connect } = useWalletContext();
    // const navigate = useNavigate();

    return (
        <DropDown
            containerClass="bg-white sm:w-fit w-full flex gap-2 items-center justify-center bg-opacity-20 backdrop-blur-sm text-base font-medium text-white px-4 py-1.5 rounded-lg hover:bg-white/20 disabled:opacity-50"
            label={
                <>
                    <button>{publicKey ? `${publicKey?.toString().slice(0, 4)}...${publicKey?.toString().slice(-4)}` : "Connect Wallet"}</button>
                </>
            }
            isArrow
            grow={grow}
        >
            {(toggle: any) => (
                <>
                    {!publicKey ? (
                        <span className="self-stretch px-3.5 sm:py-3 py-4 opacity-50 cursor-not-allowed rounded-md justify-start items-center gap-2 inline-flex hover:bg-white/10">
                            <img src={GraphIcon} className="w-5 h-5 relative  overflow-hidden" alt="menu-option" />
                            <div className="text-base font-medium leading-none">Manage your funds</div>
                        </span>
                    ) : (
                        <Link
                            to="/manager/trade"
                            className="self-stretch px-3.5 sm:py-3 py-4 rounded-md justify-start items-center gap-2 inline-flex hover:bg-white/10"
                            onClick={() => {
                                toggle();
                                setIsMenuOpen(false);
                            }}
                        >
                            <img src={GraphIcon} className="w-5 h-5 relative  overflow-hidden" alt="menu-option" />
                            <div className="text-white text-base font-medium leading-none">Manage your funds</div>
                        </Link>
                    )}
                    <DropDown.Item
                        onClick={() => {
                            if (authToken?.twitter) {
                                window.open(`https://x.com/${authToken?.twitter}`, "_blank");
                            } else {
                                getTwitterAuthAPI();
                                toggle();
                                setIsMenuOpen(false);
                            }
                        }}
                        disabled={Boolean(!publicKey)}
                    >
                        <img src={TwitterIcon} className="w-5 h-5 relative" alt="menu-option" />
                        <div className="text-white text-base font-medium leading-none">{authToken?.twitter ? `@${authToken?.twitter}` : "Connect Twitter"}</div>
                        {authToken?.twitter && <img src={DisLink} loading="lazy" width="20" height="20" alt="" className="ml-auto"></img>}
                    </DropDown.Item>
                    {!publicKey && (
                        <DropDown.Item
                            onClick={() => {
                                connect();
                                toggle();
                                setIsMenuOpen(false);
                            }}
                        >
                            <img src={DisLinkW} className="w-5 h-5 relative overflow-hidden" alt="menu-option" />
                            <span className="text-base font-medium leading-none">Connect Wallet</span>
                        </DropDown.Item>
                    )}
                    {publicKey && (
                        <DropDown.Item
                            onClick={() => {
                                disconnect();
                                toggle();
                                setIsMenuOpen(false);
                            }}
                        >
                            <img src={DisconnectIcon} className="w-5 h-5 relative overflow-hidden" alt="menu-option" />
                            <div className="text-rose-500 text-base font-medium leading-none">Disconnect Wallet</div>
                        </DropDown.Item>
                    )}
                </>
            )}
        </DropDown>
    );
}

export default DropdownMenu;
