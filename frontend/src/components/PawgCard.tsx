import { CreatorProps, FundResponse, SocialLinkProps } from "../utils/type";
// import SamplePic from "../assets/sample.png";
import TwitterIcon from "../assets/twitter.svg";
import TelegramIcon from "../assets/telegram.svg";
import WebIcon from "../assets/web.svg";
import CreatorPic from "../assets/creator.png";
import { useEffect, useState } from "react";
import { hedgeApi } from "../contexts/WalletContext";

export const SocialLink: React.FC<SocialLinkProps> = ({ icon, label, value }) => (
    <a
        href={Boolean(value) ? value : ""}
        target={Boolean(value) ? "_blank" : "_self"}
        rel="noreferrer"
        className={`flex gap-2 items-center self-stretch px-2 py-1.5 my-auto rounded-lg bg-white bg-opacity-10  ${Boolean(value) ? "" : "opacity-50 cursor-not-allowed"}`}
    >
        <img loading="lazy" src={icon} alt="" className={`object-contain shrink-0 self-stretch my-auto w-4 aspect-square text-inherit`} />
        <div className="self-stretch my-auto">{label}</div>
    </a>
);

export const Creator: React.FC<CreatorProps> = ({ avatar, handle, followers }) => (
    <div className="flex flex-col max-w-full font-medium">
        <div className="text-xs leading-none uppercase text-white text-opacity-50">Fund Creator:</div>
        <div className="flex gap-1 items-center mt-1.5 text-sm leading-none">
            <img loading="lazy" src={avatar} alt={`${handle}'s avatar`} className="object-contain shrink-0 self-stretch my-auto w-5 rounded-3xl aspect-square" />
            {handle ? (
                <>
                    <a className="self-stretch my-auto text-white cursor-pointer" href={`https://x.com/${handle}`} target="_blank" rel="noreferrer noopenner">
                        {handle}
                    </a>
                    <div className="self-stretch my-auto text-white text-opacity-50">{followers} Followers</div>
                </>
            ) : (
                <div className="text-[0.6875rem] opacity-60">User has not connected his twitter account.</div>
            )}
        </div>
    </div>
);

interface PollOption {
    text: string;
    voter_count: number;
    _id: string;
}

interface Poll {
    _id: string;
    question: string;
    options: PollOption[];
    totalVoterCount: number;
    isClosed: boolean;
    closedAt?: string;
}

const PollCard: React.FC<{ poll: Poll }> = ({ poll }) => {
    const totalVotes = poll.totalVoterCount;

    return (
        <div className="bg-white bg-opacity-5 rounded-lg p-3 mb-3">
            <h3 className="text-white text-xs mb-3">Q. {poll.question}</h3>
            <div className="grid grid-cols-2 gap-3">
                {poll.options.map((option, index) => {
                    return (
                        <div key={option._id} className="flex justify-between items-center text-xs ">
                            <span className="truncate w-fit text-opacity-60 text-white">{index+1}. {option.text}</span>
                            <span className="text-green-500 bg-green-500/10 size-5 text-xs flex items-center justify-center rounded-md">{option.voter_count}</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-white text-opacity-50">
                <span>{totalVotes} total votes</span>
                {poll.isClosed && <span>Poll closed</span>}
            </div>
        </div>
    );
};

export const PawgCard: React.FC<{ fundData: FundResponse }> = ({ fundData }) => {
    const twitter = fundData?.manager?.socials?.find((i: any) => i?.social === "twitter");
    const socialLinks = [
        { icon: TelegramIcon, value: fundData?.telegramUrl, label: "Telegram" },
        { icon: TwitterIcon, value: fundData?.twitterHandle, label: "Twitter" },
        { icon: WebIcon, value: fundData?.websiteUrl, label: "Website" },
    ];
    const [polls, setPolls] = useState<Poll[]>([]);
    console.log("socilaa", socialLinks);

    useEffect(() => {
        if (fundData?._id) {
            hedgeApi
                .get("/poll/fund/" + fundData?._id)
                .then((res) => {
                    if (res.data && res.data.success && Array.isArray(res.data.polls)) {
                        setPolls(res.data.polls);
                    }
                })
                .catch((err) => {
                    console.log("err", err);
                });
        }
    }, [fundData]);

    return (
        <section className="flex sm:flex-nowrap flex-wrap gap-8 items-center w-full max-md:max-w-full mb-10">
            <div className="flex sm:flex-nowrap flex-wrap flex-1 shrink gap-10 items-center self-stretch my-auto basis-0 min-w-[240px] max-md:max-w-full">
                <img loading="lazy" src={fundData?.fundLogoUrl} alt={fundData?.fundName} className="object-contain shrink-0 self-stretch my-auto rounded-lg aspect-square w-[158px]" />
                <div className="flex flex-col flex-1 shrink self-stretch my-auto basis-0 min-w-[240px]">
                    <div className="flex flex-col w-full font-medium leading-tight">
                        <div className="text-base text-green-500">{fundData?.fundTicker}</div>
                        <h1 className="mt-1 text-3xl tracking-tight text-white">{fundData?.fundName}</h1>
                    </div>
                    <div className="flex flex-col mt-6 w-full leading-none whitespace-nowrap">
                        <div className="text-xs font-medium uppercase text-white text-opacity-50">Socials</div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 w-full text-sm text-white">
                            {socialLinks.map((link, index) => (
                                <SocialLink key={index} {...link} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col flex-1 shrink self-stretch my-auto basis-0 min-w-[180px] max-w-[380px]">
                <Creator avatar={twitter?.image || CreatorPic} handle={twitter?.username || ""} followers={twitter?.followers || 0} />
                <div className="flex flex-col mt-4 w-full max-md:max-w-full">
                    <div className="text-xs font-medium leading-none uppercase text-white text-opacity-50 max-md:max-w-full">About</div>
                    <p className="mt-1 text-sm leading-7 text-white max-md:max-w-full">{fundData?.fundDescription}</p>
                </div>
                <div className="flex flex-col mt-4 w-full max-md:max-w-full">
                    <div className="text-xs font-medium leading-none uppercase text-white text-opacity-50 max-md:max-w-full">Telegram Channel</div>
                    <p className="mt-1 text-sm leading-7 text-white max-md:max-w-full">{fundData?.fundName}_Fund</p>
                </div>
            </div>
            <div className="flex flex-col flex-1 shrink self-stretch my-auto basis-0 max-w-[240px] max-md:max-w-full">
                {polls.length > 0 && (
                    <div className="flex flex-col w-full">
                        <div className="text-xs font-medium leading-none uppercase text-white text-opacity-50 mb-3">Community Polls</div>
                        <div className="max-h-[150px] overflow-y-auto pr-2">
                            {polls.map((poll) => (
                                <PollCard key={poll._id} poll={poll} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
