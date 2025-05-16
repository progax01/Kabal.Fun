import { FundProcessProps, FundStepProps } from "../utils/type";

export const FundStep: React.FC<FundStepProps> = ({ number, title, description, imageSrc, imagePosition = "bottom-right", additionalContent, height }) => {
    return (
        <div className={`flex overflow-hidden relative flex-col flex-1 shrink-0 p-5 rounded-xl basis-0 bg-[#1C2229] min-w-[340px] w-full`} style={{ height }}>
            {imageSrc && (
                <img
                    loading="lazy"
                    src={imageSrc}
                    alt=""
                    className={`object-contain transition-all absolute z-0 max-w-full ${
                        imagePosition === "bottom-right" ? "right-0 bottom-0 mt-auto w-[100%]" : "bottom-0 left-2/4 -translate-x-2/4 aspect-[2.67] translate-y-[0%] w-[432px]"
                    }`}
                />
            )}
            <div className="flex z-0 flex-col w-full">
                <div className="flex gap-3 items-center self-start text-lg font-medium tracking-tight whitespace-nowrap">
                    <div className="self-stretch px-2.5 my-auto w-8 h-8 flex items-center justify-center text-center text-green-500 rounded-xl bg-green-500 bg-opacity-10 min-h-[32px] leading-none font-medium">{number}</div>
                    <div className="self-stretch my-auto text-white">{title}</div>
                </div>
                <p className="mt-4 text-base tracking-tight leading-7 text-white">{description}</p>
                {additionalContent}
            </div>
        </div>
    );
};

export const FundProcess: React.FC<FundProcessProps> = ({ currentTab, fundSteps }) => {
    return (
        <section className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5 w-full lg:px-8 sm:px-4" role="main" aria-label="Fund Process Steps">
            {fundSteps?.map((step, index) => (
                <FundStep key={index} number={step.number} title={step.title} description={step.description} imageSrc={step.imageSrc} imagePosition={step.imagePosition} additionalContent={step.additionalContent} height={currentTab === "investors" ? "356px" : "370px"} />
            ))}
        </section>
    );
};
