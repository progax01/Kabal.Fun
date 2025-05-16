import { UploadCloud as CloudUpload } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWalletContext } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronDown } from "lucide-react";
// import DropDown from "../components/DropDown";

export default function CreateFund() {
    const navigate = useNavigate();
    const { connected, createFund, authToken } = useWalletContext();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showMore, setShowMore] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        ticker: "",
        description: "",
        raiseAmount: "",
        managementFee: "",
        fundDuration: 1,
        website: "",
        telegram: "",
        twitter: "",
    });

    const isTelegramLogin = authToken?.telegram ? true : false;

    // const convertToBase64 = (file: File, set: (result: string) => void) => {
    //     const reader = new FileReader();
    //     reader.onloadend = () => {
    //         set(reader.result as string);
    //     };
    //     reader.readAsDataURL(file); // This converts the file to Base64
    // };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        // Validate file size (e.g., 5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert("File size should be less than 5MB");
            return;
        }

        setSelectedFile(file);

        // Create preview URL
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("fanda   ", formData.fundDuration.toString());

        if (!connected) {
            toast.error("Please connect your wallet first");
            return;
        }

        try {
            setLoading(true);

            // Create FormData object
            const submitFormData = new FormData();

            // Add all form fields
            submitFormData.append("name", formData.name);
            submitFormData.append("ticker", formData.ticker);
            submitFormData.append("description", formData.description);
            submitFormData.append("raiseAmount", formData.raiseAmount);
            submitFormData.append("managementFee", formData.managementFee);
            submitFormData.append("website", formData.website);
            submitFormData.append("telegram", formData.telegram);
            submitFormData.append("twitter", formData.twitter);
            submitFormData.append("fundDuration", formData.fundDuration.toString());

            // Add file if selected
            if (!selectedFile) {
                // const fileBase64 = await new Promise<string>((resolve) => convertToBase64(selectedFile!, resolve));
                // submitFormData.append("logo", selectedFile);
                throw new Error("File not uploaded");
            }

            const tx = await createFund({
                name: formData.name,
                ticker: formData.ticker,
                description: formData.description,
                raiseAmount: parseFloat(formData.raiseAmount),
                managementFee: parseFloat(formData.managementFee),
                logo: selectedFile!,
                website: formData.website,
                telegram: formData.telegram,
                twitter: formData.twitter,
                fundDuration: formData.fundDuration,
            });

            console.log("Fund created successfully:", tx);
            navigate("/");
        } catch (error) {
            console.error("Failed to create fund:", error);
            toast.error("Failed to create fund. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    useEffect(() => {
        document.querySelectorAll('input[type="number"]').forEach((input) => {
            input.addEventListener(
                "wheel",
                function (event) {
                    event.preventDefault();
                },
                { passive: false }
            ); // Ensure passive is false to prevent scrolling
        });
    }, []);

    return (
        <div className="min-h-screen bg-[#0D1117] pt-20 pb-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-bold text-white mb-8 text-center">Create New Fund</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Previous form fields remain the same */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Fund Name"
                                className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Ticker</label>
                            <input
                                type="text"
                                name="ticker"
                                value={formData.ticker}
                                onChange={handleChange}
                                placeholder="Ticker"
                                className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex w-full justify-between items-center">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                            <span className="text-sm font-medium text-gray-500 mb-2">Max 240 Characters</span>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Description (Max 240 Characters)"
                            rows={4}
                            className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                            required
                            maxLength={240}
                        />
                    </div>

                    <div>
                        <div className="flex w-full justify-between items-center">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
                            <span className="text-sm font-medium text-gray-500 mb-2">500x500</span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${isDragging ? "border-green-500" : "hover:border-gray-500 border-gray-700"}`}
                            onClick={handleUploadClick}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center">
                                {previewUrl ? (
                                    <div className="mb-4">
                                        <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                                    </div>
                                ) : (
                                    <CloudUpload className="h-12 w-12 text-gray-500 mb-4" />
                                )}
                                <button type="button" className="text-green-500 hover:text-green-400">
                                    {selectedFile ? "Change File" : "Drag & Drop or Select File"}
                                </button>
                                {selectedFile && <p className="text-gray-400 text-sm mt-2">{selectedFile.name}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Raise Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="raiseAmount"
                                    value={formData.raiseAmount}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none appearance-none"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">SOL</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Carry Fee</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="managementFee"
                                    value={formData.managementFee}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="noSpinButtons w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none appearance-none"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                            </div>
                        </div>
                    </div>

                    {/* <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Fund duration</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="fundDuration"
                                    min={1}
                                    max={12}
                                    value={formData.fundDuration}
                                    onChange={handleChange}
                                    placeholder="1 to 12"
                                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg pl-4 py-2.5 text-white placeholder-gray-500 focus:outline-none pr-20 focus:border-green-500"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 select-none">weeks</span>
                            </div>
                        </div>
                    </div> */}
                    <button className="text-[#4df7b3] text-sm font-medium flex items-center gap-1" onClick={() => setShowMore(!showMore)} type="button">
                        Show More Options <ChevronDown className={`size-4 transition-all ${showMore ? "rotate-180" : ""}`} />
                    </button>
                    {showMore && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="URL, eg: https://my-website.com"
                                    className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Telegram Link</label>
                                    <input
                                        type="text"
                                        name="telegram"
                                        value={formData.telegram}
                                        onChange={handleChange}
                                        placeholder="https://t.me"
                                        className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Twitter (X) Link</label>
                                    <input
                                        type="text"
                                        name="twitter"
                                        value={formData.twitter}
                                        onChange={handleChange}
                                        placeholder="https://x.com/@"
                                        className="w-full bg-[#1A1F2B] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="bg-blue-900/30 border border-blue-700 relative group rounded-lg p-3 flex items-center justify-center">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-blue-100 text-sm">
                                In telegram, allow yourself to be added to groups, settings {">"} security or privacy, set invites to everybody. <br />
                                You will be added to a group after fund creation for community discussions and voting.
                            </p>
                        </div>
                        <img src="https://i.ibb.co/8DNgKHxY/telegram-settings.jpg" alt="Telegram settings screenshot" className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-[300px] h-[300px] object-cover rounded-md shadow-lg z-10" />
                    </div>

                    <button type="submit" disabled={loading || !connected || !isTelegramLogin} className="w-full bg-[#1e9c47] text-white py-3 rounded-lg hover:bg-green-600 mt-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? "Creating Fund..." : "Create Fund"}
                    </button>
                    {!isTelegramLogin && <p className="text-red-500 text-center text-sm">Please connect your telegram account to create a fund</p>}

                    {!connected && <p className="text-red-500 text-center text-sm">Please connect your wallet to create a fund</p>}
                </form>
            </div>
        </div>
    );
}
