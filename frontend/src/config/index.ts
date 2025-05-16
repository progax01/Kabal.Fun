import { SortFilter, TokenListData } from "../utils/type";
import token_list from "../config/tokenlist.json";

export const sortFilter: SortFilter = {
    trending: null,
    fundraising: [
        {
            id: "newest",
            name: "Most Recent",
        }, {
            id: "progress-low",
            name: "Least Progress",
        }, {
            id: "progress-high",
            name: "Most Progress",
        }, {
            id: "target-high",
            name: "Highest Fundraising Amount",
        }, {
            id: "target-low",
            name: "Lowest Fundraising Amount",
        }
    ],
    trading: [
        {
            id: "newest",
            name: "Most Recent",
        }, {
            id: "price-high",
            name: "Highest Price",
        }, {
            id: "price-low",
            name: "Lowest Price",
        }, {
            id: "aum-high",
            name: "Highest AUM",
        }, {
            id: "aum-low",
            name: "Lowest AUM",
        }
    ]
}

export const shortAddress = (address: string) => `${address?.slice(0, 4)}...${address?.slice(-4)}`;

export const formatNum = (num: number | string, maxFraction: number = 2) => Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxFraction });

export const comma = (num: number | string) => Number(num).toLocaleString();

export const formatNumWithSuffix = (num: number | string): string => {
    const formatter = new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1
    });
    return formatter.format(Number(num));
};

const supportedToken = ["SOL", "USDC", "Bonk"];

const TokenList: Array<TokenListData> = token_list?.filter(token => supportedToken.includes(token?.symbol));

export { TokenList }

export function addDaysAndFormat(dateString: string | Date, days: number) {
    const date = new Date(dateString);
    date.setUTCDate(date.getUTCDate() + days);

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: true, timeZone: 'UTC'
    }).format(date).toString().toUpperCase();
}

export function addDateAndFormat(dateString: string | Date, days: number) {
    const date = new Date(dateString);
    date.setUTCDate(date.getUTCDate() + days);

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: "short", year: 'numeric',
        timeZone: 'UTC'
    }).format(date).toString().toUpperCase();
}

export function showDayDate(dateString: string | Date) {
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: "short", year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(dateString)).toString().toUpperCase();
}
