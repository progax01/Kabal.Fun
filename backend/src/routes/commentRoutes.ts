import { Router } from "express";
import CommentController from "../controllers/commentController";
import authenticateUser from "../middlewares/auth";

const commentRouter = Router();

// Create a new comment (requires authentication)
commentRouter.post(
  "/new", 
  authenticateUser, 
  CommentController.createComment
);

// Get comments for a fund (public)
commentRouter.get(
  "/fund/:fundId", 
  authenticateUser,
  CommentController.getComments
);

// Get replies to a comment (public)
commentRouter.get(
  "/:commentId/replies", 
  authenticateUser,
  CommentController.getReplies
);

// Like or unlike a comment (requires authentication)
commentRouter.post(
  "/:commentId/like", 
  authenticateUser, 
  CommentController.toggleLike
);

// Update a comment (requires authentication)
commentRouter.put(
  "/:commentId", 
  authenticateUser, 
  CommentController.updateComment
);

// Delete a comment (requires authentication)
commentRouter.delete(
  "/:commentId", 
  authenticateUser, 
  CommentController.deleteComment
);

export default commentRouter; 