import { useEffect, useState } from "react";
import { hedgeApi, useWalletContext } from "../contexts/WalletContext";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { Loader } from "lucide-react";
import HeartOutline from "../assets/outline-heart.svg";
import FilledOutline from "../assets/filled-heart.svg";
import CommentIcon from "../assets/comment.svg";

interface User {
    _id: string;
    username: string;
    profileImage: string;
}

interface Comment {
    _id: string;
    fundId: string;
    userId: string;
    content: string;
    parentId: string | null;
    likes: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
    user: User;
    likesCount: number;
    replyCount: number;
    userHasLiked: boolean;
}

interface CommentResponse {
    success: boolean;
    comments: Comment[];
    replies?: Comment[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
}
const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }

    return "Just now";
};

const SocialMediaPost = ({
    commentData,
    postlikeOnComment,
    postNewComment,
    isReply,
}: {
    commentData: Comment;
    postlikeOnComment: (commentId: string) => Promise<void>;
    postNewComment: (commentId: string, newComment: string, parentId?: string) => Promise<void>;
    isReply: boolean;
}) => {
    const [openReply, setOpenReply] = useState(false);
    const [newComment, setNewComment] = useState<string>("");
    const [loadingNewComment, setLoadingNewComment] = useState(false);
    const [trigger, setTrigger] = useState(0);
    const { publicKey, authToken, getTwitterAuthAPI } = useWalletContext();
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<Comment[]>([]);

    useEffect(() => {
        if (loadingNewComment) setTimeout(() => setLoadingNewComment(false), 2300);
    }, [loadingNewComment]);

    const getCommentReplies = async (commentId: string) => {
        try {
            setLoading(true);
            const response = await hedgeApi.get(`/comment/${commentId}/replies`, {
                headers: {
                    wallet_address: publicKey?.toBase58(),
                    auth_token: authToken?.token,
                },
                params: {
                    page: 1,
                    limit: 10,
                },
            });
            console.log("response", response.data);
            return response.data as CommentResponse;
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const refreshComments = async () => {
        const result = await getCommentReplies(commentData?._id);
        setComments(result?.replies!);
    };

    useEffect(() => {
        if (!openReply) return;
        refreshComments();
    }, [openReply, trigger]);

    return (
        <div className="flex gap-1 pt-4 mt-2 border-t-2 border-solid border-zinc-600 w-full text-white">
            <div className="h-10 w-10 rounded-md overflow-hidden mr-3">
                <img src={commentData?.user?.profileImage} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2 w-full">
                {/* User info and timestamp */}
                <div className="flex items-center mb-2">
                    <div>
                        <div className="flex items-start flex-col gap-1">
                            <span className="text-white leading-5 font-medium underline">{commentData?.user?.username}</span>
                            <span className="text-zinc-400 text-xs">{getTimeAgo(commentData?.createdAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Post content */}
                <div className={`text-zinc-300 leading-relaxed ${isReply ? "pb-2" : ""}`}>{commentData?.content}</div>

                {/* Engagement stats */}
                {!isReply && (
                    <>
                        <div className="flex gap-2 items-center mt-1">
                            <button className="flex items-center p-1 cursor-pointer" onClick={() => postlikeOnComment(commentData?._id)}>
                                <img src={commentData?.likesCount == 0 ? HeartOutline : FilledOutline} className="text-zinc-500 mr-1 size-4" />
                                <span className="text-sm">{commentData?.likesCount}</span>
                            </button>
                            <button className="flex items-center p-1 cursor-pointer" onClick={() => setOpenReply(!openReply)}>
                                <img src={CommentIcon} className="text-zinc-500 mr-1 size-4" />
                                <span className="text-sm">{commentData?.replyCount}</span>
                            </button>
                        </div>
                        {openReply && (
                            <div className="flex flex-col gap-2 rounded-xl bg-white/5 w-full py-2 px-2">
                                {authToken?.twitter ? (
                                    <div className="flex flex-col gap-2 w-full">
                                        <textarea className="w-full p-2 bg-zinc-800 text-white rounded-lg border border-zinc-600 min-h-[80px]" placeholder="Write your comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                                        <button
                                            className="px-4 py-3 bg-blue-600 min-h-[36px] text-white rounded-lg hover:bg-blue-700 transition-colors flex gap-2 items-center justify-center"
                                            onClick={async () => {
                                                if (!newComment.trim()) return;
                                                await postNewComment(commentData?._id, newComment, commentData?._id);
                                                setTrigger((p) => p + 1);
                                            }}
                                        >
                                            {loadingNewComment && <Loader size={16} className="animate-spin" />} Post Comment
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={getTwitterAuthAPI} className={`flex-1 shrink gap-2.5 self-stretch p-3 my-auto rounded-lg min-h-[36px] bg-white bg-opacity-10 hover:bg-opacity-20 transition-all`}>
                                        Connect to Twitter to comment
                                    </button>
                                )}
                                {loading ? (
                                    <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                                        {new Array(2).fill(1).map((_, index) => (
                                            <>
                                                <div className="flex gap-1 mt-2 border-t-2 border-solid border-zinc-600 w-full text-white flex-1"></div>
                                                <Skeleton key={index} className="flex mt-3 -mb-4 flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 w-full h-[60px]" />
                                            </>
                                        ))}
                                    </SkeletonTheme>
                                ) : (
                                    comments?.map((item, idx: number) => <SocialMediaPost key={idx} commentData={item} postlikeOnComment={postlikeOnComment} postNewComment={postNewComment} isReply={true} />)
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const CommentsTab: React.FC<{ fundContract: string }> = ({ fundContract }) => {
    const { authToken, publicKey, checkAuthError, getTwitterAuthAPI } = useWalletContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingNewComment, setLoadingNewComment] = useState(false);
    const [newComment, setNewComment] = useState<string>("");

    const getAllComments = async ({ fundId }: { fundId: string }) => {
        try {
            setLoading(true);
            const response = await hedgeApi.get(`/comment/fund/${fundId}`, {
                headers: {
                    wallet_address: publicKey?.toBase58(),
                    auth_token: authToken?.token,
                },
                params: {
                    page: 1,
                    limit: 10,
                    includeReplies: false,
                },
            });
            console.log("response", response.data);
            return response.data as CommentResponse;
        } catch (e) {
            checkAuthError(e);
        } finally {
            setLoading(false);
        }
    };

    const postNewComment = async (fundId: string, newComment: string, parentId?: string) => {
        try {
            setLoading(true);
            const response = await hedgeApi.post(
                `/comment/new`,
                {
                    fundId: fundId,
                    content: newComment,
                    parentId: parentId ? parentId : undefined,
                },
                {
                    headers: {
                        wallet_address: publicKey?.toBase58(),
                        auth_token: authToken?.token,
                    },
                }
            );
            console.log("response", response.data);
            refreshComments();
            return response.data;
        } catch (e) {
        } finally {
            setLoading(false);
        }
    };

    const postlikeOnComment = async (commentId: string) => {
        setComments((prev) => prev.map((comment) => (comment._id === commentId ? { ...comment, likesCount: comment.userHasLiked ? comment.likesCount - 1 : comment.likesCount + 1, userHasLiked: comment.userHasLiked ? false : true } : comment)));
        try {
            setLoading(true);
            const response = await hedgeApi.post(
                `/comment/${commentId}/like`,
                {},
                {
                    headers: {
                        wallet_address: publicKey?.toBase58(),
                        auth_token: authToken?.token,
                    },
                }
            );
            console.log("response", response.data);
            refreshComments();
            return response.data;
        } catch (e) {
        } finally {
            setLoading(false);
        }
    };

    // const getAllComments = async ({ fundId }) => {
    //     try {
    //         setLoading(true);
    //         const response = await hedgeApi.get(`/comment/fund/${fundId}`, {
    //             params: {
    //                 page: 1,
    //                 limit: 10,
    //                 includeReplies: false,
    //             },
    //         });
    //         console.log("response", response.data);
    //         return response.data;
    //     } catch (e) {
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const refreshComments = async () => {
        const result = await getAllComments({ fundId: fundContract });
        setComments(result?.comments!);
    };

    useEffect(() => {
        refreshComments();
    }, []);

    return (
        <div className="flex flex-col gap-2 px-3 py-4">
            {authToken?.twitter ? (
                <div className="flex flex-col gap-2">
                    <textarea className="w-full p-2 bg-zinc-800 text-white rounded-lg border border-zinc-600 min-h-[80px]" placeholder="Write your comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                    <button
                        className="px-4 py-3 bg-blue-600 min-h-[36px] text-white rounded-lg hover:bg-blue-700 transition-colors flex gap-2 items-center justify-center"
                        onClick={async () => {
                            if (!newComment.trim()) return;
                            setLoadingNewComment(true);
                            await postNewComment(fundContract, newComment);
                            setNewComment("");
                            setLoadingNewComment(false);
                        }}
                    >
                        {loadingNewComment && <Loader size={16} className="animate-spin" />} Post Comment
                    </button>
                </div>
            ) : (
                <button onClick={getTwitterAuthAPI} className={`flex-1 shrink gap-2.5 self-stretch p-3 my-auto rounded-lg min-h-[36px] bg-white bg-opacity-10 hover:bg-opacity-20 transition-all`}>
                    Connect to Twitter to comment
                </button>
            )}
            {loading && !comments?.length ? (
                <SkeletonTheme baseColor="#202226" highlightColor="#34373d">
                    {new Array(2).fill(1).map((_, index) => (
                        <>
                            <div className="flex gap-1 mt-2 border-t-2 border-solid border-zinc-600 w-full text-white flex-1"></div>
                            <Skeleton key={index} className="flex mt-3 -mb-4 flex-col p-4 rounded-2xl border-2 border-solid border-white border-opacity-10 w-full h-[90px]" />
                        </>
                    ))}
                </SkeletonTheme>
            ) : (
                comments?.map((item, idx: number) => <SocialMediaPost key={idx} commentData={item} postlikeOnComment={postlikeOnComment} postNewComment={postNewComment} isReply={false} />)
            )}
        </div>
    );
};

export default CommentsTab;
