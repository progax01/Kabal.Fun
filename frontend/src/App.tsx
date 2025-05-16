/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateFund from "./pages/CreateFund";
import FundDetails from "./pages/FundDetails";
import HowItWorks from "./pages/HowItWorks";
import { WalletProvider } from "./contexts/WalletContext";
import Leaderboard from "./pages/Leaderboard";
import { SolanaProvider } from "./contexts/SolanaContext";
import { Helmet } from "react-helmet";
import ManagerTrade from "./pages/ManagerTrade";
import ManagerPortfolio from "./pages/ManagerPortfolio";

function App() {
    const currentUrl = window.location.href;
    return (
        <>
            <Helmet>
                <title>KABAL.FUN</title>
                <link rel="icon" sizes="16x16 24x24 32x32 48x48 64x64" href="/src/assets/favicon.ico" />
                <meta name="description" content="KabalFun" />
                <meta name="keywords" content="pump, fun, pumpfun, kabal, hedge, token, coin, nft" />
                <meta name="author" content="Kabal-devs" />
                <meta property="og:title" content="KabalFun" />
                <meta property="og:description" content="KabalFun" />
                <meta property="og:image" content="/src/assets/opengraph.jpg" />
                <meta property="og:url" content={currentUrl} />
                <meta name="twitter:title" content="KabalFun" />
                <meta name="twitter:description" content="KabalFun" />
                <meta name="twitter:image" content="/src/assets/opengraph.jpg" />
                <meta name="twitter:card" content={currentUrl} />
                <link rel="shortcut icon" sizes="16x16 24x24 32x32 48x48 64x64" href="/src/assets/favicon.ico" />
                <link rel="apple-touch-icon" href="/src/assets/favicon.png" />
            </Helmet>
            <SolanaProvider>
                <WalletProvider>
                    <BrowserRouter>
                        <div className="min-h-screen bg-[#0D1117] text-white overflow-y-auto font-TestUntitledSans">
                            <Navbar />
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/leaderboard" element={<Leaderboard />} />
                                <Route path="/how-it-works" element={<HowItWorks />} />
                                <Route path="/create-fund" element={<CreateFund />} />
                                <Route path="/fund/:id" element={<FundDetails />} />
                                <Route path="/manager/portfolio" element={<ManagerPortfolio />} />
                                <Route path="/manager/trade" element={<ManagerTrade />} />
                            </Routes>
                        </div>
                    </BrowserRouter>
                </WalletProvider>
            </SolanaProvider>
        </>
    );
}

export default App;
