import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCardProps } from "../utils/type";

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

export const StatCard: React.FC<StatCardProps> = ({ data, height = 400 }) => {
    const dataKey1 = "tokenPrice";
    const dataKey2 = "aum";
    const highest = Math.max(...data.map((d) => d[dataKey1]), ...data.map((d) => d[dataKey2]));
    const wholeNum = 10 + Math.ceil(highest) - Math.ceil(highest % 10);
    const ticksArray = Array.from({ length: 5 }, (_, index) => {
        let fraction = ((index + 1) / 5) * wholeNum;
        console.log("fraction", fraction, Math.ceil(fraction % 5), Math.ceil(fraction));
        return Math.ceil(fraction) - Math.ceil(fraction % 5);
    });
    console.log("ticker", wholeNum, ticksArray, highest, Math.ceil(highest % 5) + Math.ceil(highest));
    ticksArray.unshift(0);
    return (
        <div role="region" aria-label="Market Statistics Chart" className="w-full mt-5">
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data} margin={{ top: 20, right: -10, left: 0, bottom: 20 }}>
                    <CartesianGrid horizontal={true} vertical={false} strokeDasharray="0" strokeOpacity={0.4} stroke="#666666" />
                    <XAxis dataKey="date" axisLine={true} tickLine={true} tickMargin={10} tickFormatter={formatDateTime} tickCount={12} minTickGap={10} tick={{ fill: "#666666", fontSize: 12 }} padding={{ right: 20, left: 0 }} tickSize={6} />
                    <YAxis
                        orientation="right"
                        includeHidden
                        type="number"
                        ticks={ticksArray}
                        tickFormatter={(value) => (value === 0 ? "0" : `$${value}`)}
                        allowDataOverflow={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#666666", fontSize: 14 }}
                    />
                    <Line type="monotone" dataKey="aum" name="AUM" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="tokenPrice" name="Fund Token Price" stroke="#3E8B55" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                    <Tooltip
                        wrapperStyle={{ outline: "none", fontSize: "12px" }}
                        contentStyle={{
                            backgroundColor: "#000",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            padding: "10px",
                        }}
                        labelStyle={{ color: "#666", fontWeight: "bold" }}
                        itemStyle={{ color: "#999", margin: 0, padding: 0 }}
                        formatter={(value: number, name: string) => [`$${Number(value).toFixed(2)}`, String(name).toUpperCase()]}
                        labelFormatter={(label) => `TIME : ${formatDateTime(label)}`}
                        aria-label="Chart data details"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
