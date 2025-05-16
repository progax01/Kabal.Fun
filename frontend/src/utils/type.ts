export interface SocialLinkProps {
    icon: string;
    label: string;
    value: string
}

export type ListFilter = "trending" | "fundraising" | "trading";

export type FundraisingSortId =
    | "oldest"
    | "target-high"
    | "target-low"
    | "newest"
    | "progress-high"
    | "progress-low";

export type TradingSortId =
    | "oldest"
    | "newest"
    | "price-high"
    | "price-low"
    | "aum-high"
    | "aum-low";

// A generic filter option interface.
export interface FilterOption<T = string> {
    id: T;
    name: string;
}

// The overall SortFilter interface.
export interface SortFilter {
    trending: null;
    fundraising: FilterOption<FundraisingSortId>[];
    trading: FilterOption<TradingSortId>[];
}


export interface HoldingData {
    amount: string;
    currency: string;
    tokens: string;
    percentageChange: number;
}

export interface CreatorProps {
    avatar: string;
    handle: string;
    followers: number;
}

export interface StatCardProps {
    data: Array<GraphDataPoint>;
    width?: number;
    height?: number;
}

export interface MarketMetricProps {
    label: string;
    value: string;
    percentage: string;
    trend: string;
}

export interface LegendItemProps {
    color: string;
    label: string;
}

export interface ProgressBarProps {
    percentage: number;
    width?: string;
    height?: string;
    color?: string;
}

export interface FundraiseAmountProps {
    current: { sol: string; usd: string };
    target: { sol: string; usd: string };
}

export interface AmountButtonProps {
    value: string;
    unit: string;
    setAmount: (value: string) => void;
}

export interface CryptoSelectorProps {
    icon: string;
    symbol: string;
}

export interface AmountInputProps {
    availableAmount: string;
    cryptoIcon: string;
    cryptoSymbol: string;
    amount: string | null;
    setAmount: (amount: string | null) => void;
    currentTab: string
}


export interface DataPoint {
    name: string;
    value: number;
}


export interface HoldingsCardProps {
    holdingData: HoldingDataProps;
}

export interface HoldingsValueProps {
    amount: string;
    currency: string;
    tokens: string;
}


export interface PercentageChangeProps {
    value: number;
}

export interface FundDetailItemProps {
    label: string;
    value: string;
}

export interface FundDetailsProps {
    details: FundDetailItemProps[];
}

export interface HoldingDataProps {
    _id: string;
    userId: string;
    fundId: string;
    fundTokenBalance: string;
    initialInvestmentAmount: string;
    tokenAddress: string;
    entryPrice: string;
    lastUpdatedAt: string;
    __v: number;
    fundTokenPrice: string;
    fund: {
        name: string;
        ticker: string;
        logo: string;
    }
    value: {
        sol: string;
        usd: string;
    };
    profitLossPercentage: string;
}

export interface AssetItemProps {
    icon: string;
    name: string;
    amount: string | number;
    marketValue: string | number;
    address?: string;
    highlighted?: boolean;
}

export interface AssetHeaderProps {
    label: string;
}

export interface GainerBadgeProps {
    label: string;
    multiplier: string;
}

export interface FundCreatorProps {
    avatar: string;
    username: string;
    followers: number;
}

export interface FundProgressProps {
    current: { sol: string; usd: string };
    target: { sol: string; usd: string };
    percentage: number;
}

export interface FundCardProps {
    id: string;
    symbol: string;
    name: string;
    logo: string;
    creator: FundCreatorProps;
    progress: FundProgressProps;
    isTrading: boolean;
    performance: FundPerformance;
}

export interface CreatorPropsDetailed {
    avatar: string;
    username: string;
    followers: number;
    verifiedIcon: string;
}

export interface FundProgressPropsDetailed {
    current: { sol: string; usd: string };
    target: { sol: string; usd: string };
    percentage: number;
}

export interface FundCardPropsDetailed {
    id: string;
    logo: string;
    name: string;
    symbol: string;
    creator: CreatorPropsDetailed;
    description: string;
    progress: FundProgressProps;
    isTrading: boolean;
    performance: FundPerformance;
}

export interface MarketData {
    id: number;
    position: number;
    positionChange: number;
    fundName: string;
    symbol: string;
    fundImage: string;
    creatorName: string;
    creatorImage: string;
    creatorVerified: boolean;
    totalRaised: string;
    marketCap: string;
    marketChanges: {
        day: number;
        week: number;
        allTime: number;
    };
}

export interface MarketChangeCellProps {
    label: string;
    value: string;
    iconSrc: string;
}

export interface MarketRowProps {
    data: FundDataLeaderboard;
    highlighted?: boolean;
    index: number
}


export interface FundStepProps {
    number: string;
    title: string;
    description: string | React.ReactNode;
    imageSrc?: string;
    imagePosition?: "bottom-right" | "bottom-center";
    additionalContent?: React.ReactNode;
    height?: string | number | undefined;
}

export interface FundProcessProps {
    currentTab: "investors" | "fundManagers";
    fundSteps: Array<FundStepProps>;
}

export interface FundStatsProps {
    marketCap: string;
    aum: string;
    progress: number;
    raised: string;
    target: string;
    holdings: {
        value: string;
        tokens: string;
        percentage: string;
    };
}

// interface CreateFundApiRequest {
//     name: string;
//     ticker: string;
//     description: string;
//     raiseAmount: string;
//     managementFee: number;
//     fundId: string;
//     fundAddress: string;
//     fundTokenAddress: string;
//     website?: string;
//     telegram?: string;
//     twitter?: string;
//     creator: string;
// }


export interface FundData {
    name: string;
    description: string;
    raiseAmount: number;
    managementFee: number;
    ticker: string;
    logo: File;
    website?: string;
    telegram?: string;
    twitter?: string;
    fundDuration?: number;
}

export interface FundDataApiResponse {
    funds?: Array<FundResponse>;
    fundsCount?: number;
    success: boolean;
    message?: string;
}

export interface FundProgress {
    current: { sol: string; usd: string };
    target: { sol: string; usd: string };
    percentage: string;
}

export interface GraphDataPoint {
    date: string;
    tokenPrice: number;
    aum: number;
}

export interface FundPerformance {
    aum: { sol: string; usd: string };
    aumPercentage: string;
    tokenPrice: { sol: string; usd: string };
    tokenPercentage: string;
}

export interface FundManager {
    _id: string;
    walletAddress: string;
    socials: TwitterSocial[];
}

export interface FundChange {
    sol: string;
    usd: string;
    percentage: string;
}

export interface FundResponse {
    _id: string;
    managerId: string;
    fundName: string;
    fundTicker: string;
    fundDescription: string;
    fundLogoUrl: string;
    targetRaiseAmount: string;
    fundTokens: string;
    annualManagementFee: number;
    onChainFundId: string;
    fundContractAddress: string;
    fundTokenAddress: string;
    websiteUrl: string;
    telegramUrl: string;
    twitterHandle: string;
    isActive: boolean;
    fundStatus: string;
    assets: any[];
    createdAt: string;
    thresholdDeadline: string;
    expirationDate: string;
    manager?: FundManager;
    progress?: FundProgress;
    performance?: FundPerformance;
    priceChange?: FundChange;
    aumChange?: FundChange;
    __v: number;
}

export interface FundDataRecord extends FundData {
    fundId: string;
    fundAddress: string;
    fundTokenAddress: string;
    creator: string;
}

export interface FundDataRecordDetails {
    managerAddress: string;
    managerTelegramUsername: string;
    fundName: string;
    fundTicker: string;
    fundDescription: string;
    targetRaiseAmount: number;
    annualManagementFee: number;
    onChainFundId: string;
    fundContractAddress: string;
    fundTokenAddress: string;
    websiteUrl?: string;
    telegramUrl?: string;
    twitterHandle?: string;
    logo: File;
}
export interface AuthTokenRecord {
    token: string;
    expiry: string;
    twitter: string;
    telegram: string;
    walletAddress: string;
}

export interface Twitter {
    social: string;
    followers: number;
    image: string;
    username: string;
}

export interface Manager {
    walletAddress: string;
    twitter: Twitter;
}

export interface PriceChange {
    sol: string;
    usd: string;
    percentage: string;
}

export interface Performance {
    tokenPrice: {
        sol: string;
        usd: string;
    };
    aum: {
        sol: string;
        usd: string;
    };
    priceChange: {
        "24h": PriceChange;
        "7d": PriceChange;
        all: PriceChange;
    };
    aumChange: {
        "24h": PriceChange;
        "7d": PriceChange;
        all: PriceChange;
    };
}

export interface FundDataLeaderboard {
    position: number;
    positionChange?: number;
    fund: Fund;
}

export interface LeaderboardResponse {
    success: boolean;
    funds: FundDataLeaderboard[];
    count: number;
    page: number;
    limit: number;
}

export interface TokenPrice {
    usd: string;
    change: {
        "1h": string;
        "24h": string;
        "7d": string;
    };
}

export interface TokenMarket {
    price: string;
    volume24h: string;
    fdv: string;
    marketCap: string;
    priceChange: {
        "1h": string;
        "24h": string;
        "7d": string;
    };
}

export interface FundAssets {
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
    name: string;
    logo: string;
    price: TokenPrice;
    market: TokenMarket;
    fundLogo: string;
}


export interface FundAssetPnl {
    usd: string;
    percentage: string;
}

export interface FundKeyMetrics {
    aum: string;
    managementFee: string;
    tradingFee: string;
    pnl: FundAssetPnl;
}

export interface FundAssetPrice {
    usd: string;
    change: {
        "1h": string;
        "24h": string;
        "7d": string;
    };
}

export interface FundAssetHoldings {
    token: string;
    usd: string;
}

export interface FundAssetDetail {
    symbol: string;
    name: string;
    logo: string;
    price: FundAssetPrice;
    holdings: FundAssetHoldings;
    averageEntry: string;
    sharePercentage: string;
    profitLoss: FundAssetPnl;
}

export interface FundDetailResponse {
    success: boolean;
    fund: Fund;
    keyMetrics: FundKeyMetrics;
    assets: FundAssetDetail[];
    message?: string
}
export interface TokenListData {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string | null;
    tags: string[];
    daily_volume: number;
    created_at: string;
    freeze_authority: string | null;
    mint_authority: string | null;
    permanent_delegate: string | null;
    minted_at: string | null;
    extensions?: {
        coingeckoId?: string;
    };
}

export interface TwitterSocial {
    social: string;
    verifier: string;
    _id: string;
    followers: number;
    image: string;
    username: string;
}

export interface FundPerformance {
    tokenPrice: {
        sol: string;
        usd: string;
    };
    aum: {
        sol: string;
        usd: string;
    };
}

export interface FundPriceChange {
    sol: string;
    usd: string;
    percentage: string;
}

export interface FundAsset {
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
    price: string;
    marketValue: string;
    marketValueSOL: string;
}

export interface Fund {
    _id: string;
    fundName: string;
    fundTicker: string;
    fundDescription: string;
    fundLogoUrl: string;
    targetRaiseAmount: string;
    fundTokens: string;
    annualManagementFee: number;
    fundContractAddress: string;
    fundTokenAddress: string;
    isActive: boolean;
    fundStatus: string;
    assets: FundAsset[];
    createdAt: string;
    manager: FundManager;
    performance: FundPerformance;
    previousPerformance: {
        tokenPrice: string;
        aum: string;
    };
    priceChange: FundPriceChange;
    aumChange: FundPriceChange;
    progress: FundProgress;
}

export interface FundDataLeaderboard {
    position: number;
    positionChange?: number;
    fund: Fund;
}


// Interface for individual asset deduction
interface AssetDeduction {
    tokenAddress: string;
    tokenSymbol: string;
    currentAmount: string;
    amountToDecrease: string;
    newAmount: string;
    carryFee: string;
}

// Interface for the quote object
interface QuoteDetails {
    fundAddress: string;
    fundName: string;
    fundTokensToSell: string;
    percentageOfFund: string;
    fundTokenPrice: string;
    totalSolToReceive: string;
    totalValueUSD: string;
    assetDeductions: AssetDeduction[];
}

// Root interface for the entire response
export interface QuoteResponse {
    success: boolean;
    quote: QuoteDetails;
}
