import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import CommentServices from "../services/db/commentServices";

class CommentController {
  /**
   * Create a new comment or reply
   */
  static createComment = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { fundId, content, parentId } = req.body;
      const userId = req.user._id;
      
      if (!fundId || !content) {
        return next(errorHandler(400, "Fund ID and content are required"));
      }
      
      const comment = await CommentServices.createComment(
        fundId, 
        userId.toString(), 
        content, 
        parentId
      );
      
      res.status(201).json({
        success: true,
        comment
      });
    }
  );
  
  /**
   * Get comments for a fund
   */
  static getComments = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { fundId } = req.params;
      const { page = 1, limit = 10, includeReplies = false } = req.query;
      
      if (!fundId) {
        return next(errorHandler(400, "Fund ID is required"));
      }
      
      // Get current user ID if authenticated
      const currentUserId = req.user?._id?.toString();
      
      const result = await CommentServices.getCommentsByFund(
        fundId,
        Number(page),
        Number(limit),
        includeReplies === 'true',
        currentUserId // Pass the current user ID
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    }
  );
  
  /**
   * Get replies to a comment
   */
  static getReplies = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { commentId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      if (!commentId) {
        return next(errorHandler(400, "Comment ID is required"));
      }
      
      // Get current user ID if authenticated
      const currentUserId = req.user?._id?.toString();
      
      const result = await CommentServices.getReplies(
        commentId,
        Number(page),
        Number(limit),
        currentUserId // Pass the current user ID
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    }
  );
  
  /**
   * Like or unlike a comment
   */
  static toggleLike = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { commentId } = req.params;
      const userId = req.user._id;
      
      if (!commentId) {
        return next(errorHandler(400, "Comment ID is required"));
      }
      
      const result = await CommentServices.toggleLike(
        commentId,
        userId.toString()
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    }
  );
  
  /**
   * Update a comment
   */
  static updateComment = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user._id;
      
      if (!commentId || !content) {
        return next(errorHandler(400, "Comment ID and content are required"));
      }
      
      const comment = await CommentServices.updateComment(
        commentId,
        userId.toString(),
        content
      );
      
      res.status(200).json({
        success: true,
        comment
      });
    }
  );
  
  /**
   * Delete a comment
   */
  static deleteComment = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { commentId } = req.params;
      const userId = req.user._id;
      
      if (!commentId) {
        return next(errorHandler(400, "Comment ID is required"));
      }
      
      const result = await CommentServices.deleteComment(
        commentId,
        userId.toString()
      );
      
      res.status(200).json({
        success: true,
        message: "Comment deleted successfully"
      });
    }
  );
}

export default CommentController; 