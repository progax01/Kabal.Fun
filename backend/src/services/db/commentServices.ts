import Comment from "../../models/commentModel";
import { Types } from "mongoose";
import userServices from "./userServices";

class CommentServices {
  /**
   * Create a new comment
   */
  static async createComment(
    fundId: string, 
    userId: string, 
    content: string, 
    parentId?: string
  ) {
    try {
      const commentData: any = {
        fundId: new Types.ObjectId(fundId),
        userId: new Types.ObjectId(userId),
        content,
        status: 'active'
      };
      
      if (parentId) {
        // Check if parent comment exists
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
          throw new Error("Parent comment not found");
        }
        
        commentData.parentId = new Types.ObjectId(parentId);
      }
      
      const comment = await Comment.create(commentData);
      return comment;
    } catch (error: any) {
      throw new Error(`Error creating comment: ${error.message}`);
    }
  }
  
  /**
   * Get comments for a fund
   */
  static async getCommentsByFund(
    fundId: string, 
    page: number = 1, 
    limit: number = 10,
    includeReplies: boolean = false,
    currentUserId?: string
  ) {
    try {
      const query: any = { 
        fundId: new Types.ObjectId(fundId),
        status: 'active'
      };
      
      // If not including replies, only get top-level comments
      if (!includeReplies) {
        query.parentId = null;
      }
      
      const totalCount = await Comment.countDocuments(query);
      
      const comments = await Comment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      // Enhance comments with user info and reply counts
      const enhancedComments = await Promise.all(
        comments.map(async (comment) => {
          // Get user info
          const user = await userServices.getUserById(comment.userId.toString());
          
          // Get reply count if this is a top-level comment
          let replyCount = 0;
          if (!comment.parentId) {
            replyCount = await Comment.countDocuments({
              parentId: comment._id,
              status: 'active'
            });
          }
          
          // Check if current user has liked this comment
          const userHasLiked = currentUserId ? 
            comment.likes?.some(id => id.toString() === currentUserId) : 
            false;
          
          return {
            ...comment,
            user: user ? {
              _id: user._id,
              username: user.username,
              profileImage: user.profileImage
            } : null,
            likesCount: comment.likes?.length || 0,
            replyCount,
            userHasLiked
          };
        })
      );
      
      return {
        comments: enhancedComments,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error: any) {
      throw new Error(`Error getting comments: ${error.message}`);
    }
  }
  
  /**
   * Get replies to a comment
   */
  static async getReplies(
    commentId: string, 
    page: number = 1, 
    limit: number = 10,
    currentUserId?: string
  ) {
    try {
      const query = { 
        parentId: new Types.ObjectId(commentId),
        status: 'active'
      };
      
      const totalCount = await Comment.countDocuments(query);
      
      const replies = await Comment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      // Enhance replies with user info
      const enhancedReplies = await Promise.all(
        replies.map(async (reply) => {
          const user = await userServices.getUserById(reply.userId.toString());
          
          // Check if current user has liked this reply
          const userHasLiked = currentUserId ? 
            reply.likes?.some(id => id.toString() === currentUserId) : 
            false;
          
          return {
            ...reply,
            user: user ? {
              _id: user._id,
              username: user.username,
              profileImage: user.profileImage
            } : null,
            likesCount: reply.likes?.length || 0,
            userHasLiked
          };
        })
      );
      
      return {
        replies: enhancedReplies,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error: any) {
      throw new Error(`Error getting replies: ${error.message}`);
    }
  }
  
  /**
   * Like or unlike a comment
   */
  static async toggleLike(commentId: string, userId: string) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error("Comment not found");
      }
      
      const userIdObj = new Types.ObjectId(userId);
      const userLikedIndex = comment.likes.findIndex(id => id.equals(userIdObj));
      
      if (userLikedIndex === -1) {
        // User hasn't liked the comment yet, add like
        comment.likes.push(userIdObj);
      } else {
        // User already liked the comment, remove like
        comment.likes.splice(userLikedIndex, 1);
      }
      
      await comment.save();
      
      return {
        liked: userLikedIndex === -1, // true if like was added, false if removed
        likesCount: comment.likes.length
      };
    } catch (error: any) {
      throw new Error(`Error toggling like: ${error.message}`);
    }
  }
  
  /**
   * Update a comment
   */
  static async updateComment(commentId: string, userId: string, content: string) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error("Comment not found");
      }
      
      // Check if the user is the author of the comment
      if (comment.userId.toString() !== userId) {
        throw new Error("Unauthorized: You can only edit your own comments");
      }
      
      comment.content = content;
      comment.updatedAt = new Date();
      
      await comment.save();
      
      return comment;
    } catch (error: any) {
      throw new Error(`Error updating comment: ${error.message}`);
    }
  }
  
  /**
   * Delete a comment (soft delete)
   */
  static async deleteComment(commentId: string, userId: string) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error("Comment not found");
      }
      
      // Check if the user is the author of the comment
      if (comment.userId.toString() !== userId) {
        throw new Error("Unauthorized: You can only delete your own comments");
      }
      
      comment.status = 'deleted';
      comment.updatedAt = new Date();
      
      await comment.save();
      
      return { success: true };
    } catch (error: any) {
      throw new Error(`Error deleting comment: ${error.message}`);
    }
  }
}

export default CommentServices; 